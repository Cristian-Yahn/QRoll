const fs = require("fs");
const path = require("path");
const db = require("./db");

const rutaSchema = path.resolve(__dirname, "../../database/schema.sql");
const schema = fs.readFileSync(rutaSchema, "utf-8");
db.exec(schema);

function columnaExiste(tabla, columna) {
    const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all();
    return columnas.some(c => c.name === columna);
}

if (!columnaExiste("Clase", "estado")) {
    db.exec(`ALTER TABLE Clase ADD COLUMN estado TEXT NOT NULL DEFAULT 'cerrada'`);
}
if (!columnaExiste("Clase", "fecha_apertura")) {
    db.exec(`ALTER TABLE Clase ADD COLUMN fecha_apertura DATETIME`);
}

// Seguridad de la cuenta (límite de intentos y recuperación de contraseña).
// CREATE TABLE IF NOT EXISTS no agrega columnas a una tabla que ya existe,
// por eso se agregan acá si faltan.
if (!columnaExiste("Usuario", "token_seguridad_tipo")) {
    db.exec(`ALTER TABLE Usuario ADD COLUMN token_seguridad_tipo TEXT`);
}
if (!columnaExiste("Usuario", "estado_cuenta")) {
    db.exec(`ALTER TABLE Usuario ADD COLUMN estado_cuenta TEXT NOT NULL DEFAULT 'normal'`);
}
if (!columnaExiste("Usuario", "sesiones_validas_desde")) {
    db.exec(`ALTER TABLE Usuario ADD COLUMN sesiones_validas_desde DATETIME`);
}

console.log("Base de datos lista");
