#!/bin/bash

# Example build script for frontend with hardcoded URLs
# This demonstrates how to build the Docker image with specific API and socket URLs

# Example 1: Build for local development
echo "Building for local development..."
docker build \
  --build-arg VITE_API_URL=http://localhost:3001 \
  --build-arg VITE_SOCKET_URL=http://localhost:3001 \
  -t webrtc-frontend:local \
  .

# Example 2: Build for production with specific domain
echo "Building for production..."
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_SOCKET_URL=https://api.yourdomain.com \
  -t webrtc-frontend:production \
  .

# Example 3: Build for staging environment
echo "Building for staging..."
docker build \
  --build-arg VITE_API_URL=https://staging-api.yourdomain.com \
  --build-arg VITE_SOCKET_URL=https://staging-api.yourdomain.com \
  -t webrtc-frontend:staging \
  .

echo "Build examples completed!"
echo ""
echo "To run the built image:"
echo "docker run -p 80:80 webrtc-frontend:local"
