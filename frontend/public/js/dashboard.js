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
    try {
        const res = await fetch(`/api/cursos?id_usuario=${usuario.id_usuario}`);
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudieron cargar los cursos", "danger");
            return;
        }

        renderizarCursos(data.cursos);
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
}

document.getElementById("btn-salir").addEventListener("click", () => {
    localStorage.removeItem("usuario");
    window.location.href = "/login.html";
});

cargarCursos();
