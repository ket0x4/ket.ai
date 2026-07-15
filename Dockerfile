# Stage 1: Build the standalone Linux binary
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy dependency files and install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Compile the Bun app to a standalone Linux x64 binary
RUN bun build --compile --minify --target=bun-linux-x64 src/index.ts --outfile ket

# Stage 2: Distroless runner
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

# Copy the compiled standalone binary from stage 1
COPY --from=builder /app/ket /app/ket

# The bot expects config.json and system.txt in /app (mapped via volumes)
CMD ["/app/ket"]
