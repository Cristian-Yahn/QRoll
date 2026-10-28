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
        claseActual = clase;
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

const INTERVALO_QR_SEG = 15;

let qrObj = null;
let cuentaRegresiva = 0;
let timerQr = null;
let timerCuenta = null;
let timerHistorial = null;
let alumnos = [];
let registrados = new Set();
let claveSelectActual = "";
let editandoId = null;
let ultimosRegistros = [];
let claseActual = null;

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
            detenerRotacionQr();
            if (res.status === 400) {
                claseActual.estado = "cerrada";
                actualizarUiEstado();
                mostrarAlerta("La asistencia se cerró automáticamente (pasaron 3 horas desde la apertura)", "info");
            } else {
                mostrarAlerta(data.error || "No se pudo generar el código QR", "danger");
            }
            return;
        }

        const enlace = `${window.location.origin}/asistencia-rapida.html?t=${data.token}`;
        document.getElementById("qr-token").textContent = enlace;

        const contenedor = document.getElementById("qr-contenedor");
        if (!qrObj) {
            qrObj = new QRCode(contenedor, {
                text: enlace,
                width: 220,
                height: 220,
                correctLevel: QRCode.CorrectLevel.M,
            });
        } else {
            qrObj.makeCode(enlace);
        }

        cuentaRegresiva = INTERVALO_QR_SEG;
        actualizarContador();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

function mostrarAvisoLocalhost() {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") return;

    const aviso = document.createElement("div");
    aviso.className = "alert alert-warning small text-start";
    aviso.textContent =
        "Estás usando localhost: los celulares no van a poder abrir este QR. " +
        "Abrí QRoll con la IP de tu PC (por ejemplo http://192.168.0.10:3000) o con un túnel HTTPS.";
    document.querySelector("#tarjeta-qr .card-body").prepend(aviso);
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

function crearControlesEdicion(registro) {
    const select = document.createElement("select");
    select.className = "form-select form-select-sm w-auto";
    select.setAttribute("aria-label", `Estado de ${registro.nombre} ${registro.apellido}`);
    Object.entries(ETIQUETA_ESTADO).forEach(([valor, texto]) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.appendChild(opcion);
    });
    select.value = registro.estado;

    const guardar = document.createElement("button");
    guardar.type = "button";
    guardar.className = "btn btn-sm btn-primary";
    guardar.textContent = "Guardar";
    guardar.addEventListener("click", () => guardarEdicion(registro, select.value, guardar));

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "btn btn-sm btn-outline-secondary";
    cancelar.textContent = "Cancelar";
    cancelar.addEventListener("click", () => {
        editandoId = null;
        renderizarHistorial(ultimosRegistros);
    });

    return [select, guardar, cancelar];
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
        item.className = "list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2";
        estilizarItemLista(item);

        const nombre = document.createElement("span");
        nombre.textContent = `${r.nombre} ${r.apellido}`;

        const derecha = document.createElement("span");
        derecha.className = "d-flex flex-wrap justify-content-end align-items-center gap-2 small";

        const meta = document.createElement("span");
        meta.className = "text-secondary-tema";
        meta.textContent = `${r.metodo === "qr" ? "QR" : "Manual"} · ${formatearHora(r.fecha_hora_registro)}`;
        derecha.appendChild(meta);

        if (r.id_asistencia === editandoId) {
            derecha.append(...crearControlesEdicion(r));
        } else {
            const badge = document.createElement("span");
            badge.className = `badge ${CLASE_ESTADO[r.estado] || "text-bg-secondary"}`;
            badge.textContent = ETIQUETA_ESTADO[r.estado] || r.estado;

            const editar = document.createElement("button");
            editar.type = "button";
            editar.className = "btn btn-sm btn-outline-secondary py-0";
            editar.textContent = "Editar";
            editar.setAttribute("aria-label", `Editar la asistencia de ${r.nombre} ${r.apellido}`);
            editar.addEventListener("click", () => {
                limpiarAlerta();
                editandoId = r.id_asistencia;
                renderizarHistorial(ultimosRegistros);
            });

            derecha.append(badge, editar);
        }

        item.append(nombre, derecha);
        lista.appendChild(item);
    });
}

