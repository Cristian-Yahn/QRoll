const usuarioGuardado = localStorage.getItem("usuario");
const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

const params = new URLSearchParams(window.location.search);
const idCurso = params.get("id_curso");
const idClase = params.get("id_clase");

if (!usuario) {
    window.location.href = "/login.html";
} else if (!idCurso || !idClase) {
    window.location.href = "/index.html";
} else {
    iniciar();
}

const alerta = document.getElementById("alerta-asistencia");

const ETIQUETA_ESTADO = { presente: "Presente", ausente: "Ausente", tarde: "Tarde", justificado: "Justificado" };
const CLASE_ESTADO = {
    presente: "text-bg-success",
    ausente: "text-bg-danger",
    tarde: "text-bg-warning",
    justificado: "text-bg-info",
};

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
}

function limpiarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
}

function formatearFecha(fechaISO) {
    const [anio, mes, dia] = fechaISO.split("-");
    return `${dia}/${mes}/${anio}`;
}

// SQLite guarda la hora en UTC como "YYYY-MM-DD HH:MM:SS"; la mostramos en hora local
function formatearHora(fechaSqlite) {
    const fecha = new Date(fechaSqlite.replace(" ", "T") + "Z");
    return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function estilizarItemLista(item) {
    item.style.backgroundColor = "var(--bs-card-bg)";
    item.style.borderColor = "var(--bs-border-color)";
    item.style.color = "var(--bs-body-color)";
}

async function iniciar() {
    document.getElementById("link-volver").href = `/curso.html?id=${idCurso}`;

    try {
        const resCurso = await fetch(`/api/cursos/${idCurso}?id_usuario=${usuario.id_usuario}`);
        const dataCurso = await resCurso.json();
        if (!resCurso.ok) {
            mostrarAlerta(dataCurso.error || "No se pudo cargar el curso", "danger");
            return;
        }

        const resClases = await fetch(`/api/cursos/${idCurso}/clases?id_usuario=${usuario.id_usuario}`);
        const dataClases = await resClases.json();
        const clase = resClases.ok ? dataClases.clases.find(c => String(c.id_clase) === String(idClase)) : null;
        if (!clase) {
            mostrarAlerta("La clase no existe en este curso", "danger");
            return;
        }

        const esProfesor = dataCurso.curso.rol_en_curso === "profesor";

        document.getElementById("nombre-curso").textContent = dataCurso.curso.nombre_curso;
        document.getElementById("titulo-clase").textContent = `Clase ${formatearFecha(clase.fecha)}`;
        document.getElementById("subtitulo-rol").textContent = esProfesor
            ? "Mostrá el código a tus alumnos o cargá la asistencia a mano."
            : "Escaneá el código que muestra el profesor para registrar tu asistencia.";

        if (esProfesor) {
            document.getElementById("vista-profesor").classList.remove("d-none");
            iniciarVistaProfesor();
        } else {
            document.getElementById("vista-alumno").classList.remove("d-none");
            iniciarVistaAlumno();
        }
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

/* =====================================================================
   PROFESOR: QR dinámico, carga manual e historial
   ===================================================================== */

// El token dura 20 s en el servidor; lo renovamos cada 15 s para que
// siempre haya un margen de solapamiento y nadie quede con un código vencido.
const INTERVALO_QR_SEG = 15;

let qrObj = null;
let cuentaRegresiva = 0;
let timerQr = null;
let timerCuenta = null;
let timerHistorial = null;
let alumnos = [];
let registrados = new Set();
let claveSelectActual = "";

function actualizarContador() {
    document.getElementById("qr-contador").textContent = cuentaRegresiva;
}

async function generarQr() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/qr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_usuario: usuario.id_usuario }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo generar el código QR", "danger");
            detenerRotacionQr();
            return;
        }

        document.getElementById("qr-token").textContent = data.token;

        const contenedor = document.getElementById("qr-contenedor");
        if (!qrObj) {
            qrObj = new QRCode(contenedor, {
                text: data.token,
                width: 220,
                height: 220,
                correctLevel: QRCode.CorrectLevel.M,
            });
        } else {
            qrObj.makeCode(data.token);
        }

        cuentaRegresiva = INTERVALO_QR_SEG;
        actualizarContador();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

function iniciarRotacionQr() {
    if (timerQr) return;
    generarQr();
    timerQr = setInterval(generarQr, INTERVALO_QR_SEG * 1000);
    timerCuenta = setInterval(() => {
        cuentaRegresiva = Math.max(0, cuentaRegresiva - 1);
        actualizarContador();
    }, 1000);
}

function detenerRotacionQr() {
    clearInterval(timerQr);
    clearInterval(timerCuenta);
    timerQr = null;
    timerCuenta = null;
}

function actualizarSelectAlumnos() {
    const select = document.getElementById("manual-alumno");
    const boton = document.getElementById("manual-guardar");
    const pendientes = alumnos.filter(a => !registrados.has(a.id_usuario));

    // Solo reconstruimos el select si cambió quiénes faltan, para no pisar
    // la selección del profesor cada vez que se refresca el historial.
    const clave = pendientes.map(a => a.id_usuario).join(",");
    if (clave === claveSelectActual) return;
    claveSelectActual = clave;

    const valorPrevio = select.value;
    select.innerHTML = "";

    if (pendientes.length === 0) {
        const opcion = document.createElement("option");
        opcion.value = "";
        opcion.textContent = alumnos.length === 0 ? "No hay alumnos inscriptos" : "Todos ya tienen registro";
        select.appendChild(opcion);
        select.disabled = true;
        boton.disabled = true;
        return;
    }

    select.disabled = false;
    boton.disabled = false;
    pendientes.forEach(a => {
        const opcion = document.createElement("option");
        opcion.value = a.id_usuario;
        opcion.textContent = `${a.apellido}, ${a.nombre}`;
        select.appendChild(opcion);
    });

    if (pendientes.some(a => String(a.id_usuario) === valorPrevio)) {
        select.value = valorPrevio;
    }
}

function renderizarHistorial(registros) {
    const lista = document.getElementById("lista-asistencia");
    const vacio = document.getElementById("sin-registros");
    lista.innerHTML = "";

    if (registros.length === 0) {
        vacio.classList.remove("d-none");
        return;
    }
    vacio.classList.add("d-none");

    registros.forEach(r => {
        const item = document.createElement("div");
        item.className = "list-group-item d-flex justify-content-between align-items-center";
        estilizarItemLista(item);

        const nombre = document.createElement("span");
        nombre.textContent = `${r.nombre} ${r.apellido}`;

        const derecha = document.createElement("span");
        derecha.className = "d-flex align-items-center gap-2 small";

        const meta = document.createElement("span");
        meta.className = "text-secondary-tema";
        meta.textContent = `${r.metodo === "qr" ? "QR" : "Manual"} · ${formatearHora(r.fecha_hora_registro)}`;

        const badge = document.createElement("span");
        badge.className = `badge ${CLASE_ESTADO[r.estado] || "text-bg-secondary"}`;
        badge.textContent = ETIQUETA_ESTADO[r.estado] || r.estado;

        derecha.append(meta, badge);
        item.append(nombre, derecha);
        lista.appendChild(item);
    });
}

async function cargarHistorial() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/asistencia?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();
        if (!res.ok) return;

        registrados = new Set(data.registros.map(r => r.id_usuario));
        renderizarHistorial(data.registros);
        actualizarSelectAlumnos();
    } catch (err) {
        // Si falla un refresco automático no molestamos con una alerta; se reintenta solo
    }
}

