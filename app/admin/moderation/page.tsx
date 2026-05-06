"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/AdminNav";

type QueueEntry = {
  id: string;
  dish_id: string | null;
  chef_id: string;
  chef_name: string;
  created_at: string;
  ai_classification: {
    dish_name?: string;
    dish_description?: string;
    dish_ingredients?: string;
    layer1?: { status: string; matched?: string };
    layer2?: { decision: string; category: string; reason: string; confidence: number; allergens: string[] };
  };
};

export default function AdminModerationPage() {
  const router = useRouter();
  const [queue, setQueue]         = useState<QueueEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [token, setToken]         = useState("");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [busy, setBusy]           = useState<string | null>(null);
  const [message, setMessage]     = useState("");

  useEffect(() => {
    async function checkAndLoad() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.replace("/login"); return; }

      const t = session.access_token;
      setToken(t);

      const res = await fetch("/api/admin/check-admin", {
        headers: { "Authorization": `Bearer ${t}` },
      });
      const { isAdmin: admin } = await res.json();
      setIsAdmin(admin);
      setAuthChecked(true);

      if (!admin) return;

      const queueRes = await fetch("/api/admin/queue", {
        headers: { "Authorization": `Bearer ${t}` },
      });
      const { entries } = await queueRes.json();
      setQueue(entries ?? []);
      setLoading(false);
    }
    checkAndLoad();
  }, [router]);

  async function handleApprove(entry: QueueEntry) {
    if (!entry.dish_id) { setMessage("Cannot approve — dish_id is null (dish not yet saved)."); return; }
    setBusy(entry.id);
    setMessage("");
    const res = await fetch("/api/admin/review/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ queue_id: entry.id, dish_id: entry.dish_id }),
    });
    if (res.ok) {
      setQueue((prev) => prev.filter((e) => e.id !== entry.id));
    } else {
      const { error } = await res.json();
      setMessage("Approve failed: " + error);
    }
    setBusy(null);
  }

  async function handleReject(entry: QueueEntry) {
    const reason = rejectReason[entry.id]?.trim();
    if (!reason) { setMessage("Enter a rejection reason first."); return; }
    if (!entry.dish_id) { setMessage("Cannot reject — dish_id is null."); return; }
    setBusy(entry.id);
    setMessage("");
    const res = await fetch("/api/admin/review/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ queue_id: entry.id, dish_id: entry.dish_id, reason }),
    });
    if (res.ok) {
      setQueue((prev) => prev.filter((e) => e.id !== entry.id));
    } else {
      const { error } = await res.json();
      setMessage("Reject failed: " + error);
    }
    setBusy(null);
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">HomeBites Admin</h1>
        <span className="text-sm text-gray-500">{queue.length} pending</span>
      </header>
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {message && (
          <p className="text-sm text-red-600 font-medium">{message}</p>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 animate-pulse">Loading queue…</p>
        ) : queue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500 text-sm">Queue is empty. Nothing to review.</p>
          </div>
        ) : (
          queue.map((entry) => {
            const ai = entry.ai_classification;
            const l2 = ai.layer2;
            const decisionColor =
              l2?.decision === "approve" ? "#16A34A" :
              l2?.decision === "reject"  ? "#DC2626" : "#D97706";

            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">{ai.dish_name ?? "—"}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      Chef: <span className="font-medium text-gray-700">{entry.chef_name}</span>
                      {" · "}
                      {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {l2 && (
                    <span
                      className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: decisionColor + "15", color: decisionColor }}
                    >
                      AI: {l2.decision} ({Math.round((l2.confidence ?? 0) * 100)}%)
                    </span>
                  )}
                </div>

                {ai.dish_description && (
                  <p className="text-[13px] text-gray-600 leading-relaxed">{ai.dish_description}</p>
                )}

                {ai.dish_ingredients && (
                  <p className="text-[12px] text-gray-500">
                    <span className="font-semibold text-gray-700">Ingredients:</span> {ai.dish_ingredients}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  {ai.layer1 && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <p className="font-semibold text-gray-700 mb-1">Layer 1 — Keyword</p>
                      <p className="text-gray-600">
                        Status: <span className="font-medium">{ai.layer1.status}</span>
                        {ai.layer1.matched && <> · matched: <span className="font-mono">{ai.layer1.matched}</span></>}
                      </p>
                    </div>
                  )}
                  {l2 && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <p className="font-semibold text-gray-700 mb-1">Layer 2 — AI</p>
                      <p className="text-gray-600">Category: {l2.category}</p>
                      <p className="text-gray-600 mt-0.5">{l2.reason}</p>
                      {l2.allergens?.length > 0 && (
                        <p className="text-gray-500 mt-0.5">Allergens: {l2.allergens.join(", ")}</p>
                      )}
                    </div>
                  )}
                </div>

                {!entry.dish_id && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    dish_id is null — dish was not saved (new-dish moderation run before insert). Approve/Reject disabled.
                  </p>
                )}

                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="Rejection reason (required to reject)"
                    value={rejectReason[entry.id] ?? ""}
                    onChange={(e) =>
                      setRejectReason((prev) => ({ ...prev, [entry.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 rounded-lg text-[13px] border border-gray-300 outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={() => handleApprove(entry)}
                    disabled={busy === entry.id || !entry.dish_id}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                    style={{ background: "#16A34A" }}
                  >
                    {busy === entry.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(entry)}
                    disabled={busy === entry.id || !entry.dish_id}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                    style={{ background: "#DC2626" }}
                  >
                    {busy === entry.id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
