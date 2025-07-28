# Services

Ce dossier est destiné à contenir vos projets clients sous forme de submodules Git.

## Utilisation

Pour ajouter un nouveau projet client :

```bash
# Ajouter un submodule backend
git submodule add https://github.com/client/backend-api.git services/client-backend

# Ajouter un submodule frontend
git submodule add https://github.com/client/frontend-app.git services/client-frontend

# Initialiser les submodules
git submodule update --init --recursive
```

## Structure recommandée

```
services/
├── projet-client-1/
│   ├── backend/          # API, base de données
│   └── frontend/         # Interface utilisateur
├── projet-client-2/
│   └── frontend/         # Site statique
└── autre-service/
    └── backend/          # Microservice
```

## Déploiement des frontends

Le script `update-frontend.sh` recherche automatiquement les frontends dans :
- `services/*/frontend/`
- `services/*/backend/frontend/`

Pour déployer tous les frontends automatiquement :
```bash
./scripts/update-frontend.sh --auto
```