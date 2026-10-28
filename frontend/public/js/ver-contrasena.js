// Agrega un botón con forma de ojo a cada campo de contraseña de la página, para poder
// ver lo que se escribió y confirmar que no hay errores de tipeo.
// Solo hay que cargar este script: encuentra solo todos los <input type="password">.

(function () {
    // Ojo abierto = "mostrar"; ojo tachado = "ocultar". Se dibujan con "currentColor"
    // para que tomen el color del tema (claro, oscuro, etc.).
    const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    const ICONO_MOSTRAR = SVG + '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICONO_OCULTAR = SVG +
        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
        '<line x1="1" y1="1" x2="23" y2="23"/></svg>';

    // Edge dibuja su propio ojito dentro de los campos de contraseña: se oculta
    // para que no aparezcan dos.
    const estilo = document.createElement("style");
    estilo.textContent = 'input[type="password"]::-ms-reveal { display: none; }';
    document.head.appendChild(estilo);

    function agregarBoton(input) {
        // Si el script se cargara dos veces, no duplicar el botón
        if (input.dataset.verContrasena === "listo") return;
        input.dataset.verContrasena = "listo";

        // El input pasa a vivir dentro de un "input-group" de Bootstrap, junto al botón
        const grupo = document.createElement("div");
        grupo.className = "input-group";
        input.parentNode.insertBefore(grupo, input);
        grupo.appendChild(input);

        const boton = document.createElement("button");
        boton.type = "button"; // sin esto, el botón enviaría el formulario
        boton.className = "btn btn-outline-secondary d-flex align-items-center";

        function actualizarBoton() {
            const visible = input.type === "text";
            boton.innerHTML = visible ? ICONO_OCULTAR : ICONO_MOSTRAR;
            boton.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
            boton.setAttribute("aria-pressed", String(visible));
            boton.title = visible ? "Ocultar contraseña" : "Mostrar contraseña";
        }

        boton.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
            actualizarBoton();
            input.focus();
        });

        actualizarBoton();
        grupo.appendChild(boton);
    }

    document.querySelectorAll('input[type="password"]').forEach(agregarBoton);
})();
