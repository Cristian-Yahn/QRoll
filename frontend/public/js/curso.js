const usuarioGuardado = localStorage.getItem("usuario");
if (!usuarioGuardado) {
    window.location.href = "/login.html";
}
const usuario = JSON.parse(usuarioGuardado);

const params = new URLSearchParams(window.location.search);
const idCurso = params.get("id");

if (!idCurso) {
    window.location.href = "/index.html";
}

const alerta = document.getElementById("alerta-curso");
let esProfesor = false;

let estadoPorClase = {};

const ETIQUETAS_ESTADO = {
    presente: { texto: "Presente", clase: "text-bg-success" },
    tarde: { texto: "Tarde", clase: "text-bg-warning" },
    justificado: { texto: "Justificado", clase: "text-bg-info" },
    ausente: { texto: "Ausente", clase: "text-bg-danger" },
};

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
}

function limpiarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
}

async function exportarExcel(e) {
    e.preventDefault();
    const boton = e.currentTarget;
    boton.classList.add("disabled");

    try {
        const res = await fetch(`/api/cursos/${idCurso}/exportar`);

        if (!res.ok) {
            if (res.status !== 401) {
                const data = await res.json().catch(() => ({}));
                mostrarAlerta(data.error || "No se pudo exportar el Excel", "danger");
            }
            return;
        }

        const disposicion = res.headers.get("Content-Disposition") || "";
        const nombreArchivo = (disposicion.match(/filename="([^"]+)"/) || [])[1] || "asistencia.xlsx";

        const url = URL.createObjectURL(await res.blob());
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    } finally {
        boton.classList.remove("disabled");
    }
}

async function cargarCurso() {
    const { ok, data } = await llamarApi(`/api/cursos/${idCurso}`);

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo cargar el curso", "danger");
        return;
    }

    esProfesor = data.curso.rol_en_curso === "profesor";

    document.getElementById("nombre-curso").textContent = data.curso.nombre_curso;
    document.title = `${data.curso.nombre_curso} — QRoll`;

    document.getElementById("tarjeta-curso").classList.add(esProfesor ? "rol-profesor" : "rol-alumno");

    const badgeRol = document.getElementById("badge-rol");
    badgeRol.textContent = esProfesor ? "Profesor" : "Alumno";
    badgeRol.className = `badge-rol mb-2 ${esProfesor ? "profesor" : "alumno"}`;

    const cantidad = data.cantidad_alumnos;
    document.getElementById("contador-alumnos").textContent =
        `${cantidad} ${cantidad === 1 ? "alumno inscripto" : "alumnos inscriptos"}`;

    if (esProfesor) {
        document.getElementById("wrap-codigo").classList.remove("d-none");
        document.getElementById("codigo-acceso").textContent = data.curso.codigo_acceso;
        document.getElementById("btn-nueva-clase").classList.remove("d-none");
        document.getElementById("form-publicacion").classList.remove("d-none");
        document.getElementById("card-bloqueados").classList.remove("d-none");
        cargarBloqueados();

        document.getElementById("item-tab-seguimiento").classList.remove("d-none");
        document.getElementById("btn-exportar").addEventListener("click", exportarExcel);
        cargarSeguimiento();
    }

    cargarClases();
    cargarPublicaciones();
    cargarParticipantes();
}

const btnCopiar = document.getElementById("btn-copiar-codigo");
btnCopiar.addEventListener("click", async () => {
    const codigo = document.getElementById("codigo-acceso").textContent;

    try {
        await navigator.clipboard.writeText(codigo);
        btnCopiar.textContent = "¡Copiado!";
        setTimeout(() => {
            btnCopiar.textContent = "Copiar";
        }, 1500);
    } catch (err) {
        mostrarAlerta("No se pudo copiar el código. Copialo a mano.", "warning");
    }
});

