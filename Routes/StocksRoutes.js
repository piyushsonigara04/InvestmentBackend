// const express = require("express");
// const app = express();

// const router = express.Router();

// const StocksCntrl = require("../Controllers/StocksCntrl")


// router.post("/stocks/add/:id",StocksCntrl.addHoldingStock);
// router.post("/stocks/get",StocksCntrl.getHoldingStock);


// module.exports = router;

const express = require("express");
const router = express.Router();
const StocksCntrl = require("../Controllers/StocksCntrl");
const verifyTokenFromCookie = require("../Middlewares/verifytoken");

// Route to add stock to holdings
router.post("/add",verifyTokenFromCookie.verifytoken, StocksCntrl.addHoldingStock);
router.get("/getStock",verifyTokenFromCookie.verifytoken, StocksCntrl.getHoldingStock);
router.post("/deleteStock/:id",StocksCntrl.deleteHolding);
router.post("/sellStock/:id",StocksCntrl.sellStock)

module.exports = router;

