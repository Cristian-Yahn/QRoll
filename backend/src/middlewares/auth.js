const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuarioModel');

const NOMBRE_COOKIE = 'qroll_sesion';
const DURACION_HORAS = 8;

// Opciones que comparten al crear y al borrar la cookie
// (para borrarla, el navegador exige que coincidan)
function opcionesBase() {
  return {
    httpOnly: true, // el JavaScript de la página NO puede leer esta cookie
    sameSite: 'lax', // el navegador no la manda en pedidos que vienen de otros sitios
    secure: process.env.NODE_ENV === 'production', // en producción, solo por HTTPS
  };
}

// Firma un token con el id del usuario y lo deja en una cookie de la respuesta
function iniciarSesion(res, id_usuario) {
  const token = jwt.sign({ id_usuario }, process.env.JWT_SECRET, {
    expiresIn: `${DURACION_HORAS}h`,
  });
  res.cookie(NOMBRE_COOKIE, token, {
    ...opcionesBase(),
    maxAge: DURACION_HORAS * 60 * 60 * 1000,
  });
}

function cerrarSesion(res) {
  res.clearCookie(NOMBRE_COOKIE, opcionesBase());
}

// Middleware: deja pasar solo si la cookie trae un token válido.
// Si pasa, deja al usuario autenticado en req.usuario para que lo use
// el controlador (ya NO se confía en el id_usuario que mande el navegador).
function requerirAuth(req, res, next) {
  const token = req.cookies[NOMBRE_COOKIE];

  if (!token) {
    return res.status(401).json({ error: 'Necesitás iniciar sesión' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = UsuarioModel.buscarPorId(payload.id_usuario);
    if (!usuario || !usuario.activo || usuario.estado_cuenta === 'bloqueada') {
      cerrarSesion(res);
      return res.status(401).json({ error: 'Tu cuenta ya no está disponible' });
    }

    // Un JWT no se puede anular, pero sí se puede ignorar: si la contraseña se cambió
    // después de que se creó esta sesión ("iat" = cuándo se firmó), la sesión ya no vale.
    // Así, cambiar la contraseña también saca a quien tuviera una sesión abierta.
    if (usuario.sesiones_validas_desde) {
      const desde = Math.floor(new Date(usuario.sesiones_validas_desde.replace(' ', 'T') + 'Z').getTime() / 1000);
      if (payload.iat < desde) {
        cerrarSesion(res);
        return res.status(401).json({ error: 'Tu sesión expiró. Iniciá sesión de nuevo' });
      }
    }

    req.usuario = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    };
    next();
  } catch (err) {
    // Token vencido, adulterado o firmado con otra clave
    cerrarSesion(res);
    return res.status(401).json({ error: 'Tu sesión expiró. Iniciá sesión de nuevo' });
  }
}

module.exports = { requerirAuth, iniciarSesion, cerrarSesion };
