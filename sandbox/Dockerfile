# Lightweight Pre-warmed Sandbox Container for Ket AI (Python 3.12 Slim + Bun + Playwright)
# Base: Debian-based Python 3.12 slim with full glibc compatibility

FROM oven/bun:debian AS bun-source

FROM python:3.12-slim

# Prevent interactive prompts during package installs
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Istanbul
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV SANDBOX_PORT=8080
ENV MPLBACKEND=Agg
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install essential CLI utilities and fonts for plotting
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    jq \
    ca-certificates \
    git \
    unzip \
    fonts-dejavu-core \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy Bun runtime from official Bun debian image
COPY --from=bun-source /usr/local/bin/bun /usr/local/bin/bun

# Install pre-compiled Python libraries (Data Science, Math, Scraping & Visualization)
RUN pip install --no-cache-dir \
    requests \
    httpx \
    beautifulsoup4 \
    lxml \
    numpy \
    pandas \
    matplotlib \
    seaborn \
    pillow \
    sympy \
    scipy \
    openpyxl \
    yfinance \
    duckdb \
    playwright

# Install Playwright Chromium headless browser with minimal dependencies
RUN playwright install --with-deps chromium

# Create unprivileged sandbox user
RUN useradd -m -u 1000 -s /bin/bash sandboxuser && \
    mkdir -p /tmp/sandboxes /home/sandboxuser/app /ms-playwright && \
    chown -R sandboxuser:sandboxuser /tmp/sandboxes /home/sandboxuser /ms-playwright

WORKDIR /home/sandboxuser/app

# Copy sandbox server code
COPY package.json server.ts ./
RUN chown -R sandboxuser:sandboxuser /home/sandboxuser/app

USER sandboxuser

EXPOSE 8080

CMD ["bun", "run", "server.ts"]
