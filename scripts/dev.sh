#!/usr/bin/env bash
# JESA OCP – Magasin Central MC01 : lance l'application en mode développement (prévisualisation).
#
#   ./scripts/dev.sh            prépare tout ce qui manque puis démarre API (4000) + Web (3000)
#   ./scripts/dev.sh --open     idem, et ouvre http://localhost:3000 dans le navigateur
#   ./scripts/dev.sh --reseed   réinitialise les données d'exemple avant de démarrer
#
# Étapes : prérequis → fichiers .env → dépendances → PostgreSQL → migrations → seed (1er lancement) → pnpm dev.
# PostgreSQL : utilise une instance déjà à l'écoute sur 5432, sinon `docker compose up -d`,
# sinon l'instance embarquée locale de .tooling/pg (si présente).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OPEN=0
RESEED=0
for arg in "$@"; do
  case "$arg" in
    --open) OPEN=1 ;;
    --reseed) RESEED=1 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Option inconnue : $arg (voir --help)" >&2; exit 1 ;;
  esac
done

green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
step() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }

# Un serveur Node écoute souvent en IPv6 seul (« *:3000 ») : une sonde 127.0.0.1 ne le voit pas.
# lsof voit les deux familles ; /dev/tcp (IPv4 puis IPv6) sert de repli là où lsof est absent.
port_open() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1 || (echo > "/dev/tcp/::1/$1") >/dev/null 2>&1
  fi
}

wait_port() { # port, timeout (s), label
  local i=0
  until port_open "$1"; do
    i=$((i + 1))
    if [ "$i" -ge "$2" ]; then red "$3 ne répond pas sur le port $1 après $2 s."; return 1; fi
    sleep 1
  done
}

# Termine un processus et toute sa descendance (watchers Nest, next-server…)
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}

EMBEDDED_PG_PID=""
DEV_PID=""
CLEANED=0
cleanup() {
  [ "$CLEANED" -eq 1 ] && return
  CLEANED=1
  if [ -n "$DEV_PID" ] && kill -0 "$DEV_PID" 2>/dev/null; then
    echo
    yellow "Arrêt de l'API et de l'application Web…"
    kill_tree "$DEV_PID"
    wait "$DEV_PID" 2>/dev/null || true
  fi
  if [ -n "$EMBEDDED_PG_PID" ] && kill -0 "$EMBEDDED_PG_PID" 2>/dev/null; then
    yellow "Arrêt de PostgreSQL embarqué…"
    kill "$EMBEDDED_PG_PID" 2>/dev/null || true
    wait "$EMBEDDED_PG_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM HUP

# ── 1. Prérequis ────────────────────────────────────────────────────────────────
step "Vérification des prérequis"
if ! command -v node >/dev/null 2>&1 && [ -x "$ROOT/.tooling/node/bin/node" ]; then
  export PATH="$ROOT/.tooling/node/bin:$PATH"
  yellow "Node.js système absent : utilisation de .tooling/node"
fi
if ! command -v node >/dev/null 2>&1; then
  red "Node.js ≥ 20 est requis : https://nodejs.org"; exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then red "Node.js ≥ 20 requis (version actuelle : $(node -v))."; exit 1; fi
if ! command -v pnpm >/dev/null 2>&1; then
  red "pnpm est requis : npm i -g pnpm  (ou : corepack enable)"; exit 1
fi
green "Node $(node -v) · pnpm $(pnpm -v)"

for p in 3000 4000; do
  if port_open "$p"; then red "Le port $p est déjà utilisé : arrêtez l'application qui l'occupe puis relancez."; exit 1; fi
done

# ── 2. Fichiers d'environnement ────────────────────────────────────────────────
step "Fichiers d'environnement"
if [ ! -f apps/api/.env ]; then cp apps/api/.env.example apps/api/.env; green "apps/api/.env créé depuis .env.example"; else echo "apps/api/.env présent"; fi
if [ ! -f apps/web/.env.local ]; then cp apps/web/.env.example apps/web/.env.local; green "apps/web/.env.local créé depuis .env.example"; else echo "apps/web/.env.local présent"; fi

# ── 3. Dépendances ─────────────────────────────────────────────────────────────
step "Dépendances"
if [ ! -d node_modules ] || [ ! -d apps/api/node_modules ] || [ ! -d apps/web/node_modules ]; then
  pnpm install
else
  echo "node_modules présents (pnpm install ignoré)"
fi

# ── 4. PostgreSQL ──────────────────────────────────────────────────────────────
step "Base de données PostgreSQL"
if port_open 5432; then
  echo "PostgreSQL déjà à l'écoute sur localhost:5432"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker compose up -d postgres
  wait_port 5432 60 "PostgreSQL (Docker)"
  # Le port s'ouvre avant que la base accepte les connexions : on attend le healthcheck.
  for _ in $(seq 1 30); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' mc01-postgres 2>/dev/null)" = "healthy" ] && break
    sleep 1
  done
  green "PostgreSQL démarré via docker compose"
elif [ -f .tooling/pg/start.mjs ]; then
  yellow "Docker indisponible : démarrage de PostgreSQL embarqué (.tooling/pg)"
  (cd .tooling/pg && exec node start.mjs) > .tooling/pg/pg.log 2>&1 &
  EMBEDDED_PG_PID=$!
  wait_port 5432 60 "PostgreSQL embarqué" || { red "Voir .tooling/pg/pg.log"; exit 1; }
  for _ in $(seq 1 30); do grep -q "PG READY" .tooling/pg/pg.log && break; sleep 1; done
  green "PostgreSQL embarqué démarré (arrêté automatiquement à la sortie)"
else
  red "Aucun PostgreSQL disponible sur localhost:5432."
  red "Installez et démarrez Docker Desktop (https://www.docker.com/products/docker-desktop), puis relancez ce script."
  exit 1
fi

# ── 5. Migrations ──────────────────────────────────────────────────────────────
step "Migrations Prisma"
pnpm --filter api prisma migrate deploy

# ── 6. Données d'exemple ───────────────────────────────────────────────────────
step "Données d'exemple"
SEEDED="$(cd apps/api && node -r dotenv/config -e '
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  p.settings.count().then((c) => console.log(c)).catch(() => console.log(0)).finally(() => p.$disconnect());
')"
if [ "$RESEED" -eq 1 ] || [ "$SEEDED" = "0" ]; then
  pnpm --filter api prisma db seed
else
  echo "Base déjà initialisée (utilisez --reseed pour réinitialiser les données)"
fi

# ── 7. Lancement ───────────────────────────────────────────────────────────────
step "Démarrage de l'API et de l'application Web"
cat <<EOF
  Application : http://localhost:3000
  API         : http://localhost:4000
  Swagger     : http://localhost:4000/api/docs
  (Ctrl+C pour tout arrêter)
EOF

if [ "$OPEN" -eq 1 ]; then
  (
    wait_port 3000 120 "Next.js" >/dev/null 2>&1 && wait_port 4000 120 "API" >/dev/null 2>&1 || exit 0
    if command -v open >/dev/null 2>&1; then open http://localhost:3000
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:3000
    fi
  ) &
fi

# En arrière-plan + wait : le trap peut ainsi arrêter toute l'arborescence de processus à la sortie.
pnpm dev &
DEV_PID=$!
wait "$DEV_PID"
