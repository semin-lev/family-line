# Docker Build with Hardcoded URLs

This document explains how to build the frontend Docker image with hardcoded API and socket URLs.

## Overview

The frontend Docker image now supports build-time configuration of API and socket URLs. This means the URLs are baked into the JavaScript bundle during the build process, eliminating the need for runtime environment variables.

## Build Arguments

The following build arguments are available:

- `VITE_API_URL`: The base URL for API calls (e.g., `http://localhost:3001`, `https://api.yourdomain.com`)
- `VITE_SOCKET_URL`: The URL for WebSocket connections (e.g., `http://localhost:3001`, `https://api.yourdomain.com`)

## Usage Examples

### Local Development
```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:3001 \
  --build-arg VITE_SOCKET_URL=http://localhost:3001 \
  -t webrtc-frontend:local \
  .
```

### Production
```bash
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_SOCKET_URL=https://api.yourdomain.com \
  -t webrtc-frontend:production \
  .
```

### Staging
```bash
docker build \
  --build-arg VITE_API_URL=https://staging-api.yourdomain.com \
  --build-arg VITE_SOCKET_URL=https://staging-api.yourdomain.com \
  -t webrtc-frontend:staging \
  .
```

## Running the Container

After building, run the container:

```bash
docker run -p 80:80 webrtc-frontend:production
```

The application will be available at `http://localhost` and will connect to the hardcoded URLs specified during the build.

## Benefits

1. **No Runtime Configuration**: URLs are baked into the build, eliminating the need for environment variables at runtime
2. **Security**: No sensitive configuration exposed in the running container
3. **Performance**: No runtime URL resolution needed
4. **Consistency**: Same URLs across all instances of the same build

## Migration from Runtime Environment Variables

If you were previously using runtime environment variables, you can now:

1. Remove any runtime environment variable configuration
2. Build the image with the appropriate URLs for your environment
3. Deploy the same image across multiple environments by building separate images

## Troubleshooting

### URLs Not Working
- Verify the URLs are accessible from the client's browser
- Ensure CORS is properly configured on the backend
- Check that the backend is running on the specified URLs

### Build Failures
- Ensure all build arguments are provided
- Check that the URLs are valid (include protocol: `http://` or `https://`)
- Verify the backend port is correct

### WebRTC Issues
- Ensure HTTPS is used for production deployments
- Check that the backend supports WebSocket connections
- Verify firewall settings allow the specified ports