document.getElementById("btn-regenerar-codigo").addEventListener("click", async () => {
    const confirmado = await confirmar({
        titulo: "Regenerar código de acceso",
        mensaje:
            "El código actual dejará de funcionar. Quienes ya están en el curso siguen adentro, pero nadie podrá unirse con el código viejo.",
        textoConfirmar: "Regenerar",
    });
    if (!confirmado) return;

    limpiarAlerta();
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/regenerar-codigo`, "POST", {});

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo regenerar el código", "danger");
        return;
    }

    document.getElementById("codigo-acceso").textContent = respuesta.data.codigo_acceso;
    mostrarAlerta("Código regenerado. El anterior ya no sirve para unirse.", "success");
});

function crearFilaParticipante(p) {
    const item = document.createElement("div");
    item.className = "list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap";

    const info = document.createElement("div");
    const nombre = document.createElement("div");
    nombre.className = "fw-semibold";
    nombre.textContent = `${p.nombre} ${p.apellido}${p.id_usuario === usuario.id_usuario ? " (vos)" : ""}`;
    info.appendChild(nombre);

    if (p.email) {
        const email = document.createElement("div");
        email.className = "small text-secondary-tema";
        email.textContent = p.email;
        info.appendChild(email);
    }

    const derecha = document.createElement("div");
    derecha.className = "d-flex align-items-center gap-2";

    const rol = document.createElement("span");
    rol.className = `badge ${p.rol_en_curso === "profesor" ? "text-bg-primary" : "text-bg-secondary"}`;
    rol.textContent = p.rol_en_curso === "profesor" ? "Profesor" : "Alumno";
    derecha.appendChild(rol);

    if (esProfesor && p.rol_en_curso === "alumno") {
        const btnEliminar = document.createElement("button");
        btnEliminar.type = "button";
        btnEliminar.className = "btn btn-sm btn-outline-secondary";
        btnEliminar.textContent = "Eliminar";
        btnEliminar.addEventListener("click", () => eliminarAlumno(p));

        const btnBloquear = document.createElement("button");
        btnBloquear.type = "button";
        btnBloquear.className = "btn btn-sm btn-outline-danger";
        btnBloquear.textContent = "Bloquear";
        btnBloquear.addEventListener("click", () => bloquearAlumno(p));

        derecha.append(btnEliminar, btnBloquear);
    }

    item.append(info, derecha);
    return item;
}

async function cargarParticipantes() {
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/participantes`);

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudieron cargar los participantes", "danger");
        return;
    }

    const participantes = respuesta.data.participantes;
    const lista = document.getElementById("lista-participantes");
    lista.innerHTML = "";
    participantes.forEach(p => lista.appendChild(crearFilaParticipante(p)));

    const hayAlumnos = participantes.some(p => p.rol_en_curso === "alumno");
    document.getElementById("sin-alumnos").classList.toggle("d-none", hayAlumnos);
}

async function eliminarAlumno(p) {
    const confirmado = await confirmar({
        titulo: "Eliminar alumno",
        mensaje: `¿Querés sacar a ${p.nombre} ${p.apellido} de este curso? Podrá volver a unirse con el código de acceso.`,
        textoConfirmar: "Eliminar",
        peligro: true,
    });
    if (!confirmado) return;

    limpiarAlerta();
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/participantes/${p.id_usuario}`, "DELETE", {});

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo eliminar al alumno", "danger");
        return;
    }

    mostrarAlerta(`${p.nombre} ${p.apellido} fue eliminado del curso`, "success");
    cargarCurso();
}

async function bloquearAlumno(p) {
    const confirmado = await confirmar({
        titulo: "Bloquear alumno",
        mensaje: `${p.nombre} ${p.apellido} sale del curso y no podrá volver a unirse, aunque cambies el código de acceso. Podés desbloquearlo más tarde.`,
        textoConfirmar: "Bloquear",
        peligro: true,
    });
    if (!confirmado) return;

    limpiarAlerta();
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/participantes/${p.id_usuario}/bloquear`, "POST", {});

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo bloquear al alumno", "danger");
        return;
    }

    mostrarAlerta(`${p.nombre} ${p.apellido} fue bloqueado`, "success");
    cargarCurso();
}

function crearFilaBloqueado(b) {
    const item = document.createElement("div");
    item.className = "list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap";

    const info = document.createElement("div");
    const nombre = document.createElement("div");
    nombre.className = "fw-semibold";
    nombre.textContent = `${b.nombre} ${b.apellido}`;
    const email = document.createElement("div");
    email.className = "small text-secondary-tema";
    email.textContent = b.email;
    info.append(nombre, email);

    const btnDesbloquear = document.createElement("button");
    btnDesbloquear.type = "button";
    btnDesbloquear.className = "btn btn-sm btn-outline-primary";
    btnDesbloquear.textContent = "Desbloquear";
    btnDesbloquear.addEventListener("click", () => desbloquearAlumno(b));

    item.append(info, btnDesbloquear);
    return item;
}

