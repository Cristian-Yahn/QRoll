const CodigoQrModel = require('../models/codigoQrModel');
const AsistenciaModel = require('../models/asistenciaModel');
const InscripcionModel = require('../models/inscripcionModel');
const ClaseModel = require('../models/claseModel');
const CursoModel = require('../models/cursoModel');
const { sincronizarEstado } = require('../utils/estadoClase');
const { calcularResumen } = require('../utils/resumenAsistencia');

const ESTADOS_VALIDOS = ['presente', 'ausente', 'tarde', 'justificado'];

// Lógica compartida del registro por QR. La usan dos endpoints:
//   - el viejo, anidado: POST /api/cursos/:id_curso/clases/:id_clase/asistencia/qr
//     (lo usa el escáner dentro de la página)
//   - el nuevo, por enlace: POST /api/asistencia/qr  (lo usa asistencia-rapida.html)
// No habla con "res": devuelve { status, body } y cada endpoint responde.
// Cada error lleva además un "codigo" corto para que el frontend sepa qué mostrar.
function registrarAsistenciaQr({ id_usuario, id_curso, id_clase, token }) {
  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcion) {
    return { status: 403, body: { error: 'No pertenecés a este curso', codigo: 'sin_permiso' } };
  }

  const claseOriginal = ClaseModel.buscarPorId(id_clase);
  // La clase tiene que existir y ser de este curso (si no, un alumno de un curso
  // podría registrarse en la clase de otro usando su propio id_curso en la URL)
  if (!claseOriginal || String(claseOriginal.id_curso) !== String(id_curso)) {
    return { status: 404, body: { error: 'La clase no existe en este curso', codigo: 'invalido' } };
  }

  const clase = sincronizarEstado(claseOriginal);
  if (clase.estado !== 'abierta') {
    return { status: 400, body: { error: 'La asistencia de esta clase está cerrada', codigo: 'cerrada' } };
  }

  const codigoQr = CodigoQrModel.buscarValidoPorToken(token);
  if (!codigoQr) {
    return { status: 400, body: { error: 'El código QR es inválido o ya venció', codigo: 'vencido' } };
  }

  if (String(codigoQr.id_clase) !== String(id_clase)) {
    return { status: 400, body: { error: 'El código QR no corresponde a esta clase', codigo: 'otra_clase' } };
  }

  // Datos para mostrarle a la persona de qué curso y clase se trata
  const curso = CursoModel.buscarPorId(id_curso);
  const contexto = { id_curso: Number(id_curso), curso: curso.nombre_curso, clase: clase.fecha };

  const yaRegistrado = AsistenciaModel.buscar(id_clase, id_usuario);
  if (yaRegistrado) {
    return {
      status: 409,
      body: { error: 'Ya registraste tu asistencia en esta clase', codigo: 'ya_registrado', ...contexto },
    };
  }

  const asistencia = AsistenciaModel.crear({
    id_clase,
    id_usuario,
    estado: 'presente',
    metodo: 'qr',
    id_codigo_qr: codigoQr.id_qr,
  });

  return {
    status: 201,
    body: { mensaje: 'Asistencia registrada correctamente', asistencia, ...contexto },
  };
}

// Endpoint viejo: el curso y la clase vienen en la URL
function registrarPorQr(req, res) {
  const { id_curso, id_clase } = req.params;
  const { token } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!token) {
    return res.status(400).json({ error: 'token es obligatorio' });
  }

  const resultado = registrarAsistenciaQr({ id_usuario, id_curso, id_clase, token });
  res.status(resultado.status).json(resultado.body);
}

// Endpoint nuevo (QR por enlace): llega solo el token y el servidor deduce
// la clase y el curso a partir de él
function registrarPorToken(req, res) {
  const { token } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token es obligatorio', codigo: 'invalido' });
  }

  const codigoQr = CodigoQrModel.buscarPorToken(token);
  if (!codigoQr) {
    return res.status(400).json({ error: 'El código QR no es válido', codigo: 'invalido' });
  }

  const clase = ClaseModel.buscarPorId(codigoQr.id_clase);
  if (!clase) {
    return res.status(404).json({ error: 'La clase de este código ya no existe', codigo: 'invalido' });
  }

  const resultado = registrarAsistenciaQr({
    id_usuario,
    id_curso: clase.id_curso,
    id_clase: clase.id_clase,
    token,
  });
  res.status(resultado.status).json(resultado.body);
}

