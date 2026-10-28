// Zona horaria de la institución. Sirve para saber qué día es "hoy" aunque el
// servidor corra en otra hora (muchos hostings usan UTC). Se puede cambiar con
// ZONA_HORARIA en el .env.
const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Argentina/Buenos_Aires';

function fechaSqlite(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function fechaSqliteEnSegundos(segundosDesdeAhora) {
  return fechaSqlite(new Date(Date.now() + segundosDesdeAhora * 1000));
}

function haVencido(fechaSqliteDesde, horas) {
  if (!fechaSqliteDesde) return false;
  const inicio = new Date(fechaSqliteDesde.replace(' ', 'T') + 'Z');
  const limite = new Date(inicio.getTime() + horas * 60 * 60 * 1000);
  return new Date() > limite;
}

// Fecha de hoy como "AAAA-MM-DD" en la zona horaria de la institución.
// (El idioma "en-CA" se usa solo porque da ese formato exacto.)
function hoyEnZona() {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
}

// Comprueba que sea "AAAA-MM-DD" Y una fecha que existe (el 2026-02-31 no)
function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
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
