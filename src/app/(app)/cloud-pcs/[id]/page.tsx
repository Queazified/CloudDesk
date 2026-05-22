import { Role, SessionStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { AdminStatusPanel } from "@/components/admin-status-panel";
import { ConnectButton } from "@/components/connect-button";
import { SessionActionButton } from "@/components/session-action-button";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/authorization";
import { getCloudPcByIdForUser } from "@/lib/cloud-pcs";
import { getAppSettings } from "@/lib/settings";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default async function CloudPcDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, settings] = await Promise.all([params, requireUser(), getAppSettings()]);
  const cloudPc = await getCloudPcByIdForUser(id, user);

  if (!cloudPc) {
    notFound();
  }

  const activeSession = cloudPc.activeSession;
  const canEmbed =
    settings.remoteAccessMode === "EMBEDDED" &&
    activeSession &&
    (user.role === Role.ADMIN || activeSession.userId === user.id) &&
    cloudPc.status === "OCCUPIED";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{cloudPc.name}</h1>
                <StatusBadge status={cloudPc.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{cloudPc.description ?? "No description has been added for this cloud PC yet."}</p>
            </div>
            <ConnectButton cloudPcId={cloudPc.id} disabled={!cloudPc.connectability.allowed} disabledReason={cloudPc.connectability.reason} />
          </div>

          <dl className="mt-6 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-900">Current status</dt>
              <dd className="mt-1">{cloudPc.connectability.allowed ? "Ready to connect" : cloudPc.connectability.reason ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Last seen online</dt>
              <dd className="mt-1">{formatDateTime(cloudPc.lastSeenAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Group</dt>
              <dd className="mt-1">{cloudPc.groupName ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Remote access URL</dt>
              <dd className="mt-1 break-all">
                {user.role === Role.ADMIN ? cloudPc.remoteUrl : "Hidden for standard users"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Current session</dt>
              <dd className="mt-1">
                {activeSession
                  ? `${activeSession.user?.name ?? activeSession.user?.email ?? "A user"} since ${formatDateTime(activeSession.startedAt)}`
                  : "No active session"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Maintenance note</dt>
              <dd className="mt-1">{cloudPc.maintenanceNotes ?? "No maintenance note added."}</dd>
            </div>
          </dl>

          {activeSession && (user.role === Role.ADMIN || activeSession.userId === user.id) ? (
            <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <SessionActionButton endpoint={`/api/sessions/${activeSession.id}/end`} label="End session" />
              {user.role === Role.ADMIN && activeSession.userId !== user.id ? (
                <SessionActionButton endpoint={`/api/sessions/${activeSession.id}/force-end`} label="Force release" tone="danger" confirmMessage="Force end this session?" />
              ) : null}
              <a href={cloudPc.remoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                Open remote desktop
              </a>
            </div>
          ) : null}

          {canEmbed ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <div className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-200">Embedded remote desktop view</div>
              <iframe title={`${cloudPc.name} remote desktop`} src={cloudPc.remoteUrl} className="h-[540px] w-full border-0 bg-white" />
            </div>
          ) : null}
        </div>

        {user.role === Role.ADMIN ? (
          <AdminStatusPanel
            cloudPcId={cloudPc.id}
            currentStatus={cloudPc.status}
            maintenanceNotes={cloudPc.maintenanceNotes}
            isEnabled={cloudPc.isEnabled}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Past occupancy history</h2>
          <p className="mt-1 text-sm text-slate-500">Recent sessions for this cloud PC, including how they ended.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-3 pr-4 font-medium">User</th>
                <th className="py-3 pr-4 font-medium">Started</th>
                <th className="py-3 pr-4 font-medium">Ended</th>
                <th className="py-3 pr-4 font-medium">Duration</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">End reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cloudPc.sessions.map((session) => (
                <tr key={session.id}>
                  <td className="py-3 pr-4 text-slate-600">
                    {user.role === Role.ADMIN
                      ? session.user.name ?? session.user.email
                      : session.userId === user.id
                        ? "You"
                        : "Another user"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{formatDateTime(session.startedAt)}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDateTime(session.endedAt)}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDuration(session.durationSeconds)}</td>
                  <td className="py-3 pr-4 text-slate-600">{session.status === SessionStatus.ACTIVE ? "Active" : session.status}</td>
                  <td className="py-3 text-slate-600">{session.endReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
