// Pantalla a la que llega la persona desde el correo:
//   /restablecer.html?token=<token>
// Pide la contraseña nueva y se la manda al servidor junto con el token.
// Esta pantalla NO usa sesion.js: quien llega acá justamente no tiene sesión.

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

// El enlace no sirve (falta el token, venció o ya se usó): se esconde el formulario
// y se ofrece pedir uno nuevo
function mostrarEnlaceInvalido() {
    form.classList.add("d-none");
    bloqueEnlaceInvalido.classList.remove("d-none");
    mostrarAlerta("El enlace no es válido o ya venció. Pedí uno nuevo.", "danger");
}

// Apenas se abre la página se le pregunta al servidor si el enlace todavía sirve (no se
// gasta nada): así, un enlace ya usado o vencido avisa enseguida, en vez de dejar completar
// el formulario y fallar recién al enviarlo.
async function validarEnlace() {
    // Mientras se consulta, el formulario queda oculto para que no parpadee
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
    } catch (err) {
        // Sin conexión no podemos saberlo: se muestra el formulario igual y el servidor
        // lo valida de todas formas al enviarlo
    }
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
            // Listo: al login, con un aviso de que ya puede entrar con la contraseña nueva
            window.location.href = "/login.html?aviso=contrasena_cambiada";
            return;
        }

        if (data.codigo === "token_invalido") {
            mostrarEnlaceInvalido();
        } else {
            // Por ejemplo "La contraseña debe incluir una mayúscula": puede corregirla y reintentar
            mostrarAlerta(data.error || "No se pudo cambiar la contraseña", "danger");
        }
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    } finally {
        boton.disabled = false;
    }
});
