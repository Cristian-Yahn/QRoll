const db = require("../config/db");

const CursoModel = {
    listarPorUsuario(id_usuario) {
        return db
            .prepare(
                `
      SELECT Curso.id_curso, Curso.nombre_curso, Inscripcion.rol_en_curso
      FROM Curso
      JOIN Inscripcion ON Inscripcion.id_curso = Curso.id_curso
      WHERE Inscripcion.id_usuario = ?
      ORDER BY Curso.nombre_curso
    `,
            )
            .all(id_usuario);
    },
};

module.exports = CursoModel;
