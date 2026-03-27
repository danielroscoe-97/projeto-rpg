FROM node:22-slim

# Install git and gh CLI (needed for branch/PR operations)
RUN apt-get update && apt-get install -y git gh && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy orchestrator files
COPY package.json ./
RUN npm install

COPY . .

# Railway injects env vars automatically
CMD ["npm", "start"]
