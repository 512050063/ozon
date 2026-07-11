# CentOS GitHub Deployment Guide

## 1. Code Sync Rule

Use GitHub as the only code source:

```text
local development -> git commit -> git push GitHub -> CentOS git pull -> build/restart
```

Do not edit application code directly on the server. Server-only files are environment files, logs, uploaded files, browser profiles, cookies, and database data.

## 2. First-Time GitHub Setup

Create a private GitHub repository, then run locally:

```bash
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
git branch -M main
git push -u origin main
```

For deployment versions:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 3. Prepare CentOS Host

Install system dependencies:

```bash
sudo bash /opt/ozon/deploy/centos/install-system-deps.sh
```

Install Node.js, MySQL, Nginx, PM2, Python 3, and Playwright/Chromium. The helper script covers the common packages, but verify these commands exist:

```bash
node -v
npm -v
mysql --version
nginx -v
pm2 -v
python3 --version
```

Clone the repository:

```bash
sudo mkdir -p /opt/ozon
sudo chown -R "$USER":"$USER" /opt/ozon
git clone git@github.com:YOUR_ORG/YOUR_REPO.git /opt/ozon
```

## 4. Server Environment

Create `/opt/ozon/backend/.env.production` from `backend/.env.example`:

```bash
cat >/opt/ozon/backend/.env.production <<'EOF'
DATABASE_URL="mysql://ozon_user:change_me@127.0.0.1:3306/ozon_crawler_db?charset=utf8mb4"
JWT_SECRET="replace-with-a-long-random-secret"
NODE_ENV="production"
PORT=3000
CORS_ORIGIN="https://your-domain.com"
CHROME_PATH="/usr/bin/google-chrome"
PYTHON_PATH="/opt/ozon-python/bin/python"
PLAYWRIGHT_NODEJS_PATH="/usr/local/node-v20.20.2-linux-x64-glibc-217/bin/node"
EOF
```

If the server's default Node.js cannot run Playwright on CentOS 7, point `PLAYWRIGHT_NODEJS_PATH` to a glibc-compatible Node 20 binary as above.

Create `/opt/ozon/frontend/.env.production` if the API URL differs from the default:

```bash
cat >/opt/ozon/frontend/.env.production <<'EOF'
VITE_API_BASE_URL=https://your-domain.com/api
VITE_APP_TITLE="Ozon跨境电商工具"
VITE_ENABLE_DEVELOPER_MODE=false
VITE_API_TIMEOUT=10000
EOF
```

Never commit `.env`, `.env.production`, cookies, API keys, or database passwords.

## 5. Database

Create the database and user manually, or use the app installer:

```sql
CREATE DATABASE IF NOT EXISTS ozon_crawler_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ozon_user'@'127.0.0.1' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON ozon_crawler_db.* TO 'ozon_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Schema changes are applied by:

```bash
cd /opt/ozon/backend
npx prisma db push --schema prisma/schema.prisma
```

## 6. Baseline Data

Slow-changing baseline tables may be exported locally and imported on the server:

- `ozon_categories`
- `ozon_category_attributes`
- `ozon_attribute_values`
- `ozon_product_templates`
- `ozon_error_codes`
- `translation_cache`

Export locally:

```bash
cd backend
node scripts/exportBaselineBundle.mjs --output ../deploy/seed-bundles/baseline-$(date +%F).json
```

Commit the baseline bundle only if it contains no private store/user/order data. Otherwise upload it to the server manually and keep it outside Git.

Never baseline-import these runtime/private tables:

- users
- roles modified for a specific customer
- stores and API configs
- tokens and SMS credentials
- products, orders, finance records
- Ozon cookies and browser profiles

## 7. Deploy

Run on CentOS:

```bash
cd /opt/ozon
chmod +x deploy/centos/deploy.sh
GIT_REF=main APP_DIR=/opt/ozon deploy/centos/deploy.sh
```

Import a baseline bundle during deployment:

```bash
IMPORT_BASELINE=1 BASELINE_FILE=/opt/ozon/deploy/seed-bundles/baseline-2026-07-10.json deploy/centos/deploy.sh
```

Deploy a tagged version:

```bash
GIT_REF=v1.0.0 deploy/centos/deploy.sh
```

## 8. Nginx

```bash
sudo cp /opt/ozon/deploy/nginx/ozon.conf.example /etc/nginx/conf.d/ozon.conf
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name`, SSL certificate paths, and proxy target before public use.

## 9. Installer

Open:

```text
https://your-domain.com/install
```

Steps:

1. Run environment checks.
2. Configure MySQL database.
3. Create schema.
4. Optionally import a baseline data bundle.
5. Create the first admin user.
6. Finalize and lock installation.

After finalization, `backend/data/install.lock` prevents mutating installer actions.

## 10. Ozon Browser Scripts

Git tracks Python scripts only. It does not track cookies or Chrome profiles.

Server requirements:

```bash
pip3 install playwright
python3 -m playwright install chromium
```

Set `CHROME_PATH` in `.env.production` if Chrome is installed outside `/usr/bin/google-chrome`.

## 11. Rollback

Use Git tags for rollback:

```bash
cd /opt/ozon
GIT_REF=v1.0.0 deploy/centos/deploy.sh
```

Database rollback is separate. Take MySQL backups before schema changes:

```bash
mysqldump -u ozon_user -p ozon_crawler_db > ozon_crawler_db_$(date +%F_%H%M).sql
```

## 12. Local Development Workflow

Before pushing:

```bash
cd backend && npm run build && npm test
cd ../frontend && npm run lint:check && npm run build
cd ..
node scripts/audit-deploy-package.mjs
```

Then:

```bash
git add .
git commit -m "your change summary"
git push
```
