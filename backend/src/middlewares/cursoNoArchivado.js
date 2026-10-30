const CursoModel = require("../models/cursoModel");
const InscripcionModel = require("../models/inscripcionModel");

function requerirCursoNoArchivado(req, res, next) {
    const { id_curso } = req.params;

    if (!InscripcionModel.buscar(id_curso, req.usuario.id_usuario)) return next();

    const curso = CursoModel.buscarPorId(id_curso);
    if (curso && curso.archivado) {
        return res.status(409).json({
            error: "Este curso está archivado. Restauralo para volver a usar esta función.",
            codigo: "curso_archivado",
        });
    }
    next();
}

module.exports = { requerirCursoNoArchivado };
