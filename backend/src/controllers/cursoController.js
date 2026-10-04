const CursoModel = require("../models/cursoModel");
const InscripcionModel = require("../models/inscripcionModel");

function crear(req, res) {
    const { nombre_curso, id_usuario } = req.body;
    if (!nombre_curso || !id_usuario) {
        return res.status(400).json({ error: "nombre_curso e id_usuario son obligatorios" });
    }

    const curso = CursoModel.crear({ nombre_curso, id_creador: id_usuario });
    InscripcionModel.crear({ id_curso: curso.id_curso, id_usuario, rol_en_curso: "profesor" });

    res.status(201).json({ mensaje: "Curso creado correctamente", curso });
}

function listarMisCursos(req, res) {
    const { id_usuario } = req.query;
    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const cursos = CursoModel.listarPorUsuario(id_usuario);
    res.json({ cursos });
}

function unirse(req, res) {
    const { codigo_acceso, id_usuario } = req.body;
    if (!codigo_acceso || !id_usuario) {
        return res.status(400).json({ error: "codigo_acceso e id_usuario son obligatorios" });
    }

    const curso = CursoModel.buscarPorCodigoAcceso(codigo_acceso.toUpperCase());
    if (!curso) {
        return res.status(404).json({ error: "No existe ningún curso con ese código" });
    }

    const yaInscripto = InscripcionModel.buscar(curso.id_curso, id_usuario);
    if (yaInscripto) {
        return res.status(409).json({ error: "Ya estás inscripto en este curso" });
    }

    InscripcionModel.crear({ id_curso: curso.id_curso, id_usuario, rol_en_curso: "alumno" });
    res.status(201).json({ mensaje: "Te uniste al curso correctamente", curso });
}

function obtenerUno(req, res) {
    const { id_curso } = req.params;
    const { id_usuario } = req.query;
    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion) {
        return res.status(403).json({ error: "No pertenecés a este curso" });
    }

    const curso = CursoModel.buscarPorId(id_curso);
    if (!curso) return res.status(404).json({ error: "El curso no existe" });

    const cantidad_alumnos = InscripcionModel.contarAlumnos(id_curso);

    res.json({
        curso: { ...curso, rol_en_curso: inscripcion.rol_en_curso },
        cantidad_alumnos,
    });
}

function listarAlumnos(req, res) {
    const { id_curso } = req.params;
    const { id_usuario } = req.query;
    if (!id_usuario) return res.status(400).json({ error: "id_usuario es obligatorio" });

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion || inscripcion.rol_en_curso !== "profesor") {
        return res.status(403).json({ error: "Solo un profesor del curso puede ver el listado de alumnos" });
    }

    const alumnos = InscripcionModel.listarAlumnos(id_curso);
    res.json({ alumnos });
}

module.exports = { crear, listarMisCursos, unirse, obtenerUno, listarAlumnos };
