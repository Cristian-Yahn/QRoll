const bcrypt = require('bcrypt');
const UsuarioModel = require('../models/usuarioModel');
const { validarContrasena } = require('../utils/validacion');
const { iniciarSesion, cerrarSesion } = require('../middlewares/auth');
const { generarToken, hashearToken } = require('../utils/tokensSeguridad');
const { fechaSqliteEnSegundos } = require('../utils/fechas');
const { enviarCorreo, urlBase } = require('../utils/correo');
const { correoVerificacionIntentos, correoRestablecerContrasena } = require('../utils/plantillasCorreo');

const SALT_ROUNDS = 10;

// Límite de intentos de login
const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_INTENTOS_MINUTOS = 15; // los fallos cuentan si ocurren dentro de esta ventana

// Vigencia de los enlaces que se mandan por correo
const VIGENCIA_VERIFICACION_HORAS = 24;
const VIGENCIA_RESTABLECER_MINUTOS = 60;
const ENFRIAMIENTO_RESTABLECER_SEG = 60; // mínimo entre un correo de "restablecer" y el siguiente

const MENSAJE_PEDIR_CAMBIO =
  'Si el email está registrado, te enviamos un enlace para elegir una contraseña nueva. Revisá también la carpeta de spam.';

async function registrar(req, res) {
  const { nombre, apellido, email, contrasena } = req.body;

  if (!nombre || !apellido || !email || !contrasena) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const emailLimpio = email.trim().toLowerCase();

  const errorContrasena = validarContrasena(contrasena);
  if (errorContrasena) {
    return res.status(400).json({ error: errorContrasena });
  }

  const existente = UsuarioModel.buscarPorEmail(emailLimpio);
  if (existente) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }

  const contrasena_hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
  const id_usuario = UsuarioModel.crear({
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    email: emailLimpio,
    contrasena_hash,
  });

  res.status(201).json({ mensaje: 'Usuario registrado correctamente', id_usuario });
}

// Manda un correo SIN hacer esperar la respuesta al navegador (enviar por Gmail tarda
// un par de segundos) y sin romperla si falla: el error queda en la terminal del servidor.
function enviarEnSegundoPlano(datosCorreo) {
  enviarCorreo(datosCorreo).catch(err => {
    console.error(`No se pudo enviar el correo "${datosCorreo.asunto}" a ${datosCorreo.para}:`, err.message);
  });
}

// Deja un token nuevo guardado (hasheado) para el usuario y devuelve el token en claro,
// que es lo único que viaja por correo.
function emitirToken(id_usuario, tipo, segundosDeVigencia) {
  const token = generarToken();
  UsuarioModel.guardarTokenSeguridad(
    id_usuario,
    hashearToken(token),
    tipo,
    fechaSqliteEnSegundos(segundosDeVigencia),
  );
  return token;
}

