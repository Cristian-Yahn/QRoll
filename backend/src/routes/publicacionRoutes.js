const express = require("express");
const router = express.Router({ mergeParams: true });
const { crear, listar } = require("../controllers/publicacionController");
const comentarioRoutes = require("./comentarioRoutes");
const { requerirCursoNoArchivado } = require("../middlewares/cursoNoArchivado");

router.post("/", requerirCursoNoArchivado, crear);
router.get("/", listar);
router.use("/:id_publicacion/comentarios", requerirCursoNoArchivado, comentarioRoutes);

module.exports = router;
