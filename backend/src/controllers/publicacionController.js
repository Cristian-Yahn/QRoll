const PublicacionModel = require("../models/publicacionModel");
const ComentarioModel = require("../models/comentarioModel");
const InscripcionModel = require("../models/inscripcionModel");

function crear(req, res) {
    const { id_curso } = req.params;
    const { contenido, enlace, id_usuario } = req.body;

    if (!contenido || !id_usuario) {
        return res.status(400).json({ error: "contenido e id_usuario son obligatorios" });
    }

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion || inscripcion.rol_en_curso !== "profesor") {
        return res.status(403).json({ error: "Solo un profesor del curso puede publicar en el tablón" });
    }

    const publicacion = PublicacionModel.crear({ id_curso, id_usuario, contenido, enlace });
    res.status(201).json({ mensaje: "Publicación creada", publicacion });
}

function listar(req, res) {
    const { id_curso } = req.params;
    const { id_usuario } = req.query;

    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion) return res.status(403).json({ error: "No pertenecés a este curso" });

    const publicaciones = PublicacionModel.listarPorCurso(id_curso).map(publicacion => ({
        ...publicacion,
        comentarios: ComentarioModel.listarPorPublicacion(publicacion.id_publicacion),
    }));

    res.json({ publicaciones });
}

module.exports = { crear, listar };
