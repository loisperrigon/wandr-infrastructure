# Supprimer l'ancien
rm update-n8n.sh

# Créer le nouveau corrigé
cat > update-n8n.sh << 'EOF'
#!/bin/bash
echo "Mise a jour n8n en cours..."

# Variables
BACKUP_DIR="/root/larefonte-infrastructure/backups"
BACKUP_FILE="n8n-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# Creer le dossier de sauvegarde
mkdir -p $BACKUP_DIR
echo "Sauvegarde des donnees..."

# Arreter n8n
if command -v docker-compose &> /dev/null; then
    docker-compose stop n8n
elif command -v docker &> /dev/null; then
    docker compose stop n8n
else
    echo "ERREUR: Docker Compose non trouve"
    exit 1
fi

# Sauvegarder les donnees (CORRIGÉ)
docker run --rm \
  -v project-n8n_n8n_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/$BACKUP_FILE /data

if [ $? -eq 0 ]; then
    echo "OK: Sauvegarde creee : $BACKUP_DIR/$BACKUP_FILE"
    ls -lh $BACKUP_DIR/$BACKUP_FILE
else
    echo "ERREUR: Erreur lors de la sauvegarde"
    exit 1
fi

echo "Telechargement de la derniere image..."
docker pull n8nio/n8n:latest

echo "Redemarrage de n8n..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d n8n
else
    docker compose up -d n8n
fi

echo "Attente du demarrage..."
sleep 10

# Verifier que n8n repond
if curl -f -s http://127.0.0.1:5678 > /dev/null; then
    echo "OK: n8n mis a jour avec succes !"
    echo "Accessible sur : https://n8n.larefonte.store"
else
    echo "ERREUR: Probleme detecte, restauration en cours..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose stop n8n
    else
        docker compose stop n8n
    fi
    
    docker run --rm \
      -v project-n8n_n8n_data:/data \
      -v $BACKUP_DIR:/backup \
      alpine sh -c "cd /data && tar xzf /backup/$BACKUP_FILE --strip-components=1"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d n8n
    else
        docker compose up -d n8n
    fi
    echo "Restauration effectuee"
fi
EOF

chmod +x update-n8n.sh