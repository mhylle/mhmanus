# Development Dockerfile for NestJS backend
FROM node:20-alpine

# Install Docker CLI and other necessary tools
RUN apk add --no-cache docker-cli bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Create docker group with GID 1001 (matching host docker group)
# and add node user to it for Docker socket access
RUN addgroup -g 1001 docker && \
    adduser node docker

# Create workspace directory with proper permissions
RUN mkdir -p /tmp/mhmanus-workspaces && \
    chown -R node:node /tmp/mhmanus-workspaces

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "start:dev"]