"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/AdminNav";

type LogEntry = {
  id: string;
  user_id: string | null;
  home_restaurant_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

export default function AdminAuditLogPage() {
  const router = useRouter();
  const [logs, setLogs]                 = useState<LogEntry[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(false);
  const [authChecked, setAuthChecked]   = useState(false);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [token, setToken]               = useState("");
  const [filterEmail, setFilterEmail]   = useState("");
  const [filterEvents, setFilterEvents] = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [page, setPage]                 = useState(1);
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});
  const [exporting, setExporting]       = useState(false);

  const PAGE_SIZE = 50;

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.replace("/login"); return; }
      const t = session.access_token;
      setToken(t);
      const res = await fetch("/api/admin/check-admin", { headers: { Authorization: `Bearer ${t}` } });
      const { isAdmin: admin } = await res.json();
      setIsAdmin(admin);
      setAuthChecked(true);
      if (admin) await load(t, 1, "", "", "", "");
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(t: string, p: number, email: string, events: string, from: string, to: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (email)  params.set("email",      email.trim());
    if (events) params.set("event_type", events.trim());
    if (from)   params.set("date_from",  from);
    if (to)     params.set("date_to",    to);
    const res = await fetch(`/api/admin/audit-log?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  function search() {
    setPage(1);
    load(token, 1, filterEmail, filterEvents, dateFrom, dateTo);
  }

  function goPage(p: number) {
    setPage(p);
    load(token, p, filterEmail, filterEvents, dateFrom, dateTo);
  }

  async function exportCSV() {
    setExporting(true);
    const params = new URLSearchParams({ export: "1" });
    if (filterEmail)  params.set("email",      filterEmail.trim());
    if (filterEvents) params.set("event_type", filterEvents.trim());
    if (dateFrom)     params.set("date_from",  dateFrom);
    if (dateTo)       params.set("date_to",    dateTo);
    const res = await fetch(`/api/admin/audit-log?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const rows: string[][] = [["id", "event_type", "home_restaurant_id", "ip_address", "created_at", "event_data"]];
    for (const row of (data.logs ?? [])) {
      rows.push([row.id, row.event_type, row.home_restaurant_id ?? "", row.ip_address ?? "", row.created_at, JSON.stringify(row.event_data)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm animate-pulse">Checking access…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600 text-sm font-semibold">Access denied.</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">HomeBites Admin</h1>
      </header>
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="email"
              placeholder="Filter by chef email"
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none"
            />
            <input
              type="text"
              placeholder="Event types (comma-separated)"
              value={filterEvents}
              onChange={(e) => setFilterEvents(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={search}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-gray-900 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Search"}
            </button>
            <button
              onClick={exportCSV}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-700 border border-gray-200 bg-white disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <span className="text-[13px] text-gray-500 self-center">{total} row{total !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Table */}
        {logs.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500 text-sm">No log entries found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Event</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Restaurant ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">IP</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => {
                  const hasData = Object.keys(entry.event_data ?? {}).length > 0;
                  const isExpanded = expanded[entry.id] ?? false;
                  return (
                    <>
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-700">{entry.event_type}</td>
                        <td className="px-4 py-2 text-gray-500 font-mono">{entry.home_restaurant_id?.slice(0, 8) ?? "—"}</td>
                        <td className="px-4 py-2 text-gray-500">{entry.ip_address ?? "—"}</td>
                        <td className="px-4 py-2 text-gray-500">{new Date(entry.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          {hasData && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !isExpanded }))}
                              className="text-[11px] font-medium text-indigo-600"
                            >
                              {isExpanded ? "Hide" : "Show"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasData && (
                        <tr key={`${entry.id}-data`} className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={5} className="px-4 py-2">
                            <pre className="text-[11px] text-gray-600 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(entry.event_data, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => goPage(page - 1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-[12px] border border-gray-200 bg-white text-gray-600 disabled:opacity-40">
              Prev
            </button>
            <span className="text-[13px] text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => goPage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-[12px] border border-gray-200 bg-white text-gray-600 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
