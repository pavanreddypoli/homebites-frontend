# HomeBites AI — Master Action Items

**Compiled from:** Legal & compliance strategy chat
**Last updated:** [DATE]

> Use this as your single tracking sheet. Sort by owner, by priority, or by when — whatever fits how you work.

---

## Quick Stats

- **Total action items:** 65
- **Pavan / founder:** 28
- **Claude Code (build sessions):** 19
- **Lawyer:** 6
- **Other parties (Stripe, insurance, government):** 12

---

## Phase 0 — Foundation (Do This Now, Before Building Anything Else)

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 1 | Drop all 12 spec files into repo at `docs/legal/` | Pavan | P0 | Source files needed before Claude Code can reference them |
| 2 | Commit and push to GitHub | Pavan | P0 | So build chat can read them |
| 3 | File **Texas Assumed Name Certificate (Form 503)** at SOS — "RedCube Group LLC d/b/a HomeBites AI" | Pavan | P0 | ~$25, online at sos.state.tx.us |
| 4 | File same Assumed Name with **Collin County Clerk** | Pavan | P0 | ~$15, required for Texas LLCs to file in both places |
| 5 | Add HomeBites AI DBA to existing RedCube Group LLC bank account | Pavan | P0 | Bring filed Assumed Name Certificate to bank |
| 6 | Confirm Texas Sales & Use Tax Permit covers HomeBites AI activity | Pavan | P1 | If RedCube already has one, confirm scope; else register |
| 7 | (Skip — using existing RedCube EIN, no new entity needed) | — | — | DBA uses parent EIN |
| 8 | Trademark search for "HomeBites AI" on USPTO TESS, file under RedCube Group LLC | Pavan | P1 | Free search, ~$350 ITU filing |
| 9 | Set up support@, privacy@, legal@ email addresses on homebitesai.com | Pavan | P0 | Resend or Google Workspace |
| 10 | Find Texas food/marketplace lawyer | Pavan | P0 | Engage by Week 6, budget $2–5K. Texas Bar referral, Avvo, Indie Hackers |

---

## Phase 1 — Engineering Foundation (Weeks 1–2)

### Pavan tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 11 | Get Stripe account verified for HomeBites AI, LLC | Pavan | P0 | Required for Stripe Connect setup |
| 12 | Audit homebitesai.com marketing copy per File 9 | Pavan | P0 | Replace "our chefs" / "verified safe" / etc. |
| 13 | Update CLAUDE.md with new compliance/legal context | Pavan | P0 | Reference to docs/legal/ folder |
| 14 | Update roadmap.md to add Sessions 9–11 | Pavan | P0 | New sessions after existing Week 8 |

### Claude Code tasks (Build Chat — execute in order)

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 15 | **Session 1** — DB schema changes per spec 04 | Claude Code | P0 | New columns on `home_restaurants`, `compliance_audit_log` table, activation trigger |
| 16 | **Existing Week 1** — RLS policies on all 4 tables | Claude Code | P0 | From original roadmap |
| 17 | **Existing Week 1** — Auth guard on `/dashboard/customer` | Claude Code | P0 | From original roadmap |
| 18 | **Existing Week 1** — Currency fix `₹` → `$` | Claude Code | P0 | From original roadmap |
| 19 | **Session 2** — Render legal pages at `/legal/*` | Claude Code | P0 | Publish ToS, Privacy, Chef Agreement |
| 20 | **Existing Week 2** — Stripe checkout + Connect | Claude Code | P0 | Stripe Connect Standard, chef = merchant of record |
| 21 | **Session 3** — Customer click-through acceptance + re-acceptance | Claude Code | P0 | At signup + on version bump |

---

## Phase 2 — Compliance Gates (Weeks 3–6)

### Claude Code tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 22 | **Session 4** — Chef onboarding wizard steps 1–4 | Claude Code | P0 | Eligibility / Profile / Cert Upload / Agreement |
| 23 | **Session 5** — Stripe Connect onboarding as Step 5 | Claude Code | P0 | Webhook for `account.updated` |
| 24 | **Session 6** — Labeling step + PDF generator | Claude Code | P0 | Per spec 05, use `@react-pdf/renderer` |
| 25 | **Session 7** — Customer checkout cottage-food disclosure | Claude Code | P0 | Checkbox + log to `orders.cottage_food_acknowledged_at` |
| 26 | **Session 8** — Daily cron for expired certs | Claude Code | P1 | Auto-suspend expired chefs, 30-day warning |
| 27 | **Existing Weeks 3–4** — Mobile UX rebuild | Claude Code | P1 | From original roadmap |
| 28 | **Existing Week 5** — Ratings/reviews | Claude Code | P1 | From original roadmap |
| 29 | **Existing Week 6** — Realtime orders + chef analytics | Claude Code | P1 | From original roadmap |

