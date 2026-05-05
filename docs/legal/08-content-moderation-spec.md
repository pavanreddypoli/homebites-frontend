# HomeBites AI — Content Moderation System Spec

**Audience:** Claude Code / engineering
**Purpose:** Detect and block dishes containing prohibited items before they reach customers.

---

## Why This Exists

Texas Cottage Food Law prohibits selling **meat, poultry, seafood, ice cream, low-acid canned goods, raw milk, and CBD/THC** from a home kitchen. If a chef lists a chicken biryani and a customer gets sick, our defense ("we didn't know") collapses. The platform must actively prevent these listings.

This is not a UX nice-to-have. It is a **legal requirement** of operating the marketplace.

---

## Architecture: Three-Layer Defense

```
[Chef adds/edits dish]
        ↓
   Layer 1: Keyword filter (instant, client-side hint + server-side block)
        ↓
   Layer 2: AI classifier (Claude API, server-side, on submit)
        ↓
   Layer 3: Manual review queue (for ambiguous items)
        ↓
   [Dish goes live] OR [Chef sees rejection with reason]
```

Each layer catches what the previous layer missed. No single layer is sufficient alone.

---

## Layer 1 — Keyword Filter

**Where it runs:** Client-side as the chef types (warning) + server-side on submit (hard block).

**English prohibited keywords (blocklist):**
```
chicken, beef, pork, lamb, mutton, goat, veal, turkey, duck,
sausage, bacon, ham, jerky, salami, pepperoni, prosciutto,
fish, salmon, tuna, cod, tilapia, mackerel, sardine, anchovy,
shrimp, prawn, lobster, crab, scallop, oyster, clam, mussel,
ice cream, gelato, sorbet, popsicle, frozen yogurt,
raw milk, unpasteurized,
cbd, thc, cannabis, hemp oil
```

**Hindi/Telugu/Urdu/Tamil prohibited keywords** (your customer base in DFW skews South Asian):
```
murgh, murg, kukad (chicken)
keema, kheema, qeema (ground meat — usually mutton/lamb)
gosht, ghosht, mutton (goat/lamb)
machhi, machli, meen, fish (fish)
jhinga, prawn (shrimp)
boti, kebab, kabab, seekh (meat skewers — context-dependent)
biryani — flag for review (often vegetarian, often not)
```

**Spanish prohibited keywords:**
```
pollo, res, cerdo, cordero, carne, jamón, tocino, chorizo,
pescado, mariscos, camarón, langosta, atún
```

**Implementation:**
```typescript
// lib/moderation/keywords.ts
export const PROHIBITED_KEYWORDS = {
  hard_block: [
    'chicken', 'beef', 'pork', /* ... */
  ],
  flag_for_review: [
    'biryani', 'kebab', 'kabab', 'meatball'
    // these are often vegetarian, send to AI for context
  ]
};

export function keywordCheck(text: string) {
  const lower = text.toLowerCase();
  const hard = PROHIBITED_KEYWORDS.hard_block.find(w =>
    new RegExp(`\\b${w}\\b`, 'i').test(lower)
  );
  if (hard) return { status: 'blocked', matched: hard };

  const flag = PROHIBITED_KEYWORDS.flag_for_review.find(w =>
    new RegExp(`\\b${w}\\b`, 'i').test(lower)
  );
  if (flag) return { status: 'review', matched: flag };

  return { status: 'pass' };
}
```

**Important:** Run on combined `name + description + ingredients` field, not each separately. Use word boundaries (`\b`) to avoid false positives ("hammer" doesn't trigger "ham").

---

## Layer 2 — AI Classifier (Claude)

**Where it runs:** Server-side API route on dish submit, after keyword pass.

**Why we need it:** Keyword filters miss context. "Chicken-style soy curry" (vegetarian) shouldn't be blocked. "Anda curry" (egg, allowed) shouldn't be flagged. "Vegetable kheema" (soy mince, allowed) shouldn't be blocked. The AI handles this.

**Implementation:**
```typescript
// app/api/moderation/classify-dish/route.ts
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a food compliance classifier for a Texas home-chef marketplace operating under Texas Cottage Food Law (SB 541).

Texas Cottage Food Law PROHIBITS sale of any food containing:
1. Meat (beef, pork, lamb, goat, venison, etc.)
2. Poultry (chicken, turkey, duck, etc.)
3. Seafood (any fish, shellfish, crustaceans)
4. Ice cream, gelato, sorbet, popsicles, or other frozen ice products
5. Low-acid canned goods (home-canned vegetables, soups in jars)
6. Raw or unpasteurized milk products
7. CBD, THC, or cannabis-derived ingredients

ALLOWED items include:
- Eggs and egg dishes (anda curry, deviled eggs, etc.)
- All vegetarian and vegan dishes
- Plant-based "meat" alternatives (soy chunks, jackfruit, mock meat)
- Dairy products (cheese, yogurt, butter — pasteurized)
- Baked goods (breads, cakes, cookies, pies)
- Pickles, jams, preserves (high-acid)
- Cooked rice/grain dishes (vegetable biryani, dal, etc.)
- Honey, syrups, dried herbs

Be careful with:
- "Biryani" — flag if mentions meat; allow if vegetable/paneer/egg
- "Kheema" / "Keema" — almost always meat, but soy versions exist (require explicit "soy" or "vegetarian" mention to allow)
- "Kebab" — meat by default; allow paneer/vegetable kebabs
- Ambiguous names — err on the side of REVIEW

Respond with strict JSON only.`;

const USER_PROMPT_TEMPLATE = (dish: DishInput) => `
Classify this dish:

Name: ${dish.name}
Description: ${dish.description}
Ingredients: ${dish.ingredients}

Return JSON in this exact shape:
{
  "decision": "allow" | "block" | "review",
  "category": "meat" | "poultry" | "seafood" | "frozen" | "raw_milk" | "cannabis" | "low_acid_canned" | "ambiguous" | "clear",
  "reason": "<one short sentence explaining the decision>",
  "confidence": 0.0 to 1.0
}`;

export async function POST(req: Request) {
  const dish = await req.json();
  const client = new Anthropic();

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",  // cheap, fast, accurate enough for this
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: USER_PROMPT_TEMPLATE(dish) }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const result = JSON.parse(text.replace(/```json|```/g, "").trim());

  // Log every classification
  await logModeration({
    dish_id: dish.id,
    chef_id: dish.chef_id,
    input: dish,
    output: result,
    model: "claude-haiku-4-5-20251001",
  });

  return Response.json(result);
}
```

**Use Haiku, not Opus.** This runs on every dish add/edit. Haiku is ~10× cheaper and accurate enough for binary classification. Opus only for manual review escalations.

**Cost estimate:** ~$0.0005 per classification. At 10,000 dish-edits/month = $5/month. Cheap insurance.

---

## Layer 3 — Manual Review Queue

When AI returns `decision: "review"` or `confidence < 0.85`:
1. Dish saves with `status: 'pending_review'` (NOT visible to customers)
2. Entry added to `moderation_queue` table
3. Chef sees: "Your dish is being reviewed. We'll email you within 24 hours."
4. Admin dashboard shows queue with sort by oldest first
5. Reviewer (you, until you hire ops) approves or rejects with reason

**Schema:**
```sql
CREATE TABLE moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id int8 REFERENCES dishes(id),
  chef_id uuid REFERENCES home_restaurants(id),
  ai_classification jsonb,
  ai_decision text,
  ai_confidence numeric,
  human_decision text,  -- 'approved' | 'rejected'
  human_reason text,
  human_reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dishes ADD COLUMN moderation_status text DEFAULT 'pending_review';
