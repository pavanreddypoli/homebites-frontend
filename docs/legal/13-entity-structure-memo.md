# Entity Structure Memo — HomeBites AI

**Decision:** HomeBites AI operates as a DBA (Assumed Name) under **RedCube Group LLC**, an existing Texas LLC.
**Decided:** [DATE]
**Owner:** Pavan

> Reference doc for lawyer, accountant, banker, and future investors. Captures the entity structure decision and the migration path to a separate entity post-funding.

---

## Current Structure

```
┌─────────────────────────────────────┐
│      RedCube Group LLC              │
│      (Texas LLC — parent entity)    │
│      EIN: [###-#######]             │
│      ─────────────                  │
│      d/b/a HomeBites AI             │
│      (homebitesai.com)              │
└─────────────────────────────────────┘
```

**All contracts, lawsuits, taxes, payments flow to RedCube Group LLC.**
HomeBites AI is a brand / business line, not a separate legal entity.

---

## Why a DBA at Launch (Not a Separate LLC)

| Factor | DBA under RedCube | New HomeBites AI LLC |
|---|---|---|
| Setup cost | ~$40 | ~$300 |
| Setup time | 1 day | 5 days |
| New EIN required? | No | Yes |
| New bank account? | No (add DBA) | Yes |
| New Stripe KYC? | No | Yes |
| Tax filing | One return | Two returns |
| Liability isolation | Shared with RedCube | Isolated |
| Investor-readiness | Needs spin-out | Ready as-is |

**At pre-launch / pre-funding, the DBA wins on speed and simplicity. Liability isolation matters less when there's no traction yet.**

---

## How This Shows Up in Documents

### Legal entity name (formal)
> **RedCube Group LLC**, a Texas limited liability company doing business as **HomeBites AI**

### Shorthand (consumer-facing copy)
> **HomeBites AI**

### Citation format in contracts
> RedCube Group LLC d/b/a HomeBites AI ("HomeBites AI")

### Footer of homebitesai.com
> © RedCube Group LLC d/b/a HomeBites AI. All rights reserved.

### Customer card statement (Stripe)
> HOMEBITES AI

### IRS / tax forms
> RedCube Group LLC (HomeBites AI is just a name, not a separate taxpayer)

---

## What Filed Where

| Filing | Where | Status | Cost | Renewal |
|---|---|---|---|---|
| LLC formation (RedCube Group LLC) | TX SOS | ✅ Complete | (already paid) | None — perpetual |
| Assumed Name Certificate (Form 503) | TX SOS | ⬜ To file | ~$25 | Every 10 years |
| Assumed Name Certificate | Collin County Clerk | ⬜ To file | ~$15 | Every 10 years |
| EIN | IRS | ✅ Complete | Free | None |
| Texas Franchise Tax | TX Comptroller | ✅ Existing for RedCube | (varies) | Annual |
| Texas Sales Tax Permit | TX Comptroller | ⬜ Confirm scope | Free | Annual |
| Federal trademark "HomeBites AI" | USPTO | ⬜ Optional | ~$350 | Every 10 years (after grant) |

---

## Banking Setup

**Existing:** RedCube Group LLC bank account (use this)
**Action:** Add HomeBites AI as DBA — bring filed Assumed Name Certificate

Most banks (Mercury, Relay, Chase) handle this in ~10 minutes. Some let you create a "sub-account" or a separate routing for clean accounting separation. Optional but recommended for tax/audit clarity.

**Internal accounting:** Track HomeBites AI revenue and expenses as a separate cost center inside RedCube's books. QuickBooks, Xero, etc. all support this. Talk to your accountant.

---

## Stripe Setup

**Two options:**

**Option A — Same Stripe account, different statement descriptor (simpler)**
- Existing RedCube Stripe account
- Set "HOMEBITES AI" as the statement descriptor for HomeBites transactions
- Customer card statement reads "HOMEBITES AI"
- Single dashboard, single payouts settings

**Option B — Separate Stripe account for HomeBites (cleaner)**
- New Stripe account, KYC under RedCube Group LLC + DBA
- Independent dashboard, independent payouts
- Required for clean Stripe Connect setup if HomeBites Connect is large

**Recommendation:** Start with Option A. Migrate to Option B once monthly Connect volume crosses ~$50K (clean separation matters more at scale).

---

## Liability Risk Profile

The DBA structure means a HomeBites AI lawsuit can reach RedCube Group LLC's other assets. This is a **real risk** worth understanding:

**Mitigations already in place:**
- Strong arbitration + class waiver in Customer ToS (File 2)
- Chef indemnification in Chef Agreement (File 1)
- Insurance bound before first paid order (File 6)
- Compliance gates and audit trail (File 4, File 8)
- Liability-aware product positioning (File 9)

**Mitigations from RedCube side:**
- Keep RedCube's other valuable IP / contracts in separate documentation
- Don't comingle high-value RedCube assets in HomeBites operations
- Maintain clean accounting separation (cost center, sub-account)

**The acceptable level of risk depends on what else RedCube owns.** If RedCube holds a few hundred thousand in cash and some IP, the DBA is fine. If RedCube has multi-million-dollar assets you can't lose, consider spinning HomeBites out earlier.

---

## Future Migration Path (Post-Funding)

**Trigger to spin out:** First serious investor conversation, or first $250K in annual revenue, whichever comes first.

**Spin-out structure (typical YC / VC playbook):**
1. Form **HomeBites AI, Inc.** as a Delaware C-Corp
2. Transfer HomeBites AI assets from RedCube Group LLC → HomeBites AI, Inc.
   - Domain (homebitesai.com)
   - Trademark
   - Software / IP
   - Chef contracts (assigned)
   - Stripe account
   - Customer database (subject to Privacy Policy notification)
3. Issue founder shares to Pavan in HomeBites AI, Inc.
4. Investors invest in HomeBites AI, Inc.
5. RedCube Group LLC retains royalty / equity stake in HomeBites AI, Inc. (optional, common)

**Cost of spin-out:** $3K–10K in legal fees. Usually paid by investor capital.

**Why Delaware C-Corp:** Standard for venture-backed companies. Investor-friendly governance, stock options for employees, dual-class shares possible, easier path to acquisition or IPO.

**Don't try to spin out yourself.** Hire a startup-experienced lawyer (Cooley, Wilson Sonsini, Gunderson, or solo specialists like Stripe Atlas with attorney add-on) to do this. Cap table mistakes here are nearly irreversible.

---

## What to Tell the Lawyer (Initial Consultation)

When you meet your Texas marketplace lawyer:

> "RedCube Group LLC is my existing Texas LLC. I'm launching HomeBites AI as a DBA under RedCube. I have the Assumed Name Certificate filed. I plan to spin HomeBites AI out into a Delaware C-Corp once we raise a seed round, but for launch through the first year I'm operating it as a DBA. I need:
>
> 1. ToS, Chef Agreement, Privacy Policy reviewed and finalized for the DBA structure
> 2. Confirmation that the DBA structure doesn't create any unexpected liability surprises specific to my industry (cottage food marketplace)
> 3. A retainer relationship for incident response post-launch"

That gives them everything they need to scope the engagement.

---

## TL;DR

- ✅ Use DBA: RedCube Group LLC d/b/a HomeBites AI
- ✅ Cost: ~$40 + 1 day
- ✅ All legal docs reference the formal name; consumer copy uses "HomeBites AI"
- ✅ Plan to spin out into Delaware C-Corp at seed funding
- ⚠️ Liability is shared with RedCube — accept this risk consciously
- ⚠️ Keep clean accounting separation for future spin-out simplicity
