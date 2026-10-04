const express = require("express");
const router = express.Router({ mergeParams: true });
const { generar } = require("../controllers/codigoQrController");

router.post("/", generar);

module.exports = router;
