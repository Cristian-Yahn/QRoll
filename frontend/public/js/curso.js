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

async function cargarCurso() {
    try {
        const res = await fetch(`/api/cursos/${idCurso}?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo cargar el curso", "danger");
            return;
        }

        const esProfesor = data.curso.rol_en_curso === "profesor";

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
        }

        cargarClases();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
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
        const flecha = document.createElement("span");
        flecha.textContent = "›";

        item.append(texto, flecha);
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

cargarCurso();
