const express = require("express");
const router = express.Router();
const { crear, listarMisCursos, unirse, obtenerUno, listarAlumnos } = require("../controllers/cursoController");
const claseRoutes = require("./claseRoutes");

router.post("/", crear);
router.get("/", listarMisCursos);
router.post("/unirse", unirse);
router.get("/:id_curso", obtenerUno);
router.get("/:id_curso/alumnos", listarAlumnos);
router.use("/:id_curso/clases", claseRoutes);

module.exports = router;
