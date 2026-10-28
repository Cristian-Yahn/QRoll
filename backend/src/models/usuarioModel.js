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

    buscarPorId(id_usuario) {
        return db.prepare("SELECT * FROM Usuario WHERE id_usuario = ?").get(id_usuario);
    },

    registrarIntentoFallido(id_usuario, ventanaMinutos) {
        db.prepare(
            `
      UPDATE Usuario
      SET intentos_fallidos = CASE
            WHEN fecha_ultimo_intento_fallido IS NULL
              OR fecha_ultimo_intento_fallido < datetime('now', ?)
            THEN 1
            ELSE COALESCE(intentos_fallidos, 0) + 1
          END,
          fecha_ultimo_intento_fallido = CURRENT_TIMESTAMP
      WHERE id_usuario = ?
    `,
        ).run(`-${ventanaMinutos} minutes`, id_usuario);

        return db.prepare("SELECT intentos_fallidos FROM Usuario WHERE id_usuario = ?").get(id_usuario)
            .intentos_fallidos;
    },

    limpiarIntentos(id_usuario) {
        db.prepare(
            `
      UPDATE Usuario SET intentos_fallidos = 0, fecha_ultimo_intento_fallido = NULL
      WHERE id_usuario = ?
    `,
        ).run(id_usuario);
    },

    marcarEnVerificacion(id_usuario) {
        const info = db
            .prepare(
                `
      UPDATE Usuario SET estado_cuenta = 'verificacion'
      WHERE id_usuario = ? AND estado_cuenta = 'normal'
    `,
            )
            .run(id_usuario);
        return info.changes === 1;
    },

    levantarVerificacion(id_usuario) {
        db.prepare(
            `
      UPDATE Usuario
      SET estado_cuenta = 'normal',
          intentos_fallidos = 0,
          fecha_ultimo_intento_fallido = NULL,
          token_seguridad = NULL,
          token_seguridad_tipo = NULL,
          token_seguridad_expiracion = NULL
      WHERE id_usuario = ?
    `,
        ).run(id_usuario);
    },

    bloquearCuenta(id_usuario) {
        db.prepare(`UPDATE Usuario SET estado_cuenta = 'bloqueada' WHERE id_usuario = ?`).run(id_usuario);
    },

    guardarTokenSeguridad(id_usuario, tokenHash, tipo, fecha_expiracion) {
        db.prepare(
            `
      UPDATE Usuario
      SET token_seguridad = ?, token_seguridad_tipo = ?, token_seguridad_expiracion = ?
      WHERE id_usuario = ?
    `,
        ).run(tokenHash, tipo, fecha_expiracion, id_usuario);
    },

    buscarPorTokenSeguridad(tokenHash, tipo) {
        return db
            .prepare(
                `
      SELECT * FROM Usuario
      WHERE token_seguridad = ?
        AND token_seguridad_tipo = ?
        AND token_seguridad_expiracion > CURRENT_TIMESTAMP
    `,
            )
            .get(tokenHash, tipo);
    },

    emitioTokenRecientemente(id_usuario, tipo, duracionSeg, enfriamientoSeg) {
        const fila = db
            .prepare(
                `
      SELECT 1 AS reciente FROM Usuario
      WHERE id_usuario = ?
        AND token_seguridad_tipo = ?
        AND token_seguridad_expiracion > datetime('now', ?)
    `,
            )
            .get(id_usuario, tipo, `+${duracionSeg - enfriamientoSeg} seconds`);
        return Boolean(fila);
    },

    restablecerContrasena(id_usuario, tokenHash, contrasena_hash) {
        const info = db
            .prepare(
                `
      UPDATE Usuario
      SET contrasena_hash = ?,
          estado_cuenta = 'normal',
          intentos_fallidos = 0,
          fecha_ultimo_intento_fallido = NULL,
          token_seguridad = NULL,
          token_seguridad_tipo = NULL,
          token_seguridad_expiracion = NULL,
          sesiones_validas_desde = CURRENT_TIMESTAMP
      WHERE id_usuario = ?
        AND token_seguridad = ?
        AND token_seguridad_tipo = 'restablecer'
        AND token_seguridad_expiracion > CURRENT_TIMESTAMP
    `,
            )
            .run(contrasena_hash, id_usuario, tokenHash);
        return info.changes === 1;
    },
};

module.exports = UsuarioModel;
