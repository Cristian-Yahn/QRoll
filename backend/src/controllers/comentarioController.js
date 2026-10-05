const ComentarioModel = require("../models/comentarioModel");
const PublicacionModel = require("../models/publicacionModel");
const InscripcionModel = require("../models/inscripcionModel");

function crear(req, res) {
    const { id_curso, id_publicacion } = req.params;
    const { contenido, id_usuario } = req.body;

    if (!contenido || !id_usuario) {
        return res.status(400).json({ error: "contenido e id_usuario son obligatorios" });
    }

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion) {
        return res.status(403).json({ error: "No pertenecés a este curso" });
    }

    const publicacion = PublicacionModel.buscarPorId(id_publicacion);
    if (!publicacion || String(publicacion.id_curso) !== String(id_curso)) {
        return res.status(404).json({ error: "La publicación no existe en este curso" });
    }

    const comentario = ComentarioModel.crear({ id_publicacion, id_usuario, contenido });
    res.status(201).json({ mensaje: "Comentario agregado", comentario });
}

module.exports = { crear };
