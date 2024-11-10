const express = require("express");
const router = express.Router();

const sentimentCntrl = require("../Controllers/SentimentCntrl")

router.post("/getsentiment",sentimentCntrl.sentimentCntrl);
router.post("/getstocksentiment",sentimentCntrl.getAvgSentiment);
router.get("/gettopsentiments",sentimentCntrl.getTopSentiments);

module.exports = router;