async function login(req, res) {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  const emailLimpio = email.trim().toLowerCase();
  const usuario = UsuarioModel.buscarPorEmail(emailLimpio);

  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Cuenta bloqueada o esperando que la persona confirme "fui yo": no se prueba la
  // contraseña ni siquiera si es la correcta (por eso 423 y no 401)
  if (usuario.estado_cuenta === 'bloqueada') {
    return res.status(423).json({
      error: 'Tu cuenta está bloqueada por seguridad. Usá "¿Olvidaste tu contraseña?" para elegir una nueva.',
      codigo: 'bloqueada',
    });
  }
  if (usuario.estado_cuenta === 'verificacion') {
    return res.status(423).json({
      error:
        'Detectamos varios intentos fallidos. Te enviamos un correo para confirmar que fuiste vos: revisalo (y la carpeta de spam) para volver a ingresar.',
      codigo: 'en_verificacion',
    });
  }

  const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);

  if (!coincide) {
    const intentos = UsuarioModel.registrarIntentoFallido(usuario.id_usuario, VENTANA_INTENTOS_MINUTOS);

    // Llegó al límite: se frena el acceso y se manda el correo "¿fuiste vos?".
    // marcarEnVerificacion devuelve true solo para el pedido que hizo el cambio.
    if (intentos >= MAX_INTENTOS_FALLIDOS && UsuarioModel.marcarEnVerificacion(usuario.id_usuario)) {
      const token = emitirToken(usuario.id_usuario, 'verificacion', VIGENCIA_VERIFICACION_HORAS * 3600);
      enviarEnSegundoPlano({
        para: usuario.email,
        ...correoVerificacionIntentos({
          nombre: usuario.nombre,
          enlace: `${urlBase()}/verificar-acceso.html?token=${token}`,
          horasValidez: VIGENCIA_VERIFICACION_HORAS,
        }),
      });
      return res.status(423).json({
        error: `Superaste los ${MAX_INTENTOS_FALLIDOS} intentos fallidos. Te enviamos un correo para confirmar que fuiste vos.`,
        codigo: 'en_verificacion',
      });
    }

    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (usuario.intentos_fallidos > 0) {
    UsuarioModel.limpiarIntentos(usuario.id_usuario);
  }

  // Login correcto: el servidor deja la cookie de sesión en la respuesta
  iniciarSesion(res, usuario.id_usuario);

  res.json({
    mensaje: 'Login exitoso',
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    },
  });
}

// La cookie es httpOnly: desde JavaScript no se puede borrar, por eso
// el cierre de sesión tiene que pasar por el servidor
function logout(req, res) {
  cerrarSesion(res);
  res.json({ mensaje: 'Sesión cerrada' });
}

// Devuelve quién es el usuario de la sesión actual (req.usuario lo arma requerirAuth)
function me(req, res) {
  res.json({ usuario: req.usuario });
}

// "Olvidé mi contraseña": paso 1, pedir el enlace.
// Responde SIEMPRE lo mismo, exista o no el email: si dijera "ese email no está
// registrado", cualquiera podría usar este formulario para averiguar quién tiene cuenta.
function pedirCambioContrasena(req, res) {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'El email es obligatorio' });
  }

  const usuario = UsuarioModel.buscarPorEmail(email.trim().toLowerCase());

  if (usuario) {
    const duracionSeg = VIGENCIA_RESTABLECER_MINUTOS * 60;
    const muyReciente = UsuarioModel.emitioTokenRecientemente(
      usuario.id_usuario,
      'restablecer',
      duracionSeg,
      ENFRIAMIENTO_RESTABLECER_SEG,
    );

    if (!muyReciente) {
      const token = emitirToken(usuario.id_usuario, 'restablecer', duracionSeg);
      enviarEnSegundoPlano({
        para: usuario.email,
        ...correoRestablecerContrasena({
          nombre: usuario.nombre,
          enlace: `${urlBase()}/restablecer.html?token=${token}`,
          minutosValidez: VIGENCIA_RESTABLECER_MINUTOS,
        }),
      });
    }
  }

  res.json({ mensaje: MENSAJE_PEDIR_CAMBIO });
}

