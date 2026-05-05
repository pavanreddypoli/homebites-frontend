# HomeBites AI — Platform Liability Positioning Memo

**Audience:** Pavan + future product/engineering team
**Purpose:** Strategic reference for product decisions that affect legal liability
**Last updated:** [DATE]

> Read this before making any product decision that involves how HomeBites AI relates to chefs, food, or recommendations. Legal positioning IS product positioning. The two cannot be separated.

---

## The Core Principle

**The more passive you are, the more protected you are.**
**The more active you are, the more liable you become.**

Courts call this the "stream of commerce" test. The question they ask: did the platform actively participate in the transaction, or did it merely connect two parties? The answer determines whether you're a publisher (largely immune) or a distributor (largely liable).

---

## The Liability Spectrum

```
        SAFER                                                   RISKIER
        ←──────────────────────────────────────────────────────→
   Craigslist  Facebook   eBay      Etsy      Shef      DoorDash    Amazon
   classifieds Marketplace                                          (FBA)

   ──── Section 230 protected ────|──── Increasingly liable ────→
```

**Where HomeBites AI sits today:** Closer to Shef than to Facebook Marketplace. We process payments (via Stripe Connect), enforce listing rules, and verify chefs. But we don't take custody of food, don't ship, don't pick favorites.

**Goal:** Stay as far left on this spectrum as the product allows.

---

## What Makes a Platform "Active" (Risky) vs. "Passive" (Safe)

### Active — increases liability
- Taking physical custody of the product (warehousing, shipping)
- Processing payments and holding funds before paying seller
- Acting as merchant of record on the receipt
- Algorithmically recommending specific sellers/products
- Editorial curation ("Editor's Picks", "Featured Chefs")
- Co-branding products ("HomeBites Chicken Curry")
- Writing product descriptions
- Setting prices
- Promising quality, safety, or vetting in marketing copy
- Providing instructions on how to make the product
- Offering "guarantees" beyond refund policy

### Passive — preserves protection
- Listing seller-provided content
- Letting users search/filter
- Showing results by objective criteria (distance, rating, price, recency)
- Seller is merchant of record
- Seller writes their own descriptions
- Seller sets their own prices
- Platform stays out of the physical transaction

---

## Texas Is Friendly Territory

Texas courts have repeatedly **declined** to extend liability to online marketplaces. The Texas Supreme Court ruled in Amazon's favor in **Amazon.com v. McMillan (2021)** on similar issues. Joining Minnesota and Arizona in this position.

**This matters for HomeBites AI because:**
- Operating in Texas
- Texas customers
- Texas chefs
- Texas-only at launch

A plaintiff in Texas faces a steeper hill than a plaintiff in California (Bolger) or Pennsylvania (Oberdorf). Don't squander this advantage by accepting jurisdiction elsewhere — keep arbitration in Dallas County.

---

## The Hard Tension: AI Personalization vs. Liability

The product vision says **"AI-powered personalization is the core differentiator."** This is the single biggest liability risk in the product.

**Why:** Every recommendation you make ("we suggest Anita's Kitchen for you") is the platform actively directing a customer to a specific chef. If that chef poisons the customer, the plaintiff's lawyer says: "*The platform sent my client there. The platform chose this chef. The platform is responsible.*"

**You don't have to abandon AI. You have to reframe it.**

### Risky framings (sound like Amazon)
- "We recommend Anita's Kitchen for you tonight"
- "Top picks for you"
- "HomeBites Featured Chefs"
- "Editor's Choice"
- "Verified safe and delicious"
- "Personalized for your taste"
- "Our AI matched you with this chef"

### Safe framings (sound like a search engine)
- "Anita's Kitchen matches your search for 'spicy vegetarian under $15'"
- "Sorted by distance from you"
- "Top-rated within 3 miles"
- "You searched for: South Indian. Here's what's available."
- "AI helped translate your search — here are matches"
- "Filter by: cuisine, price, rating, distance"

**Same underlying feature. Different liability profile.**

The legal distinction: a **search tool the user controls** is heavily protected (search engines have decades of case law in their favor). A **recommendation engine that picks for the user** is increasingly under attack — see Anderson v. TikTok, Wozniak v. YouTube, and the broader Section 230 erosion around algorithmic content.

---

## Product Decisions: A Checklist

Before adding any feature, ask:

### 1. Does this take us closer to Amazon or closer to Facebook Marketplace?
If Amazon → reconsider, redesign, or document the increased risk.

### 2. Does this make the user the decision-maker, or do we make the decision?
User decision-maker = safer. Platform decision-maker = riskier.

### 3. Does this create a duty we'd have to fulfill?
"Verified safe" = duty to verify safety. "Background-checked" = duty to background check. Don't promise things that create duties.

### 4. Does this make us look like the seller, the producer, or the source of the product?
Co-branding, custom packaging, our-name-on-it = looks like seller. Avoid.

### 5. Does this take physical or financial custody of the chef's product?
If we hold food or hold money beyond brief payment processing → distributor risk.

