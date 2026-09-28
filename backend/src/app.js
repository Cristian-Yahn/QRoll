const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.resolve(__dirname, "../../frontend/public")));

app.get("/api/ping", (req, res) => {
    res.json({ mensaje: "QRoll funcionando" });
});

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

module.exports = app;
