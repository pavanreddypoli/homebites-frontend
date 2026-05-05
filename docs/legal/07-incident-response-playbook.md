# HomeBites AI — Incident Response Playbook

**Owner:** Pavan (until ops team hired)
**Last updated:** [DATE]
**Review cadence:** Quarterly

> ⚠️ **DRAFT.** Have your lawyer review the legal escalation steps and notification templates before launch.

---

## Why This Exists

When something goes wrong on the platform, the difference between "manageable incident" and "company-ending lawsuit" is **how fast you respond and how well you document it.** This playbook is the runbook.

Print it. Bookmark it. The first time you read this in a real incident is too late.

---

## Incident Severity Levels

| Level | Definition | Examples | Initial Response |
|-------|-----------|----------|------------------|
| **P0 — Critical** | Imminent harm or major regulatory exposure | Confirmed foodborne illness, hospitalization, anaphylaxis, death, lawsuit threat, regulator inquiry, media inquiry | **Suspend chef immediately. Call lawyer within 1 hour.** |
| **P1 — High** | Serious complaint, potential injury | Reported food poisoning (unconfirmed), allergic reaction (mild), foreign object in food, unsafe packaging, repeat complaint about same chef | Suspend chef pending review. Acknowledge customer within 4 hours. |
| **P2 — Medium** | Service or quality complaint | Cold food, wrong order, missing items, hygiene complaint, late pickup, rude interaction | Acknowledge customer within 24 hours. Investigate before action. |
| **P3 — Low** | Platform/UX issue | Bug reports, payment disputes, refund requests, account access | Standard support flow. |

---

## P0 / P1 Response Procedure

### Within 1 Hour of Notification

**1. Acknowledge the customer.**
Use the P0/P1 acknowledgment template (below). Do NOT admit fault. Do NOT promise outcomes. Do NOT speculate about cause.

**2. Suspend the chef.**
Run this from admin dashboard:
```
UPDATE home_restaurants
SET is_active = false,
    suspended_at = now(),
    suspension_reason = 'incident_under_review_[ticket_id]'
WHERE id = '[chef_id]';
```
Log to `compliance_audit_log` with `event_type = 'chef_suspended_incident'`.

**3. Preservation hold.**
Lock all related data. Tag the order, chef profile, dish records, message history, and `compliance_audit_log` entries with the incident ID. Set retention to indefinite (override normal deletion rules).

**4. Notify yourself.**
PagerDuty / phone alert to your number. There is no "morning is fine" for P0.

**5. Call your lawyer.**
Do this **before** sending another customer-facing message. Lawyer guides everything from here on a P0.

### Within 4 Hours

**6. Gather facts (do not contact chef yet).**
- Pull the order: items, time, total, payment status
- Pull the chef profile: cert status, attestation date, agreement version, prior complaints
- Pull `compliance_audit_log` for that chef
- Screenshot the dish listing as it appeared at order time
- Pull customer's order history and communications

**7. Document everything.**
Open an incident file in a private folder (not in Slack, not in email subject lines):
- `incidents/[YYYY-MM-DD]-[ticket-id]/`
  - `summary.md` — what happened, timeline, parties involved
  - `customer-comms/` — every message in/out
  - `chef-comms/` — every message in/out
  - `evidence/` — screenshots, audit log exports, photos sent by customer
  - `legal/` — lawyer guidance, notes, drafts

**8. Decide on chef contact.**
For P0: lawyer-guided communication only.
For P1: contact chef with neutral tone — "We received a complaint about order #X. While we investigate, your account is paused. Please don't sell or deliver any pending orders."

### Within 24 Hours

**9. Regulatory notification (if applicable).**
- **Suspected foodborne outbreak (2+ cases from same chef OR 1 hospitalization):** Notify Texas DSHS at **512-834-6753** (Foodborne Illness Hotline). Lawyer drafts the notification.
- **Allergen mislabeling:** No mandatory state notification, but document chef's labeling history.
- **Death:** Notify DSHS, retain criminal defense counsel even if no charges expected, do not delete anything.

**10. Refund decision.**
For P0/P1, refund the customer's full order regardless of cause. This is not an admission of liability — it's standard hospitality. Process via Stripe refund + log reason.

### Within 7 Days

**11. Investigation conclusion.**
Three possible outcomes:
- **Chef cleared** → reactivate, send neutral close-out message to customer
- **Chef partially at fault** → require corrective action (re-training, re-attestation, additional cert) before reactivation
- **Chef terminated** → permanent ban, terminate Chef Agreement, hold final payout pending claim resolution

**12. Customer resolution.**
Refund + (if applicable) compensation gesture (platform credit). For P0 with injury: lawyer handles, may involve insurance claim.

**13. Post-incident review.**
Internal write-up: what failed in the compliance system that allowed this? What's the system fix?

---

## P2 / P3 Response Procedure

