function fechaSqlite(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function fechaSqliteEnSegundos(segundosDesdeAhora) {
    return fechaSqlite(new Date(Date.now() + segundosDesdeAhora * 1000));
}

module.exports = { fechaSqlite, fechaSqliteEnSegundos };
