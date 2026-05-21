"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccessPolicy, CloudPcStatus } from "@prisma/client";
import { SessionActionButton } from "@/components/session-action-button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";

type CloudPcRecord = {
  id: string;
  name: string;
  description: string | null;
  status: CloudPcStatus;
  remoteUrl: string;
  lastSeenAt: string | null;
  groupName: string | null;
  isEnabled: boolean;
  maintenanceNotes: string | null;
  accessPolicy: AccessPolicy;
  sessions: Array<{
    id: string;
    startedAt: string;
    status: string;
    user: { name: string | null; email: string | null };
  }>;
};

type ActiveSessionRecord = {
  id: string;
  startedAt: string;
  cloudPc: { id: string; name: string };
  user: { name: string | null; email: string | null };
};

type AuditRecord = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  actorUser: { name: string | null; email: string | null } | null;
};

const defaultForm: {
  name: string;
  description: string;
  remoteUrl: string;
  status: CloudPcStatus;
  groupName: string;
  isEnabled: boolean;
  maintenanceNotes: string;
  accessPolicy: AccessPolicy;
} = {
  name: "",
  description: "",
  remoteUrl: "",
  status: CloudPcStatus.AVAILABLE,
  groupName: "",
  isEnabled: true,
  maintenanceNotes: "",
  accessPolicy: AccessPolicy.ALL_USERS,
};

export function AdminConsole({
  cloudPcs,
  activeSessions,
  auditLogs,
}: {
  cloudPcs: CloudPcRecord[];
  activeSessions: ActiveSessionRecord[];
  auditLogs: AuditRecord[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(defaultForm);

  async function submitRequest(url: string, method: string, body: Record<string, unknown>, successMessage: string) {
    setMessage(null);
    setBusyId(url);

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The request could not be completed.");
      }

      setMessage(successMessage);
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be completed.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {message ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold">Add a cloud PC</h2>
          <p className="mt-1 text-sm text-slate-500">Create a new desktop entry with a remote access URL and an access rule.</p>
          <form
            className="mt-5 grid gap-4 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const success = await submitRequest("/api/cloud-pcs", "POST", createForm, `${createForm.name} was added.`);
              if (success) {
                setCreateForm(defaultForm);
              }
            }}
          >
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Name</span>
              <input value={createForm.name} onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Group</span>
              <input value={createForm.groupName} onChange={(event) => setCreateForm((form) => ({ ...form, groupName: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Description</span>
              <textarea value={createForm.description} onChange={(event) => setCreateForm((form) => ({ ...form, description: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Remote access URL</span>
              <input value={createForm.remoteUrl} onChange={(event) => setCreateForm((form) => ({ ...form, remoteUrl: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Status</span>
              <select value={createForm.status} onChange={(event) => setCreateForm((form) => ({ ...form, status: event.target.value as CloudPcStatus }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                {Object.values(CloudPcStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Access rule</span>
              <select value={createForm.accessPolicy} onChange={(event) => setCreateForm((form) => ({ ...form, accessPolicy: event.target.value as AccessPolicy }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                <option value={AccessPolicy.ALL_USERS}>All signed-in users</option>
                <option value={AccessPolicy.ADMINS_ONLY}>Admins only</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
              <input type="checkbox" checked={createForm.isEnabled} onChange={(event) => setCreateForm((form) => ({ ...form, isEnabled: event.target.checked }))} className="size-4 rounded border-slate-300" />
              Enable this cloud PC immediately
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Maintenance or repair notes</span>
              <textarea value={createForm.maintenanceNotes} onChange={(event) => setCreateForm((form) => ({ ...form, maintenanceNotes: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={busyId === "/api/cloud-pcs"} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {busyId === "/api/cloud-pcs" ? "Saving..." : "Add cloud PC"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold">Active sessions</h2>
          <p className="mt-1 text-sm text-slate-500">Force release stuck sessions if a cloud PC is still marked as occupied.</p>
          <div className="mt-4 space-y-3">
            {activeSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No active sessions right now.</div>
            ) : (
              activeSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{session.cloudPc.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{session.user.name ?? session.user.email} • started {formatDateTime(session.startedAt)}</p>
                  <div className="mt-3">
                    <SessionActionButton endpoint={`/api/sessions/${session.id}/force-end`} label="Force release" tone="danger" confirmMessage="Force end this session?" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Manage cloud PCs</h2>
          <p className="mt-1 text-sm text-slate-500">Update remote URLs, change status, and adjust access rules for each cloud PC.</p>
        </div>
        <div className="space-y-4">
          {cloudPcs.map((cloudPc) => (
            <details key={cloudPc.id} className="rounded-2xl border border-slate-200 p-5" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-900">{cloudPc.name}</h3>
                    <StatusBadge status={cloudPc.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Last seen {formatDateTime(cloudPc.lastSeenAt)}</p>
                </div>
                <span className="text-sm text-slate-400">Open editor</span>
              </summary>
              <form
                className="mt-5 grid gap-4 md:grid-cols-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  await submitRequest(
                    `/api/cloud-pcs/${cloudPc.id}`,
                    "PATCH",
                    Object.fromEntries(formData.entries()),
                    `${cloudPc.name} was updated.`,
                  );
                }}
              >
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Name</span>
                  <input name="name" defaultValue={cloudPc.name} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Group</span>
                  <input name="groupName" defaultValue={cloudPc.groupName ?? ""} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Description</span>
                  <textarea name="description" defaultValue={cloudPc.description ?? ""} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Remote access URL</span>
                  <input name="remoteUrl" defaultValue={cloudPc.remoteUrl} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Status</span>
                  <select name="status" defaultValue={cloudPc.status} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                    {Object.values(CloudPcStatus).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Access rule</span>
                  <select name="accessPolicy" defaultValue={cloudPc.accessPolicy} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                    <option value={AccessPolicy.ALL_USERS}>All signed-in users</option>
                    <option value={AccessPolicy.ADMINS_ONLY}>Admins only</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
                  <input name="isEnabled" type="checkbox" defaultChecked={cloudPc.isEnabled} className="size-4 rounded border-slate-300" />
                  Enable this cloud PC
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Maintenance or repair notes</span>
                  <textarea name="maintenanceNotes" defaultValue={cloudPc.maintenanceNotes ?? ""} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                </label>
                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button type="submit" disabled={busyId === `/api/cloud-pcs/${cloudPc.id}`} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                    {busyId === `/api/cloud-pcs/${cloudPc.id}` ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${cloudPc.name}? This cannot be undone.`)) return;
                      await submitRequest(`/api/cloud-pcs/${cloudPc.id}`, "DELETE", {}, `${cloudPc.name} was removed.`);
                    }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Delete cloud PC
                  </button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <p className="mt-1 text-sm text-slate-500">Recent administrative and session actions across the portal.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-3 pr-4 font-medium">When</th>
                <th className="py-3 pr-4 font-medium">Action</th>
                <th className="py-3 pr-4 font-medium">Actor</th>
                <th className="py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-4 text-slate-600">{formatDateTime(entry.createdAt)}</td>
                  <td className="py-3 pr-4 font-medium text-slate-900">{entry.action.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-4 text-slate-600">{entry.actorUser?.name ?? entry.actorUser?.email ?? "System"}</td>
                  <td className="py-3 text-slate-600">{entry.targetType} • {entry.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
