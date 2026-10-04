const CodigoQrModel = require("../models/codigoQrModel");
const AsistenciaModel = require("../models/asistenciaModel");
const InscripcionModel = require("../models/inscripcionModel");
const ClaseModel = require("../models/claseModel");
const { sincronizarEstado } = require("../utils/estadoClase");

function registrarPorQr(req, res) {
    const { id_curso, id_clase } = req.params;
    const { token, id_usuario } = req.body;

    if (!token || !id_usuario) {
        return res.status(400).json({ error: "token e id_usuario son obligatorios" });
    }

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion) {
        return res.status(403).json({ error: "No pertenecés a este curso" });
    }

    const claseOriginal = ClaseModel.buscarPorId(id_clase);
    const clase = claseOriginal ? sincronizarEstado(claseOriginal) : null;
    if (!clase || clase.estado !== "abierta") {
        return res.status(400).json({ error: "La asistencia de esta clase está cerrada" });
    }

    const codigoQr = CodigoQrModel.buscarValidoPorToken(token);
    if (!codigoQr) {
        return res.status(400).json({ error: "El código QR es inválido o ya venció" });
    }

    if (String(codigoQr.id_clase) !== String(id_clase)) {
        return res.status(400).json({ error: "El código QR no corresponde a esta clase" });
    }

    const yaRegistrado = AsistenciaModel.buscar(id_clase, id_usuario);
    if (yaRegistrado) {
        return res.status(409).json({ error: "Ya registraste tu asistencia en esta clase" });
    }

    const asistencia = AsistenciaModel.crear({
        id_clase,
        id_usuario,
        estado: "presente",
        metodo: "qr",
        id_codigo_qr: codigoQr.id_qr,
    });

    res.status(201).json({ mensaje: "Asistencia registrada correctamente", asistencia });
}

function registrarManual(req, res) {
    const { id_curso, id_clase } = req.params;
    const { id_usuario_objetivo, estado, id_usuario } = req.body;

    if (!id_usuario_objetivo || !estado || !id_usuario) {
        return res.status(400).json({ error: "id_usuario_objetivo, estado e id_usuario son obligatorios" });
    }

    const ESTADOS_VALIDOS = ["presente", "ausente", "tarde", "justificado"];
    if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
    }

    const inscripcionProfesor = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcionProfesor || inscripcionProfesor.rol_en_curso !== "profesor") {
        return res.status(403).json({ error: "Solo un profesor del curso puede cargar asistencia manual" });
    }

    const inscripcionAlumno = InscripcionModel.buscar(id_curso, id_usuario_objetivo);
    if (!inscripcionAlumno) {
        return res.status(404).json({ error: "Ese usuario no pertenece a este curso" });
    }

    const yaRegistrado = AsistenciaModel.buscar(id_clase, id_usuario_objetivo);
    if (yaRegistrado) {
        return res.status(409).json({ error: "Ese alumno ya tiene asistencia registrada en esta clase" });
    }

    const asistencia = AsistenciaModel.crear({ id_clase, id_usuario: id_usuario_objetivo, estado, metodo: "manual" });
    res.status(201).json({ mensaje: "Asistencia cargada manualmente", asistencia });
}

function listarPorClase(req, res) {
    const { id_clase } = req.params;
    const { id_usuario } = req.query;
    const { id_curso } = req.params;

    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion || inscripcion.rol_en_curso !== "profesor") {
        return res.status(403).json({ error: "Solo un profesor del curso puede ver el historial de asistencia" });
    }

    const registros = AsistenciaModel.listarPorClase(id_clase);
    res.json({ registros });
}

module.exports = { registrarPorQr, registrarManual, listarPorClase };
