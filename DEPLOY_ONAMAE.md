# AIOS Deployment Guide for Onamae.com (お名前.com レンタルサーバー)

This guide provides instructions for deploying the AIOS Frontend (Next.js) to the Onamae.com Rental Server using the existing domain `ap-aios.com`.

## Overview
Because the AIOS dashboard uses dynamic routes (`/os/factories/[id]`, etc.), it cannot be exported as a pure static HTML site (`output: export`). It must run as a Node.js process.

**Deployment Strategy:**
We will use Next.js's **Standalone Output**. This creates a highly optimized, self-contained Node.js server that includes only the necessary files. We will then configure the Onamae.com server to route traffic from `ap-aios.com` to this local Node.js process.

---

## 1. Domain & DNS Preparation
1. Log in to the Onamae.com Control Panel.
2. Ensure the domain `ap-aios.com` is added to your server account.
3. Configure the DNS records for `ap-aios.com` to point to the IP address of your rental server.

## 2. Build Process (Local Machine)
Run the following commands on your local machine to build the production assets:

```bash
cd website
npm ci
npm run build
```

This generates a `.next/standalone` directory, which is a self-contained Node.js server, and a `.next/static` directory containing static assets.

## 3. Uploading Files to the Server
You will need to use SSH or SFTP to upload the application.

1. Create a directory outside of your public document root (e.g., `~/aios-frontend`).
2. Upload the contents of `website/.next/standalone/` into `~/aios-frontend`.
3. Upload the `website/.next/static/` folder into `~/aios-frontend/.next/static/`.
4. Upload the `website/public/` folder into `~/aios-frontend/public/`.
5. Upload the `.env.production` file (with your API URLs and keys) to `~/aios-frontend/.env`.

**Directory Structure on Server:**
```text
~/aios-frontend/
├── .env
├── .next/
│   └── static/
├── public/
├── server.js
└── node_modules/
```

## 4. Starting the Server (SSH)
Connect to your Onamae.com server via SSH and start the Node.js application.

```bash
cd ~/aios-frontend
# Start the server on a specific internal port (e.g., 3000)
PORT=3000 node server.js
```

*Note: For a persistent background process, use a process manager like `pm2`.*
```bash
npm install -g pm2
pm2 start server.js --name "aios-frontend" --env PORT=3000
pm2 save
```

## 5. Web Server / Proxy Configuration
Onamae.com uses Apache. You need to route requests from `ap-aios.com` (port 80/443) to your internal Node.js process (port 3000).

In the Document Root for `ap-aios.com` (e.g., `~/public_html/ap-aios.com/`), create or edit the `.htaccess` file:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

*(Ensure that the `mod_proxy` module is enabled on your server for this to work. If Onamae.com's shared plan does not support `mod_proxy`, you will need to host the frontend on a VPS such as ConoHa or Vercel, and only point the DNS A/CNAME records from Onamae.com.)*

## 6. Verification
Open `https://ap-aios.com` in your browser. You should see the public AIOS landing page. Navigate to `/login` to access the OS dashboard.