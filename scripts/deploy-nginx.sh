#!/bin/bash

# ===========================================
# Script de d�ploiement Nginx Template
# ===========================================

set -e  # Arr�ter en cas d'erreur

# Variables
INFRASTRUCTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONF_DIR="/etc/nginx"
BACKUP_DIR="/root/nginx-backups/$(date +%Y%m%d_%H%M%S)"

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

# Fonction de sauvegarde
backup_current_config() {
    log_info "Sauvegarde de la configuration actuelle..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$NGINX_SITES_AVAILABLE" ]; then
        cp -r "$NGINX_SITES_AVAILABLE" "$BACKUP_DIR/"
        log_success "Sites-available sauvegard�s"
    fi
    
    if [ -d "$NGINX_SITES_ENABLED" ]; then
        cp -r "$NGINX_SITES_ENABLED" "$BACKUP_DIR/"
        log_success "Sites-enabled sauvegard�s"
    fi
    
    if [ -f "$NGINX_CONF_DIR/nginx.conf" ]; then
        cp "$NGINX_CONF_DIR/nginx.conf" "$BACKUP_DIR/"
    fi
    
    if [ -f "$NGINX_CONF_DIR/options-ssl-nginx.conf" ]; then
        cp "$NGINX_CONF_DIR/options-ssl-nginx.conf" "$BACKUP_DIR/"
    fi
    
    if [ -d "$NGINX_CONF_DIR/conf.d" ]; then
        cp -r "$NGINX_CONF_DIR/conf.d" "$BACKUP_DIR/"
    fi
    
    log_success "Sauvegarde compl�te dans : $BACKUP_DIR"
}

# Fonction de v�rification des pr�requis
check_prerequisites() {
    log_info "V�rification des pr�requis..."
    
    # V�rifier que nginx est install�
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx n'est pas install� !"
        exit 1
    fi
    
    # V�rifier que le r�pertoire infrastructure existe
    if [ ! -d "$INFRASTRUCTURE_DIR/nginx" ]; then
        log_error "R�pertoire infrastructure non trouv� : $INFRASTRUCTURE_DIR/nginx"
        exit 1
    fi
    
    # V�rifier les certificats SSL (g�n�rique)
    if [ ! -d "/etc/letsencrypt/live" ]; then
        log_warning "R�pertoire certificats SSL non trouv�. Assurez-vous que Let's Encrypt est configur�."
    fi
    
    log_success "Pr�requis OK"
}

# Fonction de d�ploiement des configurations communes
deploy_common_configs() {
    log_info "D�ploiement des configurations communes..."
    
    # D�ployer la config SSL commune
    if [ -f "$INFRASTRUCTURE_DIR/nginx/ssl/options-ssl-nginx.conf" ]; then
        cp "$INFRASTRUCTURE_DIR/nginx/ssl/options-ssl-nginx.conf" "/etc/nginx/"
        log_success "Configuration SSL commune d�ploy�e"
    fi
    
    # D�ployer la config g�n�rale
    if [ -f "$INFRASTRUCTURE_DIR/nginx/conf.d/general.conf" ]; then
        cp "$INFRASTRUCTURE_DIR/nginx/conf.d/general.conf" "/etc/nginx/conf.d/"
        log_success "Configuration g�n�rale d�ploy�e"
    fi
}

