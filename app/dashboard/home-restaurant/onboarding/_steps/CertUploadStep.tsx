"use client";

import { useState } from "react";
import { Upload, FileCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { HomeRestaurantRow } from "@/lib/compliance";

interface Props {
  userId: string;
  accessToken: string;
  onBack: () => void;
  onComplete: (updates: Partial<HomeRestaurantRow>) => void;
}

export default function CertUploadStep({ userId, accessToken, onBack, onComplete }: Props) {
  const [file, setFile]           = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const today      = new Date().toISOString().split("T")[0];
  const expiryValid = expiresAt && expiresAt > today;
  const valid       = file && expiryValid;

  async function handleUpload() {
    if (!valid || uploading) return;
    setUploading(true); setError("");

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const storagePath = `${userId}/food_handler_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("chef-credentials")
      .upload(storagePath, file, { upsert: false });

    if (upErr) {
      setError("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const res = await fetch("/api/onboarding/save-cert", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ storage_path: storagePath, expires_at: expiresAt }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to save cert details.");
      setUploading(false);
      return;
    }

    onComplete({ food_handler_cert_url: storagePath, food_handler_cert_expires_at: expiresAt });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: "var(--hb-primary)" }}
        >
          <FileCheck size={18} />
        </span>
        <div>
          <h2
            className="text-[20px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Upload your food handler certificate
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Required by Texas Cottage Food Law before you can go live
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 text-[13px] leading-relaxed"
        style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", color: "#0369A1" }}
      >
        <strong>Don&apos;t have one yet?</strong> Take a 2-hour online course for $7–15 at{" "}
        Texas A&M AgriLife, AAA Food Handler, or StateFoodSafety.
        Come back and upload the PDF when you&apos;re done.
      </div>

      <div className="space-y-4">
        {/* File input */}
        <div>
          <label
            className="block mb-1.5 text-[12px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            Certificate file (PDF, JPG, or PNG, max 10 MB)
          </label>
          {file ? (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "#F0FFF4", border: "1.5px solid #86EFAC" }}
            >
              <span className="text-[13px] font-semibold" style={{ color: "#166534" }}>✓ {file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-[12px] underline"
                style={{ color: "#991B1B" }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl cursor-pointer transition-colors hover:bg-orange-50"
              style={{ border: "2px dashed var(--hb-border)", background: "#FAFAFA" }}
            >
              <Upload size={22} style={{ color: "var(--hb-fg-muted)" }} />
              <span className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>Click to choose file</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
                  setFile(f); setError("");
                }}
              />
            </label>
          )}
        </div>

        {/* Expiry date */}
        <div>
          <label
            className="block mb-1.5 text-[12px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            Certificate expiration date *
          </label>
          <input
            type="date"
            value={expiresAt}
            min={today}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-[14px] outline-none"
            style={{ background: "#F9F6F2", border: "1px solid var(--hb-border)", color: "var(--hb-fg)" }}
          />
          {expiresAt && !expiryValid && (
            <p className="text-[12px] mt-1" style={{ color: "#991B1B" }}>
              Expiration date must be in the future.
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-[13px]" style={{ color: "#991B1B" }}>{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold"
          style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border)", background: "#fff" }}
        >
          ← Back
        </button>
        <button
          onClick={handleUpload}
          disabled={!valid || uploading}
          className="flex-1 py-3 rounded-full text-[14px] font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--hb-primary)" }}
        >
          {uploading ? "Uploading…" : "Upload & Continue →"}
        </button>
      </div>
    </div>
  );
}
