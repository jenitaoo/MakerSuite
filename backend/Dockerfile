FROM python:3.11-slim

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Make entrypoint executable
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Command to run on container start
ENTRYPOINT ["./entrypoint.sh"]
