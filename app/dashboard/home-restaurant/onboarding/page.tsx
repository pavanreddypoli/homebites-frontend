"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { HomeRestaurantRow, OnboardingStep } from "@/lib/compliance";
import { calculateOnboardingStep } from "@/lib/compliance";
import EligibilityStep from "./_steps/EligibilityStep";
import ProfileStep from "./_steps/ProfileStep";
import CertUploadStep from "./_steps/CertUploadStep";
import AgreementStep from "./_steps/AgreementStep";

const STEP_LABELS = [
  "Eligibility",
  "Your Profile",
  "Certification",
  "Agreement",
  "Stripe",
  "Labeling",
  "Go Live",
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [step, setStep]             = useState<OnboardingStep>(1);
  const [row, setRow]               = useState<HomeRestaurantRow | null>(null);
  const [userId, setUserId]         = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    async function bootstrap() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const role = session.user.user_metadata?.role;
      if (role !== "home_restaurant") { router.replace("/dashboard/customer"); return; }

      setUserId(session.user.id);
      setAccessToken(session.access_token);

      const { data } = await supabase
        .from("home_restaurants")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const currentRow: HomeRestaurantRow = data ?? {
        id: session.user.id,
        name: null, cuisine: null, description: null, city: null,
        lat: null, lng: null, hours: null, delivery_radius_km: 5,
        notification_email: session.user.email ?? null,
        is_active: false, sells_tcs_foods: false, dshs_registration_id: null,
        cottage_food_attestation_at: null, food_handler_cert_url: null,
        food_handler_cert_expires_at: null, chef_agreement_accepted_at: null,
        chef_agreement_version: null, chef_agreement_ip: null,
        stripe_payouts_enabled: false, labeling_acknowledged_at: null,
      };

      setRow(currentRow);
      setStep(calculateOnboardingStep(currentRow));
      setLoading(false);
    }
    bootstrap();
  }, []);

  function advanceTo(next: OnboardingStep, updatedRow?: Partial<HomeRestaurantRow>) {
    if (updatedRow) setRow((prev) => prev ? { ...prev, ...updatedRow } : prev);
    setStep(next);
    window.scrollTo(0, 0);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>Loading…</p>
      </div>
    );
  }

  const stepNum = step === "complete" ? 7 : (step as number);

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      {/* Mini nav */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] h-14 px-4 flex items-center justify-between backdrop-blur-md"
        style={{ background: "rgba(255,251,245,0.9)", borderBottom: "1px solid var(--hb-border-soft)" }}
      >
        <button onClick={() => router.push("/dashboard/customer")} className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "var(--hero-gradient)" }}
          >H</span>
          <span
            className="font-bold text-[16px] tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >HomeBites</span>
        </button>
        <span className="text-[12px] font-semibold" style={{ color: "var(--hb-fg-muted)" }}>
          Setup · Step {stepNum} of 7
        </span>
      </div>

      <main className="pt-20 pb-16 px-4 flex flex-col items-center">
        <div className="w-full max-w-[600px]">

          {/* Step progress */}
          <div className="mb-6">
            <div className="flex gap-1 mb-2">
              {STEP_LABELS.map((_, i) => {
                const s = i + 1;
                const future = s > 4;
                return (
                  <div
                    key={s}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: s < stepNum
                        ? "var(--hb-primary)"
                        : s === stepNum
                        ? "var(--hb-primary)"
                        : "#E8E2DA",
                      opacity: future && s > stepNum ? 0.35 : 1,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex gap-1">
              {STEP_LABELS.map((label, i) => {
                const s = i + 1;
                const future = s > 4;
                return (
                  <div key={s} className="flex-1 text-center">
                    <span
                      className="text-[9px] font-semibold leading-tight"
                      style={{
                        color: s === stepNum ? "var(--hb-primary)" : "var(--hb-fg-subtle)",
                        opacity: future && s > stepNum ? 0.4 : 1,
                      }}
                    >
                      {label}{future ? " *" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--hb-fg-subtle)" }}>
              * Steps 5–7 coming soon
            </p>
          </div>

          <div
            className="bg-white rounded-2xl p-6 lg:p-8"
            style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-card)" }}
          >
            {step === 1 && (
              <EligibilityStep
                accessToken={accessToken}
                onComplete={() => advanceTo(2, { cottage_food_attestation_at: new Date().toISOString() })}
              />
            )}
            {step === 2 && (
              <ProfileStep
                row={row!}
                accessToken={accessToken}
                onBack={() => advanceTo(1)}
                onComplete={(updates) => advanceTo(3, updates)}
              />
            )}
            {step === 3 && (
              <CertUploadStep
                userId={userId}
                accessToken={accessToken}
                onBack={() => advanceTo(2)}
                onComplete={(updates) => advanceTo(4, updates)}
              />
            )}
            {step === 4 && (
              <AgreementStep
                accessToken={accessToken}
                onBack={() => advanceTo(3)}
                onComplete={(updates) => advanceTo(5, updates)}
              />
            )}
            {(step === 5 || step === 6 || step === 7 || step === "complete") && (
              <div className="text-center py-6 space-y-4">
                <div className="text-4xl">🎉</div>
                <h2
                  className="text-[22px] font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
                >
                  Almost there
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--hb-fg-muted)" }}>
                  Steps 5–7 are coming soon: connect Stripe for payouts, acknowledge labeling
                  requirements, and go live. We&apos;ll email you when you can complete onboarding.
                </p>
                <button
                  onClick={() => router.push("/dashboard/home-restaurant")}
                  className="w-full py-3.5 rounded-full font-bold text-[15px] text-white"
                  style={{ background: "var(--hb-primary)", boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)" }}
                >
                  Back to dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
