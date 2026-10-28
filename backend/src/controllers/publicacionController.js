const PublicacionModel = require('../models/publicacionModel');
const ComentarioModel = require('../models/comentarioModel');
const InscripcionModel = require('../models/inscripcionModel');

function crear(req, res) {
  const { id_curso } = req.params;
  const { contenido, enlace } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!contenido) {
    return res.status(400).json({ error: 'contenido es obligatorio' });
  }

  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcion || inscripcion.rol_en_curso !== 'profesor') {
    return res.status(403).json({ error: 'Solo un profesor del curso puede publicar en el tablón' });
  }

  const publicacion = PublicacionModel.crear({ id_curso, id_usuario, contenido, enlace });
  res.status(201).json({ mensaje: 'Publicación creada', publicacion });
}

function listar(req, res) {
  const { id_curso } = req.params;
  const id_usuario = req.usuario.id_usuario;

  const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
  if (!inscripcion) return res.status(403).json({ error: 'No pertenecés a este curso' });

  const publicaciones = PublicacionModel.listarPorCurso(id_curso).map(publicacion => ({
    ...publicacion,
    comentarios: ComentarioModel.listarPorPublicacion(publicacion.id_publicacion),
  }));

  res.json({ publicaciones });
}

module.exports = { crear, listar };
