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

module.exports = { fechaSqlite, fechaSqliteEnSegundos, haVencido };
