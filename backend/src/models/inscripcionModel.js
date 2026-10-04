const db = require("../config/db");

const InscripcionModel = {
    crear({ id_curso, id_usuario, rol_en_curso }) {
        const stmt = db.prepare(`
      INSERT INTO Inscripcion (id_curso, id_usuario, rol_en_curso)
      VALUES (?, ?, ?)
    `);
        const info = stmt.run(id_curso, id_usuario, rol_en_curso);
        return info.lastInsertRowid;
    },

    buscar(id_curso, id_usuario) {
        return db
            .prepare(
                `
      SELECT * FROM Inscripcion WHERE id_curso = ? AND id_usuario = ?
    `,
            )
            .get(id_curso, id_usuario);
    },

    contarAlumnos(id_curso) {
        const fila = db
            .prepare(
                `
      SELECT COUNT(*) AS total FROM Inscripcion
      WHERE id_curso = ? AND rol_en_curso = 'alumno'
    `,
            )
            .get(id_curso);
        return fila.total;
    },

    listarAlumnos(id_curso) {
        return db
            .prepare(
                `
    SELECT Usuario.id_usuario, Usuario.nombre, Usuario.apellido
    FROM Inscripcion
    JOIN Usuario ON Usuario.id_usuario = Inscripcion.id_usuario
    WHERE Inscripcion.id_curso = ? AND Inscripcion.rol_en_curso = 'alumno'
    ORDER BY Usuario.apellido, Usuario.nombre
  `,
            )
            .all(id_curso);
    },
};

module.exports = InscripcionModel;
