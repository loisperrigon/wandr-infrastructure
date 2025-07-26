# Guide de Déploiement - LaRefonte Infrastructure

## 🚀 Déploiement sur nouveau serveur

### 1. Prérequis serveur
```bash
# Docker et Docker Compose
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Nginx
sudo apt update && sudo apt install nginx

# Certbot pour SSL
sudo apt install certbot python3-certbot-nginx
```

### 2. Cloner l'infrastructure
```bash
git clone https://github.com/ton-compte/larefonte-infrastructure.git
cd larefonte-infrastructure
```

### 3. Configurer les submodules
```bash
# Si les repos backend/frontend existent déjà, ajouter les submodules :
rm -rf services/backend/README.md
git submodule add https://github.com/ton-compte/backend-repo.git services/backend

# Le frontend est déjà inclus dans ce repo
```

### 4. Configuration environnement
```bash
# Copier et éditer la configuration
cp .env.example .env
nano .env

# Adapter les domaines selon votre serveur
# Modifier N8N_HOST, CERCLE_HOST, etc.
```

### 5. Générer certificats SSL
```bash
sudo certbot --nginx \
  -d votre-domaine-n8n.com \
  -d votre-domaine-cercle.com
```

### 6. Déployer l'infrastructure
```bash
# Déploiement complet
./scripts/deploy-nginx.sh

# Démarrer les services Docker
docker compose up -d
```

## 🔧 Services disponibles

Après déploiement, vous aurez :
- **N8N** : https://votre-domaine-n8n.com (port interne 5678)
- **Dashboard** : https://votre-domaine-cercle.com (frontend + API port 3001)

## 📋 Commandes utiles

### Gestion des services
```bash
# Voir les logs
docker compose logs -f n8n
docker compose logs -f cercle-des-voyages-backend

# Redémarrer un service
docker compose restart n8n

# Mise à jour frontend uniquement
./scripts/deploy-nginx.sh frontend dashboard
```

### Mise à jour des submodules
```bash
# Mettre à jour le backend
cd services/backend
git pull origin main
cd ../..
git add services/backend
git commit -m "Update backend"

# Déployer les changements
docker compose up -d --build cercle-des-voyages-backend
```

## 🔐 Sécurité

- Tous les services sont accessibles uniquement via nginx (pas d'exposition directe des ports)
- SSL obligatoire sur tous les domaines
- Rate limiting configuré
- Headers de sécurité appliqués

## 🆘 Dépannage

### Problème de certificats
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Problème nginx
```bash
sudo nginx -t
sudo systemctl status nginx
sudo systemctl restart nginx
```

### Problème Docker
```bash
docker compose ps
docker compose logs
docker system prune  # Nettoyer l'espace
```