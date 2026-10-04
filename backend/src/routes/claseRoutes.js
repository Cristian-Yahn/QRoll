const express = require("express");
const router = express.Router({ mergeParams: true });
const { crear, listar, abrir, cerrar } = require("../controllers/claseController");
const codigoQrRoutes = require("./codigoQrRoutes");
const asistenciaRoutes = require("./asistenciaRoutes");

router.post("/", crear);
router.get("/", listar);
router.post("/:id_clase/abrir", abrir);
router.post("/:id_clase/cerrar", cerrar);
router.use("/:id_clase/qr", codigoQrRoutes);
router.use("/:id_clase/asistencia", asistenciaRoutes);

module.exports = router;
