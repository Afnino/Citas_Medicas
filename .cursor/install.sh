#!/usr/bin/env bash
# Bootstrap idempotente del entorno para el backend hexagonal (Node + TS + PostgreSQL).
set -euo pipefail

cd "$(dirname "$0")/.."

# 1) PostgreSQL: instalar solo si no esta presente.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

# 2) Dependencias de Node (lockfile) y compilacion de TypeScript.
npm ci
npm run build

# 3) Archivo .env local para desarrollo (no se sobreescribe si ya existe).
#    Son valores de desarrollo contra la base de datos local; no son secretos reales.
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' .env
  sed -i 's/^JWT_SECRET=.*/JWT_SECRET=dev-local-secret-change-me-please-123456/' .env
fi
