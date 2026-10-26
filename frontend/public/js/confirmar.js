// Modal de confirmación reutilizable. Se usa así, desde cualquier página que
// cargue este script (después de Bootstrap):
//
//   const ok = await confirmar({
//       titulo: "Eliminar alumno",
//       mensaje: "¿Seguro?",
//       textoConfirmar: "Eliminar",
//       peligro: true,
//   });
//   if (!ok) return;
//
// Devuelve una promesa que se resuelve en true si la persona aceptó, y en
// false si canceló o cerró el cuadro de cualquier otra forma.

(function () {
    let modalEl = null;
    let modal = null;
    let resolver = null;
    let confirmado = false;

    // El HTML del modal se crea la primera vez que hace falta
    function montar() {
        document.body.insertAdjacentHTML(
            "beforeend",
            `
      <div class="modal fade" id="modal-confirmar" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="confirmar-titulo"></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0" id="confirmar-mensaje"></p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmar-aceptar"></button>
            </div>
          </div>
        </div>
      </div>`,
        );

        modalEl = document.getElementById("modal-confirmar");
        modal = new bootstrap.Modal(modalEl);

        document.getElementById("confirmar-aceptar").addEventListener("click", () => {
            confirmado = true;
            modal.hide();
        });

        // Se dispara cuando el modal terminó de cerrarse, sea cual sea el motivo.
        // Recién ahí resolvemos la promesa con la decisión tomada.
        modalEl.addEventListener("hidden.bs.modal", () => {
            if (resolver) {
                resolver(confirmado);
                resolver = null;
            }
            confirmado = false;
        });
    }

    window.confirmar = function ({ titulo, mensaje, textoConfirmar = "Confirmar", peligro = false }) {
        if (!modalEl) montar();

        document.getElementById("confirmar-titulo").textContent = titulo;
        document.getElementById("confirmar-mensaje").textContent = mensaje;

        const botonAceptar = document.getElementById("confirmar-aceptar");
        botonAceptar.textContent = textoConfirmar;
        botonAceptar.className = `btn ${peligro ? "btn-danger" : "btn-primary"}`;

        return new Promise(resolve => {
            resolver = resolve;
            confirmado = false;
            modal.show();
        });
    };
})();
