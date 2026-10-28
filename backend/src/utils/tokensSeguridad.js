const crypto = require('crypto');

// Token aleatorio de 256 bits: es lo que viaja en el enlace del correo
function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}

// En la base se guarda solo el HASH del token (SHA-256), nunca el token en sí.
// Así, si alguien viera la base de datos, no podría armar enlaces válidos.
// (Acá alcanza con SHA-256 y no hace falta bcrypt: el token ya es aleatorio y
// larguísimo, no se puede adivinar por fuerza bruta como una contraseña.)
function hashearToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generarToken, hashearToken };
