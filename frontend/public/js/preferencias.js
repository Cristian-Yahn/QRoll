// Este script se auto-inserta en cualquier página que lo incluya: crea el
// botón flotante de preferencias y su modal, sin necesidad de repetir el
// HTML en cada pantalla. Requiere que la página ya haya cargado Bootstrap
// (CSS y JS) y /css/tema.css antes de este script.

(function () {
    const TEMAS = [
        { valor: "claro", etiqueta: "Claro" },
        { valor: "medio", etiqueta: "Medio" },
        { valor: "oscuro", etiqueta: "Oscuro" },
    ];

    const TAMANOS_FUENTE = [
        { valor: "pequena", etiqueta: "Pequeña" },
        { valor: "mediana", etiqueta: "Mediana" },
        { valor: "grande", etiqueta: "Grande" },
    ];

    function crearGrupoBotones(opciones, valorActual, dataAttr) {
        return opciones
            .map(
                op => `
        <button
          type="button"
          class="btn btn-outline-secondary ${op.valor === valorActual ? "active" : ""}"
          data-${dataAttr}="${op.valor}"
        >${op.etiqueta}</button>`,
            )
            .join("");
    }

    function montarPreferencias() {
        const temaActual = localStorage.getItem("tema") || "claro";
        const fuenteActual = localStorage.getItem("fuente") || "mediana";

        // Botón flotante
        const boton = document.createElement("button");
        boton.className = "btn-preferencias";
        boton.setAttribute("type", "button");
        boton.setAttribute("aria-label", "Preferencias");
        boton.setAttribute("data-bs-toggle", "modal");
        boton.setAttribute("data-bs-target", "#modal-preferencias");
        boton.textContent = "⚙";
        document.body.appendChild(boton);

        // Modal
        const modalHTML = `
      <div class="modal fade" id="modal-preferencias" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Preferencias</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <label class="form-label d-block mb-2">Tema</label>
              <div class="btn-group mb-4" role="group" id="pref-grupo-tema">
                ${crearGrupoBotones(TEMAS, temaActual, "tema-valor")}
              </div>

              <label class="form-label d-block mb-2">Tamaño de fuente</label>
              <div class="btn-group" role="group" id="pref-grupo-fuente">
                ${crearGrupoBotones(TAMANOS_FUENTE, fuenteActual, "fuente-valor")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);

        // Aplicar tema
        document.getElementById("pref-grupo-tema").addEventListener("click", e => {
            const btn = e.target.closest("[data-tema-valor]");
            if (!btn) return;
            const tema = btn.dataset.temaValor;
            document.documentElement.setAttribute("data-tema", tema);
            localStorage.setItem("tema", tema);
            document.querySelectorAll("#pref-grupo-tema button").forEach(b => b.classList.toggle("active", b === btn));
        });

        // Aplicar tamaño de fuente
        document.getElementById("pref-grupo-fuente").addEventListener("click", e => {
            const btn = e.target.closest("[data-fuente-valor]");
            if (!btn) return;
            const fuente = btn.dataset.fuenteValor;
            document.documentElement.setAttribute("data-fuente", fuente);
            localStorage.setItem("fuente", fuente);
            document
                .querySelectorAll("#pref-grupo-fuente button")
                .forEach(b => b.classList.toggle("active", b === btn));
        });
    }

    // Restaurar preferencias guardadas apenas carga la página (antes de pintar
    // el modal, para que la web ya se vea con el tema/fuente correctos)
    document.documentElement.setAttribute("data-tema", localStorage.getItem("tema") || "claro");
    document.documentElement.setAttribute("data-fuente", localStorage.getItem("fuente") || "mediana");

    document.addEventListener("DOMContentLoaded", montarPreferencias);

    // Arregla un warning de accesibilidad de Bootstrap: si el foco del teclado
    // queda dentro de un modal justo cuando este empieza a cerrarse, hay que
    // sacarle el foco antes de que Bootstrap le ponga aria-hidden="true".
    // Aplica a TODOS los modales de la página (preferencias, crear curso, etc.).
    document.addEventListener("hide.bs.modal", event => {
        if (event.target.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    });
})();
