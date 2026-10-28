const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { requerirAuth } = require('./middlewares/auth');
const authRoutes = require('./routes/authRoutes');
const cursoRoutes = require('./routes/cursoRoutes');
const asistenciaRapidaRoutes = require('./routes/asistenciaRapidaRoutes');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, '../../frontend/public')));

// Rutas públicas
app.get('/api/ping', (req, res) => {
  res.json({ mensaje: 'QRoll funcionando' });
});
app.use('/api/auth', authRoutes);

// Todo lo que cuelga de /api/cursos (cursos, clases, QR, asistencia, tablón...)
// exige sesión iniciada: requerirAuth corre antes que cualquier ruta de adentro
app.use('/api/cursos', requerirAuth, cursoRoutes);

// Registro de asistencia por enlace (QR que se abre con la cámara del celular):
// el servidor deduce el curso y la clase a partir del token
app.use('/api/asistencia', requerirAuth, asistenciaRapidaRoutes);

module.exports = app;
