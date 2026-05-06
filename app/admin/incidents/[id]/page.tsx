"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/AdminNav";

type Chef = {
  id: string;
  name: string;
  notification_email: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  is_active: boolean;
};

type Incident = {
  id: string;
  severity: string;
  category: string;
  status: string;
  description: string;
  resolution_notes: string | null;
  reporter_email: string;
  subject_chef_id: string | null;
  subject_order_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: string;
  restaurant_name: string;
  status: string;
  total: number;
  customer_email: string;
  created_at: string;
};

type OrderItem = { id: string; dish_name: string; price: number; quantity: number };

type AuditEntry = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  ip_address: string;
};

const SEV: Record<string, { bg: string; color: string }> = {
  P0: { bg: "#FEE2E2", color: "#991B1B" },
  P1: { bg: "#FEF3C7", color: "#92400E" },
  P2: { bg: "#E0F2FE", color: "#0C4A6E" },
  P3: { bg: "#F3F4F6", color: "#374151" },
};

export default function IncidentDetailPage() {
  const router = useRouter();
  const { id: incidentId } = useParams<{ id: string }>();

  const [incident, setIncident]     = useState<Incident | null>(null);
  const [chef, setChef]             = useState<Chef | null>(null);
  const [order, setOrder]           = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [auditLog, setAuditLog]     = useState<AuditEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [token, setToken]           = useState("");
  const [busy, setBusy]             = useState(false);
  const [message, setMessage]       = useState("");

  // FIX 3: modal supports suspend | resolve | reactivate | null
  const [modal, setModal]                   = useState<"suspend" | "resolve" | "reactivate" | null>(null);
  const [suspendReason, setSuspendReason]   = useState("");
  const [resolveNotes, setResolveNotes]     = useState("");
  const [reactivateReason, setReactivateReason] = useState("");

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
      if (!admin) return;
      await load(t);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  async function load(t: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/incidents/${incidentId}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setIncident(data.incident);
    setChef(data.chef ?? null);
    setOrder(data.order ?? null);
    setOrderItems(data.orderItems ?? []);
    setAuditLog(data.auditLog ?? []);
    setLoading(false);
  }

  async function updateStatus(status: string, notes?: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/incidents/update", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ incident_id: incidentId, status, resolution_notes: notes }),
    });
    if (res.ok) {
      setModal(null);
      await load(token);
    } else {
      const { error } = await res.json();
      setMessage("Error: " + error);
    }
    setBusy(false);
  }

  async function suspendChef() {
    if (!chef || !suspendReason.trim()) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/chefs/suspend", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ chef_id: chef.id, reason: suspendReason.trim(), related_incident_id: incidentId }),
    });
    if (res.ok) {
      setModal(null);
      setSuspendReason("");
      await load(token);
    } else {
      const { error } = await res.json();
      setMessage("Error: " + error);
    }
    setBusy(false);
  }

  async function reactivateChef() {
    if (!chef || !reactivateReason.trim()) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/chefs/reactivate", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ chef_id: chef.id, reason: reactivateReason.trim() }),
    });
    if (res.ok) {
      setModal(null);
      setReactivateReason("");
      await load(token);
    } else {
      const { error } = await res.json();
      setMessage("Error: " + error);
    }
    setBusy(false);
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

  const sev = incident ? (SEV[incident.severity] ?? { bg: "#F3F4F6", color: "#374151" }) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">HomeBites Admin</h1>
      </header>
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <a href="/admin/incidents" className="text-[13px] text-gray-500 hover:text-gray-700">← Back to incidents</a>

        {message && <p className="text-sm text-red-600 font-medium">{message}</p>}

        {loading ? (
          <p className="text-sm text-gray-500 animate-pulse">Loading…</p>
        ) : !incident ? (
          <p className="text-sm text-red-600">Incident not found.</p>
        ) : (
          <>
            {/* Header card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {sev && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: sev.bg, color: sev.color }}>
                        {incident.severity}
                      </span>
                    )}
                    <span className="text-[13px] font-medium text-gray-700">{incident.category.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-[12px] text-gray-500">
                    ID: <span className="font-mono">{incident.id.slice(0, 8).toUpperCase()}</span>
                    {" · "}Reporter: {incident.reporter_email}
                    {" · "}{new Date(incident.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize bg-gray-100 text-gray-700">
                  {incident.status}
                </span>
              </div>

              <p className="text-[14px] text-gray-700 leading-relaxed">{incident.description}</p>

              {incident.resolution_notes && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-[13px] text-green-800">
                  <span className="font-semibold">Resolution: </span>{incident.resolution_notes}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {incident.status === "open" && (
                  <button
                    onClick={() => updateStatus("investigating")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 text-white disabled:opacity-50"
                  >
                    Mark Investigating
                  </button>
                )}
                {(incident.status === "open" || incident.status === "investigating") && (
                  <button
                    onClick={() => setModal("resolve")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-green-600 text-white disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                )}
                {incident.status === "resolved" && (
                  <button
                    onClick={() => updateStatus("closed")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-gray-600 text-white disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
                {chef && !chef.suspended_at && (
                  <button
                    onClick={() => setModal("suspend")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-600 text-white disabled:opacity-50"
                  >
                    Suspend Chef
                  </button>
                )}
                {/* FIX 3: reactivate via modal, not a bare link */}
                {chef?.suspended_at && (
                  <button
                    onClick={() => setModal("reactivate")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-amber-600 text-white disabled:opacity-50"
                  >
                    Lift Suspension
                  </button>
                )}
              </div>
            </div>

            {/* Chef card */}
            {chef && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-[13px] font-bold text-gray-900 mb-2">Chef</h2>
                <p className="text-[13px] text-gray-700 font-semibold">{chef.name}</p>
                <p className="text-[12px] text-gray-500">{chef.notification_email}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Active: {chef.is_active ? "yes" : "no"}
                  {chef.suspended_at && (
                    <span className="ml-2 text-red-600 font-medium">
                      Suspended · {chef.suspension_reason}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Order card */}
            {order && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-[13px] font-bold text-gray-900 mb-2">Linked Order</h2>
                <p className="text-[13px] text-gray-700">
                  {order.restaurant_name} · {order.customer_email} · ${(order.total ?? 0).toFixed(2)}
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Status: {order.status} · {new Date(order.created_at).toLocaleDateString()}
                </p>
                {orderItems.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {orderItems.map((item) => (
                      <li key={item.id} className="text-[12px] text-gray-600">
                        {item.quantity}× {item.dish_name} — ${(item.price ?? 0).toFixed(2)} each
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Audit trail */}
            {auditLog.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-[13px] font-bold text-gray-900 mb-3">Audit Trail (last 50)</h2>
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="text-[12px] border-b border-gray-50 pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-700">{entry.event_type}</span>
                        <span className="text-gray-400">{new Date(entry.created_at).toLocaleString()}</span>
                        {entry.ip_address && <span className="text-gray-400">{entry.ip_address}</span>}
                      </div>
                      {Object.keys(entry.event_data ?? {}).length > 0 && (
                        <pre className="mt-1 text-[11px] text-gray-500 bg-gray-50 rounded px-2 py-1 overflow-x-auto">
                          {JSON.stringify(entry.event_data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">

            {modal === "suspend" && (
              <>
                <h3 className="text-[16px] font-bold text-gray-900">Suspend Chef</h3>
                <p className="text-[13px] text-gray-600">
                  This will set <code>is_active = false</code> and <code>suspended_at</code>. Chef will receive an email.
                </p>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for suspension…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] resize-none outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setModal(null); setSuspendReason(""); }} className="px-4 py-2 rounded-full text-[13px] font-semibold text-gray-600 bg-gray-100">Cancel</button>
                  <button onClick={suspendChef} disabled={busy || !suspendReason.trim()} className="px-4 py-2 rounded-full text-[13px] font-semibold text-white bg-red-600 disabled:opacity-50">
                    {busy ? "Suspending…" : "Suspend"}
                  </button>
                </div>
              </>
            )}

            {modal === "resolve" && (
              <>
                <h3 className="text-[16px] font-bold text-gray-900">Mark Resolved</h3>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={3}
                  placeholder="Resolution notes (optional)…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] resize-none outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModal(null)} className="px-4 py-2 rounded-full text-[13px] font-semibold text-gray-600 bg-gray-100">Cancel</button>
                  <button onClick={() => updateStatus("resolved", resolveNotes)} disabled={busy} className="px-4 py-2 rounded-full text-[13px] font-semibold text-white bg-green-600 disabled:opacity-50">
                    {busy ? "Saving…" : "Mark Resolved"}
                  </button>
                </div>
              </>
            )}

            {/* FIX 3: reactivate modal with required reason */}
            {modal === "reactivate" && (
              <>
                <h3 className="text-[16px] font-bold text-gray-900">Lift Suspension</h3>
                <p className="text-[13px] text-gray-600">
                  This clears <code>suspended_at</code>. The activation trigger still gates <code>is_active</code> — the chef must complete compliance requirements to go live again.
                </p>
                <textarea
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for lifting suspension…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] resize-none outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setModal(null); setReactivateReason(""); }} className="px-4 py-2 rounded-full text-[13px] font-semibold text-gray-600 bg-gray-100">Cancel</button>
                  <button onClick={reactivateChef} disabled={busy || !reactivateReason.trim()} className="px-4 py-2 rounded-full text-[13px] font-semibold text-white bg-amber-600 disabled:opacity-50">
                    {busy ? "Lifting…" : "Lift Suspension"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
