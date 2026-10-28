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

    window.cerrarSesion = async function () {
        try {
            await fetchOriginal("/api/auth/logout", { method: "POST" });
        } catch (err) {}
        localStorage.removeItem("usuario");
        window.location.href = "/login.html";
    };
})();
