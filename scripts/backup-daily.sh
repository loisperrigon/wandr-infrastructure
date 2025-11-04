#!/bin/bash
# ===========================================
# Daily Backup Script for Wandr Infrastructure
# ===========================================
# This script backs up:
# - PostgreSQL database
# - Docker volumes
# - Nginx configuration
# - Let's Encrypt certificates
# ===========================================

set -e

# Configuration
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Wandr Daily Backup - $(date)${NC}"
echo -e "${GREEN}============================================${NC}"

# Create backup directory
mkdir -p "$BACKUP_PATH"

# 1. Backup PostgreSQL Database
echo -e "\n${YELLOW}[1/4] Backing up PostgreSQL database...${NC}"
docker exec wandr-db pg_dump -U wandr wandr | gzip > "$BACKUP_PATH/database.sql.gz"
echo -e "${GREEN}✓ Database backup completed${NC}"

# 2. Backup Docker Volumes
echo -e "\n${YELLOW}[2/4] Backing up Docker volumes...${NC}"
docker run --rm \
    -v wandr-db-data:/data \
    -v "$BACKUP_PATH":/backup \
    alpine tar czf /backup/wandr-db-volume.tar.gz -C /data .
echo -e "${GREEN}✓ Docker volumes backup completed${NC}"

# 3. Backup Nginx Configuration
echo -e "\n${YELLOW}[3/4] Backing up Nginx configuration...${NC}"
cd /root/wandr-infrastructure
tar czf "$BACKUP_PATH/nginx-config.tar.gz" nginx/
echo -e "${GREEN}✓ Nginx configuration backup completed${NC}"

# 4. Backup Let's Encrypt Certificates
echo -e "\n${YELLOW}[4/4] Backing up Let's Encrypt certificates...${NC}"
if [ -d "/etc/letsencrypt" ]; then
    tar czf "$BACKUP_PATH/letsencrypt.tar.gz" -C /etc letsencrypt/
    echo -e "${GREEN}✓ Certificates backup completed${NC}"
else
    echo -e "${YELLOW}⚠ No Let's Encrypt certificates found, skipping${NC}"
fi

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}Location: $BACKUP_PATH${NC}"
echo -e "${GREEN}Size: $BACKUP_SIZE${NC}"
echo -e "${GREEN}============================================${NC}"

# Cleanup old backups (keep last 7 days)
echo -e "\n${YELLOW}Cleaning up old backups (keeping last $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;
echo -e "${GREEN}✓ Cleanup completed${NC}"

# List recent backups
echo -e "\n${YELLOW}Recent backups:${NC}"
ls -lth "$BACKUP_DIR" | head -n 8

echo -e "\n${GREEN}All done!${NC}"
