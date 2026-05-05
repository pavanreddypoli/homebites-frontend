# HomeBites AI — Pre-Launch Legal Checklist

> Use this in conjunction with `roadmap.md`. Nothing in this checklist is legal advice — items marked **[LAWYER]** require sign-off from a Texas-licensed attorney before launch.

---

## Entity & Foundation
- [x] **RedCube Group LLC** already formed (parent entity, Texas LLC)
- [ ] File **Texas Assumed Name Certificate (Form 503)** with Secretary of State — "RedCube Group LLC d/b/a HomeBites AI" (~$25, file at sos.state.tx.us)
- [ ] File the same **Assumed Name Certificate with Collin County Clerk** (~$15)
- [ ] Add HomeBites AI as DBA on existing RedCube Group LLC bank account (bring filed certificate)
- [ ] Stripe — add HomeBites AI as a statement descriptor under existing RedCube Stripe account (or open separate account if desired)
- [ ] Register Texas Sales & Use Tax Permit with the Comptroller under RedCube Group LLC (free; if RedCube already has one, confirm it covers HomeBites AI activity)
- [ ] Trademark search for "HomeBites AI" (USPTO TESS, ~30 min); file ITU application if clear (~$350) — file under RedCube Group LLC as owner

---

## Legal Documents (Drafts in this folder)
- [ ] [LAWYER] Review & finalize **Chef Agreement** (`01-chef-agreement.md`)
- [ ] [LAWYER] Review & finalize **Customer Terms of Service** (`02-customer-terms-of-service.md`)
- [ ] [LAWYER] Review & finalize **Privacy Policy** (`03-privacy-policy.md`)
- [ ] Add Cookie Policy if EU traffic expected
- [ ] Publish all three at homebitesai.com/legal/{chef-agreement, terms, privacy}
- [ ] Link to Terms & Privacy in signup form (with checkbox for customers, full acceptance flow for chefs)

---

## Platform Positioning (Product copy review)
- [ ] Replace any instance of "our restaurants" or "our chefs" with "independent home chefs on HomeBites AI"
- [ ] Replace "we deliver / we cook" language with "chef prepares / chef offers"
- [ ] Rename references to "home restaurants" → "home kitchens" or "home chefs" where consumer-facing (regulatory framing matters)
- [ ] Confirm marketing site at homebitesai.com positions as platform/marketplace, not restaurant brand
- [ ] Add cottage-food disclaimer to:
  - Chef profile pages
  - Dish cards (small badge)
  - Checkout page (acknowledgment checkbox)
  - Order confirmation email

---

## Compliance Gates (Spec in `04-onboarding-compliance-spec.md`)
- [ ] Eligibility attestations in onboarding wizard
- [ ] Food handler cert upload + expiration tracking
- [ ] Chef Agreement acceptance with version + IP + timestamp logging
- [ ] Stripe Connect Standard onboarding flow
- [ ] Labeling acknowledgment
- [ ] Server-side activation check enforced via DB trigger
- [ ] `compliance_audit_log` table created and writes verified
- [ ] Daily cron for expired certs

---

## Payments (Stripe)
- [ ] Stripe account created and verified for HomeBites AI, LLC
- [ ] **Stripe Connect — Standard** chosen (not Express, not Custom). Chef is merchant of record.
- [ ] Application fee = 5% configured on PaymentIntent
- [ ] Webhook signing secret stored as `STRIPE_WEBHOOK_SECRET`
- [ ] `payment_intent.succeeded` handler creates the order (not before payment succeeds)
- [ ] `account.updated` handler syncs `stripe_payouts_enabled` to `home_restaurants`
- [ ] Test refund flow end-to-end on Stripe test mode

---

## Data & Security
- [ ] Enable RLS on all 4 tables (already in roadmap Week 1)
- [ ] Private Supabase Storage bucket `chef-credentials` (no public reads)
- [ ] Service-role key only in server code (verified — never in `"use client"` files)
- [ ] Auth guard on `/dashboard/customer` page
- [ ] HTTPS enforced (Vercel default)
- [ ] Add `robots.txt` and `noindex` on dashboard pages

---

## Insurance (before first paid order)
- [ ] Get quotes from 3 carriers for marketplace package:
  - General commercial liability ($1M / $2M minimum)
  - Product liability (food-specific rider)
  - Cyber liability ($1M minimum)
  - Errors & Omissions (technology platform)
- [ ] Vendors that quote marketplaces: **Hiscox, Next Insurance, CoverWallet, Embroker, Vouch**
- [ ] Bind policy before first transaction

---

## Operational Readiness
- [ ] Designated incident contact for foodborne illness reports (your phone + email, on file)
- [ ] Written internal **Incident Response Playbook**:
  1. Receive complaint
  2. Acknowledge within 24h
  3. Suspend chef pending review
  4. Notify Texas DSHS at 512-834-6753 if outbreak suspected
  5. Preserve all data and communications
  6. Loop in legal counsel
- [ ] Sentry error monitoring configured
- [ ] `support@homebitesai.com`, `privacy@homebitesai.com`, `legal@homebitesai.com` mailboxes live (Resend or Google Workspace)

---

## Lawyer Engagement
Recommended specialties: **food law / marketplace / startup**.

**Budget:** $2K–5K for ToS + Chef Agreement + Privacy Policy review pre-launch. Add another $1–2K for an entity formation + ops review.

**Sources to find one:**
- Texas Bar lawyer search (filter: Food & Drug Law, Business)
- Avvo / Martindale ratings
- Referrals from food/marketplace founders in Texas
- Forecastr's startup attorney directory

Engage by **Week 6** so they have time before Week 8 launch.

---

## Final Pre-Launch Day Checks
- [ ] All env vars in Vercel production (Supabase, Stripe LIVE keys, Resend, Anthropic if used)
- [ ] Stripe is in **live mode** (not test mode)
- [ ] First 10 chefs have completed all 7 onboarding steps
- [ ] First 10 chefs have valid certs uploaded
- [ ] First 10 chefs have Stripe payouts enabled
- [ ] Place 1 real test order yourself end-to-end on a chef's account
- [ ] Verify the cottage-food disclaimer appears at checkout
- [ ] Verify label PDF generates correctly
- [ ] Verify chef email + customer email both arrive

---

## Post-Launch (Week 9+)
- [ ] Monitor first 30 orders for any complaint patterns
- [ ] Quarterly compliance audit: re-check active chef certs, agreement versions, suspensions
- [ ] Annual chef re-attestation cron
- [ ] Watch for Texas legislative updates each session (cottage food law changes ~every 2 years)
