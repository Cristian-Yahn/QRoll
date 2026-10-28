const jwt = require("jsonwebtoken");
const UsuarioModel = require("../models/usuarioModel");

const NOMBRE_COOKIE = "qroll_sesion";
const DURACION_HORAS = 8;

function opcionesBase() {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    };
}

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

function requerirAuth(req, res, next) {
    const token = req.cookies[NOMBRE_COOKIE];

    if (!token) {
        return res.status(401).json({ error: "Necesitás iniciar sesión" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = UsuarioModel.buscarPorId(payload.id_usuario);
        if (!usuario || !usuario.activo || usuario.estado_cuenta === "bloqueada") {
            cerrarSesion(res);
            return res.status(401).json({ error: "Tu cuenta ya no está disponible" });
        }

        if (usuario.sesiones_validas_desde) {
            const desde = Math.floor(new Date(usuario.sesiones_validas_desde.replace(" ", "T") + "Z").getTime() / 1000);
            if (payload.iat < desde) {
                cerrarSesion(res);
                return res.status(401).json({ error: "Tu sesión expiró. Iniciá sesión de nuevo" });
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
        cerrarSesion(res);
        return res.status(401).json({ error: "Tu sesión expiró. Iniciá sesión de nuevo" });
    }
}

module.exports = { requerirAuth, iniciarSesion, cerrarSesion };
