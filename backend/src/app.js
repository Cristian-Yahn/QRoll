const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const { requerirAuth } = require("./middlewares/auth");
const authRoutes = require("./routes/authRoutes");
const cursoRoutes = require("./routes/cursoRoutes");
const asistenciaRapidaRoutes = require("./routes/asistenciaRapidaRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, "../../frontend/public")));

// Rutas públicas
app.get("/api/ping", (req, res) => {
    res.json({ mensaje: "QRoll funcionando" });
});
app.use("/api/auth", authRoutes);

// exige sesión iniciada (requerirAuth)
app.use("/api/cursos", requerirAuth, cursoRoutes);

app.use("/api/asistencia", requerirAuth, asistenciaRapidaRoutes);

module.exports = app;
