const CursoModel = require("../models/cursoModel");
const InscripcionModel = require("../models/inscripcionModel");
const BloqueoModel = require("../models/bloqueoModel");

function esProfesorDelCurso(id_curso, id_usuario) {
    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    return Boolean(inscripcion) && inscripcion.rol_en_curso === "profesor";
}

function esAlumnoDelCurso(id_curso, id_usuario) {
    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    return Boolean(inscripcion) && inscripcion.rol_en_curso === "alumno";
}

function crear(req, res) {
    const { nombre_curso } = req.body;
    const id_usuario = req.usuario.id_usuario;

    if (!nombre_curso) {
        return res.status(400).json({ error: "nombre_curso es obligatorio" });
    }

    const curso = CursoModel.crear({ nombre_curso, id_creador: id_usuario });
    InscripcionModel.crear({ id_curso: curso.id_curso, id_usuario, rol_en_curso: "profesor" });

    res.status(201).json({ mensaje: "Curso creado correctamente", curso });
}

function listarMisCursos(req, res) {
    const id_usuario = req.usuario.id_usuario;

    const cursos = CursoModel.listarPorUsuario(id_usuario);
    res.json({ cursos });
}

function unirse(req, res) {
    const { codigo_acceso } = req.body;
    const id_usuario = req.usuario.id_usuario;

    if (!codigo_acceso) {
        return res.status(400).json({ error: "codigo_acceso es obligatorio" });
    }

    const curso = CursoModel.buscarPorCodigoAcceso(codigo_acceso.toUpperCase());
    if (!curso) {
        return res.status(404).json({ error: "No existe ningún curso con ese código" });
    }

    if (BloqueoModel.estaBloqueado(curso.id_curso, id_usuario)) {
        return res.status(403).json({ error: "No podés unirte a este curso" });
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
    const id_usuario = req.usuario.id_usuario;

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
    const id_usuario = req.usuario.id_usuario;

    if (!esProfesorDelCurso(id_curso, id_usuario)) {
        return res.status(403).json({ error: "Solo un profesor del curso puede ver el listado de alumnos" });
    }

    const alumnos = InscripcionModel.listarAlumnos(id_curso);
    res.json({ alumnos });
}

function regenerarCodigo(req, res) {
    const { id_curso } = req.params;
    const id_usuario = req.usuario.id_usuario;

    if (!esProfesorDelCurso(id_curso, id_usuario)) {
        return res.status(403).json({ error: "Solo un profesor del curso puede regenerar el código" });
    }

    const curso = CursoModel.regenerarCodigo(id_curso);
    res.json({ mensaje: "Código regenerado", codigo_acceso: curso.codigo_acceso });
}

function listarParticipantes(req, res) {
    const { id_curso } = req.params;
    const id_usuario = req.usuario.id_usuario;

    const inscripcion = InscripcionModel.buscar(id_curso, id_usuario);
    if (!inscripcion) {
        return res.status(403).json({ error: "No pertenecés a este curso" });
    }

    const esProfesor = inscripcion.rol_en_curso === "profesor";

    const participantes = InscripcionModel.listarParticipantes(id_curso).map(({ email, ...resto }) =>
        esProfesor ? { ...resto, email } : resto,
    );

    res.json({ participantes });
}

function eliminarParticipante(req, res) {
    const { id_curso, id_participante } = req.params;
    const id_usuario = req.usuario.id_usuario;

    if (!esProfesorDelCurso(id_curso, id_usuario)) {
        return res.status(403).json({ error: "Solo un profesor del curso puede eliminar alumnos" });
    }

    if (!esAlumnoDelCurso(id_curso, id_participante)) {
        return res.status(404).json({ error: "Ese alumno no pertenece a este curso" });
    }

    InscripcionModel.eliminarAlumno(id_curso, id_participante);
    res.json({ mensaje: "Alumno eliminado del curso" });
}

function bloquearParticipante(req, res) {
    const { id_curso, id_participante } = req.params;
    const id_usuario = req.usuario.id_usuario;

    if (!esProfesorDelCurso(id_curso, id_usuario)) {
        return res.status(403).json({ error: "Solo un profesor del curso puede bloquear alumnos" });
    }

    if (!esAlumnoDelCurso(id_curso, id_participante)) {
        return res.status(404).json({ error: "Ese alumno no pertenece a este curso" });
    }

    BloqueoModel.bloquearAlumno(id_curso, id_participante);
    res.json({ mensaje: "Alumno bloqueado" });
}

function listarBloqueados(req, res) {
    const { id_curso } = req.params;
    const id_usuario = req.usuario.id_usuario;

    if (!esProfesorDelCurso(id_curso, id_usuario)) {
        return res.status(403).json({ error: "Solo un profesor del curso puede ver los bloqueados" });
    }

    const bloqueados = BloqueoModel.listarPorCurso(id_curso);
    res.json({ bloqueados });
}

function desbloquearParticipante(req, res) {
    const { id_curso, id_participante } = req.params;
    const id_usuario = req.usuario.id_usuario;

    if (!esProfesorDelCurso(id_curso, id_usuario)) {
        return res.status(403).json({ error: "Solo un profesor del curso puede desbloquear alumnos" });
    }

    const desbloqueado = BloqueoModel.desbloquear(id_curso, id_participante);
    if (!desbloqueado) {
        return res.status(404).json({ error: "Ese usuario no está bloqueado en este curso" });
    }

    res.json({ mensaje: "Alumno desbloqueado" });
}

module.exports = {
    crear,
    listarMisCursos,
    unirse,
    obtenerUno,
    listarAlumnos,
    regenerarCodigo,
    listarParticipantes,
    eliminarParticipante,
    bloquearParticipante,
    listarBloqueados,
    desbloquearParticipante,
};
