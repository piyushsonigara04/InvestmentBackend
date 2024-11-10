// const {Stock} = require("../Models/Stocks")
// const {Holdings} = require("../Models/Stocks")


// exports.addHoldingStock = async (req,res)=>{

//     try{
//         const {stockSymbol,buyPrice,quantity,buyDate} = req.body;
//         console.log(stockSymbol)
//         const {id} = req.params;
//         console.log(id);
    
//         const stock = new Stock({
//             stockSymbol,buyPrice,quantity,buyDate
//         })

//         console.log(stock)
    
       
//         const holdingsFetched = await Holdings.findById(id);
  
//         console.log(holdingsFetched);

//         if(!holdingsFetched){
//             return res.status(404).json({message: "Holdings not found"})
//         }
    
//         holdingsFetched.holdings.push(stock);
//         console.log(holdingsFetched);
    
//         const updated = await Holdings.findByIdAndUpdate(id,holdingsFetched);
    
//         res.status(200).json({
//             status:"Success",
//             message:"Stock added to holdings",
//             data:updated
//         });

//     } catch (error) {
//         res.status(400).json({
//             error:error.message,
//             message:"Failed to add stock to holdings"
//         })
//     }
// }


// exports.getHoldingStock = async (req,res)=>{

//     try{
//         const holdings = await Holdings.find();
//         console.log(holdings);

//         res.status(200).json({
//             status:"Success",
//             message:"Stock added to holdings",
//             data:holdings
//         });

//     } catch (error) {
//         res.status(400).json({
//             error:error.message,
//             message:"Failed to add stock to holdings"
//         })
//     }
// }
const cassandra = require('cassandra-driver');
const client = new cassandra.Client({
  contactPoints: ['localhost'], 
  localDataCenter: 'datacenter1', 
  keyspace: 'stock_trading' 
});

exports.addHoldingStock = async (req, res) => {
  try {
    const { stock_symbol, buy_price, quantity, buy_date } = req.body;
    const id = req.userId; 
    console.log(stock_symbol, id);

    const query = `INSERT INTO stocks (user_id, stock_symbol, buy_price, quantity, buy_date) 
                   VALUES (?, ?, ?, ?, ?)`;

    const params = [id, stock_symbol.toUpperCase(), buy_price, quantity, new Date(buy_date)];

    await client.execute(query, params, { prepare: true });

    res.status(200).json({
      status: "Success",
      message: "Stock added to holdings"
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      message: "Failed to add stock to holdings"
    });
  }
};

exports.getHoldingStock = async (req, res) => {
  try {
    const id = req.userId;
    const query = 'SELECT * FROM stocks WHERE user_id = ?';
    const params = [id];
    const result = await client.execute(query, params, { prepare: true });

    console.log(result.rows);

    res.status(200).json({
      status: "Success",
      message: "Holdings fetched",
      data: result.rows
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      message: "Failed to fetch holdings"
    });
  }
};

const jwt = require("jsonwebtoken");

exports.deleteHolding = async (req, res) => {
  try {
    const { stock_symbol } = req.body;

    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Authentication token is missing" });
    }

    const decoded = jwt.verify(token, 'piyush'); 
    const id = decoded.userId;

    console.log("Extracted userId from token:", id);

    if (!id || !stock_symbol) {
      return res.status(400).json({
        message: "User ID or stock symbol is missing"
      });
    }

    const query = `DELETE FROM stocks WHERE user_id = ? AND stock_symbol = ?`;
    const params = [id, stock_symbol.toUpperCase()];

    await client.execute(query, params, { prepare: true });

    res.status(200).json({
      status: "Success",
      message: `Stock with symbol ${stock_symbol} deleted from holdings`
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: "Error",
        message: "Invalid or expired authentication token"
      });
    }

    console.error("Error deleting stock:", error);

    res.status(500).json({
      status: "Error",
      message: "Failed to delete stock from holdings",
      error: error.message
    });
  }
};
 
exports.sellStock = async (req, res) => {
  try {
    const { stock_symbol, sell_price, sell_date } = req.body;
    const { id } = req.params; 

    const selectQuery = `SELECT * FROM stocks WHERE user_id = ? AND stock_symbol = ?`;
    const selectParams = [id, stock_symbol.toUpperCase()];
    const stock = await client.execute(selectQuery, selectParams, { prepare: true });

    if (stock.rowLength === 0) {
      return res.status(404).json({ message: `Stock with symbol ${stock_symbol} not found in holdings` });
    }

    const { buy_price, quantity, buy_date } = stock.rows[0];

    const deleteQuery = `DELETE FROM stocks WHERE user_id = ? AND stock_symbol = ?`;
    await client.execute(deleteQuery, selectParams, { prepare: true });

    const insertQuery = `INSERT INTO closed_positions (user_id, stock_symbol, buy_date, sell_date, buy_price, quantity, sell_price) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const insertParams = [id, stock_symbol.toUpperCase(), buy_date, new Date(sell_date), buy_price, quantity, sell_price];
    await client.execute(insertQuery, insertParams, { prepare: true });

    res.status(200).json({
      status: "Success",
      message: `Stock with symbol ${stock_symbol} sold successfully`,
      data: {
        stock_symbol,
        buy_price,
        sell_price,
        quantity,
        buy_date,
        sell_date
      }
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      message: "Failed to sell stock"
    });
  }
};

exports.getInvestedValue = async (req, res) => {
  try {
    const id = req.userId;
    const query = `SELECT SUM(buy_price * quantity) AS invested_value FROM stocks WHERE user_id = ?`;
    const params = [id];
    const result = await client.execute(query, params, { prepare: true });
    
    const investedValue = result.rows[0].invested_value || 0; // Ensure a fallback if no value found

    res.status(200).json({
      status: "Success",
      message: "Invested value retrieved successfully",
      data: investedValue
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: error.message,
      message: "Failed to retrieve invested value"
    });
  }
};

exports.getClosedPositions = async (req, res) => {
  try {
    const id = req.userId;
    const query = 'SELECT * FROM stocks WHERE user_id = ?';
    const params = [id];
    const result = await client.execute(query, params, { prepare: true });

    console.log(result.rows);

    res.status(200).json({
      status: "Success",
      message: "Holdings fetched",
      data: result.rows
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      message: "Failed to fetch holdings"
    });
  }
};




