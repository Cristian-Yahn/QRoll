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
            mostrarAlerta(data.error || "No se pudo iniciar sesión", "danger");
            return;
        }

        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        window.location.href = "/index.html";
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

// ----- Olvidé mi contraseña -----
document.getElementById("link-olvide").addEventListener("click", async () => {
    limpiarAlerta();
    const email = document.getElementById("login-email").value;

    if (!email) {
        mostrarAlerta("Ingresá tu email arriba y volvé a hacer clic", "danger");
        return;
    }

    try {
        const res = await fetch("/api/auth/pedir-cambio-contrasena", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        mostrarAlerta(data.mensaje, "success");
    } catch (err) {
        mostrarAlerta("No se pudo conectar con el servidor", "danger");
    }
});
