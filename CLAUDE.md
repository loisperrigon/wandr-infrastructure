# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the LaRefonte infrastructure repository - a complete professional infrastructure for the LaRefonte ecosystem using nginx, Docker, and modular architecture with Git submodules. It hosts multiple services:

- **N8N Workflows**: https://n8n.larefonte.store (automation platform)
- **Cercle des Voyages**: https://cercledesvoyages.larefonte.store (analytics dashboard + API)
- **Scraping Tools**: Backend scraping + VNC interface
- **VNC Access**: https://vnc.larefonte.store (remote access)

## Architecture

The infrastructure uses a modular approach with Git submodules for business scalability:

```
├── services/                           # Business-oriented project modules
│   ├── cercle-des-voyages/             # Complete Dashboard project (submodule)
│   │   ├── backend/                    # Node.js API + MongoDB + Dockerfile
│   │   ├── frontend/                   # Modular vanilla JavaScript interface
│   │   └── Documentation/              # Project-specific documentation
│   └── scraping-tools/
│       ├── backend/                    # Scraping backend (submodule)
│       └── novnc/                     # VNC web interface
├── nginx/                             # Modular nginx configuration
│   ├── sites-available/              # Service-specific configurations
│   ├── ssl/                          # Centralized SSL configuration
│   └── conf.d/                       # General configuration (security headers, rate limiting)
├── scripts/                          # Automation scripts
│   ├── deploy-nginx.sh              # Automated deployment with backup/rollback
│   ├── update-submodules.sh         # Intelligent submodule updates
│   ├── n8n-workflows-backup.sh      # Secure N8N workflows backup to GitHub
│   └── backup-nginx.sh              # Manual nginx backup
└── docker-compose.yml               # Service orchestration
```

## Common Commands

### Environment Setup
```bash
# Initial setup (required once)
cp .env.example .env
# Edit .env with your configuration values

# Verify all services are running
docker compose ps
```

### Docker Services Management
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart n8n
docker compose restart cercle-des-voyages-backend
docker compose restart scraping-backend

# Rebuild after submodule updates
docker compose up -d --build cercle-des-voyages-backend

# View logs
docker compose logs -f n8n
docker compose logs -f cercle-des-voyages-backend
docker compose logs scraping-backend

# Check resource usage
docker stats
```

### Submodule Management (IMPORTANT)
```bash
# Update all submodules automatically (recommended)
./scripts/update-submodules.sh


# Manual submodule update
cd services/cercle-des-voyages
git pull origin main
cd ../..
git add services/cercle-des-voyages
git commit -m "Update cercle-des-voyages submodule"

# Initial clone with submodules
git clone --recursive https://github.com/La-Refonte/la-Refonte-infrastructure.git

# If you forgot --recursive, initialize submodules
git submodule update --init --recursive
```

### N8N Workflows Secure Backup
```bash
# Backup all N8N projects to private GitHub repositories
./scripts/n8n-workflows-backup.sh

# Backup specific project only
./scripts/n8n-workflows-backup.sh nom-du-projet

# Backup with custom commit message
./scripts/n8n-workflows-backup.sh nom-du-projet "Custom backup message"

# Requirements:
# - Create .env file with GITHUB_TOKEN=ghp_xxxxx
# - Token needs access to La-Refonte organization
# - Workflows must be named: [PROJECT] Workflow name
# - Creates private repos: n8n-{project-name} in La-Refonte org
```

### Nginx Configuration Deployment
```bash
# Full deployment with automatic backup
./scripts/deploy-nginx.sh

# Test configuration only
./scripts/deploy-nginx.sh test

# Deploy frontends only (detects HTML static vs React/Vue builds automatically)
./scripts/deploy-nginx.sh frontend

# Deploy specific frontend
./scripts/deploy-nginx.sh frontend dashboard

# Rollback to backup
./scripts/deploy-nginx.sh rollback /root/nginx-backups/20250108_143022
```

### Frontend Development
```bash
# Dashboard Cercle des Voyages (currently HTML static)
cd services/cercle-des-voyages/frontend
npm install
npm run dev      # Development server on port 8080
npm start        # Production server on port 8081

# Deploy frontend changes
./scripts/deploy-nginx.sh frontend

# The deploy script automatically detects:
# - HTML/CSS/JS static files → copies directly from services/project/frontend/
# - React/Vue projects with dist/ or build/ → copies build output

# For future React/Vue projects:
cd services/project/frontend
npm run build    # Generate dist/ or build/
cd ../../..
./scripts/deploy-nginx.sh  # Auto-detects and deploys build output

# Deploy specific frontend only
./scripts/deploy-nginx.sh frontend dashboard
```

### Service Monitoring
```bash
# Check Docker services status
docker compose ps

# View nginx logs by service
tail -f /var/log/nginx/n8n.access.log
tail -f /var/log/nginx/cercledesvoyages.access.log

