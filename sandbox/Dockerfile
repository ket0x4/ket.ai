# Pre-warmed Sandbox Container for Ket AI
# Includes: Python 3, Bun, Node.js, Playwright Chromium, BeautifulSoup4, Requests, Httpx, Pandas, etc.

FROM mcr.microsoft.com/playwright:v1.49.0-noble

# Prevent interactive prompts during package installs
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Istanbul

# Install Python 3, pip, and essential utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    jq \
    ca-certificates \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

# Install common Python libraries globally
RUN pip3 install --no-cache-dir --break-system-packages \
    requests \
    httpx \
    beautifulsoup4 \
    lxml \
    pandas \
    playwright

# Install Playwright Chromium browser binaries
RUN python3 -m playwright install chromium

# Create unprivileged sandbox user
RUN useradd -m -u 1001 -s /bin/bash sandboxuser && \
    mkdir -p /tmp/sandboxes /home/sandboxuser/app /ms-playwright && \
    chown -R sandboxuser:sandboxuser /tmp/sandboxes /home/sandboxuser /ms-playwright

WORKDIR /home/sandboxuser/app

# Copy sandbox server code
COPY package.json server.ts ./
RUN chown -R sandboxuser:sandboxuser /home/sandboxuser/app

USER sandboxuser

# Environment variables
ENV PORT=8080
ENV SANDBOX_PORT=8080
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["bun", "run", "server.ts"]
