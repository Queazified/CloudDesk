#!/usr/bin/env bash
set -euo pipefail

print_step() {
  printf "\n==> %s\n" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but not installed."
    exit 1
  fi
}

print_step "Checking prerequisites"
require_command npm
require_command docker

print_step "Installing npm dependencies"
npm install

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  print_step "Creating .env from .env.example"
  cp .env.example .env
fi

print_step "Starting PostgreSQL with Docker Compose"
docker compose up -d

print_step "Waiting for PostgreSQL to become healthy"
max_attempts=30
attempt=1
until [ "$(docker inspect -f '{{.State.Health.Status}}' myclouddesk-postgres 2>/dev/null || true)" = "healthy" ]; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Error: PostgreSQL did not become healthy in time."
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

print_step "Applying database schema"
npm run db:push

print_step "Generating Prisma client"
npm run prisma:generate

print_step "Seeding database"
npm run db:seed

print_step "Setup complete"
echo "Run 'npm run dev' to start MyCloudDesk."
