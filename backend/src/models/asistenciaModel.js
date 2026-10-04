const db = require("../config/db");

const AsistenciaModel = {
    crear({ id_clase, id_usuario, estado, metodo, id_codigo_qr = null }) {
        const stmt = db.prepare(`
      INSERT INTO Asistencia (id_clase, id_usuario, estado, metodo, id_codigo_qr)
      VALUES (?, ?, ?, ?, ?)
    `);
        const info = stmt.run(id_clase, id_usuario, estado, metodo, id_codigo_qr);
        return this.buscarPorId(info.lastInsertRowid);
    },

    buscarPorId(id_asistencia) {
        return db.prepare("SELECT * FROM Asistencia WHERE id_asistencia = ?").get(id_asistencia);
    },

    buscar(id_clase, id_usuario) {
        return db.prepare("SELECT * FROM Asistencia WHERE id_clase = ? AND id_usuario = ?").get(id_clase, id_usuario);
    },

    listarPorClase(id_clase) {
        return db
            .prepare(
                `
      SELECT Asistencia.*, Usuario.nombre, Usuario.apellido
      FROM Asistencia
      JOIN Usuario ON Usuario.id_usuario = Asistencia.id_usuario
      WHERE id_clase = ?
      ORDER BY fecha_hora_registro ASC
    `,
            )
            .all(id_clase);
    },
};

module.exports = AsistenciaModel;
