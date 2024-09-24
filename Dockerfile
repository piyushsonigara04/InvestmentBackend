FROM apache/spark-py:latest

# Switch to root user
USER root  

# Install necessary packages
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Switch back to the default user
USER spark  

# Set the working directory
WORKDIR /scripts

# Copy your sentiment_analysis.py script to the image
COPY Controllers/sentiment_analysis.py /scripts/
