# Invoice Type Reference — Sales Invoice

This document describes each invoice type available in the sales invoice workflow, its purpose, and the behavioral differences it introduces in the header and line item sections.

## How Invoice Types Work

- Invoice types are defined in the `invoice_type_mst` master table.
- Each company is mapped to a subset of invoice types via the `invoice_type_co_map` table (managed from the Company Admin dashboard under "Invoice Type Mapping").
- The sales invoice creation form fetches only the invoice types mapped to the current company from the setup endpoint.
- The selected `invoice_type` is stored as an integer (`invoice_type_id`) in the `sales_invoice` header.

---

## Invoice Types

### 1. Regular (invoice_type_id = 1)

**Purpose:** Standard sales invoice for general merchandise and finished goods.

**Header behavior:**
- All standard header fields are active (customer, billing/shipping addresses, transporter, delivery terms).
- GST tax calculations apply based on billing/shipping state (IGST for inter-state, CGST+SGST for intra-state).

**Line item behavior:**
- Standard item selection from item groups.
- All item fields active: item group, item, make, quantity, rate, UOM, discount, remarks.
- Tax percentage applied per line item from item master.

**This is the default behavior — all other invoice types modify or extend this baseline.**

---

### 2. Hessian (invoice_type_id = 2)

**Purpose:** Sales invoices for hessian (jute fabric) products. Hessian invoices may involve specific grading, weight-based pricing, and jute-industry-specific fields.

**Planned header behavior changes:**
- May require additional fields for lot/grade specification.
- Pricing may be weight-based (per kg/per bale) rather than per unit.

**Planned line item behavior changes:**
- Item groups filtered to hessian-related groups only.
- Additional columns for bale count, weight per bale, gross/net weight.
- Rate calculation may differ (rate per kg vs rate per unit).

---

### 3. Govt Sacking (invoice_type_id = 3)

**Purpose:** Sales invoices for government sacking (jute bags for government procurement — food grains, fertilizer, etc.). These follow government tender pricing and specifications.

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

**Purpose:** Sales invoices for jute yarn. Yarn invoices use yarn-specific quality parameters and count-based specifications.

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

**Purpose:** Sales invoices for raw jute (loose jute fibre before processing). Used for billing raw jute bales traded between mills, dealers, and agricultural cooperatives.

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
| Hessian        | 2  | Done             | Planned        | Planned           |
| Govt Sacking   | 3  | Done             | Planned        | Planned           |
| Yarn           | 4  | Done             | Planned        | Planned           |
| Raw Jute       | 5  | Done             | Planned        | Planned           |
| Jute Invoice   | 6  | Done             | Planned        | Planned           |

## Database Tables

- `invoice_type_mst` — Master list of all invoice types (columns: `invoice_type_id`, `invoice_type_name`, `invoice_type_remarks`)
- `invoice_type_co_map` — Company-to-invoice-type mapping (columns: `invoice_type_co_map_id`, `co_id`, `invoice_type_id`, `active`, `updated_by`, `updated_date_time`)
- `sales_invoice.invoice_type` — Stores the selected `invoice_type_id` on each sales invoice header

## Backend Endpoint

- The sales invoice setup endpoint returns an `invoice_types` array with `{ invoice_type_id, invoice_type_name }` for the given company.
