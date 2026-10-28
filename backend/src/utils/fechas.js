const ZONA_HORARIA = process.env.ZONA_HORARIA || "America/Argentina/Buenos_Aires";

function fechaSqlite(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function fechaSqliteEnSegundos(segundosDesdeAhora) {
    return fechaSqlite(new Date(Date.now() + segundosDesdeAhora * 1000));
}

function haVencido(fechaSqliteDesde, horas) {
    if (!fechaSqliteDesde) return false;
    const inicio = new Date(fechaSqliteDesde.replace(" ", "T") + "Z");
    const limite = new Date(inicio.getTime() + horas * 60 * 60 * 1000);
    return new Date() > limite;
}

function hoyEnZona() {
    return new Date().toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
}

function esFechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const date = new Date(`${fecha}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === fecha;
}

module.exports = {
    ZONA_HORARIA,
    fechaSqlite,
    fechaSqliteEnSegundos,
    haVencido,
    hoyEnZona,
    esFechaValida,
};
