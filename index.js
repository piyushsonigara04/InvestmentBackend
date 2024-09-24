// const express = require("express")
// const app = express()

// app.use(express.json());

// const stockroutes = require("./Routes/StocksRoutes");
// app.use("/api/v1",stockroutes)

// const dbConnect = require("./Config/database");
// dbConnect();

// app.listen(3000,()=>{
//     console.log("server is running on port 3000")
// })

const express = require("express");
const cookieParser = require('cookie-parser');
const cors = require('cors');

const corsOptions = {
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true, // Allow credentials
};

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

const stockroutes = require("./Routes/StocksRoutes");
const userroutes = require("./Routes/UserRoutes")
const Yahooroute = require("./Routes/Yahoo");
const sentimentroute = require("./Routes/sentimentRoutes")

app.use("/api/v1/stocks", stockroutes);
app.use("/api/v1/user",userroutes);
app.use("/api/v1/yahoo",Yahooroute);
app.use("/api/v1/sentiment",sentimentroute);
// Connect to Cassandra
const { dbConnect } = require("./Config/database");
dbConnect();

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
