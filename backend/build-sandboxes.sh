#!/bin/bash

echo "Building sandbox Docker images..."

# Build base sandbox
echo "Building base sandbox..."
docker build -t mhmanus/sandbox-base:latest ./sandboxes/base/

# Build Node.js sandbox
echo "Building Node.js sandbox..."
docker build -t mhmanus/sandbox-node:latest ./sandboxes/node/

# Build Python sandbox
echo "Building Python sandbox..."
docker build -t mhmanus/sandbox-python:latest ./sandboxes/python/

echo "Sandbox images built successfully!"
docker images | grep mhmanus/sandbox