const db = require("../config/db");

const ClaseModel = {
    crear({ id_curso, fecha }) {
        const stmt = db.prepare("INSERT INTO Clase (id_curso, fecha) VALUES (?, ?)");
        const info = stmt.run(id_curso, fecha);
        return this.buscarPorId(info.lastInsertRowid);
    },

    buscarPorId(id_clase) {
        return db.prepare("SELECT * FROM Clase WHERE id_clase = ?").get(id_clase);
    },

    listarPorCurso(id_curso) {
        return db.prepare("SELECT * FROM Clase WHERE id_curso = ? ORDER BY fecha DESC").all(id_curso);
    },

    abrir(id_clase) {
        db.transaction(() => {
            db.prepare(
                `UPDATE Clase SET estado = 'abierta', fecha_apertura = CURRENT_TIMESTAMP WHERE id_clase = ?`,
            ).run(id_clase);
            db.prepare(`DELETE FROM Asistencia WHERE id_clase = ? AND metodo = 'automatico'`).run(id_clase);
        })();
        return this.buscarPorId(id_clase);
    },

    cerrar(id_clase) {
        db.transaction(() => {
            const cierre = db
                .prepare(`UPDATE Clase SET estado = 'cerrada' WHERE id_clase = ? AND estado = 'abierta'`)
                .run(id_clase);

            if (cierre.changes === 1) {
                db.prepare(
                    `
                    INSERT INTO Asistencia (id_clase, id_usuario, estado, metodo)
                    SELECT Clase.id_clase, Inscripcion.id_usuario, 'ausente', 'automatico'
                    FROM Clase
                    JOIN Inscripcion
                      ON Inscripcion.id_curso = Clase.id_curso AND Inscripcion.rol_en_curso = 'alumno'
                    WHERE Clase.id_clase = ?
                      AND NOT EXISTS (
                        SELECT 1 FROM Asistencia a
                        WHERE a.id_clase = Clase.id_clase AND a.id_usuario = Inscripcion.id_usuario
                      )
                `,
                ).run(id_clase);
            }
        })();
        return this.buscarPorId(id_clase);
    },
};

module.exports = ClaseModel;
