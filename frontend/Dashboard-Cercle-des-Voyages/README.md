# Frontend - Dashboard Cercle des Voyages

Interface utilisateur pour la gestion des briefs WordPress avec **architecture modulaire**.

## 🚀 Démarrage rapide

```bash
# Installation
npm install

# Développement (avec rechargement automatique)
npm run dev

# Production
npm start
```

L'application sera accessible sur **http://localhost:8080**

## 📋 Prérequis

- **Backend API** : Doit être démarré sur le port 3001
- **Node.js** : Version 16+ recommandée

## 🎨 Fonctionnalités interface

- **Connexion WordPress** : Authentification sécurisée
- **Dashboard temps réel** : Synchronisation automatique avec MongoDB
- **Gestion des briefs** : Génération, filtrage, téléchargement
- **Interface responsive** : Compatible desktop et mobile
- **États visuels** : Indicateurs de statut colorés

## 🔧 Configuration

L'application communique automatiquement avec :

- **API Backend** : `http://localhost:3001`
- **WordPress** : `https://www.cercledesvoyages.com`

## 📁 Structure

```
frontend/
├── index.html                 # Point d'entrée HTML
├── assets/                    # Ressources statiques
│   ├── css/
│   │   └── styles.css        # Styles CSS globaux
│   └── js/
│       ├── config.js         # Configuration globale
│       ├── app.js            # Application principale
│       ├── services/
│       │   └── api.js        # Service API
│       ├── components/
│       │   └── ui.js         # Composants UI
│       └── utils/
│           └── helpers.js    # Utilitaires
├── package.json               # Configuration et scripts
├── README.md                  # Cette documentation
└── README_ARCHITECTURE.md    # Documentation architecture
```

## 🎯 Technologies

- **HTML5** : Structure sémantique
- **CSS3** : Styles modernes et responsive
- **JavaScript Vanilla** : Logique métier avec architecture modulaire
- **http-server** : Serveur de développement

## 🏗️ Architecture

Le frontend utilise une **architecture modulaire** pour une meilleure maintenabilité :

### Modules principaux

- **`config.js`** : Configuration globale et constantes
- **`app.js`** : Application principale et orchestration
- **`services/api.js`** : Service API pour WordPress et MongoDB
- **`components/ui.js`** : Composants UI et gestionnaires d'interface
- **`utils/helpers.js`** : Fonctions utilitaires réutilisables
- **`styles.css`** : Styles CSS externalisés

### Avantages

- ✅ **Séparation des responsabilités** : Code organisé et maintenable
- ✅ **Réutilisabilité** : Composants et services modulaires
- ✅ **Évolutivité** : Ajout facile de nouvelles fonctionnalités
- ✅ **Debugging** : Plus facile de localiser les problèmes

---

Voir le **README principal** et **README_ARCHITECTURE.md** pour la documentation complète.
