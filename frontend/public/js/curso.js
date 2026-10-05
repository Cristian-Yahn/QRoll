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

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
}

function limpiarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
}

/* =====================================================================
   Datos del curso
   ===================================================================== */

async function cargarCurso() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo cargar el curso", "danger");
            return;
        }

        esProfesor = data.curso.rol_en_curso === "profesor";

        document.getElementById("nombre-curso").textContent = data.curso.nombre_curso;
        document.title = `${data.curso.nombre_curso} — QRoll`;

        const badgeRol = document.getElementById("badge-rol");
        badgeRol.textContent = esProfesor ? "Profesor" : "Alumno";
        badgeRol.className = `badge ${esProfesor ? "text-bg-primary" : "text-bg-secondary"}`;

        document.getElementById("contador-alumnos").textContent = `${data.cantidad_alumnos} alumnos inscriptos`;

        if (esProfesor) {
            document.getElementById("wrap-codigo").classList.remove("d-none");
            document.getElementById("codigo-acceso").textContent = data.curso.codigo_acceso;
            document.getElementById("btn-nueva-clase").classList.remove("d-none");
            document.getElementById("form-publicacion").classList.remove("d-none");
        }

        cargarClases();
        cargarPublicaciones();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

/* =====================================================================
   Tablón: publicaciones y comentarios
   ===================================================================== */

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

        try {
            const res = await fetch(`/api/cursos/${idCurso}/publicaciones/${publicacion.id_publicacion}/comentarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contenido, id_usuario: usuario.id_usuario }),
            });
            const data = await res.json();

            if (!res.ok) {
                mostrarAlerta(data.error || "No se pudo enviar el comentario", "danger");
                return;
            }

            input.value = "";
            cargarPublicaciones();
        } catch (err) {
            mostrarAlerta("No se pudo conectar con el servidor", "danger");
        }
    });

    card.appendChild(formComentario);
    return card;
}

async function cargarPublicaciones() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}/publicaciones?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();

        if (!res.ok) {
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
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

document.getElementById("form-publicacion").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const contenido = document.getElementById("publicacion-contenido").value;
    const enlace = document.getElementById("publicacion-enlace").value;

    try {
        const res = await fetch(`/api/cursos/${idCurso}/publicaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contenido, enlace, id_usuario: usuario.id_usuario }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo publicar", "danger");
            return;
        }

        document.getElementById("form-publicacion").reset();
        cargarPublicaciones();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
});

/* =====================================================================
   Clases
   ===================================================================== */

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

        const flecha = document.createElement("span");
        flecha.textContent = "›";
        derecha.appendChild(flecha);

        item.append(texto, derecha);
        lista.appendChild(item);
    });
}

async function cargarClases() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudieron cargar las clases", "danger");
            return;
        }

        renderizarClases(data.clases);
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

document.getElementById("form-nueva-clase").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const fecha = document.getElementById("nueva-clase-fecha").value;

    try {
        const res = await fetch(`/api/cursos/${idCurso}/clases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, id_usuario: usuario.id_usuario }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo crear la clase", "danger");
            return;
        }

        bootstrap.Modal.getInstance(document.getElementById("modal-nueva-clase")).hide();
        document.getElementById("form-nueva-clase").reset();
        mostrarAlerta("Clase creada correctamente", "success");
        cargarClases();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
});

/* =====================================================================
   Arranque
   ===================================================================== */

cargarCurso();
