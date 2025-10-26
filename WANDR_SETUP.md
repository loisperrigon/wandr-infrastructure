# 🗺️ Wandr Infrastructure Setup

Configuration complète pour déployer Wandr avec Docker Compose et Nginx.

## 📋 Architecture

```
wandr-infrastructure/
├── services/
│   └── wandr/                    # Submodule git du projet Wandr
│       ├── apps/
│       │   ├── backend/          # API Hono.js (port 8000)
│       │   └── web/              # Frontend Next.js (port 3000)
│       ├── packages/shared/
│       └── scripts/
├── nginx/
│   ├── conf.d/
│   │   ├── general.conf          # Rate limiting, security headers
│   │   └── wandr.conf            # Configuration Wandr
│   └── ssl/                      # Certificats SSL
├── docker-compose.yml            # Orchestration des services
├── .env                          # Variables d'environnement
└── .env.example                  # Template des variables
```

## 🐳 Services Docker

1. **wandr-db**: PostgreSQL 15+ avec extension pgvector
2. **wandr-backend**: API Hono.js (port 8000)
3. **wandr-web**: Frontend Next.js (port 3000)
4. **nginx**: Reverse proxy (ports 80/443)

## 🚀 Installation

### 1. Prérequis

```bash
# Installer Docker et Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Vérifier l'installation
docker --version
docker compose version
```

### 2. Configuration Initiale

```bash
# Cloner le repo infrastructure
git clone https://github.com/loisperrigon/wandr-infrastructure.git
cd wandr-infrastructure

# Initialiser le submodule Wandr
git submodule update --init --recursive

# Copier et éditer les variables d'environnement
cp .env.example .env
nano .env  # Éditer avec vos API keys
```

### 3. Variables d'Environnement Requises

Éditez le fichier `.env` avec vos propres valeurs :

```bash
# Base de données
POSTGRES_USER=wandr
POSTGRES_PASSWORD=votre_mot_de_passe_fort
POSTGRES_DB=wandr

# Reddit API - https://www.reddit.com/prefs/apps
REDDIT_CLIENT_ID=votre_client_id
REDDIT_CLIENT_SECRET=votre_client_secret
REDDIT_USERNAME=votre_username
REDDIT_PASSWORD=votre_password

# Together.ai (LLM) - https://api.together.xyz
TOGETHER_API_KEY=votre_together_key

# OpenAI (Embeddings) - https://platform.openai.com
OPENAI_API_KEY=votre_openai_key

# Mapbox (Maps) - https://account.mapbox.com
NEXT_PUBLIC_MAPBOX_TOKEN=votre_mapbox_token

# Google Maps (optionnel)
GOOGLE_MAPS_API_KEY=votre_google_maps_key

# AdSense (optionnel)
NEXT_PUBLIC_ADSENSE_ID=ca-pub-xxxxx
```

### 4. Obtenir les API Keys

#### Reddit API
1. Aller sur https://www.reddit.com/prefs/apps
2. Cliquer "Create App" ou "Create Another App"
3. Sélectionner type "script"
4. Remplir le formulaire et noter Client ID et Secret

#### Together.ai
1. Aller sur https://api.together.xyz
2. S'inscrire (25$ de crédits gratuits)
3. Aller dans Settings → API Keys
4. Créer une nouvelle clé

#### OpenAI
1. Aller sur https://platform.openai.com/api-keys
2. Créer une clé API
3. Ajouter 5-10$ de crédit (embeddings sont peu coûteux)

#### Mapbox
1. Aller sur https://account.mapbox.com
2. S'inscrire (50,000 chargements gratuits/mois)
3. Copier le token public par défaut

### 5. Lancer les Services

```bash
# Construire et démarrer tous les services
docker compose up -d --build

# Vérifier que tout fonctionne
docker compose ps
docker compose logs -f
```

### 6. Initialiser la Base de Données

```bash
# Attendre que la DB soit prête (environ 10 secondes)
docker compose exec wandr-backend sh -c "cd apps/backend && npx prisma migrate deploy"

# Générer le client Prisma
docker compose exec wandr-backend sh -c "cd apps/backend && npx prisma generate"
```

### 7. Charger les Données Initiales

```bash
# Scraper Reddit pour Chiang Mai
docker compose exec wandr-backend pnpm -w run script:scrape -- --subreddit=chiangmai

# Extraire les lieux avec LLM
docker compose exec wandr-backend pnpm -w run script:extract

# Enrichir avec Google Maps
docker compose exec wandr-backend pnpm -w run script:enrich

# Générer les embeddings
docker compose exec wandr-backend pnpm -w run script:embeddings

# Générer la config des villes
docker compose exec wandr-backend pnpm -w run script:generate-cities
```

## 🌐 Accéder à l'Application

- **Frontend**: http://localhost
- **API Backend**: http://localhost/api
- **Health Check**: http://localhost/health

## 📊 Commandes Utiles

### Gestion des Services

```bash
# Voir les logs
docker compose logs -f
docker compose logs -f wandr-web
docker compose logs -f wandr-backend
docker compose logs -f wandr-db

# Redémarrer un service
docker compose restart wandr-web
docker compose restart wandr-backend

# Arrêter tous les services
docker compose down

# Supprimer les volumes (attention: supprime les données!)
docker compose down -v

# Reconstruire après changement de code
docker compose up -d --build wandr-web
docker compose up -d --build wandr-backend
```

