const db = require("../config/db");

const ComentarioModel = {
    crear({ id_publicacion, id_usuario, contenido }) {
        const stmt = db.prepare(`
      INSERT INTO Comentario (id_publicacion, id_usuario, contenido)
      VALUES (?, ?, ?)
    `);
        const info = stmt.run(id_publicacion, id_usuario, contenido);
        return this.buscarPorId(info.lastInsertRowid);
    },

    buscarPorId(id_comentario) {
        return db.prepare("SELECT * FROM Comentario WHERE id_comentario = ?").get(id_comentario);
    },

    listarPorPublicacion(id_publicacion) {
        return db
            .prepare(
                `
      SELECT Comentario.*, Usuario.nombre, Usuario.apellido
      FROM Comentario
      JOIN Usuario ON Usuario.id_usuario = Comentario.id_usuario
      WHERE id_publicacion = ?
      ORDER BY fecha_comentario ASC
    `,
            )
            .all(id_publicacion);
    },
};

module.exports = ComentarioModel;
