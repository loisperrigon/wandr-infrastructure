#!/bin/bash

# ===========================================
# Script de mise à jour rapide de frontend
# ===========================================
# Usage: ./update-frontend.sh <chemin_source> <nom_projet>
# Exemple: ./update-frontend.sh /path/to/frontend landing-page

set -e  # Arrêter le script en cas d'erreur

# Vérifier qu'on a les 2 paramètres
if [ $# -ne 2 ]; then
    echo "Usage: $0 <chemin_source> <nom_projet>"
    echo "Exemple: $0 ./services/client/frontend client-site"
    echo ""
    echo "Le frontend sera déployé dans /var/www/<nom_projet>"
    exit 1
fi

# Récupérer les paramètres
SOURCE_DIR="$1"
PROJECT_NAME="$2"

# Configuration
DESTINATION_DIR="/var/www/$PROJECT_NAME"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
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

# Vérifier si le dossier source existe
if [ ! -d "$SOURCE_DIR" ]; then
    log_error "Le dossier source $SOURCE_DIR n'existe pas !"
    exit 1
fi

echo "=========================================="
echo "  Mise à jour Frontend"
echo "  $(date)"
echo "=========================================="

log_info "Source: $SOURCE_DIR"
log_info "Destination: $DESTINATION_DIR"

# Créer /var/www si n'existe pas
if [ ! -d "/var/www" ]; then
    log_info "Création de /var/www"
    mkdir -p /var/www
fi

# Backup si le dossier existe déjà
if [ -d "$DESTINATION_DIR" ]; then
    BACKUP_DIR="/var/www/.backups/$(date +%Y%m%d_%H%M%S)_$PROJECT_NAME"
    log_warning "Sauvegarde de l'ancien frontend vers $BACKUP_DIR"
    mkdir -p /var/www/.backups
    mv "$DESTINATION_DIR" "$BACKUP_DIR"
    log_success "Backup créé"
fi

# Copie du nouveau dossier
log_info "Copie des fichiers..."
cp -r "$SOURCE_DIR" "$DESTINATION_DIR"

# Permissions pour nginx
log_info "Application des permissions nginx..."
chown -R www-data:www-data "$DESTINATION_DIR"
chmod -R 755 "$DESTINATION_DIR"

# Vérification
if [ -d "$DESTINATION_DIR" ]; then
    # Compter les fichiers
    FILE_COUNT=$(find "$DESTINATION_DIR" -type f | wc -l)
    DIR_SIZE=$(du -sh "$DESTINATION_DIR" | cut -f1)
    
    log_success "✅ Frontend déployé avec succès !"
    log_info "📁 Fichiers: $FILE_COUNT"
    log_info "💾 Taille: $DIR_SIZE"
    log_info "📍 Chemin: $DESTINATION_DIR"
    
    # Si index.html existe, afficher
    if [ -f "$DESTINATION_DIR/index.html" ]; then
        log_success "✓ index.html trouvé"
    fi
else
    log_error "Erreur lors de la copie du dossier"
    exit 1
fi

echo ""
log_success "=== Mise à jour terminée ===" 
echo ""
echo "👉 N'oubliez pas de configurer nginx si nécessaire :"
echo "   - Créer/modifier la config dans nginx/sites-available/"
echo "   - Exécuter: ./scripts/deploy-nginx.sh"