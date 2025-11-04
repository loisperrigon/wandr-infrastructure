#!/bin/bash
# ===========================================
# Setup Cron Job for Daily Backups
# ===========================================
# This script sets up a daily cron job at 3 AM
# ===========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Setting up daily backup cron job${NC}"
echo -e "${GREEN}============================================${NC}"

# Make backup script executable
chmod +x /root/wandr-infrastructure/scripts/backup-daily.sh
chmod +x /root/wandr-infrastructure/scripts/restore-backup.sh

echo -e "${YELLOW}Making backup scripts executable...${NC}"
echo -e "${GREEN}✓ Scripts are now executable${NC}"

# Add cron job (runs daily at 3 AM)
CRON_JOB="0 3 * * * /root/wandr-infrastructure/scripts/backup-daily.sh >> /var/log/wandr-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-daily.sh"; then
    echo -e "${YELLOW}⚠ Cron job already exists${NC}"
else
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✓ Cron job added successfully${NC}"
fi

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Cron job setup completed!${NC}"
echo -e "${GREEN}Backups will run daily at 3:00 AM${NC}"
echo -e "${GREEN}Logs: /var/log/wandr-backup.log${NC}"
echo -e "${GREEN}============================================${NC}"

# Show current crontab
echo -e "\n${YELLOW}Current cron jobs:${NC}"
crontab -l

echo -e "\n${YELLOW}To manually test the backup, run:${NC}"
echo -e "  /root/wandr-infrastructure/scripts/backup-daily.sh"

echo -e "\n${YELLOW}To restore from a backup, run:${NC}"
echo -e "  /root/wandr-infrastructure/scripts/restore-backup.sh [backup_date]"
