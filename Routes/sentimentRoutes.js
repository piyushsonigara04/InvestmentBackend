const express = require("express");
const router = express.Router();

const sentimentCntrl = require("../Controllers/SentimentCntrl")

router.get("/getsentiment/:symbol",sentimentCntrl.sentimentCntrl);

module.exports = router;