Standard customer support flow:
- Acknowledge within 24 hours
- Investigate (review order, contact chef, review messages)
- Refund or partial refund as appropriate
- Document in support ticket system
- Escalate to P1 if pattern emerges (3+ complaints about same chef in 90 days)

---

## Communication Templates

### P0/P1 Customer Acknowledgment

> Subject: Re: Your recent order on HomeBites AI
>
> Hi [Customer name],
>
> Thank you for reaching out about your order on [date]. We're taking your report seriously and are looking into it now. Your account has been noted, and the food provider has been temporarily paused on the platform pending our review.
>
> A member of our team will follow up within [4 hours / 24 hours] with next steps. If your situation is a medical emergency, please call 911 or seek medical attention immediately.
>
> If you'd like to share any additional details (photos, receipts, timing), please reply to this email.
>
> [Your name]
> HomeBites AI Support

**What this template does:**
- Acknowledges concern without admitting fault
- Shows action (chef paused)
- Sets clear expectation for follow-up
- Encourages medical care without legal language
- Invites evidence preservation

### Chef Notification (P1, after lawyer sign-off if P0)

> Subject: Your HomeBites AI account has been paused
>
> Hi [Chef name],
>
> We received a customer report regarding order #[order_id] on [date]. Per the Chef Agreement Section 10, we've temporarily suspended your account while we review.
>
> **What happens next:**
> - Do not prepare or deliver any pending orders for this customer
> - We'll contact you within 48 hours with questions about the order
> - Please retain any records, ingredients, or packaging from that day
>
> This is a routine review process. We'll reach out shortly.
>
> [Your name]
> HomeBites AI

### Internal Incident Log Entry (template)

```markdown
# Incident [YYYY-MM-DD]-[####]

**Severity:** P0 / P1 / P2 / P3
**Reported:** [datetime]
**Reporter:** [customer name + ID]
**Chef:** [chef name + restaurant ID]
**Order:** [order ID, total, items]

## Timeline
- [time]: Customer reported via [channel]
- [time]: Chef suspended
- [time]: Lawyer notified
- [time]: ...

## Facts
[What we know — no speculation]

## Compliance status at time of order
- Food handler cert: [valid / expired]
- Cottage food attestation: [date]
- Chef Agreement: [version, accepted date]
- Prior complaints: [count]

## Decisions
[What was decided, by whom, when]

## Resolution
[Outcome]

## System learnings
[What in the platform allowed this — what we'll fix]
```

---

## What NOT to Do (Common Mistakes)

❌ **Don't apologize on behalf of the chef.** "We're so sorry our chef did this" = admission of agency relationship. Use "We're sorry to hear about your experience."

❌ **Don't delete anything.** Even "messy" Slack messages, draft emails, internal speculation. Discovery in litigation reaches all of it. Better to have it labeled "draft, do not send" than deleted.

❌ **Don't say "this has never happened before."** It's almost never true and creates discoverable liability if it has.

❌ **Don't post about it publicly.** No social media, no blog post, no investor update mentioning the incident until lawyer clears.

❌ **Don't reactivate the chef quickly to keep them happy.** A 3-day suspension during an investigation is normal. Premature reactivation looks like negligence if the same chef harms another customer.

❌ **Don't talk to media without your lawyer.** "No comment, please contact [lawyer]" is the only acceptable response.

❌ **Don't communicate with the chef and customer in the same thread.** Separate everything.

---

## Insurance Claim Procedure

For any P0 with injury, illness, or property damage:

1. Notify insurance carrier within 48 hours (most policies require prompt notice)
2. Provide: incident summary, evidence folder access, customer contact info, chef contact info
3. Carrier assigns adjuster — they take over communication with customer's legal counsel
4. Continue platform-side response (chef suspension, system fixes) independent of claim

Keep your **insurance broker's after-hours number** in this file. Add it now:
```
Broker: [name]
Phone: [###-###-####]
Email: [...]
Policy #: [...]
```

---

## Pattern Detection (Monthly Review)

Once a month, run these queries and review:

1. Chefs with 2+ complaints in 90 days
2. Dishes flagged by AI moderation but approved (false positives — refine)
3. Dishes that triggered allergen complaints
4. Chefs with expiring certs in next 60 days
5. Repeat customer complaints (potential fraud)

Document review in `incidents/monthly-reviews/[YYYY-MM].md`.

---

## When to Hire Help

- **First P0 with injury** → keep lawyer on retainer ($500-2K/mo). You'll need them again.
- **More than 5 incidents per 1,000 orders** → systemic issue, audit compliance gates and onboarding
- **Any media inquiry** → PR firm + lawyer immediately
- **Class action threat** → specialized litigation firm

---

## Quarterly Drill

Once a quarter, run a tabletop exercise:
1. You receive a report: "Customer hospitalized after eating from Chef X last night"
2. Walk through this playbook step by step
3. Time yourself
4. Note what's unclear or slow
5. Update the playbook

A playbook you've never practiced will fail in a real incident.
