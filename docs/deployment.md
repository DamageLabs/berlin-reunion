# Production Deployment — GCP VM + Nginx + Let's Encrypt

Deploy Berlin Reunion on a Google Cloud Compute Engine VM running Ubuntu, with Nginx as a reverse proxy and Let's Encrypt for TLS.

## Prerequisites

- A GCP account with a project and billing enabled
- A registered domain (e.g. `berlin-reunion.com`) with DNS access
- Your `.env` values ready (Resend API key, auth secret, etc.)

## 1. Create the GCP VM

```bash
gcloud compute instances create berlin-reunion \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

Open HTTP/HTTPS in the firewall (skip if these rules already exist):

```bash
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 --target-tags=http-server

gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 --target-tags=https-server
```

## 2. Point DNS to the VM

Get the VM's external IP:

```bash
gcloud compute instances describe berlin-reunion \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Create an **A record** in your DNS provider:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `<VM_EXTERNAL_IP>` |
| A | `www` | `<VM_EXTERNAL_IP>` |

Wait for DNS propagation (check with `dig berlin-reunion.com`).

## 3. SSH into the VM

```bash
gcloud compute ssh berlin-reunion --zone=us-central1-a
```

## 4. Install system dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Build tools for better-sqlite3 native addon
sudo apt install -y build-essential python3

# Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Verify
node -v    # v22.x
npm -v     # 10.x
nginx -v   # 1.x
```

## 5. Create the app user

```bash
sudo useradd -m -s /bin/bash berlin
sudo mkdir -p /var/www/berlin-reunion
sudo chown berlin:berlin /var/www/berlin-reunion
```

## 6. Deploy the application

Clone and build as the `berlin` user:

```bash
sudo -u berlin bash
cd /var/www/berlin-reunion

git clone https://github.com/DamageLabs/berlin-reunion.git .
npm ci

# Create the data directory for SQLite
mkdir -p data
```

Create the environment file:

```bash
cat > .env <<'EOF'
DATABASE_URL=file:./data/berlin-reunion.db
RESEND_API_KEY=re_your_production_key_here
NEXT_PUBLIC_APP_URL=https://berlin-reunion.com
BETTER_AUTH_SECRET=your-production-secret-here
EMAIL_FROM=Berlin Reunion <noreply@berlin-reunion.com>
EOF
chmod 600 .env
```

Generate a strong auth secret:

```bash
openssl rand -base64 32
```

Build and initialize the database:

```bash
npm run build
npx drizzle-kit push
```

Verify the app starts:

```bash
npm start
# Should listen on port 3050 — Ctrl+C to stop
```

Exit back to your sudo user:

```bash
exit
```

## 7. Create a systemd service

```bash
sudo tee /etc/systemd/system/berlin-reunion.service > /dev/null <<'EOF'
[Unit]
Description=Berlin Reunion Next.js App
After=network.target

[Service]
Type=simple
User=berlin
Group=berlin
WorkingDirectory=/var/www/berlin-reunion
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3050

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable berlin-reunion
sudo systemctl start berlin-reunion
sudo systemctl status berlin-reunion
```

Check logs if needed:

```bash
sudo journalctl -u berlin-reunion -f
```

## 8. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/berlin-reunion > /dev/null <<'EOF'
server {
    listen 80;
    server_name berlin-reunion.com www.berlin-reunion.com;

    location / {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # File upload support (profile photos)
        client_max_body_size 5M;
    }
}
EOF
```

Enable the site and test the config:

```bash
sudo ln -s /etc/nginx/sites-available/berlin-reunion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Verify HTTP is working: `curl -I http://berlin-reunion.com`

## 9. Enable HTTPS with Let's Encrypt

```bash
sudo certbot --nginx \
  -d berlin-reunion.com \
  -d www.berlin-reunion.com \
  --non-interactive \
  --agree-tos \
  -m your-email@example.com
```

Certbot will automatically:
- Obtain the certificate
- Modify the Nginx config to add SSL directives
- Set up HTTP → HTTPS redirect

Verify auto-renewal:

```bash
sudo certbot renew --dry-run
```

Certbot installs a systemd timer for automatic renewal. Confirm it's active:

```bash
sudo systemctl list-timers | grep certbot
```

## 10. Verify production

```bash
curl -I https://berlin-reunion.com
```

You should see `HTTP/2 200` with proper headers.

## Ongoing Operations

### Deploying updates

```bash
sudo -u berlin bash
cd /var/www/berlin-reunion
git pull origin main
npm ci
npx drizzle-kit push    # apply any new migrations
npm run build
exit

sudo systemctl restart berlin-reunion
```

### Backup the database

```bash
# SQLite safe backup (handles WAL mode correctly)
sudo -u berlin sqlite3 /var/www/berlin-reunion/data/berlin-reunion.db ".backup /var/www/berlin-reunion/data/backup-$(date +%Y%m%d).db"
```

Consider a cron job for daily backups:

```bash
sudo tee /etc/cron.daily/berlin-reunion-backup > /dev/null <<'EOF'
#!/bin/bash
sudo -u berlin sqlite3 /var/www/berlin-reunion/data/berlin-reunion.db \
  ".backup /var/www/berlin-reunion/data/backup-$(date +\%Y\%m\%d).db"
# Keep last 14 days
find /var/www/berlin-reunion/data -name "backup-*.db" -mtime +14 -delete
EOF
sudo chmod +x /etc/cron.daily/berlin-reunion-backup
```

### Viewing logs

```bash
# App logs
sudo journalctl -u berlin-reunion -f

# Nginx access/error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restarting services

```bash
sudo systemctl restart berlin-reunion    # app
sudo systemctl reload nginx              # nginx (no downtime)
```

## Security Hardening Checklist

- [ ] `BETTER_AUTH_SECRET` is a unique random value (not the dev default)
- [ ] `.env` file is `chmod 600` and owned by the `berlin` user
- [ ] SSH key-only auth (disable password auth in `/etc/ssh/sshd_config`)
- [ ] `ufw` enabled: `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`
- [ ] Unattended security updates: `sudo apt install unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades`
- [ ] Upload directory (`public/uploads/`) is not world-writable
- [ ] SQLite database file is not accessible via the web (Next.js serves from `public/` only, so `data/` is safe by default)