// "Olvidé mi contraseña": paso 2, elegir la contraseña nueva con el token del correo
async function restablecerContrasena(req, res) {
  const { token, contrasena } = req.body;

  if (!token || typeof token !== 'string' || !contrasena || typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'token y contrasena son obligatorios' });
  }

  const usuario = UsuarioModel.buscarPorTokenSeguridad(hashearToken(token), 'restablecer');
  if (!usuario) {
    return res.status(400).json({
      error: 'El enlace no es válido o ya venció. Pedí uno nuevo.',
      codigo: 'token_invalido',
    });
  }

  // Si la contraseña no sirve se responde ANTES de gastar el token:
  // la persona corrige y vuelve a intentar con el mismo enlace
  const errorContrasena = validarContrasena(contrasena);
  if (errorContrasena) {
    return res.status(400).json({ error: errorContrasena, codigo: 'contrasena_invalida' });
  }

  // No se puede "cambiar" la contraseña por la misma que ya tenía. Como en la base solo
  // está el hash, se compara la nueva contra ese hash con bcrypt.
  const esLaMisma = await bcrypt.compare(contrasena, usuario.contrasena_hash);
  if (esLaMisma) {
    return res.status(400).json({
      error: 'La contraseña nueva no puede ser igual a la que tenías. Elegí una distinta.',
      codigo: 'contrasena_repetida',
    });
  }

  const contrasena_hash = await bcrypt.hash(contrasena, SALT_ROUNDS);

  // Hasta acá el token se leyó pero no se gastó; mientras bcrypt calculaba, otro pedido con
  // el mismo enlace pudo haberlo usado. Por eso el token se verifica y se gasta de nuevo,
  // en un solo paso, al guardar: si ya no servía, no se cambia nada.
  const cambiada = UsuarioModel.restablecerContrasena(usuario.id_usuario, hashearToken(token), contrasena_hash);
  if (!cambiada) {
    return res.status(400).json({
      error: 'El enlace no es válido o ya venció. Pedí uno nuevo.',
      codigo: 'token_invalido',
    });
  }

  res.json({ mensaje: 'Contraseña actualizada. Ya podés iniciar sesión.' });
}

// Sirve para que las páginas de los enlaces del correo avisen "enlace no válido" apenas
// se abren (en vez de mostrar el formulario y fallar recién al enviarlo). NO gasta el token.
function validarToken(req, res) {
  const { token, tipo } = req.body;

  if (!token || typeof token !== 'string' || !['restablecer', 'verificacion'].includes(tipo)) {
    return res.status(400).json({ error: 'token y tipo (restablecer o verificacion) son obligatorios' });
  }

  const usuario = UsuarioModel.buscarPorTokenSeguridad(hashearToken(token), tipo);
  const valido = Boolean(usuario) && (tipo !== 'verificacion' || usuario.estado_cuenta === 'verificacion');
  res.json({ valido });
}

// Respuesta al correo "¿fuiste vos?" que se manda tras 5 intentos fallidos.
// Recibe { token, accion } con accion = 'fui_yo' | 'no_fui_yo'.
function verificarAcceso(req, res) {
  const { token, accion } = req.body;

  if (!token || typeof token !== 'string' || !['fui_yo', 'no_fui_yo'].includes(accion)) {
    return res.status(400).json({ error: 'token y accion (fui_yo o no_fui_yo) son obligatorios' });
  }

  const usuario = UsuarioModel.buscarPorTokenSeguridad(hashearToken(token), 'verificacion');
  if (!usuario || usuario.estado_cuenta !== 'verificacion') {
    return res.status(400).json({
      error: 'El enlace no es válido o ya venció. Si necesitás entrar, usá "¿Olvidaste tu contraseña?".',
      codigo: 'token_invalido',
    });
  }

  if (accion === 'fui_yo') {
    UsuarioModel.levantarVerificacion(usuario.id_usuario);
    return res.json({ mensaje: 'Listo, gracias por confirmar. Ya podés iniciar sesión.' });
  }

  // "No fui yo": la cuenta queda bloqueada y se entrega un token nuevo para elegir
  // una contraseña. Sigue bloqueada hasta que se complete ese cambio.
  UsuarioModel.bloquearCuenta(usuario.id_usuario);
  const token_restablecer = emitirToken(usuario.id_usuario, 'restablecer', VIGENCIA_RESTABLECER_MINUTOS * 60);
  res.json({
    mensaje: 'Bloqueamos la cuenta. Elegí una contraseña nueva para recuperarla.',
    token_restablecer,
  });
}

module.exports = {
  registrar,
  login,
  logout,
  me,
  pedirCambioContrasena,
  restablecerContrasena,
  verificarAcceso,
  validarToken,
};
