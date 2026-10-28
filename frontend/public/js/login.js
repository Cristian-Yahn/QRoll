const alerta = document.getElementById("alerta");
const formLogin = document.getElementById("form-login");
const formRegistro = document.getElementById("form-registro");

function mostrarAlerta(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
}

function limpiarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
}

document.getElementById("tab-login-btn").addEventListener("click", limpiarAlerta);
document.getElementById("tab-registro-btn").addEventListener("click", limpiarAlerta);

function destinoDespuesDelLogin() {
    const volver = new URLSearchParams(window.location.search).get("volver");
    if (!volver || !volver.startsWith("/")) return "/index.html";

    try {
        const destino = new URL(volver, window.location.origin);
        if (destino.origin !== window.location.origin) return "/index.html";
        return destino.pathname + destino.search + destino.hash;
    } catch (err) {
        return "/index.html";
    }
}

// ----- Login -----
formLogin.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const email = document.getElementById("login-email").value;
    const contrasena = document.getElementById("login-contrasena").value;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, contrasena }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo iniciar sesión", res.status === 423 ? "warning" : "danger");
            return;
        }

        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        window.location.href = destinoDespuesDelLogin();
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
});

// ----- Registro -----
formRegistro.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const nombre = document.getElementById("reg-nombre").value;
    const apellido = document.getElementById("reg-apellido").value;
    const email = document.getElementById("reg-email").value;
    const contrasena = document.getElementById("reg-contrasena").value;

    try {
        const res = await fetch("/api/auth/registro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, apellido, email, contrasena }),
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.error || "No se pudo registrar", "danger");
            return;
        }

        formRegistro.reset();
        document.getElementById("login-email").value = email;

        const tabLogin = new bootstrap.Tab(document.getElementById("tab-login-btn"));
        tabLogin.show();
        mostrarAlerta("Cuenta creada correctamente. Ahora podés iniciar sesión.", "success");
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
});

const vistaRecuperar = document.getElementById("vista-recuperar");
const elementosAcceso = [document.getElementById("tabs"), document.querySelector(".tab-content")];

function mostrarRecuperar() {
    limpiarAlerta();
    elementosAcceso.forEach(el => el.classList.add("d-none"));
    vistaRecuperar.classList.remove("d-none");

    const emailLogin = document.getElementById("login-email").value;
    if (emailLogin) document.getElementById("recuperar-email").value = emailLogin;
    document.getElementById("recuperar-email").focus();
}

function mostrarAcceso() {
    limpiarAlerta();
    vistaRecuperar.classList.add("d-none");
    elementosAcceso.forEach(el => el.classList.remove("d-none"));
}

document.getElementById("link-olvide").addEventListener("click", mostrarRecuperar);
document.getElementById("recuperar-volver").addEventListener("click", mostrarAcceso);

document.getElementById("form-recuperar").addEventListener("submit", async e => {
    e.preventDefault();
    limpiarAlerta();

    const email = document.getElementById("recuperar-email").value.trim();
    if (!email) {
        mostrarAlerta("Ingresá tu email", "danger");
        return;
    }

    const boton = document.getElementById("recuperar-enviar");
    boton.disabled = true;
    try {
        const res = await fetch("/api/auth/pedir-cambio-contrasena", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        mostrarAlerta(data.mensaje || data.error, res.ok ? "success" : "danger");
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    } finally {
        boton.disabled = false;
    }
});

const paramsUrl = new URLSearchParams(window.location.search);
if (paramsUrl.get("aviso") === "contrasena_cambiada") {
    mostrarAlerta("Contraseña actualizada. Ya podés iniciar sesión con la nueva.", "success");
}
if (paramsUrl.get("recuperar") === "1") {
    mostrarRecuperar();
}