-- values: 'pending_review', 'approved', 'rejected', 'auto_approved'
```

**Activation gate update:** Dishes only show in customer marketplace if `moderation_status IN ('approved', 'auto_approved')`.

---

## Chef-Facing UX

### When dish is auto-rejected (Layer 1 or Layer 2 hard block)

Show inline error on the form, do not save the dish:

> ❌ **This dish can't be listed on HomeBites AI**
>
> Texas Cottage Food Law doesn't allow home kitchens to sell items containing **[reason: e.g., "chicken or other poultry"]**. To sell items like this, you'd need a commercial kitchen and a food manufacturer's license.
>
> [Learn more about cottage food rules](https://homebitesai.com/help/cottage-food)
>
> Need help adapting this dish? Try a vegetarian, paneer, or soy-based version.

### When dish is sent to review (Layer 2 ambiguous)

Show success-with-note:

> ⏳ **Your dish is being reviewed**
>
> "Lamb-style Soy Kheema" is an ambiguous name — we want to confirm it's vegetarian before listing it. We'll email you within 24 hours. In the meantime, you can edit the description to clarify (e.g., "100% plant-based, no meat").

### When dish is approved

Show normally; chef may not even know it was reviewed.

### When dish is human-rejected

Email + in-app notification:

> Subject: We couldn't approve your dish "Lamb Curry"
>
> Hi [Chef],
>
> Your dish "Lamb Curry" doesn't meet Texas Cottage Food Law requirements because it contains lamb (a prohibited meat).
>
> **What you can do:**
> - Edit the dish to use a plant-based substitute (jackfruit, soy chunks)
> - Remove the dish
> - If you have a commercial kitchen license, contact us to discuss our (upcoming) commercial chef tier
>
> Reply to this email if you have questions.

---

## Photo Moderation (Phase 2 — not launch)

After launch, add image classification to catch dishes where the chef described it as "vegetable curry" but the photo clearly shows chicken. Use Claude's vision capability or a dedicated CV API. Flag mismatches between image and description for review.

Don't block on this at launch — too many false positives, slows onboarding.

---

## Allergen Detection (Required for Labels)

When a chef adds ingredients, also run a parallel classifier to identify the FDA's "Big 9" allergens:
- Milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, sesame

```typescript
// Same Claude API call, can be combined with prohibited check:
{
  "allergens_detected": ["milk", "wheat", "tree_nuts"],
  "allergen_confidence": 0.92
}
```

Pre-fill the dish's allergen multiselect with detected allergens. Chef confirms or edits. Persist to `dishes.allergens`. Used by the label generator (spec 05).

---

## Audit & Reporting

Every classification (auto-approved, blocked, reviewed) writes to `moderation_queue` for traceability.

Monthly review:
- False positive rate (auto-blocks that should have been allowed)
- False negative rate (approved dishes that turned out prohibited — caught via complaint)
- Manual review queue average resolution time
- Top 10 ambiguous keywords driving review volume

Tune the keyword lists and prompt monthly based on data.

---

## Files to Add

```
/lib/moderation/
  ├─ keywords.ts                  # Layer 1 keyword lists
  ├─ classifier.ts                # Layer 2 Claude wrapper
  ├─ queue.ts                     # Layer 3 review queue helpers
  └─ allergens.ts                 # Allergen detection

/app/api/moderation/
  ├─ classify-dish/route.ts       # Main classification endpoint
  └─ review/
      ├─ approve/route.ts
      └─ reject/route.ts

/app/admin/moderation/page.tsx    # Review queue UI (admin only)

/app/help/cottage-food/page.tsx   # Public explainer for rejected chefs
```

Add admin auth guard: only users with `user_metadata.role = 'admin'` can access `/app/admin/*`. Until you have a team, that's just you.
