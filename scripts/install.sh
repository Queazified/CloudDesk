#!/usr/bin/env bash
set -euo pipefail

# Print a consistently formatted installer step header.
# Arguments:
#   $1 - Human-readable step message.
print_step() {
  printf "\n==> %s\n" "$1"
}

# Ensure a required command is available on PATH.
# Arguments:
#   $1 - Command name to check.
# Exits:
#   1 when the command is missing.
require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but not installed."
    exit 1
  fi
}

# Resolve which Docker Compose command style is available.
# Returns:
#   Prints 'docker compose', 'docker-compose', or an empty string if unavailable.
build_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi

  echo ""
}

# Generate a random NEXTAUTH_SECRET value.
# Returns:
#   Base64 secret via stdout, or an empty string if generators are unavailable.
generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
    return
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))"
    return
  fi

  echo ""
}

print_step "Checking prerequisites"
require_command npm
require_command docker

COMPOSE_CMD="$(build_compose_cmd)"
if [ -z "$COMPOSE_CMD" ]; then
  echo "Error: Docker Compose is required but was not found."
  echo "Install Docker Compose plugin (recommended) or docker-compose binary, then rerun this script."
  exit 1
fi

print_step "Installing npm dependencies"
npm install

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  print_step "Creating .env from .env.example"
  cp .env.example .env
fi

if [ -f ".env" ] && grep -q '^NEXTAUTH_SECRET=replace-with-a-long-random-secret$' .env; then
  print_step "Generating NEXTAUTH_SECRET"
  generated_secret="$(generate_secret)"

  if [ -n "$generated_secret" ]; then
    sed -i "s|^NEXTAUTH_SECRET=replace-with-a-long-random-secret$|NEXTAUTH_SECRET=${generated_secret}|" .env
  else
    echo "Warning: Could not auto-generate NEXTAUTH_SECRET (openssl/node unavailable)."
    echo "Please set NEXTAUTH_SECRET manually in .env before production use."
  fi
fi

print_step "Starting PostgreSQL with Docker Compose"
# shellcheck disable=SC2086
$COMPOSE_CMD up -d

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
echo "MyCloudDesk is ready."
echo "Mock login is enabled by default via AUTH_ENABLE_MOCK=true in .env."
echo "Run 'npm run dev' to start MyCloudDesk."
echo "Seeded users: admin@queazified.co.uk and user@queazified.co.uk"
