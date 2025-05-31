FROM alpine:3.18

# Install basic tools
RUN apk add --no-cache \
    bash \
    coreutils \
    curl \
    wget \
    ca-certificates

# Create non-root user
RUN adduser -D -u 1000 -g 1000 -s /bin/bash sandboxuser

# Create workspace directory
RUN mkdir -p /workspace && \
    chown sandboxuser:sandboxuser /workspace

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER sandboxuser

# Default command
CMD ["/bin/bash"]