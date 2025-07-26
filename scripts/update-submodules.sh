#!/bin/bash

# ===========================================
# Script de mise à jour intelligent des submodules
# ===========================================

set -e  # Arrêter en cas d'erreur

# Variables
INFRASTRUCTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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


# Fonction pour mettre à jour un submodule
update_submodule() {
    local submodule_path="$1"
    local submodule_name=$(basename "$submodule_path")
    
    log_info "Mise à jour du submodule: $submodule_name"
    
    # Aller dans le dossier du submodule
    cd "$INFRASTRUCTURE_DIR/$submodule_path"
    
    # Vérifier si c'est bien un repo git
    if [ ! -d ".git" ]; then
        log_error "$submodule_name n'est pas un repository git valide"
        return 1
    fi
    
    # Récupérer le statut actuel
    local current_branch=$(git branch --show-current 2>/dev/null || echo "detached")
    local current_commit=$(git rev-parse --short HEAD)
    
    log_info "$submodule_name - Branche: $current_branch, Commit: $current_commit"
    
    # Vérifier s'il y a des changements locaux
    if ! git diff-index --quiet HEAD --; then
        log_warning "$submodule_name a des changements locaux non commitées"
        git status --porcelain
        read -p "Continuer quand même ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Mise à jour de $submodule_name annulée"
            return 0
        fi
    fi
    
    # Fetch les dernières modifications
    log_info "Récupération des dernières modifications..."
    git fetch origin
    
    # Si on est sur une branche, merger
    if [ "$current_branch" != "detached" ] && [ "$current_branch" != "" ]; then
        log_info "Mise à jour de la branche $current_branch..."
        git pull origin "$current_branch"
    else
        # Si on est en détaché, proposer de checkout main/master
        log_warning "$submodule_name est en état détaché"
        
        # Trouver la branche principale
        local main_branch=""
        if git ls-remote --heads origin main | grep -q main; then
            main_branch="main"
        elif git ls-remote --heads origin master | grep -q master; then
            main_branch="master"
        fi
        
        if [ -n "$main_branch" ]; then
            read -p "Checkout sur la branche $main_branch ? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git checkout "$main_branch"
                git pull origin "$main_branch"
            fi
        fi
    fi
    
    local new_commit=$(git rev-parse --short HEAD)
    
    if [ "$current_commit" != "$new_commit" ]; then
        log_success "$submodule_name mis à jour: $current_commit → $new_commit"
        return 2  # Code spécial pour "mis à jour"
    else
        log_info "$submodule_name déjà à jour"
        return 0
    fi
}

# Fonction principale
main() {
    echo "=========================================="
    echo "  Mise à jour des Submodules LaRefonte"
    echo "  $(date)"
    echo "=========================================="
    
    
    cd "$INFRASTRUCTURE_DIR"
    
    # Vérifier qu'on est dans un repo git
    if [ ! -f ".gitmodules" ]; then
        log_error "Aucun fichier .gitmodules trouvé. Pas de submodules à mettre à jour."
        exit 1
    fi
    
    # Lire les submodules depuis .gitmodules
    local submodules=($(git config --file .gitmodules --get-regexp path | awk '{ print $2 }'))
    
    if [ ${#submodules[@]} -eq 0 ]; then
        log_warning "Aucun submodule trouvé dans .gitmodules"
        exit 0
    fi
    
    log_info "Submodules détectés: ${#submodules[@]}"
    
    local updated_count=0
    local failed_count=0
    
    # Mettre à jour chaque submodule
    for submodule in "${submodules[@]}"; do
        echo
        log_info "======== $submodule ========"
        
        if update_submodule "$submodule"; then
            case $? in
                2) ((updated_count++)) ;;  # Mis à jour
                0) ;;                      # Déjà à jour
                *) ((failed_count++)) ;;   # Erreur
            esac
        else
            ((failed_count++))
        fi
        
        # Retourner à la racine
        cd "$INFRASTRUCTURE_DIR"
    done
    
    echo
    echo "=========================================="
    echo "  Résumé"
    echo "=========================================="
    log_info "Submodules traités: ${#submodules[@]}"
    
    if [ $updated_count -gt 0 ]; then
        log_success "Submodules mis à jour: $updated_count"
    fi
    
    if [ $failed_count -gt 0 ]; then
        log_error "Submodules en erreur: $failed_count"
    else
        log_success "Tous les submodules traités avec succès !"
    fi
    
    
    # Proposer de committer les changements de submodules
    if [ $updated_count -gt 0 ]; then
        echo
        log_info "Des submodules ont été mis à jour."
        read -p "Committer les changements dans l'infrastructure ? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "🔄 Update submodules

$(git submodule status | head -${updated_count})

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
            log_success "Changements commitées !"
        fi
    fi
}

# Gestion des arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [help]"
        echo ""
        echo "Met à jour intelligemment tous les submodules du projet."
        echo ""
        echo "Fonctionnalités:"
        echo "  - Détecte automatiquement tous les submodules"
        echo "  - Vérifie les changements locaux avant mise à jour" 
        echo "  - Gère les branches et états détachés"
        echo "  - Affiche un résumé des modifications"
        echo "  - Propose de committer les changements"
        echo ""
        echo "Exemples:"
        echo "  $0              # Mettre à jour tous les submodules"
        echo "  $0 help         # Afficher cette aide"
        ;;
    "")
        main
        ;;
    *)
        echo "Option inconnue: $1"
        echo "Utilisez '$0 help' pour voir l'aide"
        exit 1
        ;;
esac