const db = require('../config/db');

const AsistenciaModel = {
  crear({ id_clase, id_usuario, estado, metodo, id_codigo_qr = null }) {
    const stmt = db.prepare(`
      INSERT INTO Asistencia (id_clase, id_usuario, estado, metodo, id_codigo_qr)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(id_clase, id_usuario, estado, metodo, id_codigo_qr);
    return this.buscarPorId(info.lastInsertRowid);
  },

  buscarPorId(id_asistencia) {
    return db.prepare('SELECT * FROM Asistencia WHERE id_asistencia = ?').get(id_asistencia);
  },

  buscar(id_clase, id_usuario) {
    return db.prepare('SELECT * FROM Asistencia WHERE id_clase = ? AND id_usuario = ?').get(id_clase, id_usuario);
  },

  // Corrige el estado de un registro existente. Se deja intacto cómo se creó
  // (metodo / id_codigo_qr): solo cambia el estado.
  actualizarEstado(id_asistencia, estado) {
    db.prepare('UPDATE Asistencia SET estado = ? WHERE id_asistencia = ?').run(estado, id_asistencia);
    return this.buscarPorId(id_asistencia);
  },

  listarPorClase(id_clase) {
    return db.prepare(`
      SELECT Asistencia.*, Usuario.nombre, Usuario.apellido
      FROM Asistencia
      JOIN Usuario ON Usuario.id_usuario = Asistencia.id_usuario
      WHERE id_clase = ?
      ORDER BY fecha_hora_registro ASC
    `).all(id_clase);
  },

  // Una fila por cada clase en la que "se tomó asistencia", con el estado de este
  // alumno (o NULL si no tiene registro). Una clase cuenta si el profesor llegó a
  // abrir la asistencia o si ya hay algún registro cargado: las clases creadas
  // pero nunca tomadas (futuras, suspendidas) no cuentan como ausencia.
  listarPorAlumnoEnCurso(id_curso, id_usuario) {
    return db.prepare(`
      SELECT Clase.id_clase, Clase.fecha, Asistencia.estado
      FROM Clase
      LEFT JOIN Asistencia
        ON Asistencia.id_clase = Clase.id_clase AND Asistencia.id_usuario = ?
      WHERE Clase.id_curso = ?
        AND (
          Clase.fecha_apertura IS NOT NULL
          OR EXISTS (SELECT 1 FROM Asistencia a WHERE a.id_clase = Clase.id_clase)
        )
      ORDER BY Clase.fecha DESC
    `).all(id_usuario, id_curso);
  },

  // Las clases del curso en las que "se tomó asistencia" (mismo criterio que arriba),
  // de la más vieja a la más nueva
  listarClasesTomadas(id_curso) {
    return db.prepare(`
      SELECT Clase.id_clase, Clase.fecha
      FROM Clase
      WHERE Clase.id_curso = ?
        AND (
          Clase.fecha_apertura IS NOT NULL
          OR EXISTS (SELECT 1 FROM Asistencia a WHERE a.id_clase = Clase.id_clase)
        )
      ORDER BY Clase.fecha ASC, Clase.id_clase ASC
    `).all(id_curso);
  },

  // Todos los registros de asistencia de todas las clases de un curso
  listarRegistrosDeCurso(id_curso) {
    return db.prepare(`
      SELECT Asistencia.id_clase, Asistencia.id_usuario, Asistencia.estado
      FROM Asistencia
      JOIN Clase ON Clase.id_clase = Asistencia.id_clase
      WHERE Clase.id_curso = ?
    `).all(id_curso);
  },
};

module.exports = AsistenciaModel;