### Pavan tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 30 | After Session 4: test chef onboarding end-to-end yourself | Pavan | P0 | Take a real food handler course to validate flow |
| 31 | Update CLAUDE.md after every Claude Code session | Pavan | P1 | Keep context fresh for next session |

---

## Phase 3 — AI & Differentiation (Week 7)

### Claude Code tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 32 | **Session 9** — Three-layer moderation system | Claude Code | P0 | Per spec 08. Use Claude Haiku for classifier |
| 33 | **Existing Week 7** — AI search (NOT recommendations) | Claude Code | P1 | Frame as search/filter per File 9, not as recommender |
| 34 | **Existing Week 7** — AI menu description writer | Claude Code | P1 | Chef accepts/edits — chef remains author |
| 35 | **Existing Week 7** — Dietary filter UI | Claude Code | P1 | From original roadmap |

### Pavan tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 36 | Reframe all AI features per File 9 (search, not recommend) | Pavan | P0 | Update product copy on every AI surface |
| 37 | Audit investor pitch deck for liability-creating language | Pavan | P0 | "We recommend chefs" → "We make food discoverable" |

---

## Phase 4 — Pre-Launch (Week 8)

### Claude Code tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 38 | **Session 10** — Incident response infrastructure | Claude Code | P0 | Admin UI, suspension flow, audit log viewer |
| 39 | **Session 11** — Public help/legal pages | Claude Code | P1 | Render File 10 at /become-a-chef + /help/cottage-food |
| 40 | **Existing Week 8** — Sentry integration | Claude Code | P0 | From original roadmap |
| 41 | **Existing Week 8** — Production deploy to Vercel | Claude Code | P0 | All env vars in live mode |
| 42 | End-to-end test every flow | Claude Code | P0 | Order, payment, chef notification, status, pickup |

### Pavan tasks

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 43 | Place 1 real test order on a chef account | Pavan | P0 | Verify entire flow including labels and emails |
| 44 | Onboard 10 chefs manually in target neighborhood | Pavan | P0 | Use chef recruitment guide (File 10) |
| 45 | Verify all 10 chefs have valid certs uploaded | Pavan | P0 | Check `home_restaurants.food_handler_cert_url` |
| 46 | Verify all 10 chefs have Stripe payouts enabled | Pavan | P0 | Check `stripe_payouts_enabled = true` |
| 47 | Print and read Incident Response Playbook (File 7) | Pavan | P0 | Put it somewhere you can find at 2am |
| 48 | Set up incident response email templates in Resend | Pavan | P1 | From File 7 |
| 49 | Save lawyer phone + insurance broker phone in Playbook | Pavan | P0 | Update File 7 with real contacts |

---

## Lawyer Tasks (Engage by Week 6, Deliver by Week 7)

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 50 | Review Chef Agreement (File 1) | Lawyer | P0 | Texas-licensed, food/marketplace experience |
| 51 | Review Customer Terms of Service (File 2) | Lawyer | P0 | Especially arbitration + class waiver enforceability |
| 52 | Review Privacy Policy (File 3) | Lawyer | P0 | TX/CA/EU compliance |
| 53 | Review incident response notification templates (File 7) | Lawyer | P1 | Especially regulatory notifications |
| 54 | Confirm LLC formation + operating agreement | Lawyer | P1 | Optional but recommended |
| 55 | Be available on retainer for first P0/P1 incidents | Lawyer | P1 | $500–2K/month after first incident |

---

## Insurance (Bind Before First Paid Order)

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 56 | Get quotes from 3 carriers | Pavan | P0 | Hiscox, Next Insurance, CoverWallet, Embroker, Vouch |
| 57 | Bind general commercial liability ($1M/$2M) | Insurance | P0 | Before first order |
| 58 | Bind product liability with food rider | Insurance | P0 | Critical for foodborne illness claims |
| 59 | Bind cyber liability ($1M) | Insurance | P0 | TDPSA / CCPA exposure |
| 60 | Bind E&O for technology platform | Insurance | P1 | Protects against platform-specific claims |
| 61 | Save broker after-hours contact in Incident Playbook | Pavan | P0 | Update File 7 |

