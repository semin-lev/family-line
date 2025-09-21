#!/bin/bash

# SSL Setup Script for Family Line WebRTC Application
# This script helps you set up SSL certificates with Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 SSL Setup for Family Line WebRTC Application${NC}"
echo "=================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > .env << EOF
# Domain configuration for SSL certificates
DOMAIN=yourdomain.com
EMAIL=your-email@example.com

# Environment
NODE_ENV=production

# Backend configuration
PORT=3001
SERVER_HOST=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=yourdomain.com
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=40100
EXTERNAL_DOMAIN=yourdomain.com
EOF
    echo -e "${GREEN}✅ .env template created!${NC}"
    echo -e "${YELLOW}📝 Please edit .env file with your domain and email, then run this script again.${NC}"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ "$DOMAIN" = "yourdomain.com" ] || [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Please set your DOMAIN in .env file${NC}"
    exit 1
fi

if [ "$EMAIL" = "your-email@example.com" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Please set your EMAIL in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo ""

# Step 1: Start frontend service
echo -e "${GREEN}🚀 Starting frontend service...${NC}"
docker-compose up -d frontend

# Wait for nginx to start
echo -e "${YELLOW}⏳ Waiting for nginx to start...${NC}"
sleep 10

# Step 2: Get SSL certificates
echo -e "${GREEN}🔐 Obtaining SSL certificates from Let's Encrypt...${NC}"
docker-compose --profile ssl run --rm certbot

# Step 3: Copy certificates to nginx SSL directory
echo -e "${GREEN}📋 Copying certificates to nginx SSL directory...${NC}"
docker-compose exec frontend sh -c "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem"

# Step 4: Restart frontend to load SSL certificates
echo -e "${GREEN}🔄 Restarting frontend to load SSL certificates...${NC}"
docker-compose restart frontend

# Step 5: Start all services
echo -e "${GREEN}🚀 Starting all services...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✅ SSL setup complete!${NC}"
echo -e "${GREEN}🌐 Your application is now available at:${NC}"
echo -e "   HTTP:  http://$DOMAIN (redirects to HTTPS)"
echo -e "   HTTPS: https://$DOMAIN"
echo ""
echo -e "${YELLOW}📝 Certificate renewal:${NC}"
echo "   To renew certificates, run:"
echo "   docker-compose --profile ssl run --rm certbot-renew"
echo ""
echo -e "${YELLOW}🔄 Automatic renewal (add to crontab):${NC}"
echo "   0 */12 * * * cd $(pwd) && docker-compose --profile ssl run --rm certbot-renew && docker-compose exec frontend sh -c \"cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem && nginx -s reload\""
