const crypto = require("crypto");
const CodigoQrModel = require("../models/codigoQrModel");
const ClaseModel = require("../models/claseModel");
const InscripcionModel = require("../models/inscripcionModel");
const { fechaSqliteEnSegundos } = require("../utils/fechas");
const { sincronizarEstado } = require("../utils/estadoClase");

const DURACION_QR_SEGUNDOS = 20;

function generar(req, res) {
    const { id_curso, id_clase } = req.params;
    const { id_usuario } = req.body;

    if (!id_usuario) {
        return res.status(400).json({ error: "id_usuario es obligatorio" });
    }

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion || inscripcion.rol_en_curso !== "profesor") {
        return res.status(403).json({ error: "Solo un profesor del curso puede generar el QR" });
    }

    const claseOriginal = ClaseModel.buscarPorId(id_clase);
    if (!claseOriginal || String(claseOriginal.id_curso) !== String(id_curso)) {
        return res.status(404).json({ error: "La clase no existe en este curso" });
    }

    const clase = sincronizarEstado(claseOriginal);
    if (clase.estado !== "abierta") {
        return res.status(400).json({ error: "La asistencia de esta clase está cerrada" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const fecha_expiracion = fechaSqliteEnSegundos(DURACION_QR_SEGUNDOS);
    const codigoQr = CodigoQrModel.crear({ id_clase, token, fecha_expiracion });

    res.status(201).json({
        token: codigoQr.token,
        expira_en_segundos: DURACION_QR_SEGUNDOS,
    });
}

module.exports = { generar };
