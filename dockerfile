# For clacky.ai
FROM ubuntu:22.04

# Base tools
RUN apt-get update && \
    apt-get install -y curl build-essential git \
                       mysql-client postgresql-client redis-tools mongodb-clients

# Install nvm & Node 20.1.0
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.1/install.sh | bash && \
    /bin/bash -lc "nvm install 20.1.0 && nvm alias default 20.1.0"

# Install Python 3.12
RUN apt-get update && \
    apt-get install -y python3.12 python3.12-venv python3.12-dev

# Set the workspace
WORKDIR /workspace
