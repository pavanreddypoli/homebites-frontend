"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/AdminNav";

type Incident = {
  id: string;
  severity: string;
  category: string;
  status: string;
  reporter_email: string;
  subject_chef_id: string | null;
  chef_name: string | null;
  created_at: string;
};

const SEV: Record<string, { bg: string; color: string }> = {
  P0: { bg: "#FEE2E2", color: "#991B1B" },
  P1: { bg: "#FEF3C7", color: "#92400E" },
  P2: { bg: "#E0F2FE", color: "#0C4A6E" },
  P3: { bg: "#F3F4F6", color: "#374151" },
};

const ST: Record<string, { bg: string; color: string }> = {
  open:          { bg: "#FEF3C7", color: "#92400E" },
  investigating: { bg: "#E0F2FE", color: "#0C4A6E" },
  resolved:      { bg: "#DCFCE7", color: "#14532D" },
  closed:        { bg: "#F3F4F6", color: "#374151" },
};

export default function AdminIncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [loading, setLoading]       = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [token, setToken]           = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

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
      if (admin) await load(t, "", "");
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(t: string, status: string, severity: string) {
    setLoading(true);
    const p = new URLSearchParams();
    if (status)   p.set("status", status);
    if (severity) p.set("severity", severity);
    const res = await fetch(`/api/admin/incidents?${p}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setIncidents(data.incidents ?? []);
    setLoading(false);
  }

  function applyFilters(status: string, severity: string) {
    setFilterStatus(status);
    setFilterSeverity(severity);
    load(token, status, severity);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">HomeBites Admin</h1>
      </header>
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <select
            value={filterStatus}
            onChange={(e) => applyFilters(e.target.value, filterSeverity)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] bg-white text-gray-700"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => applyFilters(filterStatus, e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] bg-white text-gray-700"
          >
            <option value="">All severities</option>
            <option value="P0">P0 — Critical</option>
            <option value="P1">P1 — High</option>
            <option value="P2">P2 — Medium</option>
            <option value="P3">P3 — Low</option>
          </select>
          <span className="text-[13px] text-gray-500">
            {loading ? "Loading…" : `${incidents.length} incident${incidents.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {!loading && incidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500 text-sm">No incidents found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Sev</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Chef</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Reporter</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => {
                  const sev = SEV[inc.severity] ?? { bg: "#F3F4F6", color: "#374151" };
                  const st  = ST[inc.status]   ?? { bg: "#F3F4F6", color: "#374151" };
                  return (
                    <tr key={inc.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: sev.bg, color: sev.color }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{inc.category.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: st.bg, color: st.color }}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{inc.chef_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{inc.reporter_email}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(inc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/admin/incidents/${inc.id}`} className="text-[12px] font-semibold" style={{ color: "#4F46E5" }}>
                          View →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