async function cargarAlumnos() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}/alumnos?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();
        if (res.ok) {
            alumnos = data.alumnos;
        }
    } catch (err) {
        mostrarAlerta("No se pudo cargar el listado de alumnos", "danger");
    }
}

async function iniciarVistaProfesor() {
    iniciarRotacionQr();

    await cargarAlumnos();
    await cargarHistorial();
    timerHistorial = setInterval(cargarHistorial, 8000);

    // Si el profesor cambia de pestaña, pausamos la generación de códigos
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            detenerRotacionQr();
        } else {
            iniciarRotacionQr();
            cargarHistorial();
        }
    });

    document.getElementById("form-manual").addEventListener("submit", async e => {
        e.preventDefault();
        limpiarAlerta();

        const id_usuario_objetivo = document.getElementById("manual-alumno").value;
        const estado = document.getElementById("manual-estado").value;
        if (!id_usuario_objetivo) return;

        try {
            const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/asistencia/manual`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_usuario_objetivo, estado, id_usuario: usuario.id_usuario }),
            });
            const data = await res.json();

            if (!res.ok) {
                mostrarAlerta(data.error || "No se pudo guardar la asistencia", "danger");
                return;
            }

            mostrarAlerta("Asistencia cargada correctamente", "success");
            cargarHistorial();
        } catch (err) {
            mostrarAlerta("No se pudo conectar con el servidor", "danger");
        }
    });
}

/* =====================================================================
   ALUMNO: escaneo de QR con la cámara
   ===================================================================== */

let lector = null;
let escaneando = false;
let procesando = false;

async function enviarToken(token) {
    limpiarAlerta();
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/asistencia/qr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, id_usuario: usuario.id_usuario }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo registrar la asistencia", "danger");
            return;
        }

        mostrarAlerta("¡Asistencia registrada correctamente!", "success");
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

async function detenerEscaneo() {
    const boton = document.getElementById("btn-escanear");
    if (lector) {
        try {
            await lector.stop();
            lector.clear();
        } catch (err) {
            // Si ya estaba detenido no pasa nada
        }
        lector = null;
    }
    escaneando = false;
    boton.textContent = "Escanear código";
}

async function alLeerCodigo(texto) {
    if (procesando) return;
    procesando = true;
    await detenerEscaneo();
    await enviarToken(texto.trim());
    procesando = false;
}

async function iniciarEscaneo() {
    limpiarAlerta();

    if (typeof Html5Qrcode === "undefined") {
        mostrarAlerta("No se pudo cargar el lector de QR. Revisá tu conexión a internet.", "danger");
        return;
    }

    lector = new Html5Qrcode("lector-qr");
    try {
        await lector.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            alLeerCodigo,
            () => {}, // errores de lectura frame a frame: se ignoran
        );
        escaneando = true;
        document.getElementById("btn-escanear").textContent = "Cancelar";
    } catch (err) {
        lector = null;
        mostrarAlerta(
            "No se pudo acceder a la cámara. Revisá los permisos del navegador (en el celular la cámara solo funciona con HTTPS o desde localhost).",
            "danger",
        );
    }
}

function iniciarVistaAlumno() {
    document.getElementById("btn-escanear").addEventListener("click", () => {
        if (escaneando) {
            detenerEscaneo();
        } else {
            iniciarEscaneo();
        }
    });

    document.getElementById("btn-token-manual").addEventListener("click", () => {
        const token = document.getElementById("token-manual").value.trim();
        if (!token) return;
        enviarToken(token);
    });
}
