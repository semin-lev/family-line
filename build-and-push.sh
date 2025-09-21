#!/bin/bash

# Build and Push Docker Images Script
# This script builds Docker images for frontend and backend, then pushes them to Docker Hub

set -e  # Exit on any error

# Configuration
DOCKER_HUB_USERNAME="seminlev"
FRONTEND_IMAGE_NAME="webrtc-frontend"
BACKEND_IMAGE_NAME="webrtc-backend"
FRONTEND_TAG="latest"
BACKEND_TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    log_info "Checking if Docker is running..."
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# Check if user is logged in to Docker Hub
check_docker_login() {
    log_info "Checking Docker Hub authentication..."
    if ! docker info | grep -q "Username: $DOCKER_HUB_USERNAME"; then
        log_warning "Not logged in to Docker Hub as $DOCKER_HUB_USERNAME"
        log_info "Please log in to Docker Hub:"
        echo "docker login"
        read -p "Press Enter after logging in, or Ctrl+C to cancel..."
    else
        log_success "Already logged in to Docker Hub as $DOCKER_HUB_USERNAME"
    fi
}

# Build frontend image
build_frontend() {
    log_info "Building frontend Docker image for AMD64 platform..."
    cd frontend
    
    # Build the image for AMD64 platform
    docker build --platform linux/amd64 -t "$DOCKER_HUB_USERNAME/$FRONTEND_IMAGE_NAME:$FRONTEND_TAG" .
    
    if [ $? -eq 0 ]; then
        log_success "Frontend image built successfully"
    else
        log_error "Failed to build frontend image"
        exit 1
    fi
    
    cd ..
}

# Build backend image
build_backend() {
    log_info "Building backend Docker image for AMD64 platform..."
    cd backend
    
    # Build the image for AMD64 platform
    docker build --platform linux/amd64 -t "$DOCKER_HUB_USERNAME/$BACKEND_IMAGE_NAME:$BACKEND_TAG" .
    
    if [ $? -eq 0 ]; then
        log_success "Backend image built successfully"
    else
        log_error "Failed to build backend image"
        exit 1
    fi
    
    cd ..
}

# Push frontend image
push_frontend() {
    log_info "Pushing frontend image to Docker Hub..."
    docker push "$DOCKER_HUB_USERNAME/$FRONTEND_IMAGE_NAME:$FRONTEND_TAG"
    
    if [ $? -eq 0 ]; then
        log_success "Frontend image pushed successfully"
    else
        log_error "Failed to push frontend image"
        exit 1
    fi
}

# Push backend image
push_backend() {
    log_info "Pushing backend image to Docker Hub..."
    docker push "$DOCKER_HUB_USERNAME/$BACKEND_IMAGE_NAME:$BACKEND_TAG"
    
    if [ $? -eq 0 ]; then
        log_success "Backend image pushed successfully"
    else
        log_error "Failed to push backend image"
        exit 1
    fi
}

# Display image information
show_image_info() {
    log_info "Built and pushed images:"
    echo "  Frontend: $DOCKER_HUB_USERNAME/$FRONTEND_IMAGE_NAME:$FRONTEND_TAG"
    echo "  Backend:  $DOCKER_HUB_USERNAME/$BACKEND_IMAGE_NAME:$BACKEND_TAG"
    echo ""
    log_info "You can now pull these images using:"
    echo "  docker pull $DOCKER_HUB_USERNAME/$FRONTEND_IMAGE_NAME:$FRONTEND_TAG"
    echo "  docker pull $DOCKER_HUB_USERNAME/$BACKEND_IMAGE_NAME:$BACKEND_TAG"
}

# Main execution
main() {
    log_info "Starting Docker build and push process..."
    echo "=========================================="
    
    # Pre-flight checks
    check_docker
    check_docker_login
    
    # Build images
    build_frontend
    build_backend
    
    # Push images
    push_frontend
    push_backend
    
    # Show results
    echo "=========================================="
    show_image_info
    log_success "All done! Images have been built and pushed to Docker Hub."
}

# Handle script interruption
trap 'log_error "Script interrupted. Exiting..."; exit 1' INT TERM

# Run main function
main "$@"
