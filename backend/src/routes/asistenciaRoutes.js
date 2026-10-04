const express = require("express");
const router = express.Router({ mergeParams: true });
const { registrarPorQr, registrarManual, listarPorClase } = require("../controllers/asistenciaController");

router.post("/qr", registrarPorQr);
router.post("/manual", registrarManual);
router.get("/", listarPorClase);

module.exports = router;
