const ClaseModel = require("../models/claseModel");
const { haVencido } = require("./fechas");

const DURACION_APERTURA_HORAS = 3;

function sincronizarEstado(clase) {
    if (clase.estado === "abierta" && haVencido(clase.fecha_apertura, DURACION_APERTURA_HORAS)) {
        return ClaseModel.cerrar(clase.id_clase);
    }
    return clase;
}

module.exports = { sincronizarEstado, DURACION_APERTURA_HORAS };
