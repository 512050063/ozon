#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/ozon}"
GIT_REF="${GIT_REF:-main}"
BACKEND_ENV="${BACKEND_ENV:-$APP_DIR/backend/.env.production}"
PM2_BACKEND_NAME="${PM2_BACKEND_NAME:-ozon-backend}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
IMPORT_BASELINE="${IMPORT_BASELINE:-0}"
BASELINE_FILE="${BASELINE_FILE:-}"

log() {
  printf '[deploy] %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[deploy] missing command: %s\n' "$1" >&2
    exit 1
  fi
}

enable_build_toolchain() {
  if [ -f /opt/rh/devtoolset-10/enable ]; then
    # CentOS 7 default gcc is too old for native Node modules like bcrypt.
    # Prefer devtoolset-10 when available and fall back to devtoolset-8.
    # shellcheck disable=SC1091
    set +u
    . /opt/rh/devtoolset-10/enable
    set -u
    export LD_LIBRARY_PATH="/opt/rh/devtoolset-10/root/usr/lib/gcc/x86_64-redhat-linux/10:${LD_LIBRARY_PATH:-}"
    log "enabled build toolchain: devtoolset-10"
    return 0
  fi

  if [ -f /opt/rh/devtoolset-8/enable ]; then
    # shellcheck disable=SC1091
    set +u
    . /opt/rh/devtoolset-8/enable
    set -u
    export LD_LIBRARY_PATH="/opt/rh/devtoolset-8/root/usr/lib/gcc/x86_64-redhat-linux/8:${LD_LIBRARY_PATH:-}"
    log "enabled build toolchain: devtoolset-8"
    return 0
  fi

  log "no devtoolset found; using default compiler"
}

if [ ! -d "$APP_DIR/.git" ]; then
  printf '[deploy] %s is not a git checkout\n' "$APP_DIR" >&2
  exit 1
fi

require_cmd git
require_cmd node
require_cmd npm
require_cmd npx
require_cmd pm2

cd "$APP_DIR"

log "fetching GitHub refs"
git fetch --all --prune

log "checking out $GIT_REF"
git checkout "$GIT_REF"
git pull --ff-only origin "$GIT_REF" || true

if [ ! -f "$BACKEND_ENV" ]; then
  printf '[deploy] backend env file not found: %s\n' "$BACKEND_ENV" >&2
  printf '[deploy] create it from backend/.env.example before deploying\n' >&2
  exit 1
fi

# Load production runtime variables so build and PM2 restart inherit the same env.
set -a
. "$BACKEND_ENV"
set +a

enable_build_toolchain

log "installing backend dependencies"
cd "$APP_DIR/backend"
npm ci --include=dev

log "generating Prisma Client"
npx prisma generate --schema prisma/schema.prisma

log "syncing database schema"
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$BACKEND_ENV" | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')"
export DATABASE_URL
npx prisma db push --schema prisma/schema.prisma

log "building backend"
npm run build

if [ "$IMPORT_BASELINE" = "1" ]; then
  if [ -z "$BASELINE_FILE" ]; then
    BASELINE_FILE="$(ls -1t "$APP_DIR"/deploy/seed-bundles/baseline-*.json 2>/dev/null | head -n 1 || true)"
  fi
  if [ -n "$BASELINE_FILE" ] && [ -f "$BASELINE_FILE" ]; then
    log "importing baseline data from $BASELINE_FILE"
    BASELINE_FILE="$BASELINE_FILE" node -e "const fs=require('fs'); const { importBaselineBundle }=require('./dist/install/baselineDataService.js'); const bundle=JSON.parse(fs.readFileSync(process.env.BASELINE_FILE,'utf8')); importBaselineBundle(bundle).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exit(1)})"
  else
    log "baseline import requested but no baseline file was found"
  fi
fi

log "installing frontend dependencies"
cd "$APP_DIR/frontend"
npm ci --include=dev

log "building frontend"
npm run build

log "restarting backend with PM2"
cd "$APP_DIR/backend"
if pm2 describe "$PM2_BACKEND_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_BACKEND_NAME" --update-env
else
  NODE_ENV=production PORT="$BACKEND_PORT" pm2 start dist/entry.js --name "$PM2_BACKEND_NAME" --update-env
fi
pm2 save

log "deployment finished"
