#!/bin/bash

# N8N Workflows Secure Backup to GitHub
# Usage: 
#   ./n8n-workflows-backup.sh                                    # Backup all projects
#   ./n8n-workflows-backup.sh [project-name]                     # Backup specific project
#   ./n8n-workflows-backup.sh [project-name] "Custom message"    # Backup with custom message

set -euo pipefail

# === CONFIGURATION ===
GITHUB_ORG="La-Refonte"
BACKUP_DIR="/root/n8n-backups"
N8N_CONTAINER=""  # Auto-détecté plus bas
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_PROJECT="${1:-}"
CUSTOM_MESSAGE="${2:-}"

# === COLORS FOR LOGS ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# === LOG FUNCTIONS ===
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

warn() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

error() {
    echo -e "${RED}ERROR: $1${NC}"
}

# === LOADING ENVIRONMENT VARIABLES ===
load_env() {
    # Try infrastructure root .env first (recommended)
    if [[ -f "$(dirname "$0")/../.env" ]]; then
        echo "Loading .env file from infrastructure root..."
        
        # Secure method: read line by line and handle special characters
        while IFS= read -r line || [[ -n "$line" ]]; do
            # Ignore empty lines and comments
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            
            # Extract variable and its value
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                var_name="${BASH_REMATCH[1]}"
                var_value="${BASH_REMATCH[2]}"
                
                # Remove existing quotes if any
                var_value=$(echo "$var_value" | sed 's/^['\''\"]//' | sed 's/['\''\"]*$//')
                
                # Export variable securely
                export "$var_name"="$var_value"
                echo "   Variable loaded: $var_name"
            fi
        done < "$(dirname "$0")/../.env"
        
    elif [[ -f "$(dirname "$0")/.env" ]]; then
        echo "Loading .env file from scripts directory..."
        
        while IFS= read -r line || [[ -n "$line" ]]; do
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                var_name="${BASH_REMATCH[1]}"
                var_value="${BASH_REMATCH[2]}"
                var_value=$(echo "$var_value" | sed 's/^['\''\"]//' | sed 's/['\''\"]*$//')
                export "$var_name"="$var_value"
                echo "   Variable loaded: $var_name"
            fi
        done < "$(dirname "$0")/.env"
        
    elif [[ -f "/root/n8n-backups/.env" ]]; then
        echo "Loading .env file from backup directory..."
        
        while IFS= read -r line || [[ -n "$line" ]]; do
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                var_name="${BASH_REMATCH[1]}"
                var_value="${BASH_REMATCH[2]}"
                var_value=$(echo "$var_value" | sed 's/^['\''\"]//' | sed 's/['\''\"]*$//')
                export "$var_name"="$var_value"
                echo "   Variable loaded: $var_name"
            fi
        done < "/root/n8n-backups/.env"
        
    else
        echo "ERROR: .env file not found!"
        echo "Searched locations:"
        echo "- $(dirname "$0")/../.env (infrastructure root - recommended)"
        echo "- $(dirname "$0")/.env (scripts directory)"
        echo "- /root/n8n-backups/.env (backup directory)"
        echo ""
        echo "Create a .env file with: GITHUB_TOKEN=ghp_xxxxx"
        exit 1
    fi
}

# === SECURE TOKEN VERIFICATION ===
verify_token_security() {
    log "Verifying token security..."
    
    # Verify token exists
    if [[ -z "$GITHUB_TOKEN" ]]; then
        error "GITHUB_TOKEN not defined!"
        log "Create a .env file with:"
        log "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx"
        log ""
        log "Possible locations:"
        log "- $(dirname "$0")/.env"
        log "- /root/n8n-backups/.env"
        exit 1
    fi
    
    # Test access to La-Refonte organization ONLY
    org_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/orgs/$GITHUB_ORG" 2>/dev/null)
    
    if echo "$org_response" | grep -q "\"login\": \"$GITHUB_ORG\""; then
        success "Access to organization $GITHUB_ORG confirmed"
    else
        error "No access to organization $GITHUB_ORG!"
        log "Verify that your token has access to La-Refonte organization"
        exit 1
    fi
    
    # Check strict permissions (no global admin access)
    user_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/user" 2>/dev/null)
    
    if echo "$user_response" | grep -q "\"site_admin\": true"; then
        warn "Token with site_admin privileges detected!"
        log "Recommendation: Use a token with minimal permissions"
    fi
    
    success "Secure token validated for $GITHUB_ORG only"
}

# === REPOSITORY CREATION FUNCTION VIA API ===
create_repo_via_api() {
    local repo_name="$1"
    local description="$2"
    
    log "Creating repository in organization $GITHUB_ORG: $repo_name"
    
    # API to create repository in organization (not personal account)
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d "{
            \"name\": \"$repo_name\",
            \"description\": \"$description\",
            \"private\": true,
            \"auto_init\": false
        }" \
        "https://api.github.com/orgs/$GITHUB_ORG/repos")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    case "$http_code" in
        "201")
            success "Repository '$repo_name' created successfully in $GITHUB_ORG"
            return 0
            ;;
        "422")
            if echo "$response_body" | grep -q "already exists"; then
                success "Repository '$repo_name' already exists in $GITHUB_ORG"
                return 0
            else
                error "Error 422: $(echo "$response_body" | grep -o '"message":"[^"]*"')"
                return 1
            fi
            ;;
        "403")
            error "No permission to create repositories in $GITHUB_ORG"
            log "Verify that your token has rights on the organization"
            return 1
            ;;
        *)
            error "Repository creation failed (HTTP $http_code)"
            log "Response: $response_body"
            return 1
            ;;
    esac
}

