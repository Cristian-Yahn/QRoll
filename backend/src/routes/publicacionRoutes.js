const express = require("express");
const router = express.Router({ mergeParams: true });
const { crear, listar } = require("../controllers/publicacionController");
const comentarioRoutes = require("./comentarioRoutes");

router.post("/", crear);
router.get("/", listar);
router.use("/:id_publicacion/comentarios", comentarioRoutes);

module.exports = router;
