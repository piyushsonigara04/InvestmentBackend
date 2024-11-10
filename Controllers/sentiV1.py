from pyspark.sql import SparkSession
from pyspark.sql.functions import udf, col, lit
from pyspark.sql.types import DoubleType
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests
import pandas as pd
from cassandra.cluster import Cluster

spark = SparkSession.builder \
    .appName("News Sentiment Analysis for Multiple Stocks") \
    .config("spark.sql.shuffle.partitions", "8") \
    .config("spark.cassandra.connection.host", "localhost") \
    .config("spark.cassandra.connection.port", "9042") \
    .getOrCreate()

# spark = SparkSession.builder \
#     .appName("News Sentiment Analysis for Multiple Stocks") \
#     .config("spark.sql.shuffle.partitions", "8") \
#     .config("spark.cassandra.connection.host", "localhost") \
#     .config("spark.cassandra.connection.port", "9042") \
#     .config("spark.executor.memory", "2g") \  # Adjust based on your resources
#     .config("spark.driver.memory", "2g") \  # Adjust based on your resources
#     .config("spark.executor.heartbeatInterval", "60s") \  # Increase heartbeat interval
#     .config("spark.network.timeout", "800s") \  # Increase network timeout
#     .config("spark.rpc.askTimeout", "800s") \  # Increase RPC ask timeout
#     .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
#     .config("spark.kryo.registrator", "your.custom.KryoRegistrator") \  # Optional: Define a custom Kryo registrator if needed
#     .getOrCreate()



# Define the VADER sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

# UDF for sentiment analysis
def get_sentiment(content):
    return analyzer.polarity_scores(content)['compound']

sentiment_udf = udf(get_sentiment, DoubleType())

# Connect to Cassandra
def connect_to_cassandra():
    cluster = Cluster(['localhost'])
    session = cluster.connect('stock_trading')
    
    # Create the table if it doesn't exist
    session.execute("""
        CREATE TABLE IF NOT EXISTS stock_sentiments (
            stock_symbol text,
            published_date timestamp,
            title text,
            content text,
            sentiment double,
            PRIMARY KEY (stock_symbol, published_date)
        );
    """)
    return session

# Function to fetch news data and analyze sentiment for a single stock
def analyze_news_sentiment(stock_symbol, api_key):
    url = f'https://newsapi.org/v2/everything?q={stock_symbol}&sortBy=publishedAt&apiKey={api_key}'
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Error: Failed to fetch data for {stock_symbol}.")
        return None
    
    news_data = response.json()
    articles = news_data.get('articles', [])
    
    # Convert articles to a Pandas DataFrame and then to Spark DataFrame
    df_pd = pd.DataFrame(articles)
    if df_pd.empty:
        print(f"No news articles found for {stock_symbol}.")
        return None
    
    df_spark = spark.createDataFrame(df_pd)
    
    # Preprocess and apply sentiment analysis
    df_spark = df_spark.fillna({'content': ''})
    df_spark = df_spark.withColumn("sentiment", sentiment_udf(col("content")))
    df_spark = df_spark.withColumn("published_date", col("publishedAt").cast("timestamp"))
    df_spark = df_spark.withColumn("stock_symbol", lit(stock_symbol))
    
    return df_spark

# Store sentiment data into Cassandra
def store_sentiment_to_cassandra(df_spark, session):
    rows = df_spark.collect()  # Collect data from Spark DataFrame
    for row in rows:
        session.execute(
            """
            INSERT INTO stock_sentiments (stock_symbol, published_date, title, content, sentiment)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (row.stock_symbol, row.published_date, row.title, row.content, row.sentiment)
        )
    print(f"Stored {len(rows)} records for {rows[0].stock_symbol if rows else ''} in Cassandra.")

# Main function to analyze sentiment for top 100 stocks in India
def main():
    api_key = '8851210072814d85be557116e9a5ad83'
    
    # List of top 100 Indian stock symbols (replace with actual top 100 stock symbols)
    top_100_stocks = [
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBI', 'KOTAKBANK',
        'HDFC', 'BHARTIARTL', 'ITC', 'BAJFINANCE', 'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT', 
        # ... add remaining stock symbols here ...
        'ULTRACEMCO', 'M&M', 'TATAMOTORS', 'SUNPHARMA', 'JSWSTEEL', 'ONGC', 'HCLTECH', 'NTPC'
        # List up to 100 stocks
    ]
    
    # Connect to Cassandra
    cassandra_session = connect_to_cassandra()
    
    # Iterate through each stock symbol and analyze sentiment
    for stock_symbol in top_100_stocks:
        print(f"Analyzing sentiment for {stock_symbol}...")
        df_spark = analyze_news_sentiment(stock_symbol, api_key)
        
        if df_spark:
            # Store results in Cassandra
            store_sentiment_to_cassandra(df_spark, cassandra_session)
    
    # Close the Cassandra session
    cassandra_session.shutdown()

if __name__ == '__main__':
    main()
