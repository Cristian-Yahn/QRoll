// Crea una base de datos de DEMOSTRACIÓN con datos de ejemplo (profesora, alumnos, cursos con
// historial de asistencia, tablón y un curso archivado), para mostrar QRoll con la app "llena"
// y sin depender de lo que haya en tu base real.
//
// Uso (desde la carpeta backend/):
//     DB_PATH=database/demo.db node scripts/seed-demo.js
// y para correr el servidor con esos datos:
//     DB_PATH=database/demo.db npm start
//
// Seguridad: solo funciona si el nombre del archivo contiene "demo", y borra y vuelve a crear ESE
// archivo cada vez que se ejecuta. Tu base real (qroll.db) no se toca nunca.

const fs = require("fs");
const path = require("path");

const rutaConfigurada = process.env.DB_PATH;
if (!rutaConfigurada || !/demo/i.test(path.basename(rutaConfigurada))) {
    console.error(
        "\nPor seguridad, este script solo trabaja con una base cuyo nombre contenga \"demo\".\n" +
            "Ejecutalo así:  DB_PATH=database/demo.db node scripts/seed-demo.js\n",
    );
    process.exit(1);
}

// Se parte siempre de una base vacía
const rutaAbsoluta = path.resolve(__dirname, "..", rutaConfigurada);
for (const sufijo of ["", "-wal", "-shm"]) fs.rmSync(rutaAbsoluta + sufijo, { force: true });

require("../src/config/initDb"); // crea las tablas en la base nueva

const bcrypt = require("bcrypt");
const UsuarioModel = require("../src/models/usuarioModel");
const CursoModel = require("../src/models/cursoModel");
const InscripcionModel = require("../src/models/inscripcionModel");
const ClaseModel = require("../src/models/claseModel");
const AsistenciaModel = require("../src/models/asistenciaModel");
const PublicacionModel = require("../src/models/publicacionModel");
const ComentarioModel = require("../src/models/comentarioModel");
const { armarResumenCurso } = require("../src/utils/resumenAsistencia");

const CONTRASENA = "Demo1234!";
const hash = bcrypt.hashSync(CONTRASENA, 10);
const hace = dias => new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);

const crearUsuario = (nombre, apellido, usuario) =>
    UsuarioModel.buscarPorId(
        UsuarioModel.crear({ nombre, apellido, email: `${usuario}@qroll.demo`, contrasena_hash: hash }),
    );

const laura = crearUsuario("Laura", "Gómez", "laura");
const alumnos = {
    ana: crearUsuario("Ana", "Pérez", "ana"),
    bruno: crearUsuario("Bruno", "Díaz", "bruno"),
    carla: crearUsuario("Carla", "Ruiz", "carla"),
    diego: crearUsuario("Diego", "Sosa", "diego"),
    elena: crearUsuario("Elena", "Vega", "elena"),
    fede: crearUsuario("Fede", "Luna", "fede"),
};

// Cada clase se toma "de verdad": se abre, se registra a quien corresponda y se cierra.
// Al cerrar, QRoll marca solo a los ausentes (así los datos de la demo salen de la lógica real).
//   P = presente por QR   T = tarde (cargado a mano)   J = justificado (a mano)
//   M = presente cargado a mano   . = no se registró (queda ausente automático)
const REGISTRO = {
    P: { estado: "presente", metodo: "qr" },
    M: { estado: "presente", metodo: "manual" },
    T: { estado: "tarde", metodo: "manual" },
    J: { estado: "justificado", metodo: "manual" },
};

