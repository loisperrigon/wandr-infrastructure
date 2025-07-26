#!/bin/bash

# ===========================================
# Script de d�ploiement Nginx LaRefonte
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
    
    # V�rifier les certificats SSL
    if [ ! -f "/etc/letsencrypt/live/larefonte.store/fullchain.pem" ]; then
        log_warning "Certificats SSL non trouv�s. Assurez-vous qu'ils sont g�n�r�s."
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

# Fonction pour builder un frontend si n�cessaire
build_frontend_if_needed() {
    local frontend_dir="$1"
    local frontend_name="$2"
    
    # V�rifier s'il y a un package.json (projet Node.js)
    if [ -f "$frontend_dir/package.json" ]; then
        # V�rifier s'il y a un script build
        if grep -q '"build"' "$frontend_dir/package.json"; then
            log_info "Script build d�tect� pour $frontend_name"
            
            # V�rifier si build/ ou dist/ existe d�j�
            if [ ! -d "$frontend_dir/build" ] && [ ! -d "$frontend_dir/dist" ]; then
                log_warning "Aucun dossier build/dist trouv� pour $frontend_name"
                log_info "Vous devez ex�cuter 'npm run build' manuellement avant le d�ploiement"
                log_info "Ou utilisez: cd $frontend_dir && npm run build"
                return 1
            else
                log_success "Dossier build existant trouv� pour $frontend_name"
            fi
        fi
    fi
    return 0
}

