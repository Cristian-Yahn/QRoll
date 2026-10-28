const nodemailer = require('nodemailer');

let transporte = null;

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// El "transporte" es la conexión con el servidor de correo (Gmail, por ejemplo).
// Se crea la primera vez que hace falta y se reutiliza.
function obtenerTransporte() {
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT) || 587;
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465, // 465 = TLS directo; 587 = empieza sin cifrar y pasa a TLS (STARTTLS)
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Si el servidor no contesta, no dejar el pedido colgado para siempre
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporte;
}

// Dirección pública de QRoll, la que va en los enlaces de los correos.
// Sale del .env y NO del pedido: si se armara con el header "Host" que manda quien
// hace el pedido, un atacante podría pedir el cambio de contraseña de otra persona con
// un Host falso y el correo (legítimo, desde tu cuenta) traería un enlace a SU sitio.
function urlBase() {
  const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return base.replace(/\/+$/, '');
}

async function enviarCorreo({ para, asunto, texto, html }) {
  if (!smtpConfigurado()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Falta configurar el SMTP (SMTP_HOST, SMTP_USER y SMTP_PASS en el .env)');
    }
    // En desarrollo, sin SMTP, el correo se muestra en la terminal: sirve para probar
    // el flujo completo sin mandar nada de verdad.
    console.log(`\n[correo simulado — falta configurar SMTP]\nPara: ${para}\nAsunto: ${asunto}\n\n${texto}\n`);
    return;
  }

  await obtenerTransporte().sendMail({
    from: process.env.EMAIL_FROM || `QRoll <${process.env.SMTP_USER}>`,
    to: para,
    subject: asunto,
    text: texto,
    html,
  });
}

module.exports = { enviarCorreo, urlBase, smtpConfigurado };