function crearCurso({ nombre, nombresAlumnos, historial, diasDesdeLaPrimera }) {
    const curso = CursoModel.crear({ nombre_curso: nombre, id_creador: laura.id_usuario });
    InscripcionModel.crear({ id_curso: curso.id_curso, id_usuario: laura.id_usuario, rol_en_curso: "profesor" });
    nombresAlumnos.forEach(n =>
        InscripcionModel.crear({ id_curso: curso.id_curso, id_usuario: alumnos[n].id_usuario, rol_en_curso: "alumno" }),
    );

    const cantidadClases = historial[nombresAlumnos[0]].length;
    for (let i = 0; i < cantidadClases; i++) {
        const clase = ClaseModel.crear({ id_curso: curso.id_curso, fecha: hace(diasDesdeLaPrimera - i * 7) });
        ClaseModel.abrir(clase.id_clase);
        nombresAlumnos.forEach(n => {
            const marca = REGISTRO[historial[n][i]];
            if (marca) {
                AsistenciaModel.crear({ id_clase: clase.id_clase, id_usuario: alumnos[n].id_usuario, ...marca });
            }
        });
        ClaseModel.cerrar(clase.id_clase);
    }
    return curso;
}

const prog = crearCurso({
    nombre: "Programación II",
    nombresAlumnos: ["ana", "bruno", "carla", "diego", "elena", "fede"],
    diasDesdeLaPrimera: 35,
    historial: {
        ana: "PPPTPP",
        bruno: "PM.PPJ",
        carla: ".P..P.",
        diego: "PTPP.P",
        elena: "MPPPPP",
        fede: "..P.J.",
    },
});

const bd = crearCurso({
    nombre: "Base de Datos",
    nombresAlumnos: ["ana", "bruno", "carla", "diego"],
    diasDesdeLaPrimera: 21,
    historial: { ana: "PPP", bruno: "P.P", carla: "..P", diego: "PPT" },
});

const redes = crearCurso({
    nombre: "Redes (2025)",
    nombresAlumnos: ["ana", "bruno", "elena"],
    diasDesdeLaPrimera: 120,
    historial: { ana: "PP", bruno: "P.", elena: ".P" },
});
CursoModel.archivar(redes.id_curso);

// Tablón de Programación II
const p1 = PublicacionModel.crear({
    id_curso: prog.id_curso,
    id_usuario: laura.id_usuario,
    contenido: "¡Bienvenidos a Programación II! Acá van a encontrar los avisos y el material de la cursada.",
    enlace: "https://example.com/programa-de-la-materia",
});
ComentarioModel.crear({ id_publicacion: p1.id_publicacion, id_usuario: alumnos.ana.id_usuario, contenido: "¡Gracias profe!" });
ComentarioModel.crear({ id_publicacion: p1.id_publicacion, id_usuario: alumnos.bruno.id_usuario, contenido: "¿El programa incluye el TP integrador?" });
PublicacionModel.crear({
    id_curso: prog.id_curso,
    id_usuario: laura.id_usuario,
    contenido: "Recordatorio: la semana próxima entregamos el TP 1. Cualquier duda, comenten acá.",
});

// ---------- Resumen en pantalla ----------
console.log("\nBase de demostración creada en", rutaConfigurada);
console.log(`\nTodas las cuentas usan la contraseña:  ${CONTRASENA}`);
console.log("  Profesora:  laura@qroll.demo");
console.log("  Alumnos:    ana@qroll.demo  bruno@qroll.demo  carla@qroll.demo  diego@qroll.demo  elena@qroll.demo  fede@qroll.demo");
for (const [titulo, curso] of [["Programación II", prog], ["Base de Datos", bd], ["Redes (2025) — ARCHIVADO", redes]]) {
    const { clases, alumnos: filas } = armarResumenCurso(curso.id_curso);
    console.log(`\n${titulo}  (${clases.length} clases tomadas, código de acceso ${CursoModel.buscarPorId(curso.id_curso).codigo_acceso})`);
    filas.forEach(f => {
        console.log(`  ${f.nombre.padEnd(6)} ${String(f.porcentaje).padStart(3)}%   presentes ${f.presentes}  tardes ${f.tardes}  justificadas ${f.justificadas}  ausentes ${f.ausentes}`);
    });
}
console.log("\nPara usarla:  DB_PATH=database/demo.db npm start\n");
