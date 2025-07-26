# Infrastructure Template

Template d'infrastructure professionnelle pour déploiement client avec nginx, Docker et architecture modulaire.

## 🚀 Template Features

✅ **Services inclus dans le template**

- 🌐 **N8N Workflows** : Plateforme d'automatisation complète
- 🔧 **Nginx Reverse Proxy** : SSL termination et sécurité
- 🐳 **Docker Compose** : Orchestration modulaire des services
- 📦 **Support Submodules** : Intégration facile des projets clients

## 🏗️ Architecture Template

```
infrastructure-template/
├── services/                          # Services clients (à ajouter via submodules)
│   └── [vos-projets-ici]/            # Ajoutez vos submodules clients
├── nginx/                             # Configuration nginx
│   ├── sites-available/              # Templates de configuration
│   │   ├── n8n.conf.template         # Template N8N
│   │   ├── backend-api.conf.template # Template API backend
│   │   └── frontend-spa.conf.template # Template frontend SPA
│   ├── ssl/                          # Configuration SSL
│   └── conf.d/                       # Configuration générale
├── scripts/                          # Scripts d'automatisation
│   ├── deploy-nginx.sh              # Déploiement automatisé
│   ├── update-submodules.sh         # Mise à jour submodules
│   ├── n8n-workflows-backup.sh      # Backup workflows N8N
│   └── update-n8n.sh                # Mise à jour N8N
├── docker-compose.yml               # Template d'orchestration
├── .env.example                     # Variables d'environnement
├── CLAUDE.md                        # Guide développeur
└── README.md                        # Ce fichier
```

## 🚀 Démarrage Rapide Client

### 1. Copier le template

```bash
# Copier le template pour votre client
cp -r infrastructure-template/ client-infrastructure/
cd client-infrastructure/
```

### 2. Configuration initiale

```bash
# Copier et configurer les variables
cp .env.example .env
nano .env  # Modifier avec domaine client, mots de passe, etc.
```

Variables principales à configurer :
- `N8N_HOST` : Domaine N8N du client
- `CLIENT_DOMAIN` : Domaine principal du client
- `N8N_PASSWORD` : Mot de passe fort pour N8N
- `SSL_EMAIL` : Email pour Let's Encrypt
- `GITHUB_ORG` : Organisation GitHub (si backup N8N)

### 3. Ajouter les services clients

```bash
# Ajouter vos projets comme submodules
git submodule add https://github.com/client/backend-api.git services/client-backend
git submodule add https://github.com/client/frontend-app.git services/client-frontend
git submodule update --init --recursive
```

### 4. Configurer nginx

```bash
# Copier et adapter les templates nginx
cp nginx/sites-available/backend-api.conf.template nginx/sites-available/client-api.conf
# Éditer et remplacer SERVICE_NAME, CLIENT_DOMAIN, BACKEND_PORT
```

### 5. Adapter docker-compose.yml

Décommenter et adapter les services nécessaires dans `docker-compose.yml`.

### 6. Déployer

```bash
# Déployer la configuration nginx
./scripts/deploy-nginx.sh

# Démarrer les services
docker compose up -d
```

## 🔧 Gestion des Services

### Docker Services

```bash
# Démarrer tous les services
docker compose up -d

# Arrêter tous les services  
docker compose down

# Redémarrer un service spécifique
docker compose restart n8n
docker compose restart client-backend

# Voir les logs
docker compose logs -f n8n
docker compose logs -f client-backend
```

### Mise à jour des submodules

```bash
# Mettre à jour tous les submodules
./scripts/update-submodules.sh

# Mettre à jour un submodule spécifique
cd services/client-backend
git pull origin main
cd ../..
git add services/client-backend
git commit -m "Update client backend"
```

### Déploiement Frontend

```bash
# Déployer tous les frontends
./scripts/deploy-nginx.sh frontend

# Déployer un frontend spécifique
./scripts/deploy-nginx.sh frontend client-project
```

## 📊 Monitoring

### Vérifier l'état des services

```bash
# État des conteneurs Docker
docker compose ps

# Logs nginx par service
tail -f /var/log/nginx/n8n.access.log
tail -f /var/log/nginx/client.access.log

# Utilisation des ressources
docker stats
```

## 🔐 Sécurité

### Configuration SSL

Les certificats Let's Encrypt sont générés automatiquement pour chaque domaine configuré.

```bash
# Vérifier les certificats
sudo certbot certificates

# Renouvellement manuel
sudo certbot renew
```

### Sauvegarde N8N

```bash
# Configurer le backup GitHub (optionnel)
# Ajouter GITHUB_TOKEN et GITHUB_ORG dans .env

# Backup tous les workflows
./scripts/n8n-workflows-backup.sh

# Backup un projet spécifique
./scripts/n8n-workflows-backup.sh nom-projet
```

## 🛠️ Scripts Disponibles

- **deploy-nginx.sh** : Déploiement complet nginx avec backup automatique
- **update-submodules.sh** : Mise à jour intelligente des submodules
- **n8n-workflows-backup.sh** : Backup sécurisé des workflows N8N vers GitHub
- **update-n8n.sh** : Mise à jour de N8N avec backup automatique

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** : Guide complet pour le développement
- **[.env.example](.env.example)** : Template des variables d'environnement

## 🆘 Dépannage

### Problèmes Docker

```bash
# Reconstruire un service
docker compose up -d --build client-backend

# Nettoyer l'espace Docker
docker system prune
```

### Problèmes Nginx

```bash
# Test de configuration
sudo nginx -t

# Redémarrage complet
sudo systemctl restart nginx
```

## 🚀 Architecture Client

Ce template est conçu pour être **réutilisable** pour chaque client :

- **Template propre** : Aucun code spécifique hardcodé
- **Submodules dynamiques** : Ajout facile des projets clients
- **Configuration par environnement** : Tout dans `.env`
- **Scripts automatisés** : Déploiement simplifié

---

**Infrastructure Template** - Prêt pour déploiement client professionnel 🚀