# MyCloudDesk

MyCloudDesk is a cloud desktop access portal for Queazified users. Users sign in, see live cloud PC availability, and connect to an available desktop without booking, reservations, queues, or future scheduling.

## 1. Project overview

MyCloudDesk is designed for `myclouddesk.queazified.co.uk` and focuses on the simplest possible flow:

1. Sign in with SSO or mock login for development.
2. See live cloud PC availability immediately.
3. Connect to an available cloud PC.
4. Review relevant session history.

## 2. Features

- Microsoft Entra ID / Azure AD, Authentik, and generic OIDC support
- Mock login mode for local development
- Live dashboard with cloud PC counts and recent activity
- Searchable cloud PC list with clear status badges
- Cloud PC details page with remote access launch support
- Occupancy history with privacy-aware filtering
- Admin controls for cloud PC lifecycle management
- Audit logging for admin and session actions
- Docker Compose PostgreSQL setup
- Prisma schema and seed data
- GitHub Actions CI workflow

## 3. Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth.js
- Docker Compose

## 4. Repository structure

```text
.
├── prisma/
├── scripts/
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
├── .github/
├── docker-compose.yml
└── README.md
```

## 5. Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm

## 6. One-script install

Run this from the project root to install dependencies, start PostgreSQL, apply schema, generate Prisma client, and seed sample data:

```bash
bash scripts/install.sh
```

## 7. Clone and install manually

```bash
git clone https://github.com/Queazified/myclouddesk.git
cd myclouddesk
npm install
```

## 8. Environment variable setup

```bash
cp .env.example .env
```

Update values in `.env` before running the app.

If you open the dev app from another device on your LAN, add that host/IP to `ALLOWED_DEV_ORIGINS`.

## 9. PostgreSQL setup using Docker Compose

Use either command depending on your Docker setup:

```bash
docker compose up -d
```

or

```bash
docker-compose up -d
```

## 10. Prisma migrate instructions

For local development, the fastest setup is:

```bash
npm run db:push
npm run prisma:generate
```

If you prefer migration workflows, run:

```bash
npx prisma migrate dev
```

## 11. Seed database instructions

```bash
npm run db:seed
```

The seed creates:

- `admin@queazified.co.uk` — admin
- `user@queazified.co.uk` — standard user
- `QZ-CloudPC-01` to `QZ-CloudPC-05` with the requested statuses

## 12. Run the development server

```bash
npm run dev
```

Visit `http://localhost:3000`.

## 13. How to use mock login mode

Set `AUTH_ENABLE_MOCK=true` and keep the seeded users in the database. The login screen will show one-click buttons for the admin and standard user accounts.

## 14. How to configure Microsoft Entra ID SSO

Set these environment variables:

- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_TENANT_ID`

Set the redirect URI in Entra ID to:

```text
https://myclouddesk.queazified.co.uk/api/auth/callback/azure-ad
```

## 15. How to configure Authentik OIDC SSO

Set these environment variables:

- `AUTHENTIK_CLIENT_ID`
- `AUTHENTIK_CLIENT_SECRET`
- `AUTHENTIK_ISSUER`

Use this callback URL:

```text
https://myclouddesk.queazified.co.uk/api/auth/callback/authentik
```

## 16. How to add cloud PCs

Admins can add cloud PCs from the **Admin** page by entering a name, remote access URL, status, group, and access rule.

## 17. How to configure remote desktop URLs

Each cloud PC stores a `remoteUrl`. Point this at an existing service such as Apache Guacamole, Windows 365, a Dev Box portal, noVNC, or another trusted remote desktop entry point.

## 18. GitHub workflow explanation

The CI workflow installs dependencies, runs Prisma generate, type checking, linting, tests, and the production build on every push and pull request.

## 19. How to contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 20. Security notes

See [SECURITY.md](./SECURITY.md). Never commit `.env` files, and review remote access URLs carefully before deploying.

## 21. Deployment notes and checklist for `myclouddesk.queazified.co.uk`

- Use a managed PostgreSQL database.
- Set `NEXTAUTH_URL=https://myclouddesk.queazified.co.uk`.
- Use a strong production `NEXTAUTH_SECRET`.
- Terminate TLS before the app.
- Keep SSO secrets outside GitHub.
- Only expose trusted remote desktop URLs.
1. Provision PostgreSQL.
2. Set environment variables from `.env.example`.
3. Run `npm run prisma:generate` and apply the schema.
4. Seed only if you want sample data in a non-production environment.
5. Build with `npm run build` and run with `npm run start`.
