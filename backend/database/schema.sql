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

CREATE TABLE IF NOT EXISTS Curso (
  id_curso INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_curso TEXT NOT NULL,
  id_creador INTEGER NOT NULL,
  codigo_acceso TEXT NOT NULL UNIQUE,
  FOREIGN KEY (id_creador) REFERENCES Usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS Inscripcion (
  id_inscripcion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_curso INTEGER NOT NULL,
  id_usuario INTEGER NOT NULL,
  rol_en_curso TEXT NOT NULL CHECK (rol_en_curso IN ('profesor', 'alumno')),
  fecha_inscripcion DATE DEFAULT CURRENT_DATE,
  FOREIGN KEY (id_curso) REFERENCES Curso(id_curso),
  FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
  UNIQUE (id_curso, id_usuario)
);
