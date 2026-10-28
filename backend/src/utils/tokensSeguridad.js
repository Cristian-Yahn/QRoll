const crypto = require("crypto");

// Token aleatorio de 256 bits para el enlace del correo
function generarToken() {
    return crypto.randomBytes(32).toString("hex");
}

// En la base se guarda solo el HASH del token
function hashearToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = { generarToken, hashearToken };
