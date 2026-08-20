# Stage 1: Build the standalone Linux binary
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy dependency files and install workspace dependencies
COPY package.json bun.lock ./
COPY web/package.json ./web/
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build frontend web assets
RUN cd web && bun run build

# Compile the Bun app to a standalone Linux x64 binary
RUN bun build --compile --minify --target=bun-linux-x64 src/index.ts --outfile ket

# Stage 2: Distroless runner
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

# Set timezone
ENV TZ=Europe/Istanbul

# Copy the compiled standalone binary and static assets from stage 1
COPY --from=builder /app/ket /app/ket
COPY --from=builder /app/public /app/public

# The bot expects config.json, system.txt, bot.db, and logs directory in /app (mapped via volumes)
CMD ["/app/ket"]
