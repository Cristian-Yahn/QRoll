const nodemailer = require("nodemailer");

let transporte = null;

function smtpConfigurado() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obtenerTransporte() {
    if (!transporte) {
        const puerto = Number(process.env.SMTP_PORT) || 587;
        transporte = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: puerto,
            secure: puerto === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });
    }
    return transporte;
}

function urlBase() {
    const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return base.replace(/\/+$/, "");
}

async function enviarCorreo({ para, asunto, texto, html }) {
    if (!smtpConfigurado()) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Falta configurar el SMTP (SMTP_HOST, SMTP_USER y SMTP_PASS en el .env)");
        }
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
