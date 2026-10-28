const express = require('express');
const router = express.Router();
const {
  registrar,
  login,
  logout,
  me,
  pedirCambioContrasena,
  restablecerContrasena,
  verificarAcceso,
  validarToken,
} = require('../controllers/authController');
const { requerirAuth } = require('../middlewares/auth');

router.post('/registro', registrar);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requerirAuth, me);

// Recuperación de contraseña y verificación de intentos fallidos (públicas: la
// persona justamente no puede iniciar sesión)
router.post('/pedir-cambio-contrasena', pedirCambioContrasena);
router.post('/restablecer-contrasena', restablecerContrasena);
router.post('/verificar-acceso', verificarAcceso);
router.post('/validar-token', validarToken);

module.exports = router;