---

## Government & Third-Party

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 62 | TX Secretary of State — file Assumed Name Certificate (Form 503) | Texas SOS | P0 | Pavan files; ~$25, ~1 day |
| 63 | Collin County Clerk — file same Assumed Name Certificate | Collin County | P0 | Pavan files; ~$15 |
| 64 | Texas Comptroller — sales tax permit (or confirm RedCube's covers HomeBites) | TX Comptroller | P1 | Pavan applies; free |
| 65 | USPTO — trademark filing (if pursuing) under RedCube Group LLC | USPTO | P2 | Pavan files; ~$350 |

---

## Ongoing / Post-Launch

| # | Action | Owner | Priority | Cadence |
|---|--------|-------|----------|---------|
| 66 | Monthly moderation review (false positive/negative rates) | Pavan | P1 | Monthly |
| 67 | Quarterly incident response tabletop drill | Pavan | P1 | Quarterly |
| 68 | Quarterly compliance audit (active chef certs, agreements) | Pavan | P1 | Quarterly |
| 69 | Annual chef re-attestation cron (already automated) | Claude Code | P2 | Built into Session 8 |
| 70 | Watch Texas legislative sessions for cottage food updates | Pavan | P2 | Biennial |
| 71 | Update legal docs version + force re-acceptance | Pavan | P1 | Whenever law/policy changes |

---

## Files Created in This Chat (Reference)

| # | File | Owner of follow-up |
|---|------|-------------------|
| 1 | Chef Agreement | Lawyer review → publish |
| 2 | Customer Terms of Service | Lawyer review → publish |
| 3 | Privacy Policy | Lawyer review → publish |
| 4 | Onboarding Compliance Spec | Claude Code Sessions 1, 4, 5, 6 |
| 5 | Dish Label Generator Spec | Claude Code Session 6 |
| 6 | Pre-Launch Legal Checklist | Pavan operational |
| 7 | Incident Response Playbook | Pavan + lawyer |
| 8 | Content Moderation Spec | Claude Code Session 9 |
| 9 | Liability Positioning Memo | Pavan + product reference |
| 10 | Chef Requirements Guide | Public-facing + Session 11 |
| 11 | This Master Action Items file | Pavan tracking |

---

## Critical Path (If You Only Do These, You Can Launch)

The 10 must-haves before taking real money:

1. ✅ Texas Assumed Name Certificate filed (SOS + Collin County) — RedCube Group LLC d/b/a HomeBites AI (#3, #4)
2. ✅ Bank account updated with DBA (#5)
3. ✅ Insurance bound (#57–60)
4. ✅ Lawyer reviewed ToS + Chef Agreement + Privacy (#50, #51, #52)
5. ✅ DB foundation built — activation trigger live (#15)
6. ✅ Stripe Connect Standard live — chef as merchant of record (#20)
7. ✅ Chef onboarding wizard with cert upload + agreement gate (#22, #23)
8. ✅ Customer click-through acceptance live (#21)
9. ✅ Cottage food disclosure at checkout (#25)
10. ✅ Moderation system blocking prohibited items (#32)

Everything else is polish, scale, or post-launch operations.

---

## Owner Quick Reference

**Pavan total:** 28 items
- Foundation (entity, banking, lawyer, insurance): 10 items
- Operational (audit copy, recruit chefs, test, monitor): 18 items

**Claude Code total:** 19 items
- Sessions 1–11 (compliance build) + existing roadmap items

**Lawyer total:** 6 items (concentrated in Week 6–7)

**Insurance broker total:** 5 items (one-time bind)

**External (government, third party):** 4 items (filing only)

---

## What NOT to Do (Reminder from File 9)

- ❌ Don't take physical custody of food
- ❌ Don't write dish descriptions (chef writes them)
- ❌ Don't co-brand dishes ("HomeBites Biryani")
- ❌ Don't promise safety or quality in marketing
- ❌ Don't add gig delivery (cottage food violation)
- ❌ Don't accept California users at launch (different legal regime)
- ❌ Don't allow meat/poultry/seafood listings (cottage food violation)
- ❌ Don't hold chef payouts (Stripe Connect handles directly)
- ❌ Don't curate/feature chefs editorially (looks like Amazon)
- ❌ Don't skip the lawyer review to save money (false economy)
