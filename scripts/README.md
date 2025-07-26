# Scripts de Déploiement

Scripts automatisés pour le déploiement de l'infrastructure LaRefonte.

## 🚀 Script Principal : `deploy-nginx.sh`

### Usage

```bash
# Déploiement complet (recommandé)
./scripts/deploy-nginx.sh

# Options spécifiques
./scripts/deploy-nginx.sh test           # Test configuration seulement
./scripts/deploy-nginx.sh frontend       # Déploiement frontends uniquement
./scripts/deploy-nginx.sh rollback /path # Restaurer une sauvegarde
```

### Détection Automatique des Frontends

Le script détecte automatiquement le type de frontend et cherche dans les emplacements standards :

#### Structure Standard

- `services/projet/frontend/` ← **Structure recommandée**
- `services/projet/backend/frontend/` ← **Projets avec repo unique (comme cercle-des-voyages)**

#### Frontend Statique (HTML/CSS/JS)
```
services/projet/frontend/
├── index.html     ← Détecté comme statique
├── style.css
└── app.js
```
**Action** : Copie directement vers `/var/www/`

#### Frontend React/Vue (avec build)
```
services/projet/frontend/
├── src/
├── package.json   ← Contient script "build"
├── dist/          ← Build Vite/Vue CLI
└── build/         ← Build Create React App
```
**Action** : Copie `dist/` ou `build/` vers `/var/www/`

### Workflow Recommandé

#### Pour HTML Statique (cas actuel)
```bash
# Modification du code
vim services/cercle-des-voyages/frontend/index.html

# Déploiement direct
./scripts/deploy-nginx.sh
```

#### Pour React/Vue (futur)
```bash
# Modification du code
vim services/nouveau-projet/frontend/src/App.jsx

# Build du projet
cd services/nouveau-projet/frontend
npm run build  # ← Génère dist/ ou build/

# Déploiement
cd ../../..
./scripts/deploy-nginx.sh
```

### Vérifications Automatiques

Le script vérifie :
- ✅ Existence de `package.json`
- ✅ Présence du script `"build"`
- ✅ Existence de `dist/` ou `build/`
- ⚠️ **Erreur si build manquant** pour projets React/Vue

### Messages de Log

```bash
[INFO] Frontend statique détecté (HTML/CSS/JS)           # ← Ton cas actuel
[INFO] Frontend React/Vue détecté (dossier dist/)        # ← Futur React/Vue
[INFO] Frontend Create React App détecté (dossier build/) # ← Futur CRA
[ERROR] Impossible de déployer projet - build manquant   # ← Erreur si pas buildé
```

## 🔧 Autres Scripts

### `update-submodules.sh` 🆕
**Mise à jour intelligente de tous les submodules**

```bash
# Mettre à jour tous les submodules automatiquement
./scripts/update-submodules.sh

# Aide et options
./scripts/update-submodules.sh help
```

**Fonctionnalités intelligentes :**
- ✅ Détecte automatiquement tous les submodules
- ✅ Vérifie les changements locaux avant mise à jour
- ✅ Gère les branches principales (main/master) 
- ✅ Gère les états détachés (propose de checkout)
- ✅ Affiche un résumé détaillé des mises à jour
- ✅ Propose de committer les changements automatiquement

### `reload-nginx.sh`
Rechargement simple de nginx sans déploiement complet.

### `backup-nginx.sh`
Sauvegarde manuelle des configurations nginx.

### `update-frontend.sh`
Mise à jour d'un frontend spécifique.

### `update-n8n.sh`
Mise à jour du service N8N.

## 🎯 Exemples Concrets

### Projet HTML Statique (cercle-des-voyages)
```bash
./scripts/deploy-nginx.sh
# → Copie services/cercle-des-voyages/frontend/ vers /var/www/frontend/
```

### Futur Projet React
```bash
# Structure attendue :
services/nouveau-projet/frontend/
├── src/
├── package.json (avec "build": "vite build")
└── dist/ (généré par npm run build)

./scripts/deploy-nginx.sh
# → Copie services/nouveau-projet/frontend/dist/ vers /var/www/nouveau-frontend/
```

## ⚠️ Points Importants

1. **Build Manuel** : Les projets React/Vue doivent être buildés avant déploiement
2. **Sauvegarde Auto** : Chaque déploiement sauvegarde automatiquement
3. **Rollback Auto** : En cas d'erreur, retour automatique à la config précédente
4. **Chemins Relatifs** : Plus de hardcoding, fonctionne sur n'importe quel serveur

Le script est **intelligent** et s'adapte automatiquement au type de projet !

## 🔄 Workflow de Mise à Jour Complet

### Mise à jour périodique (recommandée)

```bash
# 1. Mettre à jour tous les submodules
./scripts/update-submodules.sh
# → Met à jour cercle-des-voyages, scraping-backend, etc.
# → Propose de committer automatiquement

# 2. Rebuilder les services si nécessaire  
docker compose up -d --build

# 3. Redéployer les frontends
./scripts/deploy-nginx.sh

# 4. Vérifier que tout fonctionne
docker compose ps
```

### Mise à jour d'urgence (un seul projet)

```bash
# 1. Mise à jour manuelle d'un submodule spécifique
cd services/cercle-des-voyages
git pull origin main

# 2. Rebuild + redéploiement  
cd ../..
docker compose up -d --build cercle-des-voyages-backend
./scripts/deploy-nginx.sh frontend

# 3. Committer le changement de submodule
git add services/cercle-des-voyages
git commit -m "Update cercle-des-voyages submodule"
```

**Automation parfaite pour la maintenance !** 🚀