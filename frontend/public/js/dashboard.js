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
    listaCursos.innerHTML = "";

    if (cursos.length === 0) {
        sinCursos.classList.remove("d-none");
        return;
    }
    sinCursos.classList.add("d-none");

    cursos.forEach(curso => {
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
