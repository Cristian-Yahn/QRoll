const db = require("../config/db");

const CodigoQrModel = {
    crear({ id_clase, token, fecha_expiracion }) {
        const stmt = db.prepare(`
      INSERT INTO Codigo_QR (id_clase, token, fecha_expiracion)
      VALUES (?, ?, ?)
    `);
        const info = stmt.run(id_clase, token, fecha_expiracion);
        return this.buscarPorId(info.lastInsertRowid);
    },

    buscarPorId(id_qr) {
        return db.prepare("SELECT * FROM Codigo_QR WHERE id_qr = ?").get(id_qr);
    },

    // Busca el token sin importar si venció (sirve para saber a qué clase pertenece
    // y poder distinguir "vencido" de "no existe")
    buscarPorToken(token) {
        return db.prepare("SELECT * FROM Codigo_QR WHERE token = ?").get(token);
    },

    buscarValidoPorToken(token) {
        return db
            .prepare(
                `
      SELECT * FROM Codigo_QR
      WHERE token = ? AND usado = 0 AND fecha_expiracion > CURRENT_TIMESTAMP
    `,
            )
            .get(token);
    },
};

module.exports = CodigoQrModel;
