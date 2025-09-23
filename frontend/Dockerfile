# Frontend Dockerfile for Production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for API and socket URLs
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_BACKEND_PORT=3001

# Set environment variables for the build process
ENV NODE_ENV=production
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_BACKEND_PORT=$VITE_BACKEND_PORT

# Build the application
RUN npm run build

# Production image, copy all the files and run nginx
FROM nginx:alpine AS runner

# Create nginx configuration for HTTP only (initial setup)
COPY <<EOF /etc/nginx/conf.d/http-template.conf.disabled
# HTTP server - handle Let's Encrypt challenges and serve app
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    # Let's Encrypt webroot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://webrtc-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Backend health check proxy
    location /health {
        proxy_pass http://webrtc-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket proxy for Socket.IO
    location /socket.io/ {
        proxy_pass http://webrtc-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Create nginx configuration for HTTPS (after certificates are available)
COPY <<EOF /etc/nginx/conf.d/https-template.conf.disabled
# HTTP server - handle Let's Encrypt challenges and redirect to HTTPS
server {
    listen 80;
    server_name _;
    
    # Let's Encrypt webroot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    http2 on;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SSL configuration - point directly to Let's Encrypt files
    ssl_certificate /etc/nginx/ssl/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Backend API proxy
    location /api/ {
        proxy_pass http://webrtc-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Backend health check proxy
    location /health {
        proxy_pass http://webrtc-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket proxy for Socket.IO
    location /socket.io/ {
        proxy_pass http://webrtc-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Copy the built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create certbot webroot directory
RUN mkdir -p /var/www/certbot

# Create startup script
COPY <<EOF /docker-entrypoint.sh
#!/bin/sh
set -e

# Remove any existing default.conf to avoid conflicts
rm -f /etc/nginx/conf.d/default.conf

# Check if SSL certificates exist in Let's Encrypt directory
if [ -f "/etc/nginx/ssl/live/\${DOMAIN}/fullchain.pem" ] && [ -f "/etc/nginx/ssl/live/\${DOMAIN}/privkey.pem" ]; then
    echo "SSL certificates found, using HTTPS configuration"
    cp /etc/nginx/conf.d/https-template.conf.disabled /etc/nginx/conf.d/default.conf
    # Replace domain placeholder with actual domain
    sed -i "s/DOMAIN_PLACEHOLDER/\${DOMAIN}/g" /etc/nginx/conf.d/default.conf
else
    echo "No SSL certificates found, using HTTP-only configuration"
    cp /etc/nginx/conf.d/http-template.conf.disabled /etc/nginx/conf.d/default.conf
fi

# Test nginx configuration
nginx -t

# Start nginx
exec nginx -g "daemon off;"
EOF

# Make startup script executable
RUN chmod +x /docker-entrypoint.sh

# Expose ports 80 and 443
EXPOSE 80 443

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
