# Backend Dockerfile for Production
FROM node:18-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install system dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
# Install system dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM node:18-bullseye-slim AS runner
WORKDIR /app

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nodejs

# Copy the built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./

# Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3001
EXPOSE 40000-49999/udp
EXPOSE 40000-49999/tcp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# MediaSoup configuration
ENV MEDIASOUP_ANNOUNCED_IP=webrtc-fe-app-aqdwe.ondigitalocean.app
ENV MEDIASOUP_MIN_PORT=40000
ENV MEDIASOUP_MAX_PORT=49999
ENV EXTERNAL_DOMAIN=webrtc-fe-app-aqdwe.ondigitalocean.app

# CORS configuration
ENV CORS_ORIGIN=https://webrtc-fe-app-aqdwe.ondigitalocean.app

# Server configuration
ENV SERVER_HOST=0.0.0.0

# Start the application
CMD ["npm", "start"]
