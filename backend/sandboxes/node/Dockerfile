FROM node:20-alpine

# Install additional tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    git

# Use the node user that already exists in the base image
# Just ensure it has a proper shell
RUN sed -i 's|node:x:1000:1000::/home/node:/bin/.*|node:x:1000:1000::/home/node:/bin/bash|' /etc/passwd || true

# Create workspace directory
RUN mkdir -p /workspace && \
    chown node:node /workspace

# Install common npm packages globally
RUN npm install -g \
    typescript \
    ts-node \
    @types/node \
    jest \
    mocha \
    chai \
    eslint \
    prettier

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER node

# Default command
CMD ["/bin/bash"]