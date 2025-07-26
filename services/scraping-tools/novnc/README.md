# NoVNC Web Interface

Interface web simple pour accéder au serveur VNC du scraping-backend.

## Fonctionnement

- **Port** : 6080 (interface web)
- **Connexion VNC** : Se connecte au scraping-backend sur le port 5900
- **Architecture** : ARM64 (compatible serveurs modernes)

## Utilisation

L'interface est accessible via navigateur une fois le conteneur démarré :
- URL : `http://localhost:6080`
- Se connecte automatiquement au scraping-backend

## Configuration Docker

```yaml
novnc:
  build: ./services/scraping-tools/novnc/
  platform: linux/arm64
  container_name: novnc
  ports:
    - "127.0.0.1:6080:6080"
  environment:
    - VNC_SERVER=scraping-backend:5900
  depends_on:
    - scraping-backend
```

## Dockerfile

Utilise Ubuntu 20.04 ARM64 avec :
- `novnc` : Interface web VNC
- `websockify` : Proxy WebSocket vers VNC
- `net-tools` : Utilitaires réseau

Simple et efficace pour l'accès distant au scraping.