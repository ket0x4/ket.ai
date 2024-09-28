FROM alpine

# Install packages
RUN apk add --no-cache \
    ffmpeg \
    flac \
    python3 \
    py3-pip \
    gcc \
    git \
    python3-dev \
    musl-dev \
    linux-headers

# Copy files
COPY ketard /ketard
COPY start /start
COPY config.json /config.json
COPY database.db /database.db
RUN chmod +x /start

# Install python packages
RUN pip install --no-cache-dir \
    --break-system-packages \
    langchain_community \
    TgCrypto \
    psutil \
    httpx \
    packaging \
    gitpython \
    aiosqlite \
    youtube-transcript-api \
    SpeechRecognition \
    gradio_client \
    https://github.com/KurimuzonAkuma/pyrogram/archive/dev.zip \
    && rm -rf /root/.cache/pip

# Remove build dependencies
RUN apk del gcc python3-dev musl-dev linux-headers --purge -r
CMD ["sh", "-c", "/bin/sh start"]