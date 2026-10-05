const express = require("express");
const router = express.Router({ mergeParams: true });
const { crear } = require("../controllers/comentarioController");

router.post("/", crear);

module.exports = router;
