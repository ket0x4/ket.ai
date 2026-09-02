# Ultra-lightweight Pre-warmed Sandbox Container for Ket AI (Alpine Edge)
# Includes: Python 3, Bun, Chromium Headless, BeautifulSoup4, Requests, Httpx, Pandas, etc.

FROM oven/bun:alpine AS bun-source

FROM alpine:edge

# Set timezone and environment
ENV TZ=Europe/Istanbul
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV SANDBOX_PORT=8080
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install Python 3, pip, pre-compiled data/scraping packages, Chromium, and system utilities
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    py3-requests \
    py3-beautifulsoup4 \
    py3-lxml \
    py3-pandas \
    py3-httpx \
    chromium \
    bash \
    curl \
    wget \
    jq \
    ca-certificates \
    tzdata \
    libstdc++ \
    && rm -rf /var/cache/apk/*

# Copy Bun runtime from official Bun alpine image
COPY --from=bun-source /usr/local/bin/bun /usr/local/bin/bun

# Install Playwright python package for chromium control
RUN pip3 install --no-cache-dir --break-system-packages playwright

# Create unprivileged sandbox user
RUN adduser -D -u 1000 -s /bin/bash sandboxuser && \
    mkdir -p /tmp/sandboxes /home/sandboxuser/app && \
    chown -R sandboxuser:sandboxuser /tmp/sandboxes /home/sandboxuser

WORKDIR /home/sandboxuser/app

# Copy sandbox server code
COPY package.json server.ts ./
RUN chown -R sandboxuser:sandboxuser /home/sandboxuser/app

USER sandboxuser

EXPOSE 8080

CMD ["bun", "run", "server.ts"]
