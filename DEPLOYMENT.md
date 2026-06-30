# Production Deployment Guide

## Prerequisites

- Docker + Docker Compose v2
- A domain name with DNS pointing to your server
- SSL certificate (Let's Encrypt recommended)
- At least one AI provider API key

---

## 1. Clone and configure

```bash
git clone <repo-url> andplanning-ai-os
cd andplanning-ai-os
```

### Backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=sqlite+aiosqlite:///./data/aios.db
ALLOWED_ORIGINS=https://your-domain.com

# AI providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...

# Security — MUST be changed before going live
JWT_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">

# Optional: Ollama (local LLM)
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 2. SSL certificates

Place your certificates in `backend/ssl/`:

```
backend/ssl/cert.pem   # full chain certificate
backend/ssl/key.pem    # private key
```

With Let's Encrypt (certbot):

```bash
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem backend/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem   backend/ssl/key.pem
```

---

## 3. Update docker-compose.yml

In `backend/docker-compose.yml`, update the frontend build arg and env:

```yaml
frontend:
  build:
    args:
      NEXT_PUBLIC_API_BASE_URL: "https://your-domain.com"
  environment:
    NEXT_PUBLIC_API_BASE_URL: "https://your-domain.com"
```

Uncomment the `nginx` service block.

---

## 4. Update nginx.conf

In `nginx.conf` at the project root, replace `your-domain.com` with your actual domain.

---

## 5. Build and start

```bash
cd backend
docker compose build
docker compose up -d
```

Check logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

---

## 6. First-time setup

The first user to register becomes admin automatically.

Open `https://your-domain.com/login`, register your admin account, then sign in.

---

## 7. Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Backend liveness (used by Docker healthcheck) |
| `GET /api/health/providers` | AI provider connectivity status |

```bash
curl https://your-domain.com/health
curl https://your-domain.com/api/health/providers
```

---

## 8. Database backup

The SQLite database is at `backend/data/aios.db`. Back it up regularly:

```bash
# Backup
cp backend/data/aios.db backend/data/aios.db.$(date +%Y%m%d)

# Or from Docker volume
docker compose exec backend sqlite3 /app/data/aios.db ".backup /app/data/aios.db.bak"
```

---

## 9. Updating

```bash
git pull
docker compose build
docker compose up -d --no-deps backend frontend
```

---

## 10. Ollama (local LLM, optional)

Install Ollama on the host:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve  # runs on port 11434
```

Set in `.env`:

```
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

Then select `ollama/llama3.2` as the model in Settings.

---

## Security checklist before going live

- [ ] `JWT_SECRET_KEY` is a long random string (not the example value)
- [ ] `ALLOWED_ORIGINS` is set to your production domain only
- [ ] SSL certificate is valid and HTTPS enforced in nginx.conf
- [ ] Default ports (8000, 3000) are NOT exposed externally (nginx handles routing)
- [ ] Database file (`data/aios.db`) is not web-accessible
- [ ] First admin account is registered and verified
