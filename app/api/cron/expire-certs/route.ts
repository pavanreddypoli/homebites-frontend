import { NextRequest, NextResponse }         from "next/server";
import { supabaseServer }                    from "@/lib/supabaseServer";
import { Resend }                             from "resend";
import { runExpireCerts, type SendEmailFn }  from "@/lib/cron/expire-certs-logic";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  // CRON_SECRET is auto-set by Vercel when the cron is configured.
  // If the env var is absent (local dev), isVercelCron is false — isLocalDev allows the bypass.
  const authHeader   = req.headers.get("authorization");
  const isVercelCron = process.env.CRON_SECRET
    ? authHeader === `Bearer ${process.env.CRON_SECRET}`
    : false;
  const isLocalDev   = process.env.NODE_ENV === "development";

  if (!isVercelCron && !isLocalDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sendEmail: SendEmailFn = async ({ to, subject, html }) => {
    await resend.emails.send({
      from: "HomeBites AI <noreply@homebitesai.com>",
      to,
      subject,
      html,
    });
  };

  // Production never passes includeTestData — test data is always excluded
  const stats = await runExpireCerts(supabaseServer, sendEmail);
  console.log(`[cron/expire-certs] ${new Date().toISOString()}`, stats);

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), stats });
}