async function guardarEdicion(registro, estado, boton) {
    limpiarAlerta();

    if (estado === registro.estado) {
        editandoId = null;
        renderizarHistorial(ultimosRegistros);
        return;
    }

    boton.disabled = true;
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/asistencia/${registro.id_asistencia}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo actualizar la asistencia", "danger");
            boton.disabled = false;
            return;
        }

        mostrarAlerta(`Asistencia de ${registro.nombre} ${registro.apellido} actualizada`, "success");
        editandoId = null;
        await cargarHistorial();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
        boton.disabled = false;
    }
}

async function cargarHistorial() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/asistencia?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();
        if (!res.ok) return;

        registrados = new Set(data.registros.map(r => r.id_usuario));
        ultimosRegistros = data.registros;
        if (editandoId === null) {
            renderizarHistorial(data.registros);
        }
        actualizarSelectAlumnos();
    } catch (err) {}
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

function actualizarUiEstado() {
    const abierta = claseActual.estado === "abierta";

    const badge = document.getElementById("badge-estado-asistencia");
    badge.textContent = abierta ? "Abierta" : "Cerrada";
    badge.className = `badge ${abierta ? "text-bg-success" : "text-bg-secondary"}`;

    document.getElementById("btn-abrir-asistencia").classList.toggle("d-none", abierta);
    document.getElementById("btn-cerrar-asistencia").classList.toggle("d-none", !abierta);
    document.getElementById("tarjeta-qr").classList.toggle("d-none", !abierta);
}

async function abrirAsistencia() {
    limpiarAlerta();
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/abrir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_usuario: usuario.id_usuario }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo abrir la asistencia", "danger");
            return;
        }

        claseActual = data.clase;
        actualizarUiEstado();
        iniciarRotacionQr();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

async function cerrarAsistencia() {
    const confirmado = await confirmar({
        titulo: "Cerrar asistencia",
        mensaje:
            "Los alumnos ya no van a poder registrarse con el QR. Si hace falta, podés volver a abrir la asistencia más tarde.",
        textoConfirmar: "Cerrar asistencia",
    });
    if (!confirmado) return;

    limpiarAlerta();
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases/${idClase}/cerrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_usuario: usuario.id_usuario }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo cerrar la asistencia", "danger");
            return;
        }

        claseActual = data.clase;
        actualizarUiEstado();
        detenerRotacionQr();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

async function iniciarVistaProfesor() {
    mostrarAvisoLocalhost();
    actualizarUiEstado();
    if (claseActual.estado === "abierta") {
        iniciarRotacionQr();
    }

    document.getElementById("btn-abrir-asistencia").addEventListener("click", abrirAsistencia);
    document.getElementById("btn-cerrar-asistencia").addEventListener("click", cerrarAsistencia);

    await cargarAlumnos();
    await cargarHistorial();
    timerHistorial = setInterval(cargarHistorial, 8000);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            detenerRotacionQr();
        } else if (claseActual.estado === "abierta") {
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
        } catch (err) {}
        lector = null;
    }
    escaneando = false;
    boton.textContent = "Escanear código";
}

function extraerToken(texto) {
    const limpio = texto.trim();
    try {
        return new URL(limpio).searchParams.get("t") || limpio;
    } catch (err) {
        return limpio;
    }
}

async function alLeerCodigo(texto) {
    if (procesando) return;
    procesando = true;
    await detenerEscaneo();
    await enviarToken(extraerToken(texto));
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
            () => {},
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
        const token = extraerToken(document.getElementById("token-manual").value);
        if (!token) return;
        enviarToken(token);
    });
}