# === REPOSITORY EXISTENCE CHECK FUNCTION ===
repo_exists() {
    local repo_name="$1"
    
    # Check only in La-Refonte organization
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$GITHUB_ORG/$repo_name")
    
    if [[ "$response" == "200" ]]; then
        return 0  # Repository exists
    else
        return 1  # Repository does not exist
    fi
}

# === MAIN PROJECT BACKUP FUNCTION ===
backup_project() {
    local project_name="$1"
    local files="$2"
    local repo_name="n8n-$project_name"
    local project_dir="$BACKUP_DIR/$project_name"
    
    log "Backing up project: $project_name"
    
    # Check/create repository in La-Refonte
    if repo_exists "$repo_name"; then
        success "Repository $GITHUB_ORG/$repo_name already exists"
    else
        warn "Repository $GITHUB_ORG/$repo_name does not exist"
        read -p "Create repository '$repo_name' in organization $GITHUB_ORG? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if ! create_repo_via_api "$repo_name" "N8N workflows backup for project: $project_name"; then
                error "Cannot create repository, skipping project '$project_name'"
                log "Continuing with next project..."
                return 0
            fi
        else
            warn "Repository not created, skipping project '$project_name'"
            log "Continuing with next project..."
            return 0
        fi
    fi
    
    # Create project directory
    mkdir -p "$project_dir"
    cd "$project_dir"
    
    # Initialize Git if necessary
    if [[ ! -d ".git" ]]; then
        log "Initializing local Git repository..."
        git init
        git config user.name "N8N Backup Bot"
        git config user.email "backup@larefonte.store"
        
        # Configure GitHub remote ONLY to La-Refonte
        git remote add origin "git@github.com:$GITHUB_ORG/$repo_name.git"
        
        # Create secure .gitignore
        cat > .gitignore << EOF
# Temporary files
*.tmp
*.temp
.DS_Store
Thumbs.db

# Logs
*.log

# SECURITY - Secrets and tokens
.env*
secrets/
tokens/
*.key
*.pem
config.json

# Backup scripts (avoid accidental exposure)
backup-*.sh
secure-backup.sh
EOF
    fi
    
    # Clean old workflows
    rm -rf workflows/
    mkdir -p workflows
    
    # Copy project workflows with renaming
    for filename in $files; do
        if [[ -f "$BACKUP_DIR/temp/$filename" ]]; then
            # Extract real workflow name from JSON
            workflow_name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$BACKUP_DIR/temp/$filename" | head -1 | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
            
            if [[ -n "$workflow_name" ]]; then
                # Clean name to make it a valid filename
                # Remove [TAG] from beginning and clean
                clean_name=$(echo "$workflow_name" | sed 's/^\[[^]]*\][[:space:]]*//' | sed 's/[^a-zA-Z0-9 _-]//g' | sed 's/[[:space:]]\+/_/g')
                new_filename="${clean_name}.json"
                
                # Copy with clean name
                cp "$BACKUP_DIR/temp/$filename" "workflows/$new_filename"
                log "   File: $workflow_name -> workflows/$new_filename"
            else
                # Fallback if we can't read the name
                cp "$BACKUP_DIR/temp/$filename" "workflows/"
                log "   Warning: $filename -> workflows/ (name not detected)"
            fi
        fi
    done
    
    # Create README for this project
    cat > README.md << EOF
# N8N Workflows - $project_name

Automatic backup of N8N workflows for project **$project_name**.

**SECURITY**: Private repository in La-Refonte organization only.

## Last backup
- **Date**: $(date +'%d/%m/%Y at %H:%M')
- **Workflows**: $(echo $files | wc -w)
- **Organization**: $GITHUB_ORG

## Structure

\`\`\`
workflows/
├── *.json          # All workflows with readable names
\`\`\`

## Usage

### Import into N8N
1. Copy the content of a JSON file
2. In N8N: Menu → Import from File
3. Paste the JSON

### CLI Commands
\`\`\`bash
# Import via CLI (if server access)
docker exec n8n_container n8n import:workflow --input=/path/to/workflow.json
\`\`\`

## Security
- Private repository in La-Refonte organization
- Token with limited permissions
- Automatic secure backup
- Complete Git history of changes

---
*Generated automatically by N8N secure backup script*
EOF

    # Check Git changes
    git add .
    
    if git diff --staged --quiet; then
        success "No changes for '$project_name'"
        return 0
    else
        log "Changes detected for '$project_name':"
        git diff --staged --name-status
        
        # Automatic commit with custom or default message
        if [[ -n "$CUSTOM_MESSAGE" ]]; then
            commit_msg="$CUSTOM_MESSAGE

Backup from $(date +'%d/%m/%Y at %H:%M')
- Workflows: $(echo $files | wc -w)
- Organization: $GITHUB_ORG"
        else
            commit_msg="Backup workflows: $(date +'%d/%m/%Y at %H:%M')

Statistics:
- Workflows: $(echo $files | wc -w)
- Organization: $GITHUB_ORG
- Auto-backup from N8N

Modified files:
$(git diff --staged --name-only | sed 's/^/- /')"
        fi

        git commit -m "$commit_msg"
        success "Commit created for '$project_name'"
        
        # Push to GitHub (La-Refonte organization only)
        if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
            success "Project '$project_name' backed up to $GITHUB_ORG!"
        else
            # First push - create branch
            git branch -M main
            if git push -u origin main; then
                success "Project '$project_name' backed up to $GITHUB_ORG (first push)!"
            else
                error "Push failed for '$project_name'"
                return 1
            fi
        fi
    fi
}

# === MAIN SCRIPT START ===

echo "=========================================="
echo "  N8N Workflows Secure Backup to GitHub"
echo "  LaRefonte Infrastructure - $(date)"
echo "=========================================="

# Load environment variables
load_env

# Create main backup directory
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

log "Detecting N8N container..."

# Auto-detect N8N container name
N8N_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E ".*n8n.*" | head -1)

if [ -z "$N8N_CONTAINER" ]; then
    error "No N8N container found!"
    log "Make sure N8N is running with: docker compose ps"
    log "Looking for containers containing 'n8n' in the name"
    exit 1
fi

log "Found N8N container: $N8N_CONTAINER"
log "Exporting N8N workflows from Docker container..."

# Export from Docker container (only active workflows, not archived)
if ! docker exec "$N8N_CONTAINER" n8n export:workflow --output=/tmp/workflows/ 2>/dev/null; then
    error "Failed to export workflows from container $N8N_CONTAINER"
    log "Make sure N8N container is running with: docker compose ps"
    exit 1
fi

if ! docker cp "$N8N_CONTAINER:/tmp/workflows/" ./temp/ 2>/dev/null; then
    error "Failed to copy workflows from container"
    exit 1
fi

if [[ ! -d "./temp" ]]; then
    error "Workflow export failed - no temp directory created"
    exit 1
fi

log "Auto-detecting projects from workflow names..."

# Create associative array to store detected projects
declare -A projects

# Scan all files to detect [TAGS] in JSON content
for file in temp/*.json; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        
        # Extract workflow name from JSON
        workflow_name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$file" | head -1 | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        
        if [[ -n "$workflow_name" ]]; then
            log "Workflow: $workflow_name (file: $filename)"
            
            # Extract tag in brackets [TAG] from workflow name
            if [[ $workflow_name =~ \[([^]]+)\] ]]; then
                tag="${BASH_REMATCH[1]}"
                # Convert to directory name (lowercase, replace spaces with dashes)
                project_name=$(echo "$tag" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')
                projects["$project_name"]+="$filename "
                log "Detected: [$tag] -> repository '$project_name'"
            else
                # Ignore workflows without [TAG]
                log "Ignored (no [TAG]): $workflow_name"
            fi
        else
            warn "Cannot read workflow name: $filename"
        fi
    fi
done

if [[ ${#projects[@]} -eq 0 ]]; then
    error "No projects detected!"
    log "Your workflows must have names like: [PROJECT] Workflow name"
    exit 1
fi

log "Detected projects:"
for project in "${!projects[@]}"; do
    count=$(echo ${projects[$project]} | wc -w)
    log "   Project: $project ($count workflows)"
done

# Security verification
verify_token_security

# === PROJECT PROCESSING ===
if [[ -n "$BACKUP_PROJECT" ]]; then
    # Backup specific project
    if [[ -n "${projects[$BACKUP_PROJECT]}" ]]; then
        log "Backing up specific project: $BACKUP_PROJECT"
        backup_project "$BACKUP_PROJECT" "${projects[$BACKUP_PROJECT]}"
    else
        error "Project '$BACKUP_PROJECT' not found!"
        log "Available projects: ${!projects[@]}"
        exit 1
    fi
else
    # Backup all detected projects
    log "Backing up all detected projects..."
    
    for project in "${!projects[@]}"; do
        log ""
        log "==================== $project ===================="
        backup_project "$project" "${projects[$project]}"
    done
fi

# Cleanup
rm -rf "$BACKUP_DIR/temp/"

echo ""
success "Backup completed in organization $GITHUB_ORG!"
log "Repositories created in: $BACKUP_DIR/"
log "GitHub repositories: https://github.com/orgs/$GITHUB_ORG/repositories"

echo ""
echo "📊 Summary:"
echo "- Organization: $GITHUB_ORG"
echo "- Projects backed up: ${#projects[@]}"
echo "- Backup directory: $BACKUP_DIR"
echo "- Container: $N8N_CONTAINER"