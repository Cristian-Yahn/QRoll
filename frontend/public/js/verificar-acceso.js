// Pantalla a la que llega la persona desde el correo "detectamos intentos fallidos":
//   /verificar-acceso.html?token=<token>
// Ofrece dos botones: "Sí, fui yo" (se desbloquea la cuenta) y "No fui yo"
// (la cuenta queda bloqueada y se la lleva a elegir una contraseña nueva).
// No usa sesion.js: quien llega acá no tiene sesión.

const token = new URLSearchParams(window.location.search).get("token");

const titulo = document.getElementById("titulo");
const mensaje = document.getElementById("mensaje");
const alerta = document.getElementById("alerta");
const accionesPregunta = document.getElementById("acciones-pregunta");
const accionesResultado = document.getElementById("acciones-resultado");
const botonFuiYo = document.getElementById("btn-fui-yo");
const botonNoFuiYo = document.getElementById("btn-no-fui-yo");

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo} text-start`;
}

function crearEnlaceBoton(texto, href, clase) {
    const enlace = document.createElement("a");
    enlace.href = href;
    enlace.className = `btn ${clase}`;
    enlace.textContent = texto;
    return enlace;
}

// Reemplaza las dos opciones por un resultado final con un enlace para seguir
function mostrarResultado({ tituloTexto, mensajeTexto, enlaceTexto, enlaceHref }) {
    titulo.textContent = tituloTexto;
    mensaje.textContent = mensajeTexto;
    accionesPregunta.classList.add("d-none");
    accionesResultado.classList.remove("d-none");
    accionesResultado.innerHTML = "";
    accionesResultado.appendChild(crearEnlaceBoton(enlaceTexto, enlaceHref, "btn-primary"));
}

async function responder(accion) {
    // Se deshabilitan los botones para que un doble clic no mande dos pedidos
    botonFuiYo.disabled = true;
    botonNoFuiYo.disabled = true;

    try {
        const res = await fetch("/api/auth/verificar-acceso", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, accion }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarResultado({
                tituloTexto: "No se pudo verificar",
                mensajeTexto: data.error || "Ocurrió un error inesperado.",
                enlaceTexto: "Recuperar mi cuenta",
                enlaceHref: "/login.html?recuperar=1",
            });
            return;
        }

        if (accion === "fui_yo") {
            mostrarResultado({
                tituloTexto: "¡Gracias por confirmar!",
                mensajeTexto: data.mensaje,
                enlaceTexto: "Ir a iniciar sesión",
                enlaceHref: "/login.html",
            });
        } else {
            // La cuenta quedó bloqueada: se sigue directo a elegir la contraseña nueva
            window.location.href = `/restablecer.html?token=${encodeURIComponent(data.token_restablecer)}`;
        }
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor. Intentá de nuevo.", "danger");
        botonFuiYo.disabled = false;
        botonNoFuiYo.disabled = false;
    }
}

if (!token) {
    mostrarResultado({
        tituloTexto: "Enlace no válido",
        mensajeTexto: "Este enlace está incompleto. Abrí el que te llegó por correo.",
        enlaceTexto: "Ir a iniciar sesión",
        enlaceHref: "/login.html",
    });
} else {
    botonFuiYo.addEventListener("click", () => responder("fui_yo"));
    botonNoFuiYo.addEventListener("click", () => responder("no_fui_yo"));
    validarEnlace();
}

// Apenas se abre la página se le pregunta al servidor si el enlace todavía sirve (no se
// gasta nada): un enlace ya usado o vencido avisa enseguida, sin mostrar los botones.
async function validarEnlace() {
    accionesPregunta.classList.add("d-none");
    try {
        const res = await fetch("/api/auth/validar-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, tipo: "verificacion" }),
        });
        const data = await res.json();
        if (!data.valido) {
            mostrarResultado({
                tituloTexto: "Enlace no válido",
                mensajeTexto:
                    'El enlace ya se usó o venció. Si necesitás entrar a tu cuenta, usá "¿Olvidaste tu contraseña?".',
                enlaceTexto: "Recuperar mi cuenta",
                enlaceHref: "/login.html?recuperar=1",
            });
            return;
        }
    } catch (err) {
        // Sin conexión no podemos saberlo: se muestran los botones y el servidor valida al responder
    }
    accionesPregunta.classList.remove("d-none");
}
