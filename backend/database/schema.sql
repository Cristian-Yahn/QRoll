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

CREATE TABLE IF NOT EXISTS Clase (
  id_clase INTEGER PRIMARY KEY AUTOINCREMENT,
  id_curso INTEGER NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_curso) REFERENCES Curso(id_curso)
);

CREATE TABLE IF NOT EXISTS Codigo_QR (
  id_qr INTEGER PRIMARY KEY AUTOINCREMENT,
  id_clase INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME NOT NULL,
  usado BOOLEAN DEFAULT 0,
  FOREIGN KEY (id_clase) REFERENCES Clase(id_clase)
);

CREATE TABLE IF NOT EXISTS Asistencia (
  id_asistencia INTEGER PRIMARY KEY AUTOINCREMENT,
  id_clase INTEGER NOT NULL,
  id_usuario INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('presente', 'ausente', 'tarde', 'justificado')),
  metodo TEXT NOT NULL CHECK (metodo IN ('qr', 'manual')),
  fecha_hora_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  id_codigo_qr INTEGER,
  FOREIGN KEY (id_clase) REFERENCES Clase(id_clase),
  FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
  FOREIGN KEY (id_codigo_qr) REFERENCES Codigo_QR(id_qr)
);