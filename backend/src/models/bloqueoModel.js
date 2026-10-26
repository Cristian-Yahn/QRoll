const db = require("../config/db");

const BloqueoModel = {
    // Saca al alumno del curso Y lo bloquea, todo junto: o se hacen las dos
    // cosas o no se hace ninguna (eso es una transacción).
    bloquearAlumno: db.transaction((id_curso, id_usuario) => {
        db.prepare(
            `
      DELETE FROM Inscripcion
      WHERE id_curso = ? AND id_usuario = ? AND rol_en_curso = 'alumno'
    `,
        ).run(id_curso, id_usuario);

        db.prepare(
            `
      INSERT OR IGNORE INTO Bloqueo (id_curso, id_usuario) VALUES (?, ?)
    `,
        ).run(id_curso, id_usuario);
    }),

    desbloquear(id_curso, id_usuario) {
        const info = db.prepare("DELETE FROM Bloqueo WHERE id_curso = ? AND id_usuario = ?").run(id_curso, id_usuario);
        return info.changes > 0;
    },

    estaBloqueado(id_curso, id_usuario) {
        const fila = db
            .prepare("SELECT 1 FROM Bloqueo WHERE id_curso = ? AND id_usuario = ?")
            .get(id_curso, id_usuario);
        return Boolean(fila);
    },

    listarPorCurso(id_curso) {
        return db
            .prepare(
                `
      SELECT Usuario.id_usuario, Usuario.nombre, Usuario.apellido, Usuario.email, Bloqueo.fecha_bloqueo
      FROM Bloqueo
      JOIN Usuario ON Usuario.id_usuario = Bloqueo.id_usuario
      WHERE Bloqueo.id_curso = ?
      ORDER BY Usuario.apellido, Usuario.nombre
    `,
            )
            .all(id_curso);
    },
};

module.exports = BloqueoModel;
