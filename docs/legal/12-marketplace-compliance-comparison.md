# Marketplace Compliance Comparison

**Purpose:** Side-by-side reference showing how HomeBites AI's compliance posture compares to other marketplaces. Use this for investor conversations, lawyer briefings, and product decisions.

**Last updated:** [DATE]

---

## The Five Models

| Model | Example | Position on Liability Spectrum |
|---|---|---|
| **Pure passive listing** | Booking.com, Expedia | Lowest liability — pure intermediary |
| **Independent host marketplace** | Airbnb | Low-medium — host is named, platform is venue |
| **Home chef marketplace** | Shef, HomeBites AI | Medium — sellers are unlicensed individuals, platform must verify |
| **Branded aggregator** | OYO | High — co-branded, "verified," sets standards |
| **Branded franchise** | Hilton, Marriott franchisees | Highest — franchisor controls operations |

---

## Detailed Comparison

| Dimension | Booking.com | Airbnb | **HomeBites AI** | Shef | OYO |
|---|---|---|---|---|---|
| **Sellers are…** | Licensed hotels | Independent hosts | Unlicensed individuals (cottage food) | Unlicensed individuals (cottage food) | Independent hotels |
| **Co-branded?** | ❌ No | ❌ No (host named) | ❌ No | ❌ No | ✅ "OYO Hotel X" |
| **Platform "verifies" sellers?** | ❌ Hotels self-license | ⚠️ ID + selfie via Persona | ✅ Cert + attestation | ✅ Cert + ID + kitchen photo | ✅ Engineers inspect |
| **Sets quality standards?** | ❌ No | ⚠️ Soft (ratings) | ❌ Legal min only | ⚠️ Soft | ✅ Hard brand standards |
| **Merchant of record** | Hotel | Host | **Chef (via Stripe Connect)** | Chef | OYO |
| **Holds payment** | No | Yes (release on stay) | **No (Stripe direct)** | Yes (release on delivery) | Yes (e-wallet reconciliation) |
| **Sets pricing?** | ❌ Hotel sets | ❌ Host sets | ❌ **Chef sets** | ⚠️ Suggests ranges | ✅ Dynamic pricing AI |
| **Physical inspection?** | ❌ Never | ❌ Never | ❌ **Never (cottage food law forbids)** | ❌ Never | ✅ Engineers visit |
| **Algorithmic recommendations?** | ⚠️ Sorted lists | ✅ "For you" | ⚠️ **Search/filter only (per File 9)** | ✅ Personalized | ✅ Heavy AI ranking |
| **Custody of product?** | ❌ Never | ❌ Never | ❌ **Never** | ❌ Never | ⚠️ Operational control |
| **Insurance for partners?** | Optional | $1M Host Guarantee | **Optional, recommended** | Yes (provided by Shef) | Required of partner |
| **Insurance for platform?** | Yes | Yes ($1M+) | **Yes (will bind pre-launch)** | Yes | Yes |
| **Click-through agreement?** | ✅ | ✅ | ✅ | ✅ | ⚠️ Hybrid (digital + physical) |
| **Versioned terms?** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Audit trail of acceptances?** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## How Each Handles "What If the Seller Harms a Customer?"

| Platform | Typical Outcome |
|---|---|
| **Booking.com** | Hotel sued. Booking dismissed early — pure intermediary. |
| **Airbnb** | Both sued. Airbnb often dismissed via arbitration + ToS. $1M Host Guarantee absorbs many claims before they hit court. |
| **HomeBites AI (your target)** | Both named. Strong arbitration + class waiver + chef indemnification + audit trail = manageable. Insurance absorbs financial hit. |
| **Shef** | Both named. Shef's stronger insurance posture (covers chef ops) absorbs most claims. |
| **OYO** | Both named. OYO frequently held liable due to co-branding + "verified" claims. Apparent agency doctrine bites. |

**Key principle:** Co-branding + quality promises = apparent agency = liability. The more you look like the operator, the more courts treat you like the operator.

---

## Compliance Infrastructure: What Each Actually Does

### Onboarding gates

