# Infrastructure LaRefonte

Infrastructure complète et professionnelle pour l'écosystème LaRefonte avec nginx, Docker et architecture modulaire par submodules.

## 🚀 Services déployés

✅ **Services opérationnels**

- 🌐 **N8N Workflows** : https://n8n.larefonte.store (Automatisation)
- 📊 **Cercle des Voyages** : https://cercledesvoyages.larefonte.store (Dashboard + API)
- 🤖 **Scraping Tools** : Backend scraping + interface VNC
- 🔒 **VNC Access** : https://vnc.larefonte.store (Accès distant sécurisé)

## 🏗️ Architecture Modulaire

```
larefonte-infrastructure/
├── services/                           # Services par projet (submodules)
│   ├── cercle-des-voyages/            # Submodule Dashboard complet
│   │   ├── backend/                   # API Node.js + MongoDB
│   │   ├── frontend/                  # Interface utilisateur modulaire
│   │   └── Documentation/             # Docs projet
│   └── scraping-tools/
│       ├── backend/                   # Submodule backend scraping
│       └── novnc/                     # Interface VNC web
├── nginx/                             # Configuration nginx modulaire
│   ├── sites-available/              # Configurations par service
│   ├── ssl/                          # SSL centralisé
│   └── conf.d/                       # Configuration générale
├── scripts/                          # Scripts d'automatisation
│   ├── deploy-nginx.sh              # Déploiement automatisé
│   ├── update-submodules.sh         # Mise à jour submodules
│   ├── n8n-workflows-backup.sh      # Backup sécurisé workflows N8N vers GitHub
│   └── backup-nginx.sh              # Sauvegarde nginx
├── docker-compose.yml               # Orchestration services
├── CLAUDE.md                        # Guide développeur
├── DEPLOYMENT.md                    # Guide déploiement
└── .env.example                     # Configuration portable
```

## 🚀 Démarrage Rapide

### Installation Complète

```bash
# 1. Cloner avec submodules
git clone --recursive https://github.com/La-Refonte/la-Refonte-infrastructure.git
cd la-Refonte-infrastructure

# 2. Configuration
cp .env.example .env
nano .env  # Adapter à votre environnement

# 3. Démarrer les services
docker compose up -d

# 4. Déployer nginx
./scripts/deploy-nginx.sh
```

### Sur Nouveau Serveur

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour le guide complet de déploiement.

## 🔧 Gestion des Services

### Docker Services

```bash
# Démarrer tous les services
docker compose up -d

# Arrêter tous les services  
docker compose down

# Redémarrer un service spécifique
docker compose restart n8n
docker compose restart cercle-des-voyages-backend
docker compose restart scraping-backend

# Rebuilder après mise à jour submodule
docker compose up -d --build cercle-des-voyages-backend
```

### Mise à Jour des Submodules

```bash
# Mettre à jour tous les submodules automatiquement
./scripts/update-submodules.sh


# Mettre à jour un submodule manuellement
cd services/cercle-des-voyages
git pull origin main
cd ../..
git add services/cercle-des-voyages
git commit -m "Update cercle-des-voyages submodule"
```

### Backup Sécurisé Workflows N8N

```bash
# Backup automatique de tous les projets N8N vers GitHub
./scripts/n8n-workflows-backup.sh

# Backup d'un projet spécifique
./scripts/n8n-workflows-backup.sh nom-du-projet

# Backup avec message personnalisé
./scripts/n8n-workflows-backup.sh nom-du-projet "Message custom"
```

### Déploiement Nginx

```bash
# Déploiement complet (recommandé)
./scripts/deploy-nginx.sh

# Options spécifiques  
./scripts/deploy-nginx.sh test           # Test config seulement
./scripts/deploy-nginx.sh frontend       # Frontends uniquement
./scripts/deploy-nginx.sh rollback /path # Restaurer sauvegarde
```

## 📊 Monitoring et Logs

### Logs Services

```bash
# Logs globaux
docker compose logs -f

# Logs par service
docker compose logs -f n8n
docker compose logs -f cercle-des-voyages-backend
docker compose logs -f scraping-backend

# Logs nginx par service
tail -f /var/log/nginx/n8n.access.log
tail -f /var/log/nginx/cercledesvoyages.access.log
```

### Statut Infrastructure

```bash
# État des services Docker
docker compose ps

# Espace disque volumes
docker system df

# Test configurations nginx
sudo nginx -t
```

## 🔐 Sécurité

### SSL/HTTPS
- Certificats Let's Encrypt automatiques
- TLS 1.2/1.3 uniquement  
- HSTS activé sur tous les sites
- OCSP Stapling pour validation rapide

### Headers de Sécurité
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- CORS sécurisé avec whitelist domaines

### Rate Limiting
- API : 30 req/min
- Général : 60 req/min
- Connexions simultanées limitées par IP

### Accès Services
- Tous les ports bindés sur `127.0.0.1` uniquement
- Accès externe via nginx reverse proxy SSL obligatoire
- VNC avec authentification basique requise

## 🛠️ Ports Internes

**Services accessibles uniquement via nginx :**
- `5678` : N8N Interface
- `3001` : Cercle des Voyages Backend API  
- `3000` : Scraping Backend
- `6080` : noVNC Web Interface
- `5900` : VNC Server (scraping-backend)

## 🔄 Volumes Persistants

- `project-n8n_n8n_data` : Données N8N (workflows, configurations)
- `project-n8n_scraping-backend_data` : Données de scraping persistantes

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** : Guide développeur complet
- **[DEPLOYMENT.md](DEPLOYMENT.md)** : Guide déploiement nouveau serveur
- **[scripts/README.md](scripts/README.md)** : Documentation des scripts

## 🆘 Dépannage

### Problèmes Docker

```bash
# Vérifier l'état des services
docker compose ps

# Rebuilder un service
docker compose up -d --build cercle-des-voyages-backend

# Nettoyer l'espace Docker
docker system prune
```

### Problèmes Nginx

```bash
# Test de configuration
sudo nginx -t

# Statut du service  
sudo systemctl status nginx

# Redémarrage complet
sudo systemctl restart nginx
```

### Problèmes SSL

```bash
# Vérifier l'expiration
sudo certbot certificates

# Renouvellement manuel
sudo certbot renew

# Test de renouvellement
sudo certbot renew --dry-run
```

## 🚀 Architecture Business

Cette infrastructure est conçue pour la **modularité business** :

- **Projets vendables** : Chaque service dans `services/` peut être vendu séparément
- **Submodules Git** : Facilite la maintenance et les updates
- **Configuration portable** : Variables d'environnement pour adaptation serveur
- **Scripts automatisés** : Déploiement et maintenance simplifiés

## 📞 Support

- **GitHub** : https://github.com/La-Refonte/la-Refonte-infrastructure
- **Documentation** : Voir fichiers CLAUDE.md et DEPLOYMENT.md
- **Scripts** : Aide disponible avec `./scripts/nom-script.sh help`

---

**Infrastructure professionnelle LaRefonte** - Modulaire, sécurisée et évolutive 🚀