FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash sandboxuser

# Create workspace directory
RUN mkdir -p /workspace && \
    chown sandboxuser:sandboxuser /workspace

# Install common Python packages
RUN pip install --no-cache-dir \
    pytest \
    pytest-cov \
    numpy \
    pandas \
    requests \
    flask \
    fastapi \
    black \
    flake8 \
    mypy

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER sandboxuser

# Default command
CMD ["/bin/bash"]