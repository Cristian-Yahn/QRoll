const db = require("../config/db");

const UsuarioModel = {
    crear({ nombre, apellido, email, contrasena_hash }) {
        const stmt = db.prepare(`
      INSERT INTO Usuario (nombre, apellido, email, contrasena_hash)
      VALUES (?, ?, ?, ?)
    `);
        const info = stmt.run(nombre, apellido, email, contrasena_hash);
        return info.lastInsertRowid;
    },

    buscarPorEmail(email) {
        return db.prepare("SELECT * FROM Usuario WHERE email = ?").get(email);
    },
};

module.exports = UsuarioModel;
