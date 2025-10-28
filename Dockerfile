# Stage 1: The Builder Stage
# We use an official Golang image optimized for compilation.
FROM golang:1.21-alpine AS builder

# Install necessary tools: upx for compression and git/musl-dev for general build environment setup.
RUN apk add --no-cache upx musl-dev git

WORKDIR /src

# Copy Go module files first to leverage Docker's build cache.
COPY go.mod go.sum ./
RUN go mod download

# Copy all source files
COPY . .

# Compile the Go application:
# CGO_ENABLED=0 is CRITICAL for Distroless 'static' images, ensuring a statically linked binary.
# -ldflags '-w -s' reduces the binary size.
ENV CGO_ENABLED=0
RUN go build -ldflags '-w -s' -o /usr/local/bin/dave ./main.go

# Compress the binary using upx for minimal size
RUN upx -9 -f --ultra-brute -o /usr/local/bin/dave_compressed /usr/local/bin/dave && \
    mv /usr/local/bin/dave_compressed /usr/local/bin/dave

# ---
# Stage 2: The Distroless Runtime Stage
# gcr.io/distroless/static is used for Go binaries which are statically compiled (CGO_ENABLED=0).
# This image is extremely minimal and does not contain a shell.
FROM gcr.io/distroless/static-debian12

# Set the working directory
WORKDIR /app

# Copy the compressed, statically linked binary from the builder stage.
COPY --from=builder /usr/local/bin/dave /app/dave

# Copy the configuration file.
# Note: config.json must be read directly by the Go app, as there's no shell to process environment variables or complex entrypoints.
COPY config.json /app/config.json

# Define the entry point for the application.
# Must use the JSON array (vector) format since there is no shell.
# Distroless 'static' images typically run as a non-root user (nobody/65534) by default.
# If you need a specific non-root user (e.g., 1000), you would use `gcr.io/distroless/static-debian12:nonroot` instead.
ENTRYPOINT ["/app/dave"]
