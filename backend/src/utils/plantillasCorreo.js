function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function armarHtml({ titulo, parrafos, textoBoton, enlace, pie }) {
    const cuerpo = parrafos
        .map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#1f2933">${escaparHtml(p)}</p>`)
        .join("");

    return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4f6f8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:10px;padding:28px;border:1px solid #e1e5ea">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1f2933">${escaparHtml(titulo)}</h1>
    ${cuerpo}
    <p style="margin:22px 0">
      <a href="${escaparHtml(enlace)}" style="display:inline-block;background:#2f6fed;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:15px">${escaparHtml(textoBoton)}</a>
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#52606d">Si el botón no funciona, copiá este enlace en tu navegador:</p>
    <p style="margin:0 0 18px;font-size:13px;word-break:break-all"><a href="${escaparHtml(enlace)}" style="color:#2f6fed">${escaparHtml(enlace)}</a></p>
    <p style="margin:0;font-size:13px;color:#52606d">${escaparHtml(pie)}</p>
  </div>
</body></html>`;
}

function correoVerificacionIntentos({ nombre, enlace, horasValidez }) {
    const asunto = "QRoll: detectamos intentos fallidos en tu cuenta";
    const parrafos = [
        `Hola ${nombre},`,
        "Detectamos varios intentos fallidos de iniciar sesión en tu cuenta de QRoll. Por seguridad, bloqueamos el acceso hasta que nos confirmes si fuiste vos.",
        'Abrí el enlace y elegí una opción: "Fui yo" si te equivocaste de contraseña, o "No fui yo" si no reconocés estos intentos (en ese caso vas a poder elegir una contraseña nueva).',
    ];
    const pie = `El enlace vence en ${horasValidez} horas. Si no hacés nada, tu cuenta sigue protegida y podés recuperarla con "¿Olvidaste tu contraseña?".`;

    const texto = [...parrafos, `Confirmar acá: ${enlace}`, pie].join("\n\n");
    const html = armarHtml({
        titulo: "Intentos fallidos en tu cuenta",
        parrafos,
        textoBoton: "Revisar mi cuenta",
        enlace,
        pie,
    });
    return { asunto, texto, html };
}

function correoRestablecerContrasena({ nombre, enlace, minutosValidez }) {
    const asunto = "QRoll: restablecé tu contraseña";
    const parrafos = [
        `Hola ${nombre},`,
        "Recibimos un pedido para cambiar la contraseña de tu cuenta de QRoll. Tocá el botón para elegir una nueva.",
    ];
    const pie = `El enlace vence en ${minutosValidez} minutos y solo se puede usar una vez. Si no pediste este cambio, ignorá este correo: tu contraseña no se modifica.`;

    const texto = [...parrafos, `Elegir contraseña nueva: ${enlace}`, pie].join("\n\n");
    const html = armarHtml({
        titulo: "Restablecer contraseña",
        parrafos,
        textoBoton: "Elegir contraseña nueva",
        enlace,
        pie,
    });
    return { asunto, texto, html };
}

module.exports = { correoVerificacionIntentos, correoRestablecerContrasena };
