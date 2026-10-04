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

console.log("Base de datos lista");
