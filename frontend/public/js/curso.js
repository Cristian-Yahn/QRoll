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

// Hace el fetch, convierte la respuesta a JSON y devuelve { ok, data }.
// Si no hay conexión con el servidor, devuelve ok: false con un mensaje de error,
// así quien la llama solo tiene que mirar respuesta.ok. (Las funciones más
// viejas de este archivo repiten este patrón a mano: pueden pasarse a esta
// función como ejercicio.)
async function llamarApi(url, metodo = "GET", cuerpo = null) {
    try {
        const opciones = { method: metodo };
        if (cuerpo) {
            opciones.headers = { "Content-Type": "application/json" };
            opciones.body = JSON.stringify(cuerpo);
        }
        const res = await fetch(url, opciones);
        const data = await res.json();
        return { ok: res.ok, data };
    } catch (err) {
        return { ok: false, data: { error: "No se pudo conectar con el servidor" } };
    }
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

        // La franja de color de la tarjeta y la etiqueta de rol dependen del rol
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
        }

        cargarClases();
        cargarPublicaciones();
        cargarParticipantes();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

// Botón "Copiar" del código de acceso
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

// Botón "Regenerar" del código de acceso
document.getElementById("btn-regenerar-codigo").addEventListener("click", async () => {
    const confirmado = await confirmar({
        titulo: "Regenerar código de acceso",
        mensaje:
            "El código actual dejará de funcionar. Quienes ya están en el curso siguen adentro, pero nadie podrá unirse con el código viejo.",
        textoConfirmar: "Regenerar",
    });
    if (!confirmado) return;

    limpiarAlerta();
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/regenerar-codigo`, "POST", {
        id_usuario: usuario.id_usuario,
    });

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo regenerar el código", "danger");
        return;
    }

    document.getElementById("codigo-acceso").textContent = respuesta.data.codigo_acceso;
    mostrarAlerta("Código regenerado. El anterior ya no sirve para unirse.", "success");
});

/* =====================================================================
   Participantes: lista, eliminar, bloquear y desbloquear
   ===================================================================== */

function crearFilaParticipante(p) {
    const item = document.createElement("div");
    item.className = "list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap";

    const info = document.createElement("div");
    const nombre = document.createElement("div");
    nombre.className = "fw-semibold";
    nombre.textContent = `${p.nombre} ${p.apellido}${p.id_usuario === usuario.id_usuario ? " (vos)" : ""}`;
    info.appendChild(nombre);

    // El servidor solo manda el email cuando quien pregunta es profesor
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
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/participantes?id_usuario=${usuario.id_usuario}`);

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
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/participantes/${p.id_usuario}`, "DELETE", {
        id_usuario: usuario.id_usuario,
    });

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
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/participantes/${p.id_usuario}/bloquear`, "POST", {
        id_usuario: usuario.id_usuario,
    });

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
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/bloqueados?id_usuario=${usuario.id_usuario}`);

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
    const respuesta = await llamarApi(`/api/cursos/${idCurso}/bloqueados/${b.id_usuario}`, "DELETE", {
        id_usuario: usuario.id_usuario,
    });

    if (!respuesta.ok) {
        mostrarAlerta(respuesta.data.error || "No se pudo desbloquear al alumno", "danger");
        return;
    }

    mostrarAlerta(`${b.nombre} ${b.apellido} fue desbloqueado y puede volver a unirse`, "success");
    cargarBloqueados();
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
