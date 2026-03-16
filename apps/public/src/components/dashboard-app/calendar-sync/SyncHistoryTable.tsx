"use client";

interface SyncLog {
  id: string;
  status: string;
  eventsImported: number;
  eventsSkipped: number;
  errorMessage?: string;
  syncDuration?: number;
  createdAt: string;
}

interface SyncHistoryTableProps {
  logs: SyncLog[];
}

export function SyncHistoryTable({ logs }: SyncHistoryTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-zinc-500">
        No sync history available yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-700">Date & Time</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-700">Status</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-700">Imported</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-700">Skipped</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-700">Duration</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-700">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-zinc-50">
              <td className="px-4 py-3 text-zinc-900">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    log.status === "SUCCESS"
                      ? "bg-green-100 text-green-800"
                      : log.status === "FAILED"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-zinc-900">
                {log.eventsImported}
              </td>
              <td className="px-4 py-3 text-right text-zinc-600">
                {log.eventsSkipped}
              </td>
              <td className="px-4 py-3 text-right text-zinc-600">
                {log.syncDuration ? `${log.syncDuration}ms` : "-"}
              </td>
              <td className="px-4 py-3 text-xs text-red-600">
                {log.errorMessage || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
