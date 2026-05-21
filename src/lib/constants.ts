import { AccessPolicy, CloudPcStatus, Role, SessionStatus } from "@prisma/client";

export const APP_NAME = "MyCloudDesk";
export const APP_TAGLINE = "Access your Queazified cloud desktop";
export const APP_DESCRIPTION =
  "Live cloud PC availability, remote access, occupancy history, and admin controls for Queazified users.";
export const DEFAULT_ADMIN_EMAIL = "admin@queazified.co.uk";
export const DEFAULT_SUPPORT_EMAIL = "support@queazified.co.uk";

export const statusMeta: Record<
  CloudPcStatus,
  { label: string; shortLabel: string; tone: string; description: string }
> = {
  AVAILABLE: {
    label: "Online / Available",
    shortLabel: "Available",
    tone: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    description: "Ready to connect right now.",
  },
  OCCUPIED: {
    label: "Occupied",
    shortLabel: "Occupied",
    tone: "bg-amber-100 text-amber-800 ring-amber-200",
    description: "Currently being used by another session.",
  },
  OFFLINE: {
    label: "Offline",
    shortLabel: "Offline",
    tone: "bg-slate-200 text-slate-700 ring-slate-300",
    description: "Not reachable at the moment.",
  },
  MAINTENANCE: {
    label: "Maintenance",
    shortLabel: "Maintenance",
    tone: "bg-sky-100 text-sky-800 ring-sky-200",
    description: "Temporarily unavailable while maintenance is in progress.",
  },
  REPAIR: {
    label: "Repair",
    shortLabel: "Repair",
    tone: "bg-rose-100 text-rose-800 ring-rose-200",
    description: "Unavailable because of a known issue.",
  },
};

export const sessionStatusMeta: Record<SessionStatus, string> = {
  ACTIVE: "Active",
  ENDED: "Ended",
  FORCE_ENDED: "Force ended",
  ERROR: "Ended with an error",
};

export const accessPolicyMeta: Record<AccessPolicy, { label: string; helper: string }> = {
  ALL_USERS: {
    label: "All signed-in users",
    helper: "Standard users and admins can connect when the cloud PC is available.",
  },
  ADMINS_ONLY: {
    label: "Admins only",
    helper: "Only admins can start a session on this cloud PC.",
  },
};

export const roleLabels: Record<Role, string> = {
  USER: "Standard user",
  ADMIN: "Admin",
};

export const statusFilters = ["ALL", "AVAILABLE", "OCCUPIED", "OFFLINE", "MAINTENANCE", "REPAIR"] as const;

export const mockUsers = [
  {
    email: DEFAULT_ADMIN_EMAIL,
    label: "Sign in as admin",
    helper: "Full admin access including cloud PC management and audit logs.",
  },
  {
    email: "user@queazified.co.uk",
    label: "Sign in as standard user",
    helper: "Standard user access for connecting to available cloud PCs.",
  },
] as const;
