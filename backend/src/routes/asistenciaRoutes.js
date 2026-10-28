const express = require("express");
const router = express.Router({ mergeParams: true });
const { registrarPorQr, registrarManual, editarEstado, listarPorClase } = require("../controllers/asistenciaController");

router.post("/qr", registrarPorQr);
router.post("/manual", registrarManual);
router.patch("/:id_asistencia", editarEstado);
router.get("/", listarPorClase);

module.exports = router;