### Mise à Jour du Code Wandr

```bash
# Mettre à jour le submodule
cd services/wandr
git pull origin main
cd ../..

# Reconstruire les services
docker compose up -d --build wandr-web wandr-backend
```

### Ajouter une Nouvelle Ville

```bash
# Via script automatique
docker compose exec wandr-backend pnpm -w run script:add-city "Bali" "bali"

# Ou manuellement
docker compose exec wandr-backend pnpm -w run script:scrape -- --subreddit=bali
docker compose exec wandr-backend pnpm -w run script:extract
docker compose exec wandr-backend pnpm -w run script:enrich
docker compose exec wandr-backend pnpm -w run script:embeddings
docker compose exec wandr-backend pnpm -w run script:generate-cities
```

### Base de Données

```bash
# Accéder à PostgreSQL
docker compose exec wandr-db psql -U wandr -d wandr

# Voir les tables
\dt

# Compter les lieux
SELECT COUNT(*) FROM "Place";

# Voir les villes détectées
SELECT DISTINCT city FROM "Place";

# Quitter
\q

# Backup de la DB
docker compose exec wandr-db pg_dump -U wandr wandr > backup.sql

# Restaurer la DB
cat backup.sql | docker compose exec -T wandr-db psql -U wandr wandr
```

## 🔒 Configuration SSL (Production)

### 1. Configurer le Domaine

```bash
# Éditer .env
nano .env

# Changer
CLIENT_DOMAIN=wandr.yourdomain.com
SSL_EMAIL=admin@yourdomain.com
```

### 2. Obtenir Certificat Let's Encrypt

```bash
# Installer certbot
apt-get update
apt-get install certbot

# Obtenir certificat
certbot certonly --standalone -d wandr.yourdomain.com

# Copier certificats
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/wandr.yourdomain.com/fullchain.pem nginx/ssl/wandr.crt
cp /etc/letsencrypt/live/wandr.yourdomain.com/privkey.pem nginx/ssl/wandr.key
```

### 3. Activer SSL dans Nginx

Éditer `nginx/conf.d/wandr.conf` :

```nginx
# Décommenter les lignes SSL
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/wandr.crt;
ssl_certificate_key /etc/nginx/ssl/wandr.key;
include /etc/nginx/ssl/options-ssl-nginx.conf;
```

### 4. Redémarrer Nginx

```bash
docker compose restart nginx
```

## 🐛 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker compose logs

# Vérifier les ports disponibles
netstat -tulpn | grep -E ':(80|443|3000|8000|5432)'

# Reconstruire depuis zéro
docker compose down -v
docker compose up -d --build
```

### L'API ne répond pas

```bash
# Vérifier le backend
docker compose logs wandr-backend

# Vérifier la connexion DB
docker compose exec wandr-backend sh -c "cd apps/backend && npx prisma db pull"

# Redémarrer le backend
docker compose restart wandr-backend
```

### Le frontend affiche une erreur

```bash
# Vérifier les logs frontend
docker compose logs wandr-web

# Vérifier les variables d'environnement
docker compose exec wandr-web env | grep NEXT_PUBLIC

# Reconstruire le frontend
docker compose up -d --build wandr-web
```

### La base de données n'a pas de données

```bash
# Vérifier la DB
docker compose exec wandr-db psql -U wandr -d wandr -c "SELECT COUNT(*) FROM \"Place\";"

# Si vide, relancer le pipeline de données
docker compose exec wandr-backend pnpm -w run script:scrape -- --subreddit=chiangmai
docker compose exec wandr-backend pnpm -w run script:extract
docker compose exec wandr-backend pnpm -w run script:enrich
docker compose exec wandr-backend pnpm -w run script:embeddings
```

## 📈 Monitoring

### Vérifier la Santé des Services

```bash
# Health check global
curl http://localhost/health

# Health check backend
curl http://localhost/api/health

# Stats Docker
docker stats

# Espace disque utilisé
docker system df
```

## 🔄 Workflow de Développement

### Développement Local du Frontend

```bash
cd services/wandr/apps/web
npm install
npm run dev
# Frontend disponible sur http://localhost:3001
```

### Développement Local du Backend

```bash
cd services/wandr/apps/backend
npm install
npm run dev
# Backend disponible sur http://localhost:8001
```

### Push des Changements

```bash
# Dans le submodule Wandr
cd services/wandr
git add .
git commit -m "Description des changements"
git push origin main

# Dans l'infrastructure
cd ../..
git add services/wandr
git commit -m "Update Wandr submodule"
git push origin main
```

## 📚 Documentation Wandr

Pour plus d'informations sur le projet Wandr :

- [Architecture](services/wandr/ARCHITECTURE.md)
- [Ajouter des villes](services/wandr/ADDING_CITIES.md)
- [Configuration SEO](services/wandr/SEO_URLS.md)
- [Configuration AdSense](services/wandr/ADSENSE_SETUP.md)

## 🆘 Support

- **Issues Wandr**: https://github.com/loisperrigon/Wandr/issues
- **Issues Infrastructure**: https://github.com/loisperrigon/wandr-infrastructure/issues
