# Install Node.js v22 (LTS) and alpine (lightweight Linux distribution)
FROM node:22-alpine

WORKDIR /app

# Install project dependencies
COPY package*.json ./
RUN npm ci

# Copy configuration and source files
COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs

# Set default entrypoint to run the ask-node RAG CLI
ENTRYPOINT ["npx", "tsx", "src/ask-node.ts"]
CMD ["--help"]
