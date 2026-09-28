CREATE TABLE IF NOT EXISTS Usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  intentos_fallidos INTEGER DEFAULT 0,
  fecha_ultimo_intento_fallido DATETIME,
  activo BOOLEAN DEFAULT 1,
  token_seguridad TEXT,
  token_seguridad_expiracion DATETIME
);