# Fonction simple de déploiement frontend statique
deploy_static_frontend() {
    local source_dir="$1"
    local target_name="$2"
    
    if [ ! -d "$source_dir" ]; then
        log_error "Dossier source non trouvé: $source_dir"
        return 1
    fi
    
    log_info "Déploiement frontend statique: $target_name"
    
    # Créer le dossier cible
    mkdir -p "/var/www/$target_name"
    
    # Copier les fichiers
    cp -r "$source_dir"/* "/var/www/$target_name/" 2>/dev/null || true
    
    # Permissions
    chown -R www-data:www-data "/var/www/$target_name"
    chmod -R 755 "/var/www/$target_name"
    
    log_success "Frontend déployé dans /var/www/$target_name"
    return 0
}


# Fonction de d�ploiement des sites
deploy_sites() {
    log_info "D�ploiement des configurations de sites..."
    
    # Copier les fichiers de configuration
    for config_file in "$INFRASTRUCTURE_DIR/nginx/sites-available"/*.conf; do
        if [ -f "$config_file" ]; then
            filename=$(basename "$config_file")
            log_info "D�ploiement de $filename"
            cp "$config_file" "$NGINX_SITES_AVAILABLE/"
            
            # Cr�er le lien symbolique dans sites-enabled
            if [ ! -L "$NGINX_SITES_ENABLED/$filename" ]; then
                ln -s "$NGINX_SITES_AVAILABLE/$filename" "$NGINX_SITES_ENABLED/"
                log_success "Lien symbolique cr�� pour $filename"
            else
                log_info "Lien symbolique existe d�j� pour $filename"
            fi
        fi
    done
}

# Fonction de nettoyage des anciens sites
cleanup_old_sites() {
    log_info "Nettoyage des anciennes configurations..."
    
    # Supprimer l'ancien fichier default s'il existe
    OLD_CONFIG="/etc/nginx/sites-enabled/default"
    if [ -L "$OLD_CONFIG" ] || [ -f "$OLD_CONFIG" ]; then
        rm -f "$OLD_CONFIG"
        log_success "Ancienne configuration default supprim�e"
    fi
    
    # Supprimer les liens cass�s
    find "$NGINX_SITES_ENABLED" -type l ! -exec test -e {} \; -delete 2>/dev/null || true
    log_success "Liens symboliques cass�s supprim�s"
}

# Fonction de test de configuration
test_nginx_config() {
    log_info "Test de la configuration Nginx..."
    
    if nginx -t; then
        log_success "Configuration Nginx valide"
        return 0
    else
        log_error "Configuration Nginx invalide !"
        return 1
    fi
}

# Fonction de rechargement
reload_nginx() {
    log_info "Rechargement de Nginx..."
    
    if systemctl reload nginx; then
        log_success "Nginx recharg� avec succ�s"
    else
        log_error "Erreur lors du rechargement de Nginx"
        return 1
    fi
}

# Fonction de rollback
rollback() {
    log_warning "Restauration de la configuration pr�c�dente..."
    
    if [ -d "$BACKUP_DIR" ]; then
        cp -r "$BACKUP_DIR/sites-available"/* "$NGINX_SITES_AVAILABLE/" 2>/dev/null || true
        cp -r "$BACKUP_DIR/sites-enabled"/* "$NGINX_SITES_ENABLED/" 2>/dev/null || true
        cp "$BACKUP_DIR/options-ssl-nginx.conf" "$NGINX_CONF_DIR/" 2>/dev/null || true
        cp -r "$BACKUP_DIR/conf.d"/* "$NGINX_CONF_DIR/conf.d/" 2>/dev/null || true
        
        if nginx -t && systemctl reload nginx; then
            log_success "Rollback effectu� avec succ�s"
        else
            log_error "�chec du rollback. Intervention manuelle requise."
        fi
    else
        log_error "Pas de sauvegarde disponible pour le rollback"
    fi
}


# Fonction principale
main() {
    echo "=========================================="
    echo "  D�ploiement Infrastructure Nginx"
    echo "  $(date)"
    echo "=========================================="
    
    # V�rifications
    check_prerequisites
    
    # Sauvegarde
    backup_current_config
    
    # D�ploiement
    deploy_common_configs
    deploy_sites
    cleanup_old_sites
    
    # Test et application
    if test_nginx_config; then
        reload_nginx
        log_success "D�ploiement termin� avec succ�s !"
        
        echo ""
        echo "?? Configuration nginx d�ploy�e avec succ�s"
        echo "?? Frontends d�ploy�s dans /var/www/"
        echo "?? Logs disponibles dans /var/log/nginx/"
        echo "?? Sauvegarde dans : $BACKUP_DIR"
        
    else
        log_error "�chec du d�ploiement"
        rollback
        exit 1
    fi
}

# Gestion des arguments
case "${1:-}" in
    "rollback")
        if [ -n "${2:-}" ]; then
            BACKUP_DIR="$2"
            rollback
        else
            echo "Usage: $0 rollback /path/to/backup"
            exit 1
        fi
        ;;
    "test")
        test_nginx_config
        ;;
    "frontend")
        if [ -n "${2:-}" ] && [ -n "${3:-}" ]; then
            # Usage: deploy-nginx.sh frontend /path/to/source target-name
            deploy_static_frontend "$2" "$3"
            log_success "Frontend déployé !"
        else
            echo "Usage: $0 frontend /path/to/source target-name"
            echo "Exemple: $0 frontend ./services/landing/public landing"
            exit 1
        fi
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [test|rollback|frontend]"
        echo ""
        echo "Options:"
        echo "  (aucun)                    : Déploiement nginx complet"
        echo "  test                       : Test de configuration uniquement"
        echo "  rollback <backup>          : Restaurer une sauvegarde"
        echo "  frontend <source> <target> : Déployer un frontend statique"
        echo ""
        echo "Exemples:"
        echo "  $0                                              # Déploie nginx"
        echo "  $0 frontend ./landing/public landing-site       # Déploie site statique"
        echo "  $0 rollback /root/nginx-backups/20240126_143022 # Restaure backup"
        exit 1
        ;;
esac