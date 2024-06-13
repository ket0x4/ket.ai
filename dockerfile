FROM alpine:edge

# Set the working directory
WORKDIR /app

# Copy the project files to the container
COPY ketard.py /app/
COPY requirements.txt /app/
COPY settings.json /app/

# Install any dependencies
RUN apk add --no-cache linux-headers python3 python3-dev py3-pip gcc musl-dev g++ build-base
RUN pip3 install --no-cache-dir -r requirements.txt

# Set the entry point command
CMD ["python3 ketard.py"]