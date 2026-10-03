#!/usr/bin/env bash
# Arranque por-boot: levanta PostgreSQL y garantiza rol + base de datos.
# El esquema "citas", las tablas y los datos semilla los crea la propia app al iniciar.
set -euo pipefail

# Detectar la version de cluster instalada (p. ej. 16).
PG_VER="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1 || true)"
if [ -n "${PG_VER}" ]; then
  sudo pg_ctlcluster "${PG_VER}" main start || true
fi

# Esperar a que PostgreSQL acepte conexiones.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done

# Rol y base de datos (idempotente).
sudo -u postgres psql -tc "ALTER USER postgres PASSWORD 'postgres';" >/dev/null 2>&1 || true
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='citas_medicas'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE citas_medicas;" >/dev/null 2>&1 || true
