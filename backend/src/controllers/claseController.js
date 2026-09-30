const ClaseModel = require("../models/claseModel");
const InscripcionModel = require("../models/inscripcionModel");

function crear(req, res) {
    const { id_curso } = req.params;
    const { fecha, id_usuario } = req.body;

    if (!fecha || !id_usuario) {
        return res.status(400).json({ error: "fecha e id_usuario son obligatorios" });
    }

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion || inscripcion.rol_en_curso !== "profesor") {
        return res.status(403).json({ error: "Solo un profesor del curso puede crear clases" });
    }

    const clase = ClaseModel.crear({ id_curso, fecha });
    res.status(201).json({ mensaje: "Clase creada correctamente", clase });
}

function listar(req, res) {
    const { id_curso } = req.params;
    const { id_usuario } = req.query;

    if (!id_usuario) {
        return res.status(400).json({ error: "id_usuario es obligatorio" });
    }

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion) {
        return res.status(403).json({ error: "No pertenecés a este curso" });
    }

    const clases = ClaseModel.listarPorCurso(id_curso);
    res.json({ clases });
}

module.exports = { crear, listar };
