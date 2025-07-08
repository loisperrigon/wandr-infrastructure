??? Infrastructure LaRefonte
Infrastructure complète et professionnelle pour l'écosystème LaRefonte avec nginx, Docker et monitoring.
?? Services déployés
? Services opérationnels

?? LaRefonte Main : https://larefonte.store (Express + Backend de scraping)
?? N8N Workflows : https://n8n.larefonte.store (Automatisation)
??? VNC Access : https://vnc.larefonte.store (Accès distant sécurisé)
?? Cercle des Voyages : https://cercledesvoyages.larefonte.store (Dashboard analytique)

??? Architecture
larefonte-infrastructure/
+-- nginx/                          # Configuration nginx modulaire
¦   +-- sites-available/            # Configurations par service
¦   ¦   +-- 01-larefonte-main.conf  # Express + VNC
¦   ¦   +-- 02-n8n.conf            # N8N workflows
¦   ¦   +-- 03-cercledesvoyages.conf # Dashboard SPA
¦   +-- ssl/                        # SSL centralisé
¦   ¦   +-- options-ssl-nginx.conf  # Configuration SSL commune
¦   +-- conf.d/                     # Configuration générale
¦       +-- general.conf            # Headers sécurité + rate limiting
+-- scripts/                        # Scripts d'automatisation
¦   +-- deploy-nginx.sh            # Déploiement automatisé
¦   +-- backup-nginx.sh            # Sauvegarde
¦   +-- reload-nginx.sh            # Rechargement sécurisé
+-- docker-compose.yml             # Orchestration services
+-- .env                           # Variables d'environnement
+-- README.md                      # Cette documentation
?? Gestion des services
Démarrage/Arrêt
bash# Démarrer tous les services
docker compose up -d

# Arrêter tous les services
docker compose down

# Redémarrer un service spécifique
docker compose restart n8n
docker compose restart scraping-backend
Logs et monitoring
bash# Logs globaux
docker compose logs

# Logs par service
docker compose logs n8n
docker compose logs scraping-backend
docker compose logs novnc

# Logs nginx par service
tail -f /var/log/nginx/larefonte-main.access.log
tail -f /var/log/nginx/n8n.access.log
tail -f /var/log/nginx/vnc.access.log
tail -f /var/log/nginx/cercledesvoyages.access.log
?? Gestion nginx
Déploiement de configuration
bash# Déploiement complet avec sauvegarde automatique
./scripts/deploy-nginx.sh

# Test de configuration uniquement
./scripts/deploy-nginx.sh test

# Rollback vers une sauvegarde
./scripts/deploy-nginx.sh rollback /root/nginx-backups/20250108_143022
Modification de configuration
bash# Modifier une configuration
nano nginx/sites-available/01-larefonte-main.conf

# Déployer les changements
./scripts/deploy-nginx.sh

# En cas de problème, rollback automatique
?? Sécurité
SSL/HTTPS

Certificats Let's Encrypt automatiques pour tous les domaines
Configuration SSL moderne (TLS 1.2/1.3 uniquement)
HSTS activé sur tous les sites
OCSP Stapling pour validation rapide

Headers de sécurité

X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options adapté par service
Content-Security-Policy pour les SPA

Rate limiting

API : 30 req/min
General : 60 req/min
Connexions simultanées limitées par IP

Accès VNC

Authentification basique requise
Certificat SSL obligatoire
Accès localhost uniquement (via nginx)

?? Services Docker
Ports internes (localhost uniquement)

3000 : Scraping Backend (Express)
5678 : N8N Interface
6080 : noVNC Web Interface
5900 : VNC Server (scraping-backend)

Volumes persistants

project-n8n_n8n_data : Données N8N (workflows, configurations)
project-n8n_scraping-backend_data : Données de scraping persistantes

?? Projets externes
L'infrastructure référence les projets dans /root/projects/ :
/root/projects/
+-- shared/                    # Services partagés
¦   +-- scraping-backend/      # Backend de scraping réutilisable
¦   +-- novnc/                # Interface VNC
+-- internal/                  # Projets internes LaRefonte
+-- external/                  # Projets clients
?? Déploiement initial
Prérequis
bash# Docker et Docker Compose
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Nginx
sudo apt update && sudo apt install nginx

# Certbot pour SSL
sudo apt install certbot python3-certbot-nginx
Installation
bash# Cloner l'infrastructure
git clone https://github.com/La-Refonte/la-Refonte-infrastructure.git
cd la-Refonte-infrastructure

# Copier et configurer les variables d'environnement
cp .env.example .env
nano .env

# Générer les certificats SSL
sudo certbot --nginx -d larefonte.store -d www.larefonte.store -d n8n.larefonte.store -d vnc.larefonte.store -d cercledesvoyages.larefonte.store

# Créer l'authentification VNC
sudo htpasswd -c /etc/nginx/.htpasswd votre_utilisateur

# Déployer nginx
./scripts/deploy-nginx.sh

# Démarrer les services Docker
docker compose up -d
?? Workflow de développement

Modifier les configurations dans leurs dossiers respectifs
Tester localement si nécessaire
Commiter les changements :
bashgit add .
git commit -m "feat: amélioration config nginx"
git push origin main

Déployer sur le serveur :
bash./scripts/deploy-nginx.sh


?? Dépannage
Services Docker
bash# Vérifier l'état des services
docker compose ps

# Rebuilder un service
docker compose up -d --build scraping-backend

# Logs détaillés
docker compose logs -f --tail=100 n8n
Nginx
bash# Test de configuration
sudo nginx -t

# Statut du service
sudo systemctl status nginx

# Redémarrage complet
sudo systemctl restart nginx
Certificats SSL
bash# Vérifier l'expiration
sudo certbot certificates

# Renouvellement manuel
sudo certbot renew

# Test de renouvellement
sudo certbot renew --dry-run
?? Monitoring
Métriques importantes

Uptime des services Docker
Certificats SSL (expiration dans 30 jours)
Espace disque volumes Docker
Logs d'erreur nginx et applications

Commandes utiles
bash# Espace disque volumes
docker system df

# Nettoyage Docker
docker system prune

# Taille des logs
du -sh /var/log/nginx/

# Rotation des logs
sudo logrotate -f /etc/logrotate.d/nginx
?? Liens utiles

GitHub : https://github.com/La-Refonte/la-Refonte-infrastructure
N8N Documentation : https://docs.n8n.io/
Nginx Documentation : https://nginx.org/en/docs/
Let's Encrypt : https://letsencrypt.org/