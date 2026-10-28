const express = require('express');
const router = express.Router();
const { registrarPorToken } = require('../controllers/asistenciaController');

// POST /api/asistencia/qr  { token }
router.post('/qr', registrarPorToken);

module.exports = router;
