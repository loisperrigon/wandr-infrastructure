#!/bin/bash

# ===========================================
# Script de mise à jour rapide de frontend
# ===========================================
# Usage: 
#   ./update-frontend.sh <chemin_source> <nom_projet>
#   ./update-frontend.sh --auto
# Exemple: 
#   ./update-frontend.sh /path/to/frontend landing-page
#   ./update-frontend.sh --auto

set -e  # Arrêter le script en cas d'erreur

# Variables globales
INFRASTRUCTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTO_MODE=false

# Vérifier le mode
if [ "$1" = "--auto" ]; then
    AUTO_MODE=true
elif [ $# -ne 2 ]; then
    echo "Usage:"
    echo "  $0 <chemin_source> <nom_projet>    # Mode manuel"
    echo "  $0 --auto                           # Mode automatique"
    echo ""
    echo "Mode manuel : déploie un frontend spécifique"
    echo "Mode auto   : cherche et déploie tous les frontends dans services/*/frontend/"
    echo ""
    echo "Exemples:"
    echo "  $0 ./services/client/frontend client-site"
    echo "  $0 --auto"
    exit 1
fi

# Mode manuel - récupérer les paramètres
if [ "$AUTO_MODE" = false ]; then
    SOURCE_DIR="$1"
    PROJECT_NAME="$2"
fi

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

# Fonction pour déployer un frontend
deploy_frontend() {
    local source_dir="$1"
    local project_name="$2"
    local destination_dir="/var/www/$project_name"
    
    # Vérifier si le dossier source existe
    if [ ! -d "$source_dir" ]; then
        log_error "Le dossier source $source_dir n'existe pas !"
        return 1
    fi
    
    log_info "📦 Déploiement: $project_name"
    log_info "Source: $source_dir"
    log_info "Destination: $destination_dir"
    
    # Créer /var/www si n'existe pas
    if [ ! -d "/var/www" ]; then
        mkdir -p /var/www
    fi
    
    # Backup si le dossier existe déjà
    if [ -d "$destination_dir" ]; then
        BACKUP_DIR="/var/www/.backups/$(date +%Y%m%d_%H%M%S)_$project_name"
        log_warning "Sauvegarde de l'ancien frontend vers $BACKUP_DIR"
        mkdir -p /var/www/.backups
        mv "$destination_dir" "$BACKUP_DIR"
    fi
    
    # Détection intelligente du type de frontend
    local actual_source=""
    
    # Si dist/ existe (React/Vue build)
    if [ -d "$source_dir/dist" ]; then
        log_info "📦 Frontend React/Vue détecté (dossier dist/)"
        actual_source="$source_dir/dist"
    # Si build/ existe (Create React App)
    elif [ -d "$source_dir/build" ]; then
        log_info "📦 Frontend Create React App détecté (dossier build/)"
        actual_source="$source_dir/build"
    # Si package.json existe mais pas de build
    elif [ -f "$source_dir/package.json" ] && [ ! -f "$source_dir/index.html" ]; then
        log_warning "⚠️ package.json trouvé mais pas de dossier build/dist"
        log_warning "Exécutez 'npm run build' avant le déploiement"
        return 1
    # Sinon c'est du statique
    else
        log_info "📄 Frontend statique détecté (HTML/CSS/JS)"
        actual_source="$source_dir"
    fi
    
    # Copie du nouveau dossier
    log_info "Copie des fichiers depuis $actual_source..."
    cp -r "$actual_source"/* "$destination_dir/" 2>/dev/null || cp -r "$actual_source"/. "$destination_dir/"
    
    # Permissions pour nginx
    chown -R www-data:www-data "$destination_dir"
    chmod -R 755 "$destination_dir"
    
    # Vérification
    if [ -d "$destination_dir" ]; then
        # Compter les fichiers
        FILE_COUNT=$(find "$destination_dir" -type f | wc -l)
        DIR_SIZE=$(du -sh "$destination_dir" | cut -f1)
        
        log_success "✅ $project_name déployé !"
        log_info "   📁 Fichiers: $FILE_COUNT"
        log_info "   💾 Taille: $DIR_SIZE"
        
        # Si index.html existe, afficher
        if [ -f "$destination_dir/index.html" ]; then
            log_success "   ✓ index.html trouvé"
        fi
        return 0
    else
        log_error "Erreur lors de la copie de $project_name"
        return 1
    fi
}

# Mode automatique
if [ "$AUTO_MODE" = true ]; then
    echo "=========================================="
    echo "  Mise à jour Frontend - Mode AUTO"
    echo "  $(date)"
    echo "=========================================="
    
    log_info "🔍 Recherche des frontends dans services/*/frontend/..."
    
    # Vérifier que le dossier services existe
    if [ ! -d "$INFRASTRUCTURE_DIR/services" ]; then
        log_warning "Aucun dossier services/ trouvé"
        exit 0
    fi
    
    # Compteur
    found=0
    deployed=0
    
    # Parcourir tous les projets
    for project_dir in "$INFRASTRUCTURE_DIR/services"/*; do
        if [ -d "$project_dir" ]; then
            project_name=$(basename "$project_dir")
            
            # Chercher frontend dans les emplacements standards
            frontend_locations=("$project_dir/frontend" "$project_dir/backend/frontend")
            
            for frontend_dir in "${frontend_locations[@]}"; do
                if [ -d "$frontend_dir" ]; then
                    found=$((found + 1))
                    echo ""
                    log_info "🎯 Trouvé: $project_name → $frontend_dir"
                    
                    if deploy_frontend "$frontend_dir" "$project_name"; then
                        deployed=$((deployed + 1))
                    fi
                    break  # Un seul frontend par projet
                fi
            done
        fi
    done
    
    echo ""
    echo "=========================================="
    log_success "Résumé: $deployed/$found frontends déployés"
    echo "=========================================="
    
    if [ $deployed -gt 0 ]; then
        echo ""
        echo "👉 N'oubliez pas de configurer nginx si nécessaire :"
        echo "   - Créer/modifier les configs dans nginx/sites-available/"
        echo "   - Exécuter: ./scripts/deploy-nginx.sh"
    fi
    
# Mode manuel
else
    echo "=========================================="
    echo "  Mise à jour Frontend - Mode MANUEL"
    echo "  $(date)"
    echo "=========================================="
    
    if deploy_frontend "$SOURCE_DIR" "$PROJECT_NAME"; then
        echo ""
        log_success "=== Mise à jour terminée ===" 
        echo ""
        echo "👉 N'oubliez pas de configurer nginx si nécessaire :"
        echo "   - Créer/modifier la config dans nginx/sites-available/"
        echo "   - Exécuter: ./scripts/deploy-nginx.sh"
    else
        exit 1
    fi
fi