(function () {
    const fetchOriginal = window.fetch;

    window.fetch = async function (...args) {
        const respuesta = await fetchOriginal(...args);

        const url = String(args[0]?.url ?? args[0]);
        const esPantallaDeAcceso = url.includes("/api/auth/login") || url.includes("/api/auth/registro");

        if (respuesta.status === 401 && !esPantallaDeAcceso) {
            localStorage.removeItem("usuario");
            const volver = window.location.pathname + window.location.search;
            window.location.href = `/login.html?volver=${encodeURIComponent(volver)}`;
        }

        return respuesta;
    };

    window.llamarApi = async function (url, metodo = "GET", cuerpo = null) {
        try {
            const opciones = { method: metodo };
            if (cuerpo) {
                opciones.headers = { "Content-Type": "application/json" };
                opciones.body = JSON.stringify(cuerpo);
            }
            const res = await window.fetch(url, opciones);
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
        } catch (err) {
            return { ok: false, status: 0, data: { error: "No se pudo conectar con el servidor" } };
        }
    };

    window.cerrarSesion = async function () {
        try {
            await fetchOriginal("/api/auth/logout", { method: "POST" });
        } catch (err) {}
        localStorage.removeItem("usuario");
        window.location.href = "/login.html";
    };
})();
