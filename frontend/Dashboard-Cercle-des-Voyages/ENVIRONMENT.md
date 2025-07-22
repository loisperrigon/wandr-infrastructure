# Configuration des environnements

## 🔧 Comment changer d'environnement

### Méthode simple

1. Ouvrir le fichier `assets/js/config.js`
2. Modifier la ligne 4 :

```javascript
// Pour l'environnement de développement (backend local)
ENVIRONMENT: "dev",

// Pour l'environnement de production (backend distant)
ENVIRONMENT: "prod",
```

3. Recharger la page dans le navigateur

### Environnements disponibles

#### 🔧 Développement (`dev`)

- **API Backend** : `http://localhost:3001/api`
- **WordPress** : `https://www.cercledesvoyages.com`
- **Usage** : Développement local avec backend sur votre machine

#### 🚀 Production (`prod`)

- **API Backend** : `https://cercledesvoyages.larefonte.store/api`
- **WordPress** : `https://www.cercledesvoyages.com`
- **Usage** : Utilisation avec le backend de production

## 📊 Vérification de l'environnement

### Console du navigateur

Au démarrage de l'application, vous verrez :

```
🌍 Environnement actuel: DEV
📡 API URL: http://localhost:3001/api
🔗 WordPress URL: https://www.cercledesvoyages.com
```

### Vérification manuelle

Dans la console du navigateur, tapez :

```javascript
CONFIG.showEnvironmentInfo();
```

## ⚙️ Personnalisation

### Ajouter un nouvel environnement

1. Modifier `assets/js/config.js` :

```javascript
ENVIRONMENTS: {
  dev: {
    WORDPRESS_URL: "https://www.cercledesvoyages.com",
    API_URL: "http://localhost:3001/api",
  },
  prod: {
    WORDPRESS_URL: "https://www.cercledesvoyages.com",
    API_URL: "https://cercledesvoyages.larefonte.store/api",
  },
  // Nouvel environnement
  staging: {
    WORDPRESS_URL: "https://staging.cercledesvoyages.com",
    API_URL: "https://staging-api.cercledesvoyages.com/api",
  }
},
```

2. Utiliser le nouvel environnement :

```javascript
ENVIRONMENT: "staging",
```

## 🔄 Changement rapide

### Pendant le développement

Pour changer rapidement d'environnement pendant le développement :

1. **Dev → Prod** : Changez `"dev"` en `"prod"` dans config.js
2. **Rechargez** la page
3. **Vérifiez** dans la console que l'URL API a changé

### Automatisation (optionnel)

Vous pouvez créer des scripts npm pour automatiser :

```json
{
  "scripts": {
    "dev": "sed -i 's/ENVIRONMENT: \"prod\"/ENVIRONMENT: \"dev\"/' assets/js/config.js && npm run start",
    "prod": "sed -i 's/ENVIRONMENT: \"dev\"/ENVIRONMENT: \"prod\"/' assets/js/config.js && npm run start"
  }
}
```

## 🚨 Important

- **Toujours vérifier** l'environnement avant de faire des actions importantes
- **Ne pas commiter** les changements d'environnement dans Git
- **Documenter** les URLs spécifiques à votre projet
