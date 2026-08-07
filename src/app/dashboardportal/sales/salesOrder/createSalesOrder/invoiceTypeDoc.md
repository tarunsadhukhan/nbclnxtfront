# Invoice Type Reference — Sales Order

This document describes each invoice type available in the sales order workflow, its purpose, and the behavioral differences it introduces in the header and line item sections.

## How Invoice Types Work

- Invoice types are defined in the `invoice_type_mst` master table.
- Each company is mapped to a subset of invoice types via the `invoice_type_co_map` table (managed from the Company Admin dashboard under "Invoice Type Mapping").
- The sales order creation form fetches only the invoice types mapped to the current company from `get_sales_order_setup_1`.
- The selected `invoice_type` is stored as an integer (`invoice_type_id`) in the `sales_order` header.

---

## Invoice Types

### 1. Regular (invoice_type_id = 1)

**Purpose:** Standard sales order for general merchandise and finished goods.

**Header behavior:**
- All standard header fields are active (customer, broker, billing/shipping addresses, transporter, delivery/payment terms).
- GST tax calculations apply based on billing/shipping state (IGST for inter-state, CGST+SGST for intra-state).

**Line item behavior:**
- Standard item selection from item groups.
- All item fields active: item group, item, make, quantity, rate, UOM, discount, remarks.
- Tax percentage applied per line item from item master.

**This is the default behavior — all other invoice types modify or extend this baseline.**

---

### 2. Hessian (invoice_type_id = 2)

**Purpose:** Sales orders for hessian (jute fabric) products. Pricing is rate-per-MT with brokerage deduction; quantities are entered in bales and converted to MT for the main record via `uom_item_map_mst`.

**Header behavior:**
- Standard header fields are active.
- `broker_commission_percent` (brokerage %) is used to derive the billing rate. Changing brokerage recalculates all line billing rates in real time.

**Line item behavior — Qty column:**
- User enters quantity in **bales** (stored in `sales_order_dtl_hessian.qty_bales`).
- The MT equivalent is computed: `qty_mt = qty_bales / conversion_factor` and stored in `sales_order_dtl.quantity`.
- An annotation below the input shows "≈ X MT".

**Line item behavior — Rate column:**
- User enters the **raw rate per MT** (pre-brokerage). This is NOT stored directly in the main table.
- Derived values:
  - `rate_per_bale = raw_rate_mt / conversion_factor` → stored in `sales_order_dtl_hessian.rate_per_bale`
  - `billing_rate_mt = raw_rate_mt − (raw_rate_mt × brokerage%) / 100` → stored in both `sales_order_dtl.rate` and `sales_order_dtl_hessian.billing_rate_mt`
  - `billing_rate_bale = billing_rate_mt / conversion_factor` → stored in `sales_order_dtl_hessian.billing_rate_bale`
- Annotations below the input show: "≈ X / Bale", "Billing: X / MT", "Billing: X / Bale".

**Line item behavior — Amount:**
- `amount = qty_mt × billing_rate_mt − discount` (discount is applied on the billing rate, after brokerage deduction).
- Tax is calculated on the post-discount amount as usual.

**Conversion factor source:**
- `uom_item_map_mst` where `map_from_id` = the item's default UOM (MT) and `map_to_id` = Bales.
- `relation_value` = bales per MT (e.g., 5 means 1 MT = 5 Bales).
- Resolved per-item when the item is selected, stored as `conversionFactor` on the line.

**Extension table:** `sales_order_dtl_hessian`
- One row per line item (FK: `sales_order_dtl_id`, unique).
- Columns: `qty_bales`, `rate_per_bale`, `billing_rate_mt`, `billing_rate_bale`, `updated_by`, `updated_date_time`.
- Created/updated alongside `sales_order_dtl`; hard-deleted on update before re-insert.

---

### 3. Govt Sacking (invoice_type_id = 3)

