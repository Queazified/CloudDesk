import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import AuthentikProvider from "next-auth/providers/authentik";
import CredentialsProvider from "next-auth/providers/credentials";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAppSettings, getAdminEmails } from "@/lib/settings";

function normalizeIssuerUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function getOauthHttpTimeoutMs() {
  const raw = Number(process.env.OAUTH_HTTP_TIMEOUT_MS ?? "10000");
  if (!Number.isFinite(raw) || raw < 1000) {
    return 10000;
  }
  return Math.floor(raw);
}

async function syncUserRecord({
  email,
  name,
  provider,
  providerAccountId,
}: {
  email: string;
  name?: string | null;
  provider?: string;
  providerAccountId?: string;
}) {
  const settings = await getAppSettings();
  const adminEmails = getAdminEmails(settings);
  const normalizedEmail = email.toLowerCase();
  const role = adminEmails.includes(normalizedEmail) ? Role.ADMIN : Role.USER;

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: name?.trim() || normalizedEmail,
      role,
      provider: provider ?? undefined,
      providerAccountId: providerAccountId ?? undefined,
    },
    create: {
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail,
      role,
      provider: provider ?? undefined,
      providerAccountId: providerAccountId ?? undefined,
    },
  });
}

function buildGenericOidcProvider() {
  const clientId = process.env.GENERIC_OIDC_CLIENT_ID;
  const clientSecret = process.env.GENERIC_OIDC_CLIENT_SECRET;
  const issuer = process.env.GENERIC_OIDC_ISSUER;

  if (!clientId || !clientSecret || !issuer) {
    return null;
  }

  const normalizedIssuer = normalizeIssuerUrl(issuer);

  return {
    id: "generic-oidc",
    name: process.env.GENERIC_OIDC_NAME ?? "Generic OIDC",
    type: "oauth",
    wellKnown: `${normalizedIssuer}/.well-known/openid-configuration`,
    clientId,
    clientSecret,
    idToken: true,
    checks: ["pkce", "state"],
    httpOptions: {
      timeout: getOauthHttpTimeoutMs(),
    },
    profile(profile: Record<string, unknown>) {
      return {
        id: String(profile.sub ?? profile.email ?? crypto.randomUUID()),
        name: String(profile.name ?? profile.preferred_username ?? profile.email ?? "OIDC User"),
        email: String(profile.email ?? ""),
        role: Role.USER,
      };
    },
  } satisfies OAuthConfig<Record<string, unknown>>;
}

export function getLoginProviders() {
  return [
    process.env.AUTH_ENABLE_MOCK === "true"
      ? { id: "credentials", name: "Mock login", kind: "mock" as const }
      : null,
    process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
      ? { id: "azure-ad", name: "Microsoft Entra ID", kind: "sso" as const }
      : null,
    process.env.AUTHENTIK_CLIENT_ID && process.env.AUTHENTIK_CLIENT_SECRET && process.env.AUTHENTIK_ISSUER
      ? { id: "authentik", name: "Authentik", kind: "sso" as const }
      : null,
    process.env.GENERIC_OIDC_CLIENT_ID && process.env.GENERIC_OIDC_CLIENT_SECRET && process.env.GENERIC_OIDC_ISSUER
      ? { id: "generic-oidc", name: process.env.GENERIC_OIDC_NAME ?? "Generic OIDC", kind: "sso" as const }
      : null,
  ].filter(
    (provider): provider is { id: string; name: string; kind: "mock" | "sso" } => provider !== null,
  );
}

const providers = [];

if (process.env.AUTH_ENABLE_MOCK === "true") {
  providers.push(
    CredentialsProvider({
      name: "Mock login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();

        if (!email) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          provider: user.provider,
        };
      },
    }),
  );
}

if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  );
}

if (process.env.AUTHENTIK_CLIENT_ID && process.env.AUTHENTIK_CLIENT_SECRET && process.env.AUTHENTIK_ISSUER) {
  const authentikIssuer = normalizeIssuerUrl(process.env.AUTHENTIK_ISSUER);

  providers.push(
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      issuer: authentikIssuer,
      wellKnown: `${authentikIssuer}/.well-known/openid-configuration`,
      httpOptions: {
        timeout: getOauthHttpTimeoutMs(),
      },
    }),
  );
}

const genericOidcProvider = buildGenericOidcProvider();
if (genericOidcProvider) {
  providers.push(genericOidcProvider);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.email) {
        const dbUser = await syncUserRecord({
          email: user.email,
          name: user.name,
          provider: account?.provider ?? ("provider" in user ? user.provider ?? undefined : undefined),
          providerAccountId: account?.providerAccountId,
        });

        token.sub = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.name;
        token.role = dbUser.role;
        token.provider = dbUser.provider ?? account?.provider ?? null;
        return token;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
        });

        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.provider = dbUser.provider;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.role = (token.role as Role | undefined) ?? Role.USER;
        session.user.provider = (token.provider as string | null | undefined) ?? null;
      }

      return session;
    },
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      await syncUserRecord({
        email: user.email,
        name: user.name,
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
      });

      return true;
    },
  },
};

export async function getCurrentSession() {
  return getServerSession(authOptions);
}
