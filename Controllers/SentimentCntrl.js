const axios = require('axios');
const { Client } = require('cassandra-driver');
const { v4: uuidv4 } = require('uuid');
const vader = require('vader-sentiment');

const cassandra = require('cassandra-driver');
const client = new cassandra.Client({
  contactPoints: ['localhost'], 
  localDataCenter: 'datacenter1', 
  keyspace: 'stock_trading', 
  port: 9042, 
  socketOptions: { readTimeout: 600000 }
});

exports.sentimentCntrl = async (req, res) => {
  console.log("Inside sentiment controller");

  const stockSymbols = [
    'ONGC', 'INFY', 'IRFC', 'RELIANCE', 'TCS', 'HDFCBANK', 'ITC', 'BHARTIARTL', 
    'SBIN', 'HINDUNILVR', 'KOTAKBANK', 'LT', 'ASIANPAINT', 'ICICIBANK', 'HCLTECH', 
    'AXISBANK', 'BAJFINANCE', 'WIPRO', 'MARUTI', 'HDFCLIFE', 'ULTRACEMCO', 'NTPC', 
    'POWERGRID', 'ADANIPORTS', 'TATAMOTORS', 'SUNPHARMA', 'M&M', 'BAJAJFINSV', 
    'TATACONSUM', 'NESTLEIND', 'COALINDIA', 'INDUSINDBK', 'BPCL', 'IOC', 
    'TITAN', 'JSWSTEEL', 'VEDL', 'GRASIM', 'DIVISLAB', 'SHREECEM', 'DRREDDY', 
    'HINDALCO', 'UPL', 'TECHM', 'BRITANNIA', 'CIPLA', 'SBILIFE', 'EICHERMOT', 
    'HEROMOTOCO', 'GAIL', 'BANDHANBNK', 'GODREJCP', 'TATAPOWER', 'DABUR', 
    'HAVELLS', 'PIDILITIND', 'SIEMENS', 'MCDOWELL-N', 'BIOCON', 'ADANIGREEN', 
    'TORNTPHARM', 'NAUKRI', 'ICICIGI', 'LUPIN', 'BERGEPAINT', 'ADANITRANS', 
    'ACC', 'BOSCHLTD', 'HINDPETRO', 'BALKRISIND', 'JINDALSTEL', 'PGHH', 
    'GLAXO', 'COLPAL', 'PETRONET', 'HDFCAMC', 'AMBUJACEM', 'IDFCFIRSTB', 
    'NMDC', 'DLF', 'PFC', 'SIEMENS', 'IRCTC', 'BEL', 'PVR', 'MFSL', 
    'BATAINDIA', 'BANKBARODA', 'CANBK', 'SRTRANSFIN', 'ADANIPOWER', 'ESCORTS', 
    'ZEEL', 'INDIGO', 'AUBANK', 'IGL', 'TATAELXSI', 'ABB', 'MOTHERSUMI', 
    'CHOLAFIN', 'LICI', 'ATUL', 'CRISIL', 'CUMMINSIND', 'FEDERALBNK', 
    'AUROPHARMA', 'APOLLOTYRE', 'CONCOR', 'HONAUT', 'INDIANB', 'RBLBANK', 
    'UBL', 'SUNTV', 'CASTROLIND', 'RAMCOCEM', 'NHPC', 'SHRIRAMFIN', 'ZYDUSLIFE', 
    'OBEROIRLTY', 'POLYCAB', 'TRENT', 'GMRINFRA', 'PHOENIXLTD', 'PIIND'
  ];

  const createSentimentTableQuery = `
      CREATE TABLE IF NOT EXISTS sentiment_results (
          stock_symbol TEXT,
          published_date TIMESTAMP,
          article_id UUID,
          sentiment_score FLOAT,
          PRIMARY KEY (stock_symbol, published_date, article_id)
      )
  `;

  try {
    await client.execute(createSentimentTableQuery);
    console.log("Table sentiment_results created or already exists.");

    for (const symbol of stockSymbols) {
      const api_key = '8851210072814d85be557116e9a5ad83'; 
      const url = `https://newsapi.org/v2/everything?q=${symbol}&sortBy=publishedAt&apiKey=${api_key}`;

      const response = await axios.get(url);
      const articles = response.data.articles;

      for (const article of articles) {
        const article_id = uuidv4(); 
        const published_date = new Date(article.publishedAt); 
        const content = article.content || ''; 

        const sentimentScores = vader.SentimentIntensityAnalyzer.polarity_scores(content); 
        const sentimentScore = sentimentScores.compound; 

        const insertSentimentQuery = `
            INSERT INTO sentiment_results (stock_symbol, published_date, article_id, sentiment_score)
            VALUES (?, ?, ?, ?)
        `;
        await client.execute(insertSentimentQuery, [symbol, published_date, article_id, sentimentScore], { prepare: true });
      }
    }

    console.log("Sentiment results inserted into Cassandra successfully!");
    return res.status(200).json({ message: "Sentiment analysis completed and results inserted successfully!" });
  } catch (error) {
    console.error(`Error occurred: ${error}`);
    return res.status(500).json({ error: 'An error occurred while processing the sentiment analysis' });
  }
};

exports.getAvgSentiment = async (req, res) => {
    const stock_symbol = req.body.symbol; 

    console.log(`Fetching average sentiment for stock symbol: ${stock_symbol}`);

    const avgSentimentQuery = `
        SELECT AVG(sentiment_score) AS avg_sentiment
        FROM sentiment_results
        WHERE stock_symbol = ?
    `;

    try {
        const result = await client.execute(avgSentimentQuery, [stock_symbol], { prepare: true });

        if (result.rowLength === 0) {
            return res.status(404).json({ message: 'No sentiment data found for this stock symbol.' });
        }

        const avgSentiment = result.rows[0].avg_sentiment; 
        return res.status(200).json({
            stock_symbol: stock_symbol,
            average_sentiment: avgSentiment
        });
    } catch (error) {
        console.error(`Error occurred while fetching average sentiment: ${error}`);
        return res.status(500).json({ error: 'An error occurred while fetching the average sentiment.' });
    }
};

exports.getTopSentiments = async (req, res) => {
    console.log("Fetching top 5 stocks based on average sentiment scores.");

    const stockSymbolsQuery = `SELECT DISTINCT stock_symbol FROM sentiment_results`;

    try {
        const stockSymbolsResult = await client.execute(stockSymbolsQuery, [], { prepare: true });
        const stockSymbols = stockSymbolsResult.rows.map(row => row.stock_symbol);

        if (stockSymbols.length === 0) {
            return res.status(404).json({ message: 'No stock symbols found.' });
        }

        let sentiments = [];

        for (let symbol of stockSymbols) {
            const avgSentimentQuery = `
                SELECT AVG(sentiment_score) AS avg_sentiment
                FROM sentiment_results
                WHERE stock_symbol = ?
            `;

            const result = await client.execute(avgSentimentQuery, [symbol], { prepare: true });

            if (result.rowLength > 0 && result.rows[0].avg_sentiment !== null) {
                sentiments.push({
                    stock_symbol: symbol,
                    average_sentiment: result.rows[0].avg_sentiment
                });
            }
        }

        const topSentiments = sentiments.sort((a, b) => b.average_sentiment - a.average_sentiment).slice(0, 5);

        return res.status(200).json({
            top_sentiments: topSentiments
        });
    } catch (error) {
        console.error(`Error occurred while fetching top sentiments: ${error}`);
        return res.status(500).json({ error: 'An error occurred while fetching the top sentiments.' });
    }
};

