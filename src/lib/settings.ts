import { RemoteAccessMode, type AppSettings } from "@prisma/client";
import prisma from "@/lib/prisma";
import { APP_NAME, APP_TAGLINE, DEFAULT_ADMIN_EMAIL, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants";
import { parseCommaSeparatedList } from "@/lib/utils";

function buildDefaultSettings(): AppSettings {
  const now = new Date();

  return {
    id: "default",
    organisationName: "Queazified",
    portalTitle: APP_NAME,
    portalSubtitle: APP_TAGLINE,
    supportEmail: DEFAULT_SUPPORT_EMAIL,
    remoteAccessMode: RemoteAccessMode.NEW_TAB,
    sessionTimeoutMinutes: 480,
    brandingPrimaryColor: "#2563eb",
    adminRoleMappings: DEFAULT_ADMIN_EMAIL,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAppSettings() {
  if (!process.env.DATABASE_URL) {
    return buildDefaultSettings();
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: buildDefaultSettings(),
  });

  return settings;
}

export function getAdminEmails(settings: Pick<AppSettings, "adminRoleMappings">) {
  return [
    ...new Set(
      [
        ...parseCommaSeparatedList(settings.adminRoleMappings),
        ...parseCommaSeparatedList(process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAIL),
      ].filter(Boolean),
    ),
  ];
}
