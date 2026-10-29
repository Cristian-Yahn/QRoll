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

if (!columnaExiste("Usuario", "token_seguridad_tipo")) {
    db.exec(`ALTER TABLE Usuario ADD COLUMN token_seguridad_tipo TEXT`);
}
if (!columnaExiste("Usuario", "estado_cuenta")) {
    db.exec(`ALTER TABLE Usuario ADD COLUMN estado_cuenta TEXT NOT NULL DEFAULT 'normal'`);
}
if (!columnaExiste("Usuario", "sesiones_validas_desde")) {
    db.exec(`ALTER TABLE Usuario ADD COLUMN sesiones_validas_desde DATETIME`);
}

const sqlAsistencia = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'Asistencia'")
    .get().sql;
if (!sqlAsistencia.includes("'automatico'")) {
    console.log("Migrando la tabla Asistencia (se agrega el método 'automatico')...");

    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(db.name, `${db.name}.antes-de-migrar-asistencia.bak`);

    db.pragma("foreign_keys = OFF");
    try {
        db.transaction(() => {
            db.exec(`
                CREATE TABLE Asistencia_nueva (
                    id_asistencia INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_clase INTEGER NOT NULL,
                    id_usuario INTEGER NOT NULL,
                    estado TEXT NOT NULL CHECK (estado IN ('presente', 'ausente', 'tarde', 'justificado')),
                    metodo TEXT NOT NULL CHECK (metodo IN ('qr', 'manual', 'automatico')),
                    fecha_hora_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                    id_codigo_qr INTEGER,
                    FOREIGN KEY (id_clase) REFERENCES Clase(id_clase),
                    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
                    FOREIGN KEY (id_codigo_qr) REFERENCES Codigo_QR(id_qr)
                );
                INSERT INTO Asistencia_nueva
                    (id_asistencia, id_clase, id_usuario, estado, metodo, fecha_hora_registro, id_codigo_qr)
                SELECT id_asistencia, id_clase, id_usuario, estado, metodo, fecha_hora_registro, id_codigo_qr
                FROM Asistencia;
                DROP TABLE Asistencia;
                ALTER TABLE Asistencia_nueva RENAME TO Asistencia;
            `);

            const problemas = db.pragma("foreign_key_check");
            if (problemas.length > 0) {
                throw new Error(`La migración dejó ${problemas.length} referencia(s) rota(s)`);
            }
        })();
    } finally {
        db.pragma("foreign_keys = ON");
    }
    console.log("Tabla Asistencia migrada (copia de seguridad: *.antes-de-migrar-asistencia.bak)");
}

console.log("Base de datos lista");
