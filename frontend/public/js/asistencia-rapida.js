// Pantalla a la que llega el alumno al escanear el QR con la cámara del celular:
//   /asistencia-rapida.html?t=<token>
// No pide hacer nada más: apenas carga, registra la asistencia y muestra el resultado.

const params = new URLSearchParams(window.location.search);
const token = params.get("t");

const icono = document.getElementById("estado-icono");
const titulo = document.getElementById("estado-titulo");
const mensaje = document.getElementById("estado-mensaje");
const detalle = document.getElementById("estado-detalle");
const acciones = document.getElementById("estado-acciones");

// Cada resultado posible: qué ícono, qué color y qué texto mostrar.
// La clave coincide con el "codigo" que manda el servidor.
const ESTADOS = {
    exito: {
        icono: "✓",
        color: "text-bg-success",
        titulo: "¡Asistencia registrada!",
        mensaje: "Ya quedaste presente en esta clase.",
    },
    ya_registrado: {
        icono: "✓",
        color: "text-bg-info",
        titulo: "Ya estabas registrado",
        mensaje: "Tu asistencia en esta clase ya estaba cargada. No hace falta hacer nada más.",
    },
    vencido: {
        icono: "!",
        color: "text-bg-warning",
        titulo: "El código venció",
        mensaje: "El QR cambia cada pocos segundos. Volvé a escanear el que muestra el profesor en pantalla.",
    },
    cerrada: {
        icono: "!",
        color: "text-bg-warning",
        titulo: "La asistencia está cerrada",
        mensaje: "El profesor ya cerró el registro de esta clase. Si llegaste tarde, avisale para que te cargue la asistencia.",
    },
    sin_permiso: {
        icono: "✕",
        color: "text-bg-danger",
        titulo: "No pertenecés a este curso",
        mensaje: "Para registrar asistencia primero tenés que unirte al curso con su código de acceso, desde el inicio.",
    },
    invalido: {
        icono: "✕",
        color: "text-bg-danger",
        titulo: "Código no válido",
        mensaje: "Este enlace no corresponde a ninguna clase. Escaneá de nuevo el QR del profesor.",
    },
    sin_conexion: {
        icono: "✕",
        color: "text-bg-danger",
        titulo: "No se pudo conectar",
        mensaje: "Revisá tu conexión e intentá de nuevo.",
    },
    error: {
        icono: "✕",
        color: "text-bg-danger",
        titulo: "No se pudo registrar",
        mensaje: "Ocurrió un error inesperado.",
    },
};

function crearBoton(texto, clase, alHacerClic) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = `btn ${clase}`;
    boton.textContent = texto;
    boton.addEventListener("click", alHacerClic);
    return boton;
}

// Dibuja un resultado. Todo texto que viene del servidor (nombre del curso, mensajes)
// va con textContent, nunca con innerHTML, para que nadie pueda colar HTML.
function mostrarEstado(claveRecibida, datos = {}) {
    // Si el servidor manda un código que esta pantalla no conoce, se trata como error genérico
    const clave = ESTADOS[claveRecibida] ? claveRecibida : "error";
    const estado = ESTADOS[clave];

    icono.className = `rounded-circle d-inline-flex align-items-center justify-content-center mb-3 ${estado.color}`;
    icono.textContent = estado.icono;
    titulo.textContent = estado.titulo;
    // Si el servidor mandó un mensaje propio para un error genérico, lo mostramos
    mensaje.textContent = clave === "error" && datos.error ? datos.error : estado.mensaje;

    if (datos.curso) {
        document.getElementById("detalle-curso").textContent = datos.curso;
        document.getElementById("detalle-clase").textContent = `Clase del ${formatearFecha(datos.clase)}`;
        detalle.classList.remove("d-none");
    } else {
        detalle.classList.add("d-none");
    }

    acciones.innerHTML = "";
    if (datos.id_curso) {
        acciones.appendChild(crearBoton("Ir al curso", "btn-primary", () => {
            window.location.href = `/curso.html?id=${datos.id_curso}`;
        }));
    }
    if (clave === "sin_conexion") {
        acciones.appendChild(crearBoton("Reintentar", "btn-primary", () => window.location.reload()));
    }
    acciones.appendChild(crearBoton("Ir al inicio", "btn-outline-secondary", () => {
        window.location.href = "/index.html";
    }));
}

function formatearFecha(fechaISO) {
    const [anio, mes, dia] = fechaISO.split("-");
    return `${dia}/${mes}/${anio}`;
}

// Sin sesión: se manda al login y, al entrar, vuelve exactamente acá (parámetro "volver")
function irAlLogin() {
    const volver = window.location.pathname + window.location.search;
    window.location.href = `/login.html?volver=${encodeURIComponent(volver)}`;
}

async function registrar() {
    try {
        const res = await fetch("/api/asistencia/qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });

        // 401 = no hay sesión (o venció): sesion.js ya está redirigiendo al login
        if (res.status === 401) return;

        const data = await res.json();

        if (res.ok) {
            mostrarEstado("exito", data);
        } else {
            mostrarEstado(data.codigo || "error", data);
        }
    } catch (err) {
        mostrarEstado("sin_conexion");
    }
}

if (!localStorage.getItem("usuario")) {
    irAlLogin();
} else if (!token) {
    mostrarEstado("invalido");
} else {
    registrar();
}
