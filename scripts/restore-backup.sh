#!/bin/bash
# ===========================================
# Restore Script for Wandr Backups
# ===========================================
# Usage: ./restore-backup.sh [backup_date]
# Example: ./restore-backup.sh 20250104_120000
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup date is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide backup date${NC}"
    echo -e "${YELLOW}Usage: $0 [backup_date]${NC}"
    echo -e "${YELLOW}Example: $0 20250104_120000${NC}"
    echo ""
    echo -e "${YELLOW}Available backups:${NC}"
    ls -1 /root/backups/
    exit 1
fi

BACKUP_DATE=$1
BACKUP_PATH="/root/backups/$BACKUP_DATE"

# Check if backup exists
if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}Error: Backup not found at $BACKUP_PATH${NC}"
    echo -e "${YELLOW}Available backups:${NC}"
    ls -1 /root/backups/
    exit 1
fi

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Wandr Backup Restore${NC}"
echo -e "${GREEN}Backup: $BACKUP_DATE${NC}"
echo -e "${GREEN}============================================${NC}"

# Confirmation
echo -e "\n${RED}WARNING: This will restore data from backup!${NC}"
echo -e "${YELLOW}This will overwrite current data. Are you sure? (yes/no)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

cd /root/wandr-infrastructure

# 1. Restore Database
echo -e "\n${YELLOW}[1/4] Restoring PostgreSQL database...${NC}"
if [ -f "$BACKUP_PATH/database.sql.gz" ]; then
    gunzip < "$BACKUP_PATH/database.sql.gz" | docker exec -i wandr-db psql -U wandr wandr
    echo -e "${GREEN}✓ Database restored${NC}"
else
    echo -e "${RED}✗ Database backup file not found${NC}"
fi

# 2. Restore Docker Volumes
echo -e "\n${YELLOW}[2/4] Restoring Docker volumes...${NC}"
if [ -f "$BACKUP_PATH/wandr-db-volume.tar.gz" ]; then
    docker run --rm \
        -v wandr-db-data:/data \
        -v "$BACKUP_PATH":/backup \
        alpine sh -c "cd /data && tar xzf /backup/wandr-db-volume.tar.gz"
    echo -e "${GREEN}✓ Docker volumes restored${NC}"
else
    echo -e "${RED}✗ Docker volume backup file not found${NC}"
fi

# 3. Restore Nginx Configuration
echo -e "\n${YELLOW}[3/4] Restoring Nginx configuration...${NC}"
if [ -f "$BACKUP_PATH/nginx-config.tar.gz" ]; then
    tar xzf "$BACKUP_PATH/nginx-config.tar.gz"
    echo -e "${GREEN}✓ Nginx configuration restored${NC}"
else
    echo -e "${RED}✗ Nginx configuration backup file not found${NC}"
fi

# 4. Restore Let's Encrypt Certificates
echo -e "\n${YELLOW}[4/4] Restoring Let's Encrypt certificates...${NC}"
if [ -f "$BACKUP_PATH/letsencrypt.tar.gz" ]; then
    tar xzf "$BACKUP_PATH/letsencrypt.tar.gz" -C /etc/
    echo -e "${GREEN}✓ Certificates restored${NC}"
else
    echo -e "${YELLOW}⚠ No certificates backup found, skipping${NC}"
fi

# Restart services
echo -e "\n${YELLOW}Restarting services...${NC}"
docker compose restart

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Restore completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
