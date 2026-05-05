# HomeBites AI — Dish Label Generator Spec

**Audience:** Claude Code / engineering
**Purpose:** Auto-generate a printable PDF label for each order item that satisfies Texas Cottage Food Law labeling requirements.

---

## When It's Generated

When an order moves to status `placed` (after payment success), generate one label PDF per order item and attach to the chef's order detail view at `/dashboard/home-restaurant/orders/[orderId]`.

Chef prints labels and attaches one to each packaged item before pickup.

---

## Required Label Content (Texas SB 541)

Every label MUST include, in this order:

1. **Chef's name** OR **DSHS registration number** (if chef opted into number for privacy)
2. **Chef's address** (omitted if registration number is used)
3. **Common product name** (e.g., "Vegetable Biryani")
4. **Allergen statement** — list any of the following present in the dish:
   - milk, eggs, wheat, soy, peanuts, tree nuts, fish, shellfish
   - Format: "**CONTAINS:** milk, wheat, eggs"
5. **Mandatory disclaimer** in at least 10-point type:
   > **THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION.**
6. **Production date** (date label is generated, in `YYYY-MM-DD` format)
7. **For TCS foods only**, additional line:
   > **SAFE HANDLING INSTRUCTIONS:** To prevent illness from bacteria, keep this food refrigerated or frozen until the food is prepared for consumption.

---

## Layout

- Page: 4" × 6" PDF (fits on standard shipping label sheets, also prints fine on letter paper at 4-up)
- Font: sans-serif, all body text 10pt minimum, disclaimer 10pt bold
- Top: HomeBites AI logo (small) + order ID
- Body: chef name/address, dish name (large/bold), allergens, dates
- Bottom: disclaimer in a bordered box for visibility

---

## Implementation

Use a server-side PDF generator (e.g., `@react-pdf/renderer` or `pdfkit`) in a new API route:

```
/app/api/labels/[orderId]/route.ts
```

Pull from:
- `orders` (id, created_at)
- `order_items` (joined to `dishes` for ingredients/allergens)
- `home_restaurants` (chef name, address, dshs_registration_id)

Add a column to `dishes`:
```sql
ALTER TABLE dishes ADD COLUMN allergens text[] DEFAULT '{}';
ALTER TABLE dishes ADD COLUMN is_tcs bool DEFAULT false;
```

Update the add-item / edit-item forms to capture allergens (multi-select) and TCS flag.

---

## Chef UX

In the order detail page:
- Button: **"Download labels for this order"** → triggers PDF download
- Button: **"Print labels"** → opens print dialog with the PDF

Show a one-time tutorial modal on first order: "Every package needs a label. Print these and attach one to each item before pickup."

---

## Compliance Note

The label generator helps chefs comply but does NOT shift legal responsibility. The Chef Agreement Section 4.3 confirms the chef remains responsible for accurate labeling. Document this clearly in the chef-facing UI.
