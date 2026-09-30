const db = require("../config/db");
const crypto = require("crypto");

function generarCodigoAcceso() {
    // Código corto y legible, tipo "A3F9K2": 6 caracteres, mayúsculas + números
    return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

const CursoModel = {
    crear({ nombre_curso, id_creador }) {
        let codigo_acceso;
        let intentos = 0;

        do {
            codigo_acceso = generarCodigoAcceso();
            intentos++;
        } while (this.buscarPorCodigoAcceso(codigo_acceso) && intentos < 5);

        const stmt = db.prepare(`
      INSERT INTO Curso (nombre_curso, id_creador, codigo_acceso)
      VALUES (?, ?, ?)
    `);
        const info = stmt.run(nombre_curso, id_creador, codigo_acceso);
        return this.buscarPorId(info.lastInsertRowid);
    },

    buscarPorId(id_curso) {
        return db.prepare("SELECT * FROM Curso WHERE id_curso = ?").get(id_curso);
    },

    buscarPorCodigoAcceso(codigo_acceso) {
        return db.prepare("SELECT * FROM Curso WHERE codigo_acceso = ?").get(codigo_acceso);
    },

    listarPorUsuario(id_usuario) {
        return db
            .prepare(
                `
      SELECT Curso.*, Inscripcion.rol_en_curso
      FROM Curso
      JOIN Inscripcion ON Inscripcion.id_curso = Curso.id_curso
      WHERE Inscripcion.id_usuario = ?
      ORDER BY Curso.id_curso DESC
    `,
            )
            .all(id_usuario);
    },
};

module.exports = CursoModel;
