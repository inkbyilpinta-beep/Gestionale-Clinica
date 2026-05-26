#!/bin/bash
# ============================================================
# SETUP AUTOMATICO SERVER HETZNER — Gestionale Clinica
# Ubuntu 24.04 LTS — Eseguire come root
# ============================================================
# Uso: bash setup-server.sh tuodominio.it tua@email.it
# ============================================================

set -e
DOMAIN=${1:-"tuodominio.it"}
EMAIL=${2:-"admin@tuodominio.it"}
APP_USER="clinica"
APP_DIR="/home/$APP_USER/gestionale"
DB_NAME="gestionale"
DB_USER="clinica_user"
DB_PASS=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 48)

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║    SETUP GESTIONALE CLINICA — HETZNER SERVER    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Dominio:  $DOMAIN"
echo "  Email:    $EMAIL"
echo "  App user: $APP_USER"
echo ""

# ── SISTEMA BASE ─────────────────────────────────────────
echo "▶ Aggiornamento sistema..."
apt update -qq && apt upgrade -y -qq
apt install -y -qq curl git ufw fail2ban nginx certbot python3-certbot-nginx

# ── FIREWALL ─────────────────────────────────────────────
echo "▶ Configurazione firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── FAIL2BAN ─────────────────────────────────────────────
systemctl enable fail2ban
systemctl start fail2ban

# ── NODE.JS 20 ───────────────────────────────────────────
echo "▶ Installazione Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y -qq nodejs
npm install -g pm2 serve nodemon

# ── POSTGRESQL 16 ────────────────────────────────────────
echo "▶ Installazione PostgreSQL 16..."
apt install -y -qq postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Crea database e utente
echo "▶ Configurazione database..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# ── UTENTE APP ───────────────────────────────────────────
echo "▶ Creazione utente applicazione..."
useradd -m -s /bin/bash $APP_USER || true
mkdir -p $APP_DIR
mkdir -p /backup
mkdir -p /var/log/gestionale
chown -R $APP_USER:$APP_USER $APP_DIR /backup /var/log/gestionale

# ── NGINX ────────────────────────────────────────────────
echo "▶ Configurazione Nginx..."
cat > /etc/nginx/sites-available/gestionale << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location / { return 301 https://\$server_name\$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=31536000" always;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /ws {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
    location /webhook/ { proxy_pass http://127.0.0.1:4000; }
    location ~ /\. { deny all; }
}
EOF

ln -sf /etc/nginx/sites-available/gestionale /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# ── SSL CERTBOT ──────────────────────────────────────────
echo "▶ Certificato SSL Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
systemctl reload nginx

# ── PM2 STARTUP ──────────────────────────────────────────
echo "▶ Configurazione PM2 avvio automatico..."
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER

# ── FILE .env ────────────────────────────────────────────
echo "▶ Creazione file .env..."
cat > $APP_DIR/backend/.env << EOF
PORT=4000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
CLINIC_NAME=Studio Dentistico Familiare
DOMAIN=https://$DOMAIN
EMAIL_FROM=noreply@$DOMAIN
EMAIL_ADMIN=
GENYA_API_URL=https://api.genya.it/v1
GENYA_API_KEY=DA_CONFIGURARE
TWILIO_ACCOUNT_SID=DA_CONFIGURARE
TWILIO_AUTH_TOKEN=DA_CONFIGURARE
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
BREVO_API_KEY=DA_CONFIGURARE
BACKUP_DIR=/backup
BACKUP_RETENTION_DAYS=30
EOF
chown $APP_USER:$APP_USER $APP_DIR/backend/.env
chmod 600 $APP_DIR/backend/.env

# ── RIEPILOGO ────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              SETUP COMPLETATO ✓                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  URL:           https://$DOMAIN"
echo "  DB name:       $DB_NAME"
echo "  DB user:       $DB_USER"
echo "  DB password:   $DB_PASS"
echo "  JWT secret:    (salvato in .env)"
echo ""
echo "  ⚠️  PROSSIMI PASSI MANUALI:"
echo "  1. Copia il codice in $APP_DIR"
echo "  2. cd $APP_DIR/backend && npm install"
echo "  3. psql -U $DB_USER -d $DB_NAME -f ../database/schema.sql"
echo "  4. cd $APP_DIR/frontend && npm install && npm run build"
echo "  5. cd $APP_DIR && pm2 start ecosystem.config.js"
echo "  6. pm2 save"
echo "  7. Configura GENYA_API_KEY, TWILIO, BREVO in .env"
echo ""
echo "  Logs: pm2 logs gestionale-backend"
echo ""
