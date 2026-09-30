const CursoModel = require("../models/cursoModel");

function listar(req, res) {
    const { id_usuario } = req.query;

    if (!id_usuario) {
        return res.status(400).json({ error: "Falta id_usuario" });
    }

    const cursos = CursoModel.listarPorUsuario(id_usuario);
    res.json({ cursos });
}

module.exports = { listar };
