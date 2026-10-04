const ClaseModel = require("../models/claseModel");
const InscripcionModel = require("../models/inscripcionModel");
const { sincronizarEstado } = require("../utils/estadoClase");

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

    const clases = ClaseModel.listarPorCurso(id_curso).map(sincronizarEstado);
    res.json({ clases });
}

function verificarProfesorDeClase(id_curso, id_clase, id_usuario) {
    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion || inscripcion.rol_en_curso !== "profesor") {
        return { error: 403, mensaje: "Solo un profesor del curso puede hacer esto" };
    }
    const clase = ClaseModel.buscarPorId(id_clase);
    if (!clase || String(clase.id_curso) !== String(id_curso)) {
        return { error: 404, mensaje: "La clase no existe en este curso" };
    }
    return { clase };
}

function abrir(req, res) {
    const { id_curso, id_clase } = req.params;
    const { id_usuario } = req.body;
    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const resultado = verificarProfesorDeClase(id_curso, id_clase, id_usuario);
    if (resultado.error) return res.status(resultado.error).json({ error: resultado.mensaje });

    const clase = ClaseModel.abrir(id_clase);
    res.json({ mensaje: "Asistencia abierta", clase });
}

function cerrar(req, res) {
    const { id_curso, id_clase } = req.params;
    const { id_usuario } = req.body;
    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const resultado = verificarProfesorDeClase(id_curso, id_clase, id_usuario);
    if (resultado.error) return res.status(resultado.error).json({ error: resultado.mensaje });

    const clase = ClaseModel.cerrar(id_clase);
    res.json({ mensaje: "Asistencia cerrada", clase });
}

module.exports = { crear, listar, abrir, cerrar };
