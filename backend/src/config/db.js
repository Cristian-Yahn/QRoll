const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const rutaDb = path.resolve(__dirname, "../../", process.env.DB_PATH || "database/qroll.db");

fs.mkdirSync(path.dirname(rutaDb), { recursive: true });

const db = new Database(rutaDb);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

module.exports = db;
