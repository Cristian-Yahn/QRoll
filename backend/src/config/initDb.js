const fs = require("fs");
const path = require("path");
const db = require("./db");

const rutaSchema = path.resolve(__dirname, "../../database/schema.sql");
const schema = fs.readFileSync(rutaSchema, "utf-8");

db.exec(schema);

console.log("Base de datos lista");
