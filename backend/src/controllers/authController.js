const bcrypt = require("bcrypt");
const UsuarioModel = require("../models/usuarioModel");
const { validarContrasena } = require("../utils/validacion");

const SALT_ROUNDS = 10;

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

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

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

module.exports = { registrar, login };