function registrarManual(req, res) {
  const { id_curso, id_clase } = req.params;
  const { id_usuario_objetivo, estado } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!id_usuario_objetivo || !estado) {
    return res.status(400).json({ error: 'id_usuario_objetivo y estado son obligatorios' });
  }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  const inscripcionProfesor = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcionProfesor || inscripcionProfesor.rol_en_curso !== 'profesor') {
    return res.status(403).json({ error: 'Solo un profesor del curso puede cargar asistencia manual' });
  }

  const inscripcionAlumno = InscripcionModel.buscar(id_curso, id_usuario_objetivo);
  if (!inscripcionAlumno) {
    return res.status(404).json({ error: 'Ese usuario no pertenece a este curso' });
  }

  const yaRegistrado = AsistenciaModel.buscar(id_clase, id_usuario_objetivo);
  if (yaRegistrado) {
    return res.status(409).json({ error: 'Ese alumno ya tiene asistencia registrada en esta clase' });
  }

  const asistencia = AsistenciaModel.crear({
    id_clase,
    id_usuario: id_usuario_objetivo,
    estado,
    metodo: 'manual',
  });
  res.status(201).json({ mensaje: 'Asistencia cargada manualmente', asistencia });
}

// Corrige el estado de un registro ya cargado (por ejemplo, un "ausente" que en
// realidad fue "justificado"). Solo un profesor del curso, y se puede hacer aunque la
// asistencia de la clase ya esté cerrada: justamente sirve para corregir después.
function editarEstado(req, res) {
  const { id_curso, id_clase, id_asistencia } = req.params;
  const { estado } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcion || inscripcion.rol_en_curso !== 'profesor') {
    return res.status(403).json({ error: 'Solo un profesor del curso puede modificar la asistencia' });
  }

  // La clase tiene que ser de este curso y el registro de esa clase: si no, un profesor
  // podría editar registros de otro curso usando su propio id_curso en la URL
  const clase = ClaseModel.buscarPorId(id_clase);
  if (!clase || String(clase.id_curso) !== String(id_curso)) {
    return res.status(404).json({ error: 'La clase no existe en este curso' });
  }

  const registro = AsistenciaModel.buscarPorId(id_asistencia);
  if (!registro || String(registro.id_clase) !== String(id_clase)) {
    return res.status(404).json({ error: 'El registro de asistencia no existe en esta clase' });
  }

  const asistencia = AsistenciaModel.actualizarEstado(registro.id_asistencia, estado);
  res.json({ mensaje: 'Asistencia actualizada', asistencia });
}

function listarPorClase(req, res) {
  const { id_curso, id_clase } = req.params;
  const id_usuario = req.usuario.id_usuario;

  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcion || inscripcion.rol_en_curso !== 'profesor') {
    return res.status(403).json({ error: 'Solo un profesor del curso puede ver el historial de asistencia' });
  }

  const registros = AsistenciaModel.listarPorClase(id_clase);
  res.json({ registros });
}

// Resumen de asistencia del alumno que hace el pedido, en un curso.
// "Asistió" = presente o tarde. Las justificadas se muestran aparte y NO suman
// como asistencia. Una clase tomada sin registro del alumno cuenta como ausente.
function miAsistenciaEnCurso(req, res) {
  const { id_curso } = req.params;
  const id_usuario = req.usuario.id_usuario;

  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcion || inscripcion.rol_en_curso !== 'alumno') {
    return res.status(403).json({ error: 'Solo un alumno del curso puede ver su asistencia' });
  }

  const registros = AsistenciaModel.listarPorAlumnoEnCurso(id_curso, id_usuario).map(fila => ({
    id_clase: fila.id_clase,
    fecha: fila.fecha,
    estado: fila.estado || 'ausente',
  }));

  res.json({
    resumen: calcularResumen(registros.map(r => r.estado)),
    registros,
  });
}

module.exports = {
  registrarPorQr,
  registrarPorToken,
  registrarManual,
  editarEstado,
  listarPorClase,
  miAsistenciaEnCurso,
};
