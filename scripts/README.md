# Scripts Utilitaires

Scripts utilitaires pour la gestion de l'infrastructure.

## 📜 Scripts disponibles

### `deploy-nginx.sh`
Déploiement automatisé de la configuration nginx avec backup.

```bash
# Déploiement complet nginx
./scripts/deploy-nginx.sh

# Test de configuration seulement
./scripts/deploy-nginx.sh test

# Déployer un frontend statique
./scripts/deploy-nginx.sh frontend /source/path target-name

# Rollback vers un backup
./scripts/deploy-nginx.sh rollback /path/to/backup
```

### `update-frontend.sh` 🆕
Mise à jour rapide d'un frontend (pour les flemmards 😄).

```bash
# Usage simple
./scripts/update-frontend.sh /chemin/source nom-projet

# Exemples
./scripts/update-frontend.sh ./services/landing/public landing
./scripts/update-frontend.sh ~/client-site/dist client-website
```

Avantages :
- ✅ Backup automatique de l'ancien frontend
- ✅ Permissions nginx appliquées automatiquement
- ✅ Affiche les stats (nombre de fichiers, taille)
- ✅ Plus simple que deploy-nginx.sh

### `backup-docker-volumes.sh`
Sauvegarde de volumes Docker.

```bash
# Lister les volumes disponibles
./scripts/backup-docker-volumes.sh

# Sauvegarder un volume spécifique
./scripts/backup-docker-volumes.sh mongo_data
```

### `restore-docker-volume.sh`
Restauration de volumes Docker depuis un backup.

```bash
# Restaurer un volume
./scripts/restore-docker-volume.sh backups/mongo_data_20240126.tar.gz mongo_data
```

## 📝 Notes

- Les backups sont stockés dans le dossier `backups/` par défaut
- Tous les scripts incluent une gestion d'erreurs et des logs colorés
- Les scripts nginx créent automatiquement des backups avant modification