---

## Specific Decisions to Lock In Now

### ✅ Already correct (don't change)
- **Pickup only** — never delivery via gig drivers (Texas cottage food law mandate, also keeps us passive)
- **Stripe Connect Standard** — chef is merchant of record, money flows direct
- **Chef self-lists, sets own prices** — we're a tool, not a curator
- **Chef provides own photos** — we don't author content
- **Texas-only** — friendlier jurisdiction, simpler compliance

### ⚠️ Decisions to make
- **Search vs. recommendations** — frame all AI features as search/filter tools, not recommenders
- **Branding language** — "chefs on HomeBites AI" never "our chefs"; "Anita's biryani" never "HomeBites biryani"
- **Marketing copy** — review every page for words that create duties (verified, safe, vetted, guaranteed, hand-picked)
- **Featured chefs** — don't have them at launch. If added later, make criteria objective and disclosed (e.g., "highest-rated this month" not "our favorites")
- **Reviews** — display them, don't curate them; show all reviews above a length threshold, don't pick "helpful" ones algorithmically

### ❌ Avoid (do not build)
- "HomeBites recommends" any specific chef
- "Personalized for you" branding (use "matches your search")
- Co-branded packaging (we provide template; chef brand stays primary)
- Photography services (chef provides photos)
- "Verified" badges that imply we did anything beyond "they passed cottage food onboarding"
- Quality guarantees beyond refund policy
- Endorsements of specific dishes ("must-try")

---

## The Marketing Copy Audit

Before launch, audit every line of customer-facing copy for liability-creating language. Examples to flag:

| Risky | Safer |
|---|---|
| "Verified home chefs" | "Home chefs operating under Texas Cottage Food Law" |
| "Safe, home-cooked meals" | "Home-cooked meals from independent chefs" |
| "Hand-picked chefs" | "Independent chefs in your area" |
| "Trusted by HomeBites" | "Active on HomeBites" |
| "Guaranteed delicious" | (don't promise this) |
| "Our chefs" | "Chefs on HomeBites" / "Independent chefs" |
| "We deliver authentic..." | "Discover authentic..." |
| "Approved for quality" | "Onboarded and active" |
| "AI selects the best for you" | "AI helps you find what you're looking for" |

Run this audit on:
- Landing page (homebitesai.com)
- App store listings
- Email templates
- Social media bio + posts
- Chef recruitment pages
- Customer onboarding flow
- Investor pitch deck (yes — discoverable)

---

## When AI Personalization Actually Becomes Useful

**You don't lose differentiation by reframing.** Here's how the same AI capabilities serve users while staying on the safe side:

| Capability | Risky implementation | Safe implementation |
|---|---|---|
| Natural language search | "Tell me what to eat" → AI picks | "What are you in the mood for?" → AI translates to search filters → user picks |
| Dietary filtering | "Safe meals for diabetics" | "Filter: low-sugar dishes (per chef's tags)" |
| Cuisine discovery | "We think you'd love Telugu food" | "Browse by cuisine: Telugu (12 chefs nearby)" |
| Re-ordering | "We recommend reordering X" | "Your past orders" |
| Allergen warnings | "Safe for nut allergies" | "Chef has tagged this as: contains tree nuts" |

**The pattern:** AI as an interface to data, not as an authority that vouches for outcomes.

---

## How to Talk About This with Investors

Investors will ask "what's your moat / what's your defensibility?" If you say "AI recommendations of best chefs," you've now also told a plaintiff's lawyer your business model is to actively direct customers to specific sellers.

**Better investor framing:**
- "We use AI to make hyperlocal home-cooked food **discoverable** at scale"
- "Natural-language search lets users find exactly what they're craving"
- "AI helps chefs write better listings and helps customers find their match"
- "The defensibility is the supply side: regulated chef onboarding + cottage food expertise"

This story sells just as well, and it doesn't pre-cook your liability case for you.

---

## When to Revisit This Memo

- Before launching any new feature involving recommendations, ranking, or AI
- When updating marketing copy or brand messaging
- Before any press, investor pitch, or partnership announcement
- After any incident (P0/P1) — was our positioning a factor?
- Annually as part of legal review

---

## TL;DR

1. **Be Facebook, not Amazon.** Passive intermediary > active distributor.
2. **AI is a search tool, not a recommendation engine.** Same feature, safer framing.
3. **Use Texas to your advantage.** Keep jurisdiction here. Don't take California users until you have insurance and a lawyer on retainer.
4. **Audit your words.** "Verified," "safe," "trusted," "our" — all carry legal weight.
5. **Branding stays with the chef.** "Anita's Kitchen on HomeBites" not "HomeBites Anita's Kitchen."
6. **Never take custody.** Of food. Of money beyond brief payment processing. Of editorial decisions.

The platform that ships in 8 weeks looks more like a classifieds-with-payments site than like a curated marketplace. **That's not a downgrade — that's the moat.** The legal positioning is what lets you scale without dying in the first lawsuit.
