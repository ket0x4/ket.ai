FROM python:3-alpine

# Copy files and set working directory
COPY . /app
WORKDIR /app

# Install dependencies
RUN set -eux; \
        apk add --no-cache \
            build-base \
            g++ gcc \
            linux-headers \
            musl-dev; \
        pip install --no-cache-dir -Ur requirements.txt

# Set execution command
CMD ["python", "ketard.py"]
