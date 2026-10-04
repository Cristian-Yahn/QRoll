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
        db.prepare(`UPDATE Clase SET estado = 'abierta', fecha_apertura = CURRENT_TIMESTAMP WHERE id_clase = ?`).run(
            id_clase,
        );
        return this.buscarPorId(id_clase);
    },

    cerrar(id_clase) {
        db.prepare(`UPDATE Clase SET estado = 'cerrada' WHERE id_clase = ?`).run(id_clase);
        return this.buscarPorId(id_clase);
    },
};

module.exports = ClaseModel;
