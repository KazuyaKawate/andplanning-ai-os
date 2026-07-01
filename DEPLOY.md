# AIOS Production Deployment Guide — `ap-aios.com`

This guide explains how to deploy the unified FastAPI (Backend) and Next.js (Frontend) AIOS application on your production server under the domain **`ap-aios.com`** using Docker Compose.

---

## Prerequisites & Server Requirements

- **Server Specifications**: Ubuntu 22.04 LTS or 24.04 LTS with at least **2 Cores** and **4GB RAM** (essential for compiling Next.js production bundles during Docker build).
- **Core Software**: Docker (v24.0+) & Docker Compose v2.
- **Port Access**: Open TCP Ports `80` (HTTP) and `443` (HTTPS) on your firewall.

---

## Step 1: DNS Setup

Map your domain `ap-aios.com` to your server's public IP address in your DNS registrar:
- **A Record** | `@` | `YOUR_SERVER_IP`
- **A Record** | `www` | `YOUR_SERVER_IP`

---

## Step 2: Obtain SSL Certificates (Let's Encrypt)

Run Certbot's standalone client on the host machine **before** starting Nginx to avoid port conflicts:

```bash
# 1. Update system and install Certbot
sudo apt update && sudo apt install -y certbot

# 2. Issue certs (ensure port 80 is not bound by any other process)
sudo certbot certonly --standalone -d ap-aios.com -d www.ap-aios.com
```

This places your active certificates at:
- Cert: `/etc/letsencrypt/live/ap-aios.com/fullchain.pem`
- Key:  `/etc/letsencrypt/live/ap-aios.com/privkey.pem`

---

## Step 3: Clone Code & Structure Directories

Clone the repository and prepare the SSL and persistent directories:

```bash
cd /root
git clone https://github.com/KazuyaKawate/andplanning-ai-os.git
cd andplanning-ai-os

# 1. Create SQLite database data directories
mkdir -p backend/data

# 2. Create SSL directory and link active Let's Encrypt certificates
mkdir -p ssl
ln -sf /etc/letsencrypt/live/ap-aios.com/fullchain.pem ssl/cert.pem
ln -sf /etc/letsencrypt/live/ap-aios.com/privkey.pem  ssl/key.pem
```

---

## Step 4: Configure Production Environment Variables

Copy the template and generate secure keys:

```bash
cp .env.production.example backend/.env
chmod 600 backend/.env
```

Open `backend/.env` with your editor (`nano backend/.env`) and update:
1. **`JWT_SECRET_KEY`**: Generate via `python3 -c "import secrets; print(secrets.token_hex(32))"`
2. **`API_SECRET_KEY`**: Generate another 64-char hex key.
3. **`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`**: Fill in your production tokens.

---

## Step 5: Build & Launch with Docker Compose

Compile the Next.js bundle and start all daemon containers in a single command:

```bash
# Build (next.js public API URL is baked in at build-time)
docker compose build --build-arg NEXT_PUBLIC_API_BASE_URL="https://ap-aios.com"

# Start the services
docker compose up -d
```

Verify that all three services are running cleanly:
```bash
docker compose ps
```

---

## Step 6: Automate SSL Renewals

Let's Encrypt certificates expire every 90 days. Set up a simple root cron job to automatically renew and reload Nginx:

```bash
sudo crontab -e
```

Add the following line to the crontab:
```text
0 3 * * * certbot renew --post-hook "docker compose restart nginx" > /dev/null 2>&1
```

---

## Troubleshooting & Debugging

- **Access Container Logs**:
  ```bash
  docker compose logs -f backend
  docker compose logs -f frontend
  docker compose logs -f nginx
  ```
- **Database Backups**:
  Since the SQLite DB is stored inside `backend/data/aios.db`, you can back it up safely on the host without halting the containers:
  ```bash
  sqlite3 backend/data/aios.db ".backup 'backups/aios_backup_\$(date +%Y%m%d).db'"
  ```
