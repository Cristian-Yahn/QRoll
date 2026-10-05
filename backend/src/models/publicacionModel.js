const db = require("../config/db");

const PublicacionModel = {
    crear({ id_curso, id_usuario, contenido, enlace }) {
        const stmt = db.prepare(`
      INSERT INTO Publicacion (id_curso, id_usuario, contenido, enlace)
      VALUES (?, ?, ?, ?)
    `);
        const info = stmt.run(id_curso, id_usuario, contenido, enlace || null);
        return this.buscarPorId(info.lastInsertRowid);
    },

    buscarPorId(id_publicacion) {
        return db.prepare("SELECT * FROM Publicacion WHERE id_publicacion = ?").get(id_publicacion);
    },

    listarPorCurso(id_curso) {
        return db
            .prepare(
                `
      SELECT Publicacion.*, Usuario.nombre, Usuario.apellido
      FROM Publicacion
      JOIN Usuario ON Usuario.id_usuario = Publicacion.id_usuario
      WHERE id_curso = ?
      ORDER BY fecha_publicacion DESC
    `,
            )
            .all(id_curso);
    },
};

module.exports = PublicacionModel;
