// Manejo de sesión compartido por las pantallas que requieren estar logueado
// (inicio, curso, asistencia). Va DESPUÉS de Bootstrap y ANTES del script
// propio de cada página.
//
// 1) Envuelve a fetch: si el servidor contesta 401 (no hay sesión, o venció),
//    limpia lo guardado en el navegador y manda a la persona al login.
//    Así no hay que repetir ese chequeo en cada pedido de cada pantalla.
// 2) Ofrece cerrarSesion(), que le avisa al servidor para que borre la cookie
//    (desde JavaScript no se puede: es httpOnly) y después vuelve al login.

(function () {
    const fetchOriginal = window.fetch;

    window.fetch = async function (...args) {
        const respuesta = await fetchOriginal(...args);

        // Un 401 en el login o el registro significa "credenciales inválidas",
        // no "sesión vencida": ahí no hay que redirigir
        const url = String(args[0]?.url ?? args[0]);
        const esPantallaDeAcceso = url.includes("/api/auth/login") || url.includes("/api/auth/registro");

        if (respuesta.status === 401 && !esPantallaDeAcceso) {
            localStorage.removeItem("usuario");
            // Guardamos la página actual para volver después de iniciar sesión
            // (importante cuando la persona llegó escaneando un QR)
            const volver = window.location.pathname + window.location.search;
            window.location.href = `/login.html?volver=${encodeURIComponent(volver)}`;
        }

        return respuesta;
    };

    window.cerrarSesion = async function () {
        try {
            await fetchOriginal("/api/auth/logout", { method: "POST" });
        } catch (err) {
            // Si el servidor no responde igual salimos del lado del navegador
        }
        localStorage.removeItem("usuario");
        window.location.href = "/login.html";
    };
})();
