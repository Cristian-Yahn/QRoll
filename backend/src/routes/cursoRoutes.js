const express = require('express');
const router = express.Router();
const {
  crear,
  listarMisCursos,
  unirse,
  obtenerUno,
  listarAlumnos,
  regenerarCodigo,
  listarParticipantes,
  eliminarParticipante,
  bloquearParticipante,
  listarBloqueados,
  desbloquearParticipante,
  archivar,
  restaurar,
  salir,
} = require('../controllers/cursoController');
const { miAsistenciaEnCurso } = require('../controllers/asistenciaController');
const { resumenAlumnos, exportarExcel } = require('../controllers/reporteController');
const claseRoutes = require('./claseRoutes');
const publicacionRoutes = require('./publicacionRoutes');

router.post('/', crear);
router.get('/', listarMisCursos);
router.post('/unirse', unirse);
router.get('/:id_curso', obtenerUno);
router.get('/:id_curso/alumnos', listarAlumnos);
router.get('/:id_curso/mi-asistencia', miAsistenciaEnCurso);
router.get('/:id_curso/resumen-alumnos', resumenAlumnos);
router.get('/:id_curso/exportar', exportarExcel);
router.post('/:id_curso/regenerar-codigo', regenerarCodigo);
router.post('/:id_curso/archivar', archivar);
router.post('/:id_curso/restaurar', restaurar);
router.post('/:id_curso/salir', salir);
router.get('/:id_curso/participantes', listarParticipantes);
router.delete('/:id_curso/participantes/:id_participante', eliminarParticipante);
router.post('/:id_curso/participantes/:id_participante/bloquear', bloquearParticipante);
router.get('/:id_curso/bloqueados', listarBloqueados);
router.delete('/:id_curso/bloqueados/:id_participante', desbloquearParticipante);
router.use('/:id_curso/clases', claseRoutes);
router.use('/:id_curso/publicaciones', publicacionRoutes);

module.exports = router;
