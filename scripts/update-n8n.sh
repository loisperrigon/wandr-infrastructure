#!/bin/bash

# ===========================================
# N8N Update Script - Template Version
# ===========================================

echo "=========================================="
echo "  N8N Update Process"
echo "  $(date)"
echo "=========================================="

# Variables
INFRASTRUCTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$INFRASTRUCTURE_DIR/backups"
BACKUP_FILE="n8n-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "Creating backup..."

# Stop n8n
echo "Stopping N8N service..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" stop n8n
elif command -v docker &> /dev/null; then
    docker compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" stop n8n
else
    echo "ERROR: Docker Compose not found"
    exit 1
fi

# Backup data
echo "Backing up N8N data..."
docker run --rm \
  -v n8n_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/$BACKUP_FILE" /data

if [ $? -eq 0 ]; then
    echo "✓ Backup created: $BACKUP_DIR/$BACKUP_FILE"
    ls -lh "$BACKUP_DIR/$BACKUP_FILE"
else
    echo "ERROR: Backup failed"
    exit 1
fi

# Pull latest image
echo "Downloading latest N8N image..."
docker pull n8nio/n8n:latest

# Restart n8n
echo "Starting N8N with new image..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" up -d n8n
else
    docker compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" up -d n8n
fi

echo "Waiting for N8N to start..."
sleep 10

# Verify n8n is responding
if curl -f -s http://127.0.0.1:5678 > /dev/null; then
    echo "✓ N8N updated successfully!"
    echo "✓ Service is running on port 5678"
    echo ""
    echo "Please verify N8N is accessible through your configured domain"
else
    echo "ERROR: N8N not responding, attempting restore..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" stop n8n
    else
        docker compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" stop n8n
    fi
    
    docker run --rm \
      -v n8n_data:/data \
      -v "$BACKUP_DIR":/backup \
      alpine sh -c "cd /data && tar xzf /backup/$BACKUP_FILE --strip-components=1"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" up -d n8n
    else
        docker compose -f "$INFRASTRUCTURE_DIR/docker-compose.yml" up -d n8n
    fi
    echo "Restore completed"
fi

echo ""
echo "Update process finished"
echo "Backup stored in: $BACKUP_DIR/$BACKUP_FILE"