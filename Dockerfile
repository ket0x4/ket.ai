FROM alpine:edge

# Copy files
COPY ket /ket

CMD ["sh", "-c", "ket"]