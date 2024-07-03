FROM alpine:edge

# Install packages
RUN apk update && \
    apk add --no-cache \
        git \
        curl \
        ffmpeg \
        flac \
        python3 \
        py3-pip \
        gcc \
        python3-dev \
        musl-dev \
        linux-headers

# Clone repo and install requirements
RUN git clone https://github.com/ket0x4/ketard-ai && \
    cd ketard-ai && \
    python3 -m venv venv && \
    source venv/bin/activate && \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# install ollama and pull model
RUN curl -fsSL https://ollama.com/install.sh | sh
RUN ollama pull phi3-mini

WORKDIR /ketard-ai
CMD ["/bin/sh", "start"]