# Use the official Python 3.12 image with OpenJDK
FROM python:3.12.2-bullseye

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    openjdk-11-jdk \
    curl && \
    rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Set environment variables for Spark and Cassandra
ENV SPARK_VERSION=3.4.1
ENV HADOOP_VERSION=3
ENV SPARK_HOME=/opt/spark
ENV PATH="$SPARK_HOME/bin:$PATH"

# Download and install Spark
RUN curl -fsSL https://archive.apache.org/dist/spark/spark-$SPARK_VERSION/spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION.tgz | \
    tar -xz -C /opt && \
    mv /opt/spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION /opt/spark

# Install Python packages
RUN pip install pyspark==3.4.1 cassandra-driver requests pandas vaderSentiment

# Create working directory
WORKDIR /app

# Copy the sentiV1.py script to the container
COPY Controllers/sentiV1.py /app/

# Expose the Spark UI and Cassandra default ports
EXPOSE 4040 9042

# Set the entry point to run the Python script
CMD ["python", "sentiV1.py"]
