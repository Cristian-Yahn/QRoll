const usuarioGuardado = localStorage.getItem("usuario");
if (!usuarioGuardado) {
    window.location.href = "/login.html";
}
const usuario = JSON.parse(usuarioGuardado);

document.getElementById("nombre-usuario").textContent = `${usuario.nombre} ${usuario.apellido}`;

const alerta = document.getElementById("alerta-dashboard");
const listaCursos = document.getElementById("lista-cursos");
const sinCursos = document.getElementById("sin-cursos");

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
}

function limpiarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
}

function renderizarCursos(cursos) {
    const activos = cursos.filter(curso => !curso.archivado);
    renderizarArchivados(cursos.filter(curso => curso.archivado));

    listaCursos.innerHTML = "";

    if (activos.length === 0) {
        sinCursos.classList.remove("d-none");
        return;
    }
    sinCursos.classList.add("d-none");

    activos.forEach(curso => {
        const esProfesor = curso.rol_en_curso === "profesor";
        const item = document.createElement("a");
        item.href = `/curso.html?id=${curso.id_curso}`;
        item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

        const nombre = document.createElement("span");
        nombre.textContent = curso.nombre_curso;

        const badge = document.createElement("span");
        badge.className = `badge ${esProfesor ? "text-bg-primary" : "text-bg-secondary"}`;
        badge.textContent = esProfesor ? "Profesor" : "Alumno";

        item.append(nombre, badge);
        listaCursos.appendChild(item);
    });
}

/* ---------- Cursos archivados ---------- */

const seccionArchivados = document.getElementById("seccion-archivados");
const botonArchivados = document.getElementById("btn-toggle-archivados");
const listaArchivados = document.getElementById("lista-archivados");

botonArchivados.addEventListener("click", () => {
    const seAbre = listaArchivados.classList.contains("d-none");
    listaArchivados.classList.toggle("d-none", !seAbre);
    botonArchivados.setAttribute("aria-expanded", String(seAbre));
});

function renderizarArchivados(archivados) {
    listaArchivados.innerHTML = "";
    seccionArchivados.classList.toggle("d-none", archivados.length === 0);
    botonArchivados.textContent = `Cursos archivados (${archivados.length})`;

    archivados.forEach(curso => {
        const esProfesor = curso.rol_en_curso === "profesor";

        const item = document.createElement("div");
        item.className = "list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2";

        const enlace = document.createElement("a");
        enlace.href = `/curso.html?id=${curso.id_curso}`;
        enlace.textContent = curso.nombre_curso;

        const derecha = document.createElement("span");
        derecha.className = "d-flex align-items-center gap-2";

        const badge = document.createElement("span");
        badge.className = `badge ${esProfesor ? "text-bg-primary" : "text-bg-secondary"}`;
        badge.textContent = esProfesor ? "Profesor" : "Alumno";
        derecha.appendChild(badge);

        if (esProfesor) {
            const restaurar = document.createElement("button");
            restaurar.type = "button";
            restaurar.className = "btn btn-sm btn-outline-primary";
            restaurar.textContent = "Restaurar";
            restaurar.setAttribute("aria-label", `Restaurar el curso ${curso.nombre_curso}`);
            restaurar.addEventListener("click", () => restaurarCurso(curso, restaurar));
            derecha.appendChild(restaurar);
        }

        item.append(enlace, derecha);
        listaArchivados.appendChild(item);
    });
}

async function restaurarCurso(curso, boton) {
    boton.disabled = true;
    const { ok, data } = await llamarApi(`/api/cursos/${curso.id_curso}/restaurar`, "POST", {});

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo restaurar el curso", "danger");
        boton.disabled = false;
        return;
    }

    mostrarAlerta(`El curso "${curso.nombre_curso}" volvió a la lista principal`, "success");
    cargarCursos();
}

async function cargarCursos() {
    const { ok, data } = await llamarApi("/api/cursos");

    if (!ok) {
        mostrarAlerta(data.error || "No se pudieron cargar los cursos", "danger");
        return;
    }

    renderizarCursos(data.cursos);
}

// ----- Crear curso -----
document.getElementById("form-crear-curso").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const nombre_curso = document.getElementById("crear-nombre-curso").value;

    const { ok, data } = await llamarApi("/api/cursos", "POST", { nombre_curso });

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo crear el curso", "danger");
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById("modal-crear")).hide();
    document.getElementById("form-crear-curso").reset();
    mostrarAlerta(`Curso creado. Código de acceso: ${data.curso.codigo_acceso}`, "success");
    cargarCursos();
});

// ----- Unirse a curso -----
document.getElementById("form-unirse-curso").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const codigo_acceso = document.getElementById("unirse-codigo").value.toUpperCase();

    const { ok, data } = await llamarApi("/api/cursos/unirse", "POST", { codigo_acceso });

    if (!ok) {
        mostrarAlerta(data.error || "No se pudo unir al curso", "danger");
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById("modal-unirse")).hide();
    document.getElementById("form-unirse-curso").reset();
    mostrarAlerta(`Te uniste a "${data.curso.nombre_curso}" correctamente`, "success");
    cargarCursos();
});

document.getElementById("btn-salir").addEventListener("click", async () => {
    const confirmado = await confirmar({
        titulo: "Cerrar sesión",
        mensaje: "¿Querés cerrar tu sesión?",
        textoConfirmar: "Cerrar sesión",
    });
    if (!confirmado) return;
    cerrarSesion();
});

cargarCursos();
