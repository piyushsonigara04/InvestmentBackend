const express = require("express");
const router = express.Router();

const Yahoo = require("../Controllers/Yahoo")

router.get("/stock/:symbol",Yahoo.Yahoo);

module.exports = router;