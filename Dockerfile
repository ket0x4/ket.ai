FROM alpine:edge

# Install packages
RUN apk update && \
    apk add --no-cache \
        ffmpeg \
        flac \
        python3 \
        py3-pip \
        gcc \
        python3-dev \
        musl-dev \
        linux-headers

# Copy files
COPY ketard /ketard
COPY start /start
COPY config.json /config.json
RUN chmod +x /start

# Install python packages
RUN python -m venv venv && source venv/bin/activate && \
    pip install --no-cache-dir \
    langchain_community \
    TgCrypto \
    packaging \
    psutil \
    httpx \
    gitpython \
    aiosqlite \
    youtube-transcript-api \
    SpeechRecognition \
    https://github.com/KurimuzonAkuma/pyrogram/archive/dev.zip && \
    rm -rf /root/.cache/pip

# Remove build dependencies
RUN apk del gcc python3-dev musl-dev linux-headers py3-pip --purge -r

CMD ["sh", "-c", "source venv/bin/activate && /bin/sh start"]