const express = require("express");
const router = express.Router();
const { registrarPorToken } = require("../controllers/asistenciaController");

router.post("/qr", registrarPorToken);

module.exports = router;
