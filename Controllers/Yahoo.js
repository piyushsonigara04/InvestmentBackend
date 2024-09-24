const yahooFinance = require("yahoo-finance2").default;

exports.Yahoo = async (req, res) => {
    const symbol = req.params.symbol;

    try {
        const stockData = await yahooFinance.quoteSummary(`${symbol}.NS`, { modules: ['price'] });

        if (stockData && stockData.price) {
            res.json({
                symbol: stockData.price.symbol,
                currentPrice: stockData.price.regularMarketPrice,
                currency: stockData.price.currency,
            });
        } else {
            res.status(404).json({ error: "Stock data not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};