| Step | Booking.com | Airbnb | HomeBites AI | Shef | OYO |
|---|---|---|---|---|---|
| Identity verification | Tax ID | Persona/ID + selfie | DSHS food handler cert | ID + cert + selfie | PAN + Aadhaar + ID |
| Business registration | Hotel license | None (individual host) | None (cottage food) | None (cottage food) | GST + trade license |
| Property/kitchen verification | Self-attest | None | Address verified, no inspection | Photos required, no inspection | Physical engineer audit |
| Background check | None | Optional in some markets | None | Yes via Checkr | None |
| Skills check | None | None | None | Test cook required | None |
| Bank/payout verification | Stripe/bank | Stripe-equivalent | Stripe Connect | Stripe Connect | OYO Secure wallet |
| Contract acceptance | Digital | Digital click-through | **Digital click-through** | Digital | Digital (eMudhra/DocuSign) |
| Time to go live | 1–3 days | Hours | **~30 min target** | 1–2 weeks (test cook) | 30 min (OYO 360) to 6 weeks (full audit) |

### Ongoing compliance

| Mechanism | Booking | Airbnb | HomeBites AI | Shef | OYO |
|---|---|---|---|---|---|
| Cert/license expiration tracking | Hotel responsibility | N/A | **Daily cron, auto-suspend** | Yearly renewal | Annual fire/health renewal |
| Annual re-attestation | No | No | **Yes (in spec)** | Yes | Yes |
| Content moderation (listings) | Light | Light | **AI + keyword + human (3-layer)** | Heavy | Image moderation only |
| Customer complaint handling | Yes | Trust & Safety team | **Incident response playbook** | Yes | Yes |
| Auto-suspend on complaint | Sometimes | Yes | **Yes (P1+ triggers it)** | Yes | Yes |
| Brand standard enforcement | None | Light (rating-based delisting) | **None (legal min only)** | Light | Heavy (5x penalty) |

---

## Where HomeBites AI Sits

You're **closest to Shef** with deliberate moves toward the safer side:

- ✅ Same model: home chefs as unlicensed individuals
- ✅ Same compliance baseline: cert + attestation + indemnification
- ✅ Shef pulls toward Airbnb side (provides chef insurance, vetting)
- ✅ HomeBites AI pulls toward Booking.com side (no co-branding, no "verified")

**This is intentional.** Shef raised over $100M and has lawyers + insurance Shef-the-company can afford. You don't yet. Until you do, hug the Booking.com side of the spectrum.

---

## Why This Matters for Investor Conversations

When investors ask "what's your defensibility / how do you compete with Shef?", here's the framing:

**Don't say:**
- "We verify our chefs more strictly than Shef" (creates duty to verify)
- "We guarantee quality" (creates duty to guarantee)
- "AI recommends the best chef for you" (creates apparent agency)
- "We hand-pick our chefs" (creates editorial liability)

**Do say:**
- "We're a discovery platform — search and filter, not recommend"
- "Our compliance gates are automated — chef self-certifies and we enforce via product, not judgment"
- "Our defensibility is supply-side: we make Texas cottage food onboarding the lowest-friction in the market"
- "We're more like Booking.com than OYO — we never act as merchant of record"

This story sells the same valuation without pre-cooking your liability case.

---

## When To Move Toward The Higher-Liability Side

You don't have to stay maximally passive forever. Some features are worth the liability bump if they unlock real growth, but only **after** you have:

1. ✅ Insurance bound ($1M+ product liability + cyber + E&O)
2. ✅ Lawyer on retainer
3. ✅ At least 1 year of clean incident history
4. ✅ Audit trail proving compliance gates work
5. ✅ Capital to weather a P0 lawsuit

**Then** you can consider:

- "Top-rated chefs this month" (objective, not editorial)
- "HomeBites Verified" badge (only after you actually verify, e.g., kitchen photo + video walkthrough)
- Insurance for chefs (becomes Shef-style)
- Personalized recommendations (with strong disclaimer language)

But not before. Not at launch. Not in the first 1,000 orders.

---

## TL;DR for Lawyer/Investor

> HomeBites AI is a Texas-based home chef marketplace operating in the same model as Shef but with deliberately more passive positioning (closer to Booking.com / Airbnb). We do not co-brand, do not act as merchant of record, do not set prices, do not "verify" chefs beyond legally required cottage food compliance, and do not take physical or financial custody. Compliance is enforced via product (DB triggers, automated cert tracking, AI moderation) rather than via human inspection, which both scales better and creates lower liability exposure than aggregator models like OYO.

---

## File Reference

This comparison draws from:
- File 7 — Incident Response Playbook (how we handle problems)
- File 8 — Content Moderation Spec (how we prevent prohibited items)
- File 9 — Liability Positioning Memo (the strategic reasoning)
- File 1 — Chef Agreement (the contractual structure)
