const CursoModel = require('../models/cursoModel');
const InscripcionModel = require('../models/inscripcionModel');
const { armarResumenCurso } = require('../utils/resumenAsistencia');
const { construirExcelAsistencia } = require('../utils/excelAsistencia');
const { ZONA_HORARIA, hoyEnZona } = require('../utils/fechas');

function esProfesorDelCurso(id_curso, id_usuario) {
  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  return Boolean(inscripcion) && inscripcion.rol_en_curso === 'profesor';
}

// Texto seguro para usar en el nombre de un archivo: sin tildes, espacios ni símbolos
function paraNombreDeArchivo(texto) {
  const limpio = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return limpio || 'curso';
}

// Resumen de asistencia de cada alumno (para la pantalla de seguimiento del profesor)
function resumenAlumnos(req, res) {
  const { id_curso } = req.params;
  const id_usuario = req.usuario.id_usuario;

  if (!esProfesorDelCurso(id_curso, id_usuario)) {
    return res.status(403).json({ error: 'Solo un profesor del curso puede ver el seguimiento' });
  }

  const { clases, alumnos } = armarResumenCurso(id_curso);

  // "estados" (el detalle clase por clase) solo hace falta para el Excel
  const resumen = alumnos.map(({ estados, ...resto }) => resto);

  res.json({ clases_totales: clases.length, alumnos: resumen });
}

// Descarga del cuadro de asistencia del curso como archivo .xlsx
async function exportarExcel(req, res) {
  const { id_curso } = req.params;
  const id_usuario = req.usuario.id_usuario;

  if (!esProfesorDelCurso(id_curso, id_usuario)) {
    return res.status(403).json({ error: 'Solo un profesor del curso puede exportar la asistencia' });
  }

  const curso = CursoModel.buscarPorId(id_curso);
  if (!curso) return res.status(404).json({ error: 'El curso no existe' });

  const { clases, alumnos } = armarResumenCurso(id_curso);
  const generado = new Date().toLocaleString('es-AR', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const libro = construirExcelAsistencia({ curso, clases, alumnos, generado });
  const nombreArchivo = `asistencia-${paraNombreDeArchivo(curso.nombre_curso)}-${hoyEnZona()}.xlsx`;

  // Estas dos cabeceras hacen que el navegador DESCARGUE el archivo en vez de mostrarlo
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

  await libro.xlsx.write(res);
  res.end();
}

module.exports = { resumenAlumnos, exportarExcel };
