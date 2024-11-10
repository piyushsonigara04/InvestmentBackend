from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from uuid import uuid4
import requests
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime

# Initialize Cassandra connection
cluster = Cluster(['127.0.0.1'], port=9042)  # Replace with your Cassandra node IPs
session = cluster.connect('stock_trading')

# 1. Data Collection (using a news API)
ST='ONGC'
api_key = '8851210072814d85be557116e9a5ad83'
url = ('https://newsapi.org/v2/everything?'
       f'q={ST}&'  # Replace 'AAPL' with your stock symbol
       'sortBy=publishedAt&'
       f'apiKey={api_key}')

response = requests.get(url)
news_data = response.json()

# 2. Convert to DataFrame
articles = news_data.get('articles', [])
df = pd.DataFrame(articles)

# 3. Text Preprocessing
df['content'] = df['content'].fillna('')

# 4. Sentiment Analysis using VADER
analyzer = SentimentIntensityAnalyzer()
df['sentiment'] = df['content'].apply(lambda x: analyzer.polarity_scores(x)['compound'])

# 5. Store Articles in Cassandra
for _, row in df.iterrows():
    article_id = uuid4()
    stock_symbol = f'{ST}'  # Replace with your stock symbol
    published_date = datetime.strptime(row['publishedAt'], '%Y-%m-%dT%H:%M:%SZ')  # Convert to datetime object
    title = row['title']
    content = row['content']
    author = row.get('author', 'Unknown')
    url = row['url']
    
    # Insert into news_articles table
    insert_article_query = """
    INSERT INTO news_articles (stock_symbol, published_date, article_id, title, content, author, url)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    session.execute(insert_article_query, (stock_symbol, published_date, article_id, title, content, author, url))
    
    # Insert sentiment analysis result into sentiment_results table
    sentiment_score = row['sentiment']
    insert_sentiment_query = """
    INSERT INTO sentiment_results (stock_symbol, published_date, article_id, sentiment_score)
    VALUES (%s, %s, %s, %s)
    """
    session.execute(insert_sentiment_query, (stock_symbol, published_date, article_id, sentiment_score))

print("Data inserted into Cassandra successfully!")