async function cargarBloqueados() {
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/bloqueados`);

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudieron cargar los bloqueados", "danger");
        return;
    }

    const bloqueados = respuesta.data.bloqueados;
    const lista = document.getElementById("lista-bloqueados");
    lista.innerHTML = "";
    bloqueados.forEach(b => lista.appendChild(crearFilaBloqueado(b)));

    document.getElementById("sin-bloqueados").classList.toggle("d-none", bloqueados.length > 0);
}

async function desbloquearAlumno(b) {
    limpiarAlerta();
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/bloqueados/${b.id_usuario}`, "DELETE", {});

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo desbloquear al alumno", "danger");
        return;
    }

    mostrarAlerta(`${b.nombre} ${b.apellido} fue desbloqueado y puede volver a unirse`, "success");
    cargarBloqueados();
}

let alumnosSeguimiento = [];
let ordenSeguimiento = { campo: "apellido", direccion: "asc" };

const COMPARADORES = {
    apellido: (a, b) => a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es"),
    asistidas: (a, b) => a.asistidas - b.asistidas,
    porcentaje: (a, b) => (a.porcentaje ?? -1) - (b.porcentaje ?? -1),
};

async function cargarSeguimiento() {
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/resumen-alumnos`);

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo cargar el seguimiento", "danger");
        return;
    }

    const total = respuesta.data.clases_totales;
    document.getElementById("seg-clases-tomadas").textContent =
        `${total} ${total === 1 ? "clase tomada" : "clases tomadas"}`;

    alumnosSeguimiento = respuesta.data.alumnos;
    pintarSeguimiento();
}

function cambiarOrdenSeguimiento(campo) {
    if (ordenSeguimiento.campo === campo) {
        ordenSeguimiento.direccion = ordenSeguimiento.direccion === "asc" ? "desc" : "asc";
    } else {
        ordenSeguimiento = { campo, direccion: campo === "apellido" ? "asc" : "desc" };
    }
    pintarSeguimiento();
}

function crearCeldaNumero(valor) {
    const celda = document.createElement("td");
    celda.className = "text-center";
    celda.textContent = valor;
    return celda;
}

function pintarSeguimiento() {
    const hayAlumnos = alumnosSeguimiento.length > 0;
    document.getElementById("seg-tabla").classList.toggle("d-none", !hayAlumnos);
    document.getElementById("seg-sin-alumnos").classList.toggle("d-none", hayAlumnos);

    document.querySelectorAll("#seguimiento-encabezado [data-orden]").forEach(boton => {
        const activo = boton.dataset.orden === ordenSeguimiento.campo;
        boton.classList.toggle("activo", activo);
        boton.querySelector(".flecha-orden").textContent = activo
            ? ordenSeguimiento.direccion === "asc"
                ? "▲"
                : "▼"
            : "";
        boton
            .closest("th")
            .setAttribute(
                "aria-sort",
                activo ? (ordenSeguimiento.direccion === "asc" ? "ascending" : "descending") : "none",
            );
    });

    const comparador = COMPARADORES[ordenSeguimiento.campo];
    const sentido = ordenSeguimiento.direccion === "asc" ? 1 : -1;

    const ordenados = [...alumnosSeguimiento].sort((a, b) => comparador(a, b) * sentido || COMPARADORES.apellido(a, b));

    const cuerpo = document.getElementById("cuerpo-seguimiento");
    cuerpo.innerHTML = "";

    ordenados.forEach(alumno => {
        const fila = document.createElement("tr");

        const celdaNombre = document.createElement("td");
        celdaNombre.className = "fw-semibold";
        celdaNombre.textContent = `${alumno.apellido}, ${alumno.nombre}`;

        const celdaPorcentaje = document.createElement("td");
        celdaPorcentaje.className = "text-center";
        if (alumno.porcentaje === null) {
            celdaPorcentaje.textContent = "–";
        } else {
            const texto = document.createElement("div");
            texto.className = "fw-bold";
            texto.textContent = `${alumno.porcentaje}%`;

            const barra = document.createElement("div");
            barra.className = "progress progress-fino";
            const relleno = document.createElement("div");
            relleno.className = "progress-bar";
            relleno.style.width = `${alumno.porcentaje}%`;
            barra.appendChild(relleno);

            celdaPorcentaje.append(texto, barra);
        }

        fila.append(
            celdaNombre,
            crearCeldaNumero(`${alumno.asistidas} / ${alumno.clases_totales}`),
            celdaPorcentaje,
            crearCeldaNumero(alumno.justificadas),
            crearCeldaNumero(alumno.ausentes),
        );
        cuerpo.appendChild(fila);
    });
}

document.getElementById("seguimiento-encabezado").addEventListener("click", e => {
    const boton = e.target.closest("[data-orden]");
    if (!boton) return;
    cambiarOrdenSeguimiento(boton.dataset.orden);
});

function formatearFechaHora(fechaSqlite) {
    const fecha = new Date(fechaSqlite.replace(" ", "T") + "Z");
    return fecha.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function crearComentario(comentario) {
    const item = document.createElement("div");
    item.className = "d-flex gap-2 mb-1";

    const autor = document.createElement("strong");
    autor.className = "small";
    autor.textContent = `${comentario.nombre}:`;

    const texto = document.createElement("span");
    texto.className = "small";
    texto.textContent = comentario.contenido;

    item.append(autor, texto);
    return item;
}

function crearTarjetaPublicacion(publicacion) {
    const card = document.createElement("div");
    card.className = "border-bottom pb-3 mb-3";

    const encabezado = document.createElement("div");
    encabezado.className = "d-flex justify-content-between align-items-baseline mb-1";

    const autor = document.createElement("strong");
    autor.className = "small";
    autor.textContent = `${publicacion.nombre} ${publicacion.apellido}`;

    const fecha = document.createElement("span");
    fecha.className = "small text-secondary-tema";
    fecha.textContent = formatearFechaHora(publicacion.fecha_publicacion);

    encabezado.append(autor, fecha);

    const contenido = document.createElement("p");
    contenido.className = "mb-2";
    contenido.textContent = publicacion.contenido;

    card.append(encabezado, contenido);

    if (publicacion.enlace) {
        const link = document.createElement("a");
        link.href = publicacion.enlace;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "d-inline-block mb-2 small";
        link.textContent = "🔗 Ver enlace";
        card.appendChild(link);
    }

    const comentarios = document.createElement("div");
    comentarios.className = "ms-2 mb-2";
    publicacion.comentarios.forEach(c => comentarios.appendChild(crearComentario(c)));
    card.appendChild(comentarios);

    const formComentario = document.createElement("form");
    formComentario.className = "d-flex gap-2";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control form-control-sm";
    input.placeholder = "Responder...";
    input.required = true;

    const boton = document.createElement("button");
    boton.type = "submit";
    boton.className = "btn btn-sm btn-outline-secondary";
    boton.textContent = "Enviar";

    formComentario.append(input, boton);

    formComentario.addEventListener("submit", async e => {
        e.preventDefault();
        const contenido = input.value;
        if (!contenido) return;

        const { ok, data } = await llamarApi(
            `/api/cursos/${idCurso}/publicaciones/${publicacion.id_publicacion}/comentarios`,
            "POST",
            { contenido },
        );

        if (!ok) {
            mostrarAlerta(data.error || "No se pudo enviar el comentario", "danger");
            return;
        }

        input.value = "";
        cargarPublicaciones();
    });

    card.appendChild(formComentario);
    return card;
}

async function cargarPublicaciones() {
    const { ok, data } = await llamarApi(`/api/cursos/${idCurso}/publicaciones`);

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo cargar el tablón", "danger");
        return;
    }

    const lista = document.getElementById("lista-publicaciones");
    const sinPublicaciones = document.getElementById("sin-publicaciones");
    lista.innerHTML = "";

    if (data.publicaciones.length === 0) {
        sinPublicaciones.classList.remove("d-none");
        return;
    }
    sinPublicaciones.classList.add("d-none");

    data.publicaciones.forEach(p => lista.appendChild(crearTarjetaPublicacion(p)));
}

document.getElementById("form-publicacion").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const contenido = document.getElementById("publicacion-contenido").value;
    const enlace = document.getElementById("publicacion-enlace").value;

    const { ok, data } = await llamarApi(`/api/cursos/${idCurso}/publicaciones`, "POST", { contenido, enlace });

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo publicar", "danger");
        return;
    }

    document.getElementById("form-publicacion").reset();
    cargarPublicaciones();
});

async function cargarMiAsistencia() {
    if (esProfesor) return;

    const respuesta = await llamarApi(`/api/cursos/${idCurso}/mi-asistencia`);

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo cargar tu asistencia", "danger");
        return;
    }

    estadoPorClase = {};
    respuesta.data.registros.forEach(r => {
        estadoPorClase[r.id_clase] = r.estado;
    });

    pintarResumenAsistencia(respuesta.data.resumen);
}

function pintarResumenAsistencia(resumen) {
    document.getElementById("card-mi-asistencia").classList.remove("d-none");

    const hayDatos = resumen.clases_totales > 0;
    document.getElementById("asist-contenido").classList.toggle("d-none", !hayDatos);
    document.getElementById("asist-vacio").classList.toggle("d-none", hayDatos);
    if (!hayDatos) return;

    document.getElementById("asist-asistidas").textContent = resumen.asistidas;
    document.getElementById("asist-totales").textContent = resumen.clases_totales;
    document.getElementById("asist-porcentaje").textContent = `${resumen.porcentaje}%`;
    document.getElementById("asist-presentes").textContent = resumen.presentes;
    document.getElementById("asist-tardes").textContent = resumen.tardes;
    document.getElementById("asist-justificadas").textContent = resumen.justificadas;
    document.getElementById("asist-ausentes").textContent = resumen.ausentes;

    document.getElementById("asist-barra").style.width = `${resumen.porcentaje}%`;
    document.getElementById("asist-progreso").setAttribute("aria-valuenow", resumen.porcentaje);
}

function formatearFecha(fechaISO) {
    const [anio, mes, dia] = fechaISO.split("-");
    return `${dia}/${mes}/${anio}`;
}

function renderizarClases(clases) {
    const lista = document.getElementById("lista-clases");
    const sinClases = document.getElementById("sin-clases");
    lista.innerHTML = "";

    if (clases.length === 0) {
        sinClases.classList.remove("d-none");
        return;
    }
    sinClases.classList.add("d-none");

    clases.forEach(clase => {
        const item = document.createElement("a");
        item.href = `/asistencia.html?id_curso=${idCurso}&id_clase=${clase.id_clase}`;
        item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

        const texto = document.createElement("span");
        texto.textContent = `Clase ${formatearFecha(clase.fecha)}`;

        const derecha = document.createElement("span");
        derecha.className = "d-flex align-items-center gap-2";

        if (clase.estado === "abierta") {
            const badge = document.createElement("span");
            badge.className = "badge text-bg-success";
            badge.textContent = "Abierta";
            derecha.appendChild(badge);
        }

        const estado = estadoPorClase[clase.id_clase];
        if (estado) {
            const badgeEstado = document.createElement("span");
            badgeEstado.className = `badge ${ETIQUETAS_ESTADO[estado].clase}`;
            badgeEstado.textContent = ETIQUETAS_ESTADO[estado].texto;
            derecha.appendChild(badgeEstado);
        }

        const flecha = document.createElement("span");
        flecha.textContent = "›";
        derecha.appendChild(flecha);

        item.append(texto, derecha);
        lista.appendChild(item);
    });
}

async function cargarClases() {
    await cargarMiAsistencia();
    const { ok, data } = await llamarApi(`/api/cursos/${idCurso}/clases`);

    if (!ok) {
        mostrarAlerta(data.error || "No se pudieron cargar las clases", "danger");
        return;
    }

    renderizarClases(data.clases);
}

document.getElementById("modal-nueva-clase").addEventListener("show.bs.modal", () => {
    const hoy = new Date().toLocaleDateString("en-CA");
    const campoFecha = document.getElementById("nueva-clase-fecha");
    campoFecha.min = hoy;
    campoFecha.value = hoy;
});

document.getElementById("form-nueva-clase").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const fecha = document.getElementById("nueva-clase-fecha").value;

    const { ok, data } = await llamarApi(`/api/cursos/${idCurso}/clases`, "POST", { fecha });

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo crear la clase", "danger");
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById("modal-nueva-clase")).hide();
    document.getElementById("form-nueva-clase").reset();
    mostrarAlerta("Clase creada correctamente", "success");
    cargarClases();
});

cargarCurso();
