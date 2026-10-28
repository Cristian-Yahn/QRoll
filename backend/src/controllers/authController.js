const bcrypt = require("bcrypt");
const UsuarioModel = require("../models/usuarioModel");
const { validarContrasena } = require("../utils/validacion");
const { iniciarSesion, cerrarSesion } = require("../middlewares/auth");
const { generarToken, hashearToken } = require("../utils/tokensSeguridad");
const { fechaSqliteEnSegundos } = require("../utils/fechas");
const { enviarCorreo, urlBase } = require("../utils/correo");
const { correoVerificacionIntentos, correoRestablecerContrasena } = require("../utils/plantillasCorreo");

const SALT_ROUNDS = 10;

const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_INTENTOS_MINUTOS = 15;

const VIGENCIA_VERIFICACION_HORAS = 24;
const VIGENCIA_RESTABLECER_MINUTOS = 60;
const ENFRIAMIENTO_RESTABLECER_SEG = 60;

const MENSAJE_PEDIR_CAMBIO =
    "Si el email está registrado, te enviamos un enlace para elegir una contraseña nueva. Revisá también la carpeta de spam.";

async function registrar(req, res) {
    const { nombre, apellido, email, contrasena } = req.body;

    if (!nombre || !apellido || !email || !contrasena) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const emailLimpio = email.trim().toLowerCase();

    const errorContrasena = validarContrasena(contrasena);
    if (errorContrasena) {
        return res.status(400).json({ error: errorContrasena });
    }

    const existente = UsuarioModel.buscarPorEmail(emailLimpio);
    if (existente) {
        return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    }

    const contrasena_hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
    const id_usuario = UsuarioModel.crear({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: emailLimpio,
        contrasena_hash,
    });

    res.status(201).json({ mensaje: "Usuario registrado correctamente", id_usuario });
}

function enviarEnSegundoPlano(datosCorreo) {
    enviarCorreo(datosCorreo).catch(err => {
        console.error(`No se pudo enviar el correo "${datosCorreo.asunto}" a ${datosCorreo.para}:`, err.message);
    });
}

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
        return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const emailLimpio = email.trim().toLowerCase();
    const usuario = UsuarioModel.buscarPorEmail(emailLimpio);

    if (!usuario) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    if (usuario.estado_cuenta === "bloqueada") {
        return res.status(423).json({
            error: 'Tu cuenta está bloqueada por seguridad. Usá "¿Olvidaste tu contraseña?" para elegir una nueva.',
            codigo: "bloqueada",
        });
    }
    if (usuario.estado_cuenta === "verificacion") {
        return res.status(423).json({
            error: "Detectamos varios intentos fallidos. Te enviamos un correo para confirmar que fuiste vos: revisalo (y la carpeta de spam) para volver a ingresar.",
            codigo: "en_verificacion",
        });
    }

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);

    if (!coincide) {
        const intentos = UsuarioModel.registrarIntentoFallido(usuario.id_usuario, VENTANA_INTENTOS_MINUTOS);

        if (intentos >= MAX_INTENTOS_FALLIDOS && UsuarioModel.marcarEnVerificacion(usuario.id_usuario)) {
            const token = emitirToken(usuario.id_usuario, "verificacion", VIGENCIA_VERIFICACION_HORAS * 3600);
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
                codigo: "en_verificacion",
            });
        }

        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    if (usuario.intentos_fallidos > 0) {
        UsuarioModel.limpiarIntentos(usuario.id_usuario);
    }

    iniciarSesion(res, usuario.id_usuario);

    res.json({
        mensaje: "Login exitoso",
        usuario: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
        },
    });
}

function logout(req, res) {
    cerrarSesion(res);
    res.json({ mensaje: "Sesión cerrada" });
}

function me(req, res) {
    res.json({ usuario: req.usuario });
}

function pedirCambioContrasena(req, res) {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "El email es obligatorio" });
    }

    const usuario = UsuarioModel.buscarPorEmail(email.trim().toLowerCase());

    if (usuario) {
        const duracionSeg = VIGENCIA_RESTABLECER_MINUTOS * 60;
        const muyReciente = UsuarioModel.emitioTokenRecientemente(
            usuario.id_usuario,
            "restablecer",
            duracionSeg,
            ENFRIAMIENTO_RESTABLECER_SEG,
        );

        if (!muyReciente) {
            const token = emitirToken(usuario.id_usuario, "restablecer", duracionSeg);
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

async function restablecerContrasena(req, res) {
    const { token, contrasena } = req.body;

    if (!token || typeof token !== "string" || !contrasena || typeof contrasena !== "string") {
        return res.status(400).json({ error: "token y contrasena son obligatorios" });
    }

    const usuario = UsuarioModel.buscarPorTokenSeguridad(hashearToken(token), "restablecer");
    if (!usuario) {
        return res.status(400).json({
            error: "El enlace no es válido o ya venció. Pedí uno nuevo.",
            codigo: "token_invalido",
        });
    }

    const errorContrasena = validarContrasena(contrasena);
    if (errorContrasena) {
        return res.status(400).json({ error: errorContrasena, codigo: "contrasena_invalida" });
    }

    const esLaMisma = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (esLaMisma) {
        return res.status(400).json({
            error: "La contraseña nueva no puede ser igual a la que tenías. Elegí una distinta.",
            codigo: "contrasena_repetida",
        });
    }

    const contrasena_hash = await bcrypt.hash(contrasena, SALT_ROUNDS);

    const cambiada = UsuarioModel.restablecerContrasena(usuario.id_usuario, hashearToken(token), contrasena_hash);
    if (!cambiada) {
        return res.status(400).json({
            error: "El enlace no es válido o ya venció. Pedí uno nuevo.",
            codigo: "token_invalido",
        });
    }

    res.json({ mensaje: "Contraseña actualizada. Ya podés iniciar sesión." });
}

function validarToken(req, res) {
    const { token, tipo } = req.body;

    if (!token || typeof token !== "string" || !["restablecer", "verificacion"].includes(tipo)) {
        return res.status(400).json({ error: "token y tipo (restablecer o verificacion) son obligatorios" });
    }

    const usuario = UsuarioModel.buscarPorTokenSeguridad(hashearToken(token), tipo);
    const valido = Boolean(usuario) && (tipo !== "verificacion" || usuario.estado_cuenta === "verificacion");
    res.json({ valido });
}

function verificarAcceso(req, res) {
    const { token, accion } = req.body;

    if (!token || typeof token !== "string" || !["fui_yo", "no_fui_yo"].includes(accion)) {
        return res.status(400).json({ error: "token y accion (fui_yo o no_fui_yo) son obligatorios" });
    }

    const usuario = UsuarioModel.buscarPorTokenSeguridad(hashearToken(token), "verificacion");
    if (!usuario || usuario.estado_cuenta !== "verificacion") {
        return res.status(400).json({
            error: 'El enlace no es válido o ya venció. Si necesitás entrar, usá "¿Olvidaste tu contraseña?".',
            codigo: "token_invalido",
        });
    }

    if (accion === "fui_yo") {
        UsuarioModel.levantarVerificacion(usuario.id_usuario);
        return res.json({ mensaje: "Listo, gracias por confirmar. Ya podés iniciar sesión." });
    }

    UsuarioModel.bloquearCuenta(usuario.id_usuario);
    const token_restablecer = emitirToken(usuario.id_usuario, "restablecer", VIGENCIA_RESTABLECER_MINUTOS * 60);
    res.json({
        mensaje: "Bloqueamos la cuenta. Elegí una contraseña nueva para recuperarla.",
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
