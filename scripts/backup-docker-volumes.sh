#!/bin/bash

# ===========================================
# Docker Volumes Backup Script
# ===========================================
# Script générique pour backup de volumes Docker

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +"%Y%m%d_%H%M%S")

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Créer dossier backup
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "  Docker Volumes Backup"
echo "  $(date)"
echo "=========================================="

# Lister tous les volumes
echo "Volumes disponibles:"
docker volume ls --format "table {{.Name}}"
echo ""

# Si un volume est spécifié
if [ -n "$1" ]; then
    VOLUME_NAME="$1"
    BACKUP_FILE="$BACKUP_DIR/${VOLUME_NAME}_${DATE}.tar.gz"
    
    echo "Backup du volume: $VOLUME_NAME"
    
    # Backup avec alpine
    docker run --rm \
        -v "$VOLUME_NAME":/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine tar czf "/backup/$(basename $BACKUP_FILE)" -C /data .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup créé: $BACKUP_FILE${NC}"
        ls -lh "$BACKUP_FILE"
    else
        echo -e "${RED}✗ Erreur lors du backup${NC}"
        exit 1
    fi
else
    # Backup de tous les volumes
    echo "Aucun volume spécifié. Pour backup un volume:"
    echo "Usage: $0 [volume_name]"
    echo ""
    echo "Exemple: $0 mongo_data"
fi

echo ""
echo "Backups stockés dans: $BACKUP_DIR/"