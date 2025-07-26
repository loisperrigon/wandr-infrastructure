# Projet Scraping Tools

Suite d'outils de scraping avec interface VNC pour automatisation web.

## Structure du projet

```
scraping-tools/
├── backend/    # Backend scraping avec Puppeteer (submodule)
└── novnc/      # Interface VNC web (submodule)
```

## Services Docker

- **Scraping Backend** : Serveur Node.js + Puppeteer + VNC (ports 3000, 5900)
- **NoVNC Interface** : Interface web pour contrôle VNC (port 6080)

## Configuration submodules

```bash
# Backend scraping
rm -rf services/scraping-tools/backend/README.md
git submodule add https://github.com/ton-compte/scraping-backend.git services/scraping-tools/backend

# Interface NoVNC
rm -rf services/scraping-tools/novnc/README.md
git submodule add https://github.com/ton-compte/novnc-interface.git services/scraping-tools/novnc
```

## Déploiement standalone

Ce projet peut être vendu séparément :

```bash
# Pour un client qui veut juste les outils de scraping
git submodule add https://github.com/ton-agence/scraping-tools.git services/scraping-tools
```

## Fonctionnalités

- Scraping automatisé avec Puppeteer
- Interface graphique via VNC
- Contrôle distant via NoVNC web
- Données persistantes dans volumes Docker