**Purpose:** Sales orders for government sacking (jute bags for government procurement — food grains, fertilizer, etc.). These follow government tender pricing and specifications.

**Planned header behavior changes:**
- May require tender/contract reference number.
- Government buyer details and delivery schedule fields.
- Pricing governed by government-mandated rates.

**Planned line item behavior changes:**
- Item groups filtered to sacking-related items.
- Fixed rates from government tender (rate field may be pre-filled or locked).
- Additional fields for bag specification (size, weight, ply count).
- Delivery schedule integration (quantity per delivery).

---

### 4. Yarn (invoice_type_id = 4)

**Purpose:** Sales orders for jute yarn. Yarn orders use yarn-specific quality parameters and count-based specifications.

**Planned header behavior changes:**
- May include yarn quality/count specification fields.
- Spindle/machine details for production reference.

**Planned line item behavior changes:**
- Item groups filtered to yarn-related items.
- Additional columns for yarn count, quality grade, number of cones/bobbins.
- Rate may be per kg with count-based pricing tiers.
- Quality tolerance fields (acceptable deviation percentage).

---

### 5. Raw Jute (invoice_type_id = 5)

**Purpose:** Sales orders for raw jute (loose jute fibre before processing). Used for trading raw jute bales between mills, dealers, and agricultural cooperatives.

**Planned header behavior changes:**
- May require crop year and jute variety/grade fields.
- Pricing typically weight-based (per quintal or per maund).
- Moisture percentage and selection details.

**Planned line item behavior changes:**
- Item groups filtered to raw jute varieties (e.g., TD, Mesta, White Jute).
- Additional columns for bale count, average bale weight, gross/tare/net weight.
- Rate per quintal with grade-based pricing.
- Quality parameters: staple length, root content, moisture %.

---

### 6. Jute Invoice (invoice_type_id = 6)

**Purpose:** General-purpose invoice type for jute-related transactions that do not fall under the more specific categories (Hessian, Govt Sacking, Yarn, Raw Jute). Covers miscellaneous jute products, jute diversified products (JDP), and composite jute goods.

**Planned header behavior changes:**
- Standard header fields with optional jute-specific metadata.
- May include fields for product category classification.

**Planned line item behavior changes:**
- Item groups may include a broader range of jute products.
- Standard rate and quantity fields apply.
- Additional fields for product specification as needed.

---

## Implementation Status

| Invoice Type   | ID | Dynamic Dropdown | Header Changes | Line Item Changes |
|----------------|----|------------------|----------------|-------------------|
| Regular        | 1  | Done             | N/A (baseline) | N/A (baseline)    |
| Hessian        | 2  | Done             | Done           | Done              |
| Govt Sacking   | 3  | Done             | Planned        | Planned           |
| Yarn           | 4  | Done             | Planned        | Planned           |
| Raw Jute       | 5  | Done             | Planned        | Planned           |
| Jute Invoice   | 6  | Done             | Planned        | Planned           |

## Database Tables

- `invoice_type_mst` — Master list of all invoice types (columns: `invoice_type_id`, `invoice_type_name`, `invoice_type_remarks`)
- `invoice_type_co_map` — Company-to-invoice-type mapping (columns: `invoice_type_co_map_id`, `co_id`, `invoice_type_id`, `active`, `updated_by`, `updated_date_time`)
- `sales_order.invoice_type` — Stores the selected `invoice_type_id` on each sales order header
- `sales_order_dtl_hessian` — Per-line extension for Hessian (invoice_type=2). Columns: `sales_order_dtl_hessian_id` PK, `sales_order_dtl_id` FK (unique), `qty_bales`, `rate_per_bale`, `billing_rate_mt`, `billing_rate_bale`, `updated_by`, `updated_date_time`

## Backend Endpoint

- `GET /api/salesOrder/get_sales_order_setup_1?co_id=X&branch_id=Y` — Returns `invoice_types` array with `{ invoice_type_id, invoice_type_name }` for the given company.
