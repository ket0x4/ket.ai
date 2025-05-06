FROM alpine

# Copy files
COPY . /build
WORKDIR /build

# Build the Go app
RUN apk --no-cache add go upx && \
    go mod tidy && \
    CCGO_ENABLED=0 go build -ldflags '-w -s' -o main main.go && \
    upx -9 -f --ultra-brute -o ketai main && \
    mkdir /app && mv ketai /app/ketai &&\
    rm -rf /build && \
    apk del --purge go upx

COPY sample.config.json /app/config.json

WORKDIR /app
CMD ["sh", "-c", "/app/ketai"]
