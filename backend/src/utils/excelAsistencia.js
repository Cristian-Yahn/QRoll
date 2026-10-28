const ExcelJS = require('exceljs');

// Colores en formato ARGB (FF = opaco) y letra que se muestra en cada celda
const COLOR_ENCABEZADO = 'FF2F6FED';
const COLORES_ESTADO = {
  presente: 'FFC8E6C9',
  tarde: 'FFFFF3C4',
  justificado: 'FFBBDEFB',
  ausente: 'FFFFCDD2',
};
const LETRAS_ESTADO = { presente: 'P', tarde: 'T', justificado: 'J', ausente: 'A' };

const FILA_ENCABEZADO = 4;
const COLUMNAS_DATOS_ALUMNO = 3; // Apellido, Nombre, Email

function formatearFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

const BORDE_FINO = {
  top: { style: 'thin', color: { argb: 'FFBBBBBB' } },
  left: { style: 'thin', color: { argb: 'FFBBBBBB' } },
  bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } },
  right: { style: 'thin', color: { argb: 'FFBBBBBB' } },
};

// Devuelve el libro de Excel armado; quien lo llama decide cómo enviarlo
function construirExcelAsistencia({ curso, clases, alumnos, generado }) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'QRoll';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Asistencia');

  // ----- Título -----
  hoja.getCell('A1').value = `Asistencia — ${curso.nombre_curso}`;
  hoja.getCell('A1').font = { bold: true, size: 14 };
  hoja.getCell('A2').value = `Generado el ${generado}`;
  hoja.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };

  // ----- Encabezado -----
  const encabezados = [
    'Apellido',
    'Nombre',
    'Email',
    ...clases.map(clase => formatearFecha(clase.fecha)),
    'Clases',
    'Asistidas',
    'Justificadas',
    'Ausentes',
    '% asistencia',
  ];

  const filaEncabezado = hoja.getRow(FILA_ENCABEZADO);
  encabezados.forEach((texto, i) => {
    const celda = filaEncabezado.getCell(i + 1);
    celda.value = texto;
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } };
    celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    celda.border = BORDE_FINO;
  });

  // ----- Una fila por alumno -----
  const primeraColumnaClases = COLUMNAS_DATOS_ALUMNO + 1;
  const primeraColumnaTotales = primeraColumnaClases + clases.length;

  alumnos.forEach((alumno, indice) => {
    const fila = hoja.getRow(FILA_ENCABEZADO + 1 + indice);

    fila.getCell(1).value = alumno.apellido;
    fila.getCell(2).value = alumno.nombre;
    fila.getCell(3).value = alumno.email;

    alumno.estados.forEach((estado, j) => {
      const celda = fila.getCell(primeraColumnaClases + j);
      celda.value = LETRAS_ESTADO[estado];
      celda.alignment = { horizontal: 'center' };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES_ESTADO[estado] } };
    });

    const totales = [alumno.clases_totales, alumno.asistidas, alumno.justificadas, alumno.ausentes];
    totales.forEach((valor, j) => {
      const celda = fila.getCell(primeraColumnaTotales + j);
      celda.value = valor;
      celda.alignment = { horizontal: 'center' };
    });

    // El porcentaje se guarda como número (0.75) con formato de porcentaje (75%),
    // para que en Excel se pueda ordenar y calcular con él
    const celdaPorcentaje = fila.getCell(primeraColumnaTotales + totales.length);
    celdaPorcentaje.value = alumno.porcentaje === null ? null : alumno.porcentaje / 100;
    celdaPorcentaje.numFmt = '0%';
    celdaPorcentaje.alignment = { horizontal: 'center' };
    celdaPorcentaje.font = { bold: true };

    for (let columna = 1; columna <= primeraColumnaTotales + totales.length; columna++) {
      fila.getCell(columna).border = BORDE_FINO;
    }
  });

  // ----- Anchos de columna -----
  hoja.getColumn(1).width = 20;
  hoja.getColumn(2).width = 20;
  hoja.getColumn(3).width = 30;
  for (let j = 0; j < clases.length; j++) {
    hoja.getColumn(primeraColumnaClases + j).width = 12;
  }
  for (let j = 0; j < 5; j++) {
    hoja.getColumn(primeraColumnaTotales + j).width = 14;
  }

  // Deja fijos el encabezado y las columnas de apellido y nombre al desplazarse
  hoja.views = [{ state: 'frozen', xSplit: 2, ySplit: FILA_ENCABEZADO }];

  // ----- Referencias al pie -----
  const filaLeyenda = FILA_ENCABEZADO + alumnos.length + 2;
  hoja.getCell(`A${filaLeyenda}`).value = 'P = Presente   T = Tarde   J = Justificado   A = Ausente';
  hoja.getCell(`A${filaLeyenda + 1}`).value =
    'Asistidas = Presentes + Tardes. % asistencia = Asistidas / Clases. Una clase tomada sin registro del alumno cuenta como ausente.';
  hoja.getCell(`A${filaLeyenda}`).font = { bold: true };
  hoja.getCell(`A${filaLeyenda + 1}`).font = { italic: true, color: { argb: 'FF666666' } };

  return libro;
}

module.exports = { construirExcelAsistencia };
