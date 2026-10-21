#!/usr/bin/env bash
# Boot the full dev environment: PostgreSQL (docker compose), the NestJS API
# (watch mode, `AUTH_MODE` from backend/.env) and the Astro dev server.
#
# The store is forced to DB_MODE=dev (local SQLite, where the owner's data
# lives) so a DATABASE_URL left in backend/.env cannot silently move the API
# onto an empty PostgreSQL. Override from the shell to try another store:
#
#   scripts/dev.sh              db + API + web app (default)
#   scripts/dev.sh --no-docker  skip the database; the API runs on SQLite
#   DB_MODE=dev-neon scripts/dev.sh   API against a Neon development branch
#
# Ctrl+C stops the API and the dev server; the database container keeps
# running (`restart: unless-stopped`, see backend/docker-compose.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
APP="$ROOT/personal-app"

USE_DOCKER=true
for arg in "$@"; do
  case "$arg" in
    --no-docker) USE_DOCKER=false ;;
    *) echo "unknown option: $arg (supported: --no-docker)" >&2; exit 1 ;;
  esac
done

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: '$1' is not installed (or not on PATH)" >&2
    exit 1
  fi
}
need pnpm

# This script is the local dev boot, so the store defaults to DB_MODE=dev
# (SQLite) no matter what backend/.env carries — dotenv never overrides the
# process environment, and an explicit shell DB_MODE wins over this default.
: "${DB_MODE:=dev}"
export DB_MODE

port_is_used() {
  # Bash built-in TCP probe: works for any listener (HTTP or PostgreSQL), no
  # `lsof` required.
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null || return 1
}

port_is_ready() {
  curl -sf --max-time 2 "$1" >/dev/null 2>&1
}

# --- backend/.env gate -------------------------------------------------------
# The file is the owner's (never committed, per backend/README.md) and main.ts
# loads it with dotenv. Without it the API boots into the default `better`
# mode and the dev-panel login has no account to sign in with.
if [[ ! -f "$BACKEND/.env" ]]; then
  echo "error: backend/.env is missing." >&2
  echo "" >&2
  echo "Create it with the block from the 'Modo de auth interino (dev)' section" >&2
  echo "of backend/README.md:" >&2
  echo "" >&2
  cat >&2 <<'ENVBLOCK'
# backend/.env
AUTH_MODE=dev
ADMIN_EMAIL=<tu-email>
ADMIN_PASSWORD=<password-fuerte>
DEV_SESSION_SECRET=<string-largo-aleatorio>
DEV_SESSION_TTL=604800

# Optional: run the API against PostgreSQL (docker compose). Without it the
# API falls back to SQLite, which also works for the dev panel.
DATABASE_URL=postgres://app:app@localhost:5432/personal_page
BETTER_AUTH_SECRET=replace-with-a-32-character-random-secret
BETTER_AUTH_URL=http://localhost:3000
ENVBLOCK
  echo "" >&2
  echo "Then run this script again." >&2
  exit 1
fi

# --- 1. database -------------------------------------------------------------
if [[ "$USE_DOCKER" == true ]]; then
  need docker
  if port_is_used 5432; then
    echo "==> port 5432 already listening (docker or local PostgreSQL)"
  else
    echo "==> starting PostgreSQL (docker compose -d db)"
    (cd "$BACKEND" && docker compose up -d db)
    # The container is healthy once its own healthcheck passes inside.
    for _ in $(seq 1 30); do
      if docker exec personal-page-db pg_isready -U app -d personal_page >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    if ! docker exec personal-page-db pg_isready -U app -d personal_page >/dev/null 2>&1; then
      echo "error: PostgreSQL did not become ready within 30s" >&2
      exit 1
    fi
    echo "    PostgreSQL ready"
  fi
fi

# --- dependencies ------------------------------------------------------------
if [[ ! -d "$BACKEND/node_modules" ]]; then
  echo "==> installing backend dependencies"
  (cd "$BACKEND" && pnpm install)
fi
if [[ ! -d "$APP/node_modules" ]]; then
  echo "==> installing personal-app dependencies"
  (cd "$APP" && pnpm install)
fi

# --- port guards -------------------------------------------------------------
# Astro 7 keeps a registry of its running dev servers in `.astro/dev.json`;
# a crashed instance can leave a stale entry behind and the next `astro dev`
# fails with "Another astro dev server is already running". Clear it only
# when its PID is provably dead, otherwise point to the live server.
if [[ -f "$APP/.astro/dev.json" ]]; then
  STALE_PID="$(sed -n 's/.*"pid": \([0-9][0-9]*\).*/\1/p' "$APP/.astro/dev.json" | head -1)"
  if [[ -n "$STALE_PID" ]] && ! kill -0 "$STALE_PID" 2>/dev/null; then
    echo "==> removing stale Astro dev server registry (dead pid $STALE_PID)"
    rm -f "$APP/.astro/dev.json" "$APP/.astro/dev.log"
  fi
fi
if port_is_used 3000; then
  echo "error: port 3000 is already in use (another API instance?)" >&2
  exit 1
fi
if port_is_used 4321; then
  echo "error: port 4321 is already in use (another dev server?)" >&2
  exit 1
fi

# --- 2. API (watch mode) -----------------------------------------------------
echo "==> starting backend API on http://localhost:3000"
(cd "$BACKEND" && pnpm start:dev) &
BACKEND_PID=$!

cleanup() {
  kill "${BACKEND_PID:-0}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 60); do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "error: the backend exited before becoming reachable — see its logs above" >&2
    exit 1
  fi
  port_is_ready "http://localhost:3000/session-mode" && break
  sleep 1
done
if ! port_is_ready "http://localhost:3000/session-mode"; then
  echo "error: the API did not answer /session-mode within 60s — see its logs above" >&2
  exit 1
fi

# --- 3. web app (foreground) -------------------------------------------------
echo "" >&2
MODE="$(curl -sf "http://localhost:3000/session-mode")"
echo "    API ready:  http://localhost:3000  (session-mode: $MODE)" >&2
echo "    App ready:  http://localhost:4321  (login at /admin/login/)" >&2
echo "    Ctrl+C stops both. PostgreSQL keeps running in docker." >&2
echo ""
echo "==> starting Astro dev server on http://localhost:4321"
(cd "$APP" && pnpm dev)