# Fonction de d�ploiement des frontends (CORRIG�E POUR FORCER LA MISE � JOUR)
deploy_frontends() {
    log_info "D�ploiement des frontends depuis l'infrastructure..."
    
    # Cr�er le r�pertoire web principal
    mkdir -p /var/www
    
    # V�rifier que le dossier services existe dans l'infrastructure
    if [ ! -d "$INFRASTRUCTURE_DIR/services" ]; then
        log_warning "Aucun dossier services trouv� dans $INFRASTRUCTURE_DIR/services"
        return 0
    fi
    
    # Parcourir tous les projets et leurs frontends
    for project_dir in "$INFRASTRUCTURE_DIR/services"/*; do
        project_name=$(basename "$project_dir")
        
        # Chercher frontend dans les emplacements standards
        frontend_locations=("$project_dir/frontend" "$project_dir/backend/frontend")
        
        for frontend_base in "${frontend_locations[@]}"; do
            if [ -d "$frontend_base" ]; then
                log_info "D�ploiement des frontends du projet: $project_name (depuis $(basename "$frontend_base"))"
                
                for frontend_dir in "$frontend_base"/*; do
                if [ -d "$frontend_dir" ]; then
                    # Extraire le nom du frontend
                    frontend_name=$(basename "$frontend_dir")
                    
                    log_info "D�ploiement frontend: $frontend_name"
                    
                    # V�rifier et pr�parer le build si n�cessaire
                    if ! build_frontend_if_needed "$frontend_dir" "$frontend_name"; then
                        log_error "Impossible de d�ployer $frontend_name - build manquant"
                        continue
                    fi
                    
                    # SUPPRIMER COMPL�TEMENT le dossier existant pour forcer la mise � jour
                    if [ -d "/var/www/$frontend_name" ]; then
                        log_warning "Suppression de l'ancien frontend /var/www/$frontend_name"
                        rm -rf "/var/www/$frontend_name"
                    fi
                    
                    # Cr�er le dossier de destination dans /var/www/
                    mkdir -p "/var/www/$frontend_name"
                    
                    # D�tecter le type de frontend et copier accordingly
                    if [ -d "$frontend_dir/dist" ]; then
                        log_info "Frontend React/Vue d�tect� (dossier dist/)"
                        source_dir="$frontend_dir/dist"
                    elif [ -d "$frontend_dir/build" ]; then
                        log_info "Frontend Create React App d�tect� (dossier build/)"
                        source_dir="$frontend_dir/build"
                    else
                        log_info "Frontend statique d�tect� (HTML/CSS/JS)"
                        source_dir="$frontend_dir"
                    fi
                    
                    # Copier le frontend avec rsync pour une synchronisation compl�te
                    if command -v rsync &> /dev/null; then
                        log_info "Utilisation de rsync pour la synchronisation..."
                        rsync -av --delete "$source_dir/" "/var/www/$frontend_name/"
                    else
                        log_info "Utilisation de cp pour la copie..."
                        cp -r "$source_dir"/* "/var/www/$frontend_name/"
                    fi
                    
                    # Permissions correctes
                    chown -R www-data:www-data "/var/www/$frontend_name"
                    chmod -R 755 "/var/www/$frontend_name"
                    
                    log_success "Frontend $frontend_name d�ploy� dans /var/www/$frontend_name"
                    
                    # Afficher la taille du frontend d�ploy�
                    frontend_size=$(du -sh "/var/www/$frontend_name" | cut -f1)
                    log_info "Taille du frontend $frontend_name: $frontend_size"
                fi
            done
        fi
        done
    done
    
    log_success "D�ploiement des frontends termin�"
    log_info "Frontends disponibles dans /var/www/:"
    ls -la /var/www/ | grep "^d"
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

# Fonction de d�ploiement d'un frontend sp�cifique
deploy_specific_frontend() {
    local frontend_name="$1"
    
    if [ -z "$frontend_name" ]; then
        log_error "Nom du frontend non sp�cifi�"
        return 1
    fi
    
    local frontend_dir="$INFRASTRUCTURE_DIR/services/frontend/$frontend_name"
    
    if [ ! -d "$frontend_dir" ]; then
        log_error "Frontend $frontend_name non trouv� dans $frontend_dir"
        return 1
    fi
    
    log_info "D�ploiement sp�cifique du frontend: $frontend_name"
    
    # Supprimer l'ancien frontend
    if [ -d "/var/www/$frontend_name" ]; then
        log_warning "Suppression de l'ancien frontend /var/www/$frontend_name"
        rm -rf "/var/www/$frontend_name"
    fi
    
    # Cr�er le dossier de destination
    mkdir -p "/var/www/$frontend_name"
    
    # Copier avec rsync ou cp
    if command -v rsync &> /dev/null; then
        log_info "Utilisation de rsync pour la synchronisation..."
        rsync -av --delete "$frontend_dir/" "/var/www/$frontend_name/"
    else
        log_info "Utilisation de cp pour la copie..."
        cp -r "$frontend_dir"/* "/var/www/$frontend_name/"
    fi
    
    # Permissions correctes
    chown -R www-data:www-data "/var/www/$frontend_name"
    chmod -R 755 "/var/www/$frontend_name"
    
    log_success "Frontend $frontend_name d�ploy� avec succ�s"
    
    # Afficher la taille
    frontend_size=$(du -sh "/var/www/$frontend_name" | cut -f1)
    log_info "Taille du frontend $frontend_name: $frontend_size"
}

# Fonction principale
main() {
    echo "=========================================="
    echo "  D�ploiement Infrastructure Nginx"
    echo "  LaRefonte - $(date)"
    echo "=========================================="
    
    # V�rifications
    check_prerequisites
    
    # Sauvegarde
    backup_current_config
    
    # D�ploiement
    deploy_common_configs
    deploy_frontends
    deploy_sites
    cleanup_old_sites
    
    # Test et application
    if test_nginx_config; then
        reload_nginx
        log_success "D�ploiement termin� avec succ�s !"
        
        echo ""
        echo "?? Configuration active :"
        echo "- LaRefonte Main : https://larefonte.store (Express port 3000)"
        echo "- VNC Access     : https://vnc.larefonte.store (noVNC port 6080)"
        echo "- N8N Workflows  : https://n8n.larefonte.store (N8N port 5678)"
        echo "- Cercle Voyages : https://cercledesvoyages.larefonte.store (SPA + API port 3001)"
        echo ""
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
        if [ -n "${2:-}" ]; then
            # D�ploiement d'un frontend sp�cifique
            deploy_specific_frontend "$2"
            reload_nginx
            log_success "Frontend $2 d�ploy� !"
        else
            # D�ploiement de tous les frontends
            log_info "D�ploiement rapide de tous les frontends..."
            deploy_frontends
            reload_nginx
            log_success "Tous les frontends d�ploy�s !"
        fi
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [rollback /path/to/backup|test|frontend [nom_frontend]]"
        echo ""
        echo "Options:"
        echo "  (aucun)              : D�ploiement complet"
        echo "  test                 : Test de configuration uniquement"
        echo "  rollback <backup>    : Restaurer une sauvegarde"
        echo "  frontend             : D�ploiement rapide de tous les frontends"
        echo "  frontend <nom>       : D�ploiement d'un frontend sp�cifique"
        echo ""
        echo "Exemples:"
        echo "  $0 frontend                              # D�ploie tous les frontends"
        echo "  $0 frontend Dashboard-Cercle-des-Voyages # D�ploie seulement ce frontend"
        exit 1
        ;;
esac