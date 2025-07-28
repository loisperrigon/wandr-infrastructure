# 🚀 Infrastructure Template

<p align="center">
  <strong>Template d'infrastructure professionnelle prêt à déployer</strong><br>
  Nginx • Docker • Architecture Modulaire • SSL Auto • Multi-Services
</p>

<p align="center">
  <a href="#-démarrage-rapide">Démarrage Rapide</a> •
  <a href="#-architecture-template">Architecture</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contribution">Contribution</a>
</p>

---

> 🎯 **Objectif** : Fournir une infrastructure de base solide et modulaire pour déployer rapidement des projets clients avec les meilleures pratiques DevOps.

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
│   ├── sites-available/              # Vos configurations (vide)
│   ├── ssl/                          # Configuration SSL
│   └── conf.d/                       # Configuration générale
├── scripts/                          # Scripts utilitaires
│   ├── deploy-nginx.sh              # Déploiement nginx
│   ├── backup-docker-volumes.sh     # Backup volumes
│   └── restore-docker-volume.sh     # Restore volumes
├── examples/                         # Exemples de configuration
│   ├── docker-compose.examples.yml  # Services Docker exemples
│   └── nginx-templates/             # Templates nginx
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
# Copier les templates depuis examples
cp examples/nginx-templates/backend-api.conf.template nginx/sites-available/client-api.conf
# Éditer et remplacer SERVICE_NAME, CLIENT_DOMAIN, BACKEND_PORT
```

### 5. Adapter docker-compose.yml

```bash
# Copier les services nécessaires depuis examples
# Voir examples/docker-compose.examples.yml
```

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
git submodule update --remote --merge

# Mettre à jour un submodule spécifique
cd services/client-backend
git pull origin main
cd ../..
git add services/client-backend
git commit -m "Update client backend"
```

### Déploiement Frontend (optionnel)

```bash
# Mode AUTO - déploie TOUS les frontends trouvés (pour les flemmards 😄)
./scripts/update-frontend.sh --auto
# → Cherche dans services/*/frontend/ et services/*/backend/frontend/
# → Détecte automatiquement React/Vue (dist/, build/) vs HTML statique
# → Déploie tout automatiquement

# Mode MANUEL - déploie un frontend spécifique
./scripts/update-frontend.sh /chemin/source nom-site

# Ou via deploy-nginx.sh (plus basique, sans détection)
./scripts/deploy-nginx.sh frontend /chemin/source nom-site

# Exemples :
./scripts/update-frontend.sh --auto                      # Déploie TOUT avec détection
./scripts/update-frontend.sh ./services/landing landing  # Un seul projet
./scripts/update-frontend.sh ./services/app/frontend app # React/Vue auto-détecté
```

**Détection intelligente** :
- Si `dist/` ou `build/` existe → déploie le contenu compilé (React/Vue)
- Sinon → déploie les fichiers statiques (HTML/CSS/JS)
- Si `package.json` sans build → erreur avec instruction de faire `npm run build`

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

### Sauvegarde Volumes Docker

```bash
# Backup d'un volume spécifique
./scripts/backup-docker-volumes.sh mongo_data

# Restaurer un volume
./scripts/restore-docker-volume.sh backups/mongo_data_20240126_143022.tar.gz mongo_data
```

## 🛠️ Scripts Disponibles

- **deploy-nginx.sh** : Déploiement nginx avec backup automatique
- **update-frontend.sh** : Mise à jour rapide d'un frontend statique
- **backup-docker-volumes.sh** : Backup générique de volumes Docker
- **restore-docker-volume.sh** : Restauration de volumes Docker

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

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** : Guide complet pour Claude AI et développement
- **[CONTRIBUTING.md](CONTRIBUTING.md)** : Guide de contribution
- **[LICENSE](LICENSE)** : Licence MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🌟 Remerciements

- Conçu pour être modulaire et réutilisable
- Basé sur les meilleures pratiques DevOps
- Optimisé pour une mise en production rapide

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/La-Refonte">La Refonte</a><br>
  <strong>Infrastructure Template</strong> - Votre base solide pour des déploiements professionnels 🚀
</p>