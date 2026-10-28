const AsistenciaModel = require("../models/asistenciaModel");
const InscripcionModel = require("../models/inscripcionModel");

function calcularResumen(estados) {
    const contar = estado => estados.filter(e => e === estado).length;

    const clases_totales = estados.length;
    const presentes = contar("presente");
    const tardes = contar("tarde");
    const justificadas = contar("justificado");
    const ausentes = contar("ausente");
    const asistidas = presentes + tardes;
    const porcentaje = clases_totales === 0 ? null : Math.round((asistidas / clases_totales) * 100);

    return { clases_totales, asistidas, presentes, tardes, justificadas, ausentes, porcentaje };
}

function armarResumenCurso(id_curso) {
    const clases = AsistenciaModel.listarClasesTomadas(id_curso);
    const registros = AsistenciaModel.listarRegistrosDeCurso(id_curso);
    const alumnos = InscripcionModel.listarAlumnos(id_curso);

    // el Map permite buscar "este alumno en esta clase" sin recorrer toda la lista
    const estadoPor = new Map();
    registros.forEach(r => estadoPor.set(`${r.id_usuario}:${r.id_clase}`, r.estado));

    const filas = alumnos.map(alumno => {
        const estados = clases.map(clase => estadoPor.get(`${alumno.id_usuario}:${clase.id_clase}`) || "ausente");
        return { ...alumno, estados, ...calcularResumen(estados) };
    });

    return { clases, alumnos: filas };
}

module.exports = { calcularResumen, armarResumenCurso };
