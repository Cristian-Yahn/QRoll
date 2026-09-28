function validarContrasena(contrasena) {
    if (contrasena.length < 8) {
        return "La contraseña debe tener al menos 8 caracteres";
    }
    if (!/[a-z]/.test(contrasena)) {
        return "La contraseña debe incluir una minúscula";
    }
    if (!/[A-Z]/.test(contrasena)) {
        return "La contraseña debe incluir una mayúscula";
    }
    if (!/\d/.test(contrasena)) {
        return "La contraseña debe incluir un número";
    }
    if (!/[^A-Za-z0-9]/.test(contrasena)) {
        return "La contraseña debe incluir un carácter especial";
    }
    return null;
}

module.exports = { validarContrasena };