# System resource usage
docker system df
docker stats
```

## Key Service Ports (Internal)

- **5678**: N8N Interface  
- **3001**: Cercle des Voyages Backend API
- **3000**: Scraping Backend (Express)
- **6080**: noVNC Web Interface
- **5900**: VNC Server (scraping-backend)

All services are accessible only via nginx reverse proxy with SSL termination.

## Frontend Architecture

### Dashboard Cercle des Voyages
Uses modular vanilla JavaScript architecture:
- `config.js`: Global configuration and API URLs
- `services/api.js`: WordPress and backend API communication
- `components/ui.js`: UI managers (Connection, Loading, Table, Filter, Notification)
- `utils/helpers.js`: Reusable utility functions
- `app.js`: Main application orchestration

Frontend communicates with:
- Backend API: https://cercledesvoyages.larefonte.store/api
- WordPress: https://www.cercledesvoyages.com

**Deploy script automatically detects:**
- Static HTML/CSS/JS → copies `services/project/frontend/` to `/var/www/`
- React/Vue projects → copies `services/project/frontend/dist/` or `build/` to `/var/www/`

## Security Features

- Let's Encrypt SSL certificates for all domains
- HSTS enabled on all sites
- Security headers (X-Content-Type-Options, X-XSS-Protection, etc.)
- **CORS properly configured** with domain whitelist (not wildcard)
- Rate limiting (API: 30 req/min, General: 60 req/min)
- All ports bound to `127.0.0.1` only
- VNC access requires basic authentication

## Business Architecture

The infrastructure is designed for **modular business sales**:

- **Each service in `services/` is a separate sellable project**
- **Git submodules** allow independent development and versioning
- **Client-specific infrastructure** can reference only needed submodules
- **Portable configuration** via environment variables

Example: Selling only Dashboard to a client:
```bash
mkdir client-infrastructure
cd client-infrastructure
git submodule add https://github.com/La-Refonte/Dashboard-Cercle-des-Voyages.git services/cercle-des-voyages
# Custom docker-compose.yml with only needed services
```

## Development Workflow

### Regular Development
1. Modify code in submodule: `cd services/cercle-des-voyages && git pull`
2. Test locally if necessary
3. Deploy: `./scripts/deploy-nginx.sh`
4. Rebuild Docker if needed: `docker compose up -d --build`

### Submodule Updates
1. Update all submodules: `./scripts/update-submodules.sh`
2. Script automatically handles conflicts and proposes commits
3. Deploy changes: `./scripts/deploy-nginx.sh`

### New Project Addition
1. Create new submodule: `git submodule add <repo-url> services/new-project`
2. Add service to `docker-compose.yml`
3. Create nginx config in `nginx/sites-available/`
4. Deploy: `./scripts/deploy-nginx.sh`

## Volume Management

Persistent data is stored in Docker volumes:
- `project-n8n_n8n_data`: N8N workflows and configurations
- `project-n8n_scraping-backend_data`: Scraping data storage

**IMPORTANT**: Volume names are preserved from original setup to prevent data loss during infrastructure updates.

## SSL Certificate Management

```bash
# Check certificate expiration
sudo certbot certificates

# Manual renewal
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Configuration Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Restart nginx completely
sudo systemctl restart nginx
```

### Docker Issues
```bash
# Rebuild specific service
docker compose up -d --build cercle-des-voyages-backend

# Clean up Docker resources
docker system prune

# Check container resource usage
docker stats
```

### Submodule Issues
```bash
# Fix submodule in detached HEAD state
cd services/problematic-submodule
git checkout main
git pull origin main

# Reset submodule completely
git submodule deinit -f services/problematic-submodule
git submodule update --init services/problematic-submodule
```

## Important Notes for Development

1. **Always use submodule update script**: `./scripts/update-submodules.sh` handles edge cases
2. **Frontend deploy script is intelligent**: Detects static vs build-based projects automatically
3. **Nginx deployment includes automatic backup**: Safe to deploy, can rollback if issues
4. **Volume names are preserved**: No risk of data loss during infrastructure updates
5. **Standard directory names**: Use `frontend/` and `backend/` for consistency
6. **Business modular**: Each `services/` directory should be independently sellable
7. **Environment configuration**: Always copy `.env.example` to `.env` and configure before first run
8. **Service isolation**: All services bind to `127.0.0.1` only, external access via nginx reverse proxy

The infrastructure includes automatic backup and rollback functionality for safe configuration updates.

## Quick Development Workflow

1. **Update submodules**: `./scripts/update-submodules.sh`
2. **Make changes** in service directories
3. **For backend changes**: `docker compose up -d --build [service-name]`
4. **For frontend changes**: `./scripts/deploy-nginx.sh frontend`
5. **Test and verify**: `docker compose ps` and check service logs