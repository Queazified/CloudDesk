import { Role, SessionStatus } from "@prisma/client";
import { requireUser } from "@/lib/authorization";
import { getHistoryData, listCloudPcsForUser } from "@/lib/cloud-pcs";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const filters = {
    from: typeof query.from === "string" ? query.from : undefined,
    to: typeof query.to === "string" ? query.to : undefined,
    cloudPcId: typeof query.cloudPcId === "string" ? query.cloudPcId : undefined,
    status: typeof query.status === "string" ? (query.status as SessionStatus | "ALL") : "ALL",
    userEmail: typeof query.userEmail === "string" ? query.userEmail : undefined,
  };

  const [history, cloudPcs] = await Promise.all([getHistoryData(user, filters), listCloudPcsForUser(user)]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">History</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Occupancy history</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          {user.role === Role.ADMIN
            ? "Filter by date, user, cloud PC, or session status to review occupancy history across the platform."
            : "Review your recent cloud PC sessions and see how long each session lasted."}
        </p>
      </div>

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-5" method="get">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>From</span>
          <input type="date" name="from" defaultValue={filters.from} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>To</span>
          <input type="date" name="to" defaultValue={filters.to} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Cloud PC</span>
          <select name="cloudPcId" defaultValue={filters.cloudPcId ?? ""} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
            <option value="">All cloud PCs</option>
            {cloudPcs.map((cloudPc) => (
              <option key={cloudPc.id} value={cloudPc.id}>{cloudPc.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Session status</span>
          <select name="status" defaultValue={filters.status} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
            <option value="ALL">All session statuses</option>
            {Object.values(SessionStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        {user.role === Role.ADMIN ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>User email</span>
            <input name="userEmail" defaultValue={filters.userEmail} placeholder="Search by user email" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
        ) : null}
        <div className="flex gap-3 lg:col-span-5">
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Apply filters</button>
          <a href="/history" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">Clear</a>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Cloud PC</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Start time</th>
              <th className="px-4 py-3 font-medium">End time</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">End reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No sessions match the current filters.</td>
              </tr>
            ) : (
              history.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 text-slate-900">{session.cloudPc.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.role === Role.ADMIN ? session.user.name ?? session.user.email : "You"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(session.startedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(session.endedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(session.durationSeconds)}</td>
                  <td className="px-4 py-3 text-slate-600">{session.status}</td>
                  <td className="px-4 py-3 text-slate-600">{session.endReason ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
