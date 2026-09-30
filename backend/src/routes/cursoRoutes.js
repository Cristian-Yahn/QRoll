const express = require("express");
const router = express.Router();
const { listar } = require("../controllers/cursoController");

router.get("/", listar);

module.exports = router;
