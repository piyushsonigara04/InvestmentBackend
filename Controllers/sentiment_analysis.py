from pyspark.sql import SparkSession
from pyspark.sql.functions import udf, col, lit
from pyspark.sql.types import StringType, DoubleType
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import pandas as pd
import json
from datetime import datetime
import sys

# Initialize Spark session
spark = SparkSession.builder \
    .appName("News Sentiment Analysis") \
    .config("spark.sql.shuffle.partitions", "8") \
    .getOrCreate()

# Get stock symbol from command line arguments
if len(sys.argv) < 2:
    print(json.dumps({'error': 'Stock symbol is required'}))
    spark.stop()
    sys.exit(1)

ST = sys.argv[1]  # Get the stock symbol from command line argument
api_key = '8851210072814d85be557116e9a5ad83'
url = f'https://newsapi.org/v2/everything?q={ST}&sortBy=publishedAt&apiKey={api_key}'

try:
    # Fetch data from the API
    response = requests.get(url)
    
    # Check if the API response was successful
    response.raise_for_status()  # Raises an HTTPError for bad responses

    news_data = response.json()

    # Convert articles to a DataFrame using Pandas and then to Spark DataFrame
    articles = news_data.get('articles', [])
    df_pd = pd.DataFrame(articles)

    # Create Spark DataFrame
    df_spark = spark.createDataFrame(df_pd)

    # Text preprocessing (fill null content)
    df_spark = df_spark.fillna({'content': ''})

    # Define a UDF for sentiment analysis using VADER
    analyzer = SentimentIntensityAnalyzer()
    
    def get_sentiment(content):
        return analyzer.polarity_scores(content)['compound']

    # Register the UDF
    sentiment_udf = udf(get_sentiment, DoubleType())

    # Apply the UDF to compute sentiment score
    df_spark = df_spark.withColumn("sentiment", sentiment_udf(col("content")))

    # Convert 'publishedAt' to timestamp type
    df_spark = df_spark.withColumn("published_date", col("publishedAt").cast("timestamp"))

    # Add stock symbol column to the DataFrame
    df_spark = df_spark.withColumn("stock_symbol", lit(ST))

    # Select relevant columns
    df_spark = df_spark.select(
        col("source.name").alias("source"),
        col("title"),
        col("author"),
        col("content"),
        col("url"),
        col("published_date"),
        col("sentiment"),
        col("stock_symbol")
    )

    # Store the data in Spark SQL (In-Memory Table)
    df_spark.createOrReplaceTempView("news_articles")

    # Query to fetch the average sentiment score
    avg_sentiment = spark.sql(f"""
        SELECT AVG(sentiment) AS avg_sentiment
        FROM news_articles 
        WHERE stock_symbol = '{ST}'
    """)
    avg_sentiment_value = avg_sentiment.collect()[0]['avg_sentiment']

    # Convert average sentiment to a JSON-compatible format
    avg_sentiment_json = [{'avg_sentiment': avg_sentiment_value}]
    print(json.dumps(avg_sentiment_json))

except Exception as e:
    print(f"An error occurred: {e}")
finally:
    spark.stop()  # Ensure Spark session stops in case of any error
