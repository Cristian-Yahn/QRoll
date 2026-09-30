const express = require("express");
const router = express.Router({ mergeParams: true });
const { crear, listar } = require("../controllers/claseController");

router.post("/", crear);
router.get("/", listar);

module.exports = router;
