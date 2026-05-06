import type { SupabaseClient } from "@supabase/supabase-js";

export type SendEmailFn = (params: {
  to:      string;
  subject: string;
  html:    string;
}) => Promise<void>;

export type CronStats = {
  expired:    number;
  warning_30: number;
  warning_14: number;
  warning_7:  number;
  errors:     string[];
};

export async function runExpireCerts(
  db:        SupabaseClient,
  sendEmail: SendEmailFn,
  opts?:     { includeTestData?: boolean },
): Promise<CronStats> {
  const today   = new Date().toISOString().split("T")[0];
  const today30 = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
  const today14 = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];
  const today7  = new Date(Date.now() +  7 * 86_400_000).toISOString().split("T")[0];

  const stats: CronStats = { expired: 0, warning_30: 0, warning_14: 0, warning_7: 0, errors: [] };

  // ── STEP 1: Suspend chefs whose cert has expired ──
  // lte catches certs that expired during any missed cron run
  const baseExpiredQuery = db
    .from("home_restaurants")
    .select("id, name, notification_email, food_handler_cert_expires_at")
    .lte("food_handler_cert_expires_at", today)
    .is("suspended_at", null);  // idempotent: skip already-suspended

  const { data: expiredChefs, error: expiredErr } = await (
    opts?.includeTestData
      ? baseExpiredQuery
      : baseExpiredQuery.eq("is_test_data", false)
  );

  if (expiredErr) {
    stats.errors.push(`expired query failed: ${expiredErr.message}`);
  } else {
    for (const chef of expiredChefs ?? []) {
      try {
        const now = new Date().toISOString();

        const { error: updateErr } = await db
          .from("home_restaurants")
          .update({
            is_active:         false,
            suspended_at:      now,
            suspension_reason: `Food handler certificate expired on ${chef.food_handler_cert_expires_at}`,
          })
          .eq("id", chef.id);

        if (updateErr) {
          stats.errors.push(`suspend ${chef.id} failed: ${updateErr.message}`);
          continue;
        }

        await db.from("compliance_audit_log").insert({
          user_id:            chef.id,
          home_restaurant_id: chef.id,
          event_type:         "cert_expired_deactivation",
          event_data:         { cert_expired_at: chef.food_handler_cert_expires_at, suspended_at: now },
          ip_address:         "cron",
          user_agent:         "vercel-cron/expire-certs",
        });

        if (chef.notification_email) {
          await sendEmail({
            to:      chef.notification_email,
            subject: "Your HomeBites AI listing has been suspended",
            html: `
              <h2>Hi ${chef.name},</h2>
              <p>Your food handler certificate expired on <strong>${chef.food_handler_cert_expires_at}</strong>.
              Per Texas Cottage Food Law, your HomeBites AI listing has been temporarily suspended.</p>
              <p><strong>To reactivate your listing:</strong></p>
              <ol>
                <li>Renew your food handler certification (online courses available for $7–15)</li>
                <li>Sign in to <a href="https://homebitesai.com/dashboard/home-restaurant">HomeBites AI</a></li>
                <li>Upload your renewed certificate in the onboarding wizard</li>
                <li>Your listing will reactivate automatically</li>
              </ol>
              <p>Questions? Reply to this email.</p>
              <p>– HomeBites AI</p>
            `,
          });
        }

        stats.expired++;
      } catch (err) {
        stats.errors.push(`suspend ${chef.id} threw: ${String(err)}`);
      }
    }
  }

  // ── STEP 2: 30-day warning ──
  // Exact-match on date — chef receives this email only once, the day they hit 30 days out
  const base30Query = db
    .from("home_restaurants")
    .select("id, name, notification_email, food_handler_cert_expires_at")
    .eq("food_handler_cert_expires_at", today30)
    .is("suspended_at", null);

  const { data: warn30, error: w30Err } = await (
    opts?.includeTestData
      ? base30Query
      : base30Query.eq("is_test_data", false)
  );

  if (w30Err) {
    stats.errors.push(`warning_30 query failed: ${w30Err.message}`);
  } else {
    for (const chef of warn30 ?? []) {
      try {
        if (chef.notification_email) {
          await sendEmail({
            to:      chef.notification_email,
            subject: "Your food handler certificate expires in 30 days",
            html: `
              <h2>Hi ${chef.name},</h2>
              <p>Your food handler certification expires on <strong>${chef.food_handler_cert_expires_at}</strong> — 30 days from today.</p>
              <p>Renew now to keep your listing active. Online renewal courses take ~2 hours and cost $7–15:</p>
              <ul>
                <li>Texas A&amp;M AgriLife Extension</li>
                <li>AAA Food Handler</li>
                <li>StateFoodSafety</li>
              </ul>
              <p>Once renewed, sign in to <a href="https://homebitesai.com/dashboard/home-restaurant/onboarding">HomeBites AI</a> and upload the new certificate.</p>
              <p>– HomeBites AI</p>
            `,
          });
        }
        stats.warning_30++;
      } catch (err) {
        stats.errors.push(`warning_30 ${chef.id} threw: ${String(err)}`);
      }
    }
  }

  // ── STEP 3: 14-day warning ──
  const base14Query = db
    .from("home_restaurants")
    .select("id, name, notification_email, food_handler_cert_expires_at")
    .eq("food_handler_cert_expires_at", today14)
    .is("suspended_at", null);

  const { data: warn14, error: w14Err } = await (
    opts?.includeTestData
      ? base14Query
      : base14Query.eq("is_test_data", false)
  );

  if (w14Err) {
    stats.errors.push(`warning_14 query failed: ${w14Err.message}`);
  } else {
    for (const chef of warn14 ?? []) {
      try {
        if (chef.notification_email) {
          await sendEmail({
            to:      chef.notification_email,
            subject: "Your food handler certificate expires in 14 days — please renew now",
            html: `
              <h2>Hi ${chef.name},</h2>
              <p>Your food handler certification expires on <strong>${chef.food_handler_cert_expires_at}</strong> — only 14 days away.</p>
              <p>Your listing will be automatically suspended on that date if you haven't renewed.
              Renewal takes ~2 hours online and costs $7–15:</p>
              <ul>
                <li>Texas A&amp;M AgriLife Extension</li>
                <li>AAA Food Handler</li>
                <li>StateFoodSafety</li>
              </ul>
              <p><a href="https://homebitesai.com/dashboard/home-restaurant/onboarding">Upload your renewed certificate here →</a></p>
              <p>– HomeBites AI</p>
            `,
          });
        }
        stats.warning_14++;
      } catch (err) {
        stats.errors.push(`warning_14 ${chef.id} threw: ${String(err)}`);
      }
    }
  }

  // ── STEP 4: 7-day warning ──
  const base7Query = db
    .from("home_restaurants")
    .select("id, name, notification_email, food_handler_cert_expires_at")
    .eq("food_handler_cert_expires_at", today7)
    .is("suspended_at", null);

  const { data: warn7, error: w7Err } = await (
    opts?.includeTestData
      ? base7Query
      : base7Query.eq("is_test_data", false)
  );

  if (w7Err) {
    stats.errors.push(`warning_7 query failed: ${w7Err.message}`);
  } else {
    for (const chef of warn7 ?? []) {
      try {
        if (chef.notification_email) {
          await sendEmail({
            to:      chef.notification_email,
            subject: "URGENT: Your food handler certificate expires in 7 days",
            html: `
              <h2>Hi ${chef.name},</h2>
              <p><strong>Your food handler certification expires in 7 days</strong> on <strong>${chef.food_handler_cert_expires_at}</strong>.</p>
              <p>If you don't upload a renewed certificate before then, your listing will be automatically
              suspended and customers won't be able to order from you.</p>
              <p>Renew immediately — courses take ~2 hours and cost $7–15:</p>
              <ul>
                <li>Texas A&amp;M AgriLife Extension</li>
                <li>AAA Food Handler</li>
                <li>StateFoodSafety</li>
              </ul>
              <p><a href="https://homebitesai.com/dashboard/home-restaurant/onboarding" style="font-weight:bold">Upload your renewed certificate now →</a></p>
              <p>– HomeBites AI</p>
            `,
          });
        }
        stats.warning_7++;
      } catch (err) {
        stats.errors.push(`warning_7 ${chef.id} threw: ${String(err)}`);
      }
    }
  }

  return stats;
}
