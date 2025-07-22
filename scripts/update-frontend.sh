#!/bin/bash

# Script de mise à jour de dossiers de projets
# Auteur: Assistant
# Description: Supprime et remplace un dossier spécifié
# Usage: ./update_project.sh <chemin_source_complet> <nom_du_dossier_destination>

set -e  # Arrêter le script en cas d'erreur

# Vérifier qu'on a les 2 paramètres
if [ $# -ne 2 ]; then
    echo "Usage: $0 <chemin_source_complet> <nom_du_dossier_destination>"
    echo "Exemple: $0 /root/projects/external/Dashboard-Cercle-des-Voyages/frontend/ Dashboard-Cercle-des-Voyages"
    exit 1
fi

# Récupérer les paramètres
SOURCE_DIR="$1"
PROJECT_NAME="$2"

# Configuration du chemin de destination
DESTINATION_BASE="/root/larefonte-infrastructure/frontend"
DESTINATION_DIR="$DESTINATION_BASE/$PROJECT_NAME"

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

# Vérifier si le répertoire de destination de base existe
if [ ! -d "$DESTINATION_BASE" ]; then
    log_error "Le répertoire de destination $DESTINATION_BASE n'existe pas !"
    exit 1
fi

# Vérifier si le dossier source existe
if [ ! -d "$SOURCE_DIR" ]; then
    log_error "Le dossier source $SOURCE_DIR n'existe pas !"
    exit 1
fi

log_info "Source: $SOURCE_DIR"
log_info "Destination: $DESTINATION_DIR"

# Suppression du dossier de destination s'il existe
if [ -d "$DESTINATION_DIR" ]; then
    log_warning "Suppression du dossier existant: $DESTINATION_DIR"
    rm -rf "$DESTINATION_DIR"
    log_success "Dossier supprimé avec succès"
else
    log_info "Le dossier de destination n'existe pas (première fois?)"
fi

# Copie du nouveau dossier
log_info "Copie de $SOURCE_DIR vers $DESTINATION_DIR"
cp -r "$SOURCE_DIR" "$DESTINATION_DIR"

# Vérification que la copie s'est bien passée
if [ -d "$DESTINATION_DIR" ]; then
    log_success "$PROJECT_NAME mis à jour avec succès !"
    log_info "Nouvelle taille du dossier: $(du -sh "$DESTINATION_DIR" | cut -f1)"
else
    log_error "Erreur lors de la copie du dossier"
    exit 1
fi

# Affichage des permissions
log_info "Permissions du dossier: $(ls -ld "$DESTINATION_DIR" | awk '{print $1, $3, $4}')"

echo
log_success "=== Mise à jour terminée avec succès ==="