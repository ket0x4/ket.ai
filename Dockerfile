FROM alpine

# Copy files
COPY ket.ai /app

CMD ["sh", "-c", "/app/ket.ai"]
