const token = new URLSearchParams(window.location.search).get("token");

const alerta = document.getElementById("alerta");
const form = document.getElementById("form-restablecer");
const bloqueEnlaceInvalido = document.getElementById("bloque-enlace-invalido");

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
}

function limpiarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
}

function mostrarEnlaceInvalido() {
    form.classList.add("d-none");
    bloqueEnlaceInvalido.classList.remove("d-none");
    mostrarAlerta("El enlace no es válido o ya venció. Pedí uno nuevo.", "danger");
}

async function validarEnlace() {
    form.classList.add("d-none");
    try {
        const res = await fetch("/api/auth/validar-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, tipo: "restablecer" }),
        });
        const data = await res.json();
        if (!data.valido) {
            mostrarEnlaceInvalido();
            return;
        }
    } catch (err) {}
    form.classList.remove("d-none");
}

if (!token) {
    mostrarEnlaceInvalido();
} else {
    validarEnlace();
}

form.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const contrasena = document.getElementById("contrasena-nueva").value;
    const repetida = document.getElementById("contrasena-repetir").value;

    if (!contrasena) {
        mostrarAlerta("Ingresá la contraseña nueva", "danger");
        return;
    }
    if (contrasena !== repetida) {
        mostrarAlerta("Las contraseñas no coinciden", "danger");
        return;
    }

    const boton = document.getElementById("btn-guardar");
    boton.disabled = true;
    try {
        const res = await fetch("/api/auth/restablecer-contrasena", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, contrasena }),
        });
        const data = await res.json();

        if (res.ok) {
            window.location.href = "/login.html?aviso=contrasena_cambiada";
            return;
        }

        if (data.codigo === "token_invalido") {
            mostrarEnlaceInvalido();
        } else {
            mostrarAlerta(data.error || "No se pudo cambiar la contraseña", "danger");
        }
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    } finally {
        boton.disabled = false;
    }
});
