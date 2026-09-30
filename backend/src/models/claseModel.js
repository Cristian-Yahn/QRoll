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
};

module.exports = ClaseModel;
