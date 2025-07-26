#!/bin/bash

# ===========================================
# Docker Volume Restore Script
# ===========================================
# Script générique pour restaurer des volumes Docker

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Docker Volume Restore"
echo "  $(date)"
echo "=========================================="

# Vérifier les arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <backup_file> <volume_name>"
    echo ""
    echo "Exemple: $0 backups/mongo_data_20240126_143022.tar.gz mongo_data"
    exit 1
fi

BACKUP_FILE="$1"
VOLUME_NAME="$2"

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Fichier backup non trouvé: $BACKUP_FILE${NC}"
    exit 1
fi

# Vérifier si le volume existe
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Le volume '$VOLUME_NAME' existe déjà${NC}"
    read -p "Écraser le contenu existant? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restauration annulée"
        exit 0
    fi
else
    echo "Création du volume '$VOLUME_NAME'"
    docker volume create "$VOLUME_NAME"
fi

echo "Restauration depuis: $BACKUP_FILE"

# Restaurer avec alpine
docker run --rm \
    -v "$VOLUME_NAME":/data \
    -v "$(dirname $(readlink -f $BACKUP_FILE))":/backup \
    alpine sh -c "cd /data && tar xzf /backup/$(basename $BACKUP_FILE) ."

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Volume '$VOLUME_NAME' restauré avec succès${NC}"
else
    echo -e "${RED}✗ Erreur lors de la restauration${NC}"
    exit 1
fi