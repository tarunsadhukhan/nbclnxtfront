# Purchase Order (PO) Page — Procurement Module

## 1. Overview

The **Purchase Order (PO)** page is part of the Procurement module. It allows users to create purchase orders either **directly** (without an indent) or **against existing indents**. The system behaviour depends on a **company-level configuration** that determines whether indent usage is mandatory or optional.

This document serves as:

- **AI Agent Context** — a reference for automated decision-making and validation logic.
- **Developer Technical Spec** — a definitive source for implementing business rules.
- **End-User Documentation** — a guide for understanding how PO creation works.

**Prerequisite reading:** The Indent Page specification. PO validation logic references and builds upon indent concepts (expense types, max/min/reorder quantities, stock checks, financial year scoping).

---

## 2. Core Concepts

### 2.1 PO Creation Modes

The system supports two PO creation modes, governed by a **company configuration flag** stored in a separate configuration table.

| Config Setting | Behaviour |
|----------------|-----------|
| **Indent Mandatory = ON** | All POs must be created against approved indents. Direct PO creation is disabled. |
| **Indent Mandatory = OFF** | Users may create POs directly (without indent) or against indents. Both paths are available. |

### 2.2 PO Types

| PO Type | Description |
|---------|-------------|
| **Regular** | A standard purchase order for one-time or routine procurement. |
| **Open** | An open-ended purchase order, typically used for recurring or flexible requirements within a financial year. |

When a PO is created **against an indent**, the PO Type is **inherited from the Indent Type** using the following mapping:

| Indent Type | Inherited PO Type |
|-------------|-------------------|
| Regular | Regular |
| BOM | Regular |
| Open | Open |

When a PO is created **directly** (no indent), the user selects the PO Type manually.

### 2.3 Expense Types

Expense types are identical to those in the Indent module:

| Expense Type | Description |
|--------------|-------------|
| **General** | General-purpose expenses not tied to a specific category. |
| **Maintenance** | Expenses related to maintenance activities. |
| **Production** | Expenses related to production processes. |
| **Overhaul** | Expenses related to overhaul or refurbishment activities. |
| **Capital** | Capital expenditure items. |

When a PO is created against an indent, the Expense Type is **inherited from the indent header**. When created directly, the user selects it manually.

---

## 3. Header Rules

### 3.1 Indent-Based PO

When creating a PO against indents, the header fields are determined as follows this is at the line item level:

| Field | Behaviour |
|-------|-----------|
| **PO Type** | Auto-inherited from indent type (see Section 2.2 mapping). Read-only. |
| **Expense Type** | Auto-inherited from indent header. Read-only. |
| **Party (Supplier)** | User selects from Party Master (filtered to party_type = 'supplier'). |
| **Rate** | Manual entry per line item. |

**Indent selection:** The user selects from a list of approved indents that have outstanding (unfulfilled) quantities. Multiple indents can be selected and clubbed into a single PO (see Section 5 for FIFO consumption logic).

### 3.2 Direct PO (No Indent)

When creating a PO directly (only available when Indent Mandatory = OFF):

| Field | Behaviour |
|-------|-----------|
| **PO Type** | User selects: Regular or Open. |
| **Expense Type** | User selects: General, Maintenance, Production, Overhaul, or Capital. |
| **Party (Supplier)** | User selects from Party Master (filtered to party_type = 'supplier'). |
| **Rate** | Manual entry per line item. |

The selected PO Type + Expense Type combination determines which **line item validation logic** applies (see Section 6).

---

## 4. PO View Fields

The PO listing view displays the following fields:

| Field | Description |
|-------|-------------|
| **PO Status (Header)** | Current status of the PO at the header level. |
| **PO Type** | Regular or Open. |
| **Expense Type** | General, Maintenance, Production, Overhaul, or Capital. |
| **PO Line Item ID** | Unique identifier for each line item within the PO. |
| **Party Name** | Supplier name from the Party Master. |
| **Rate** | Unit rate for the line item. |
| **Quantity** | Ordered quantity for the line item. |
| **Source** | Indicates whether the line item is indent-based or direct. |
| **Linked Indent Line Item ID(s)** | Reference to source indent line item(s), if applicable. Displays "Direct" for non-indent POs. |

---

## 5. Indent-Based PO — Line Item Logic

When a PO is created against indents, the system **trusts the indent-stage validation**. No re-validation of stock levels or max/min quantities is performed at PO creation time. The primary control is ensuring PO quantities do not exceed indent outstanding quantities (subject to tolerance).
unless this indent type was open. in this case it needs to use the formula --> max qty for branch - po balance qty for branch - current stock for branch (all 3 for that item)


### 5.1 Quantity Control — Tolerance

not applicable 

### 5.2 FIFO Consumption Logic (Multi-Indent Clubbing)

When a single PO line item draws from **multiple indent line items for the same item**, the system applies **FIFO (First In, First Out)** consumption based on indent creation date/sequence.

#### Behaviour

- **Frontend:** Displays a single consolidated line item showing the **total quantity** and item details. The user enters one quantity value.
- **Backend:** Stores **multiple records** — one per indent line item consumed — each recording the quantity consumed from that specific indent.
- **API Response:** Returns the data as a **single aggregated entry** per item, with the consumed indent breakdown available in a nested/detail structure if needed.

#### Worked Example

| Indent | Indent Line Item | Item | Outstanding Qty | Created Date |
|--------|-----------------|------|-----------------|--------------|
| IND-001 | IND-001-LI-01 | Item A | 5 | 01-Apr-2025 |
| IND-002 | IND-002-LI-03 | Item A | 6 | 15-Apr-2025 |

**User enters PO quantity for Item A: 8**

FIFO consumption:

| Step | Source Indent Line Item | Consumed | Remaining in Indent |
|------|------------------------|----------|---------------------|
| 1 | IND-001-LI-01 (oldest) | 5 (fully consumed) | 0 |
| 2 | IND-002-LI-03 | 3 (partially consumed) | 3 |

**Database records created:**

| PO Line Item ID | Item | Qty | Linked Indent Line Item | Consumed from Indent |
|----------------|------|-----|-------------------------|---------------------|
| PO-001-LI-01a | Item A | 5 | IND-001-LI-01 | 5 of 5 |
| PO-001-LI-01b | Item A | 3 | IND-002-LI-03 | 3 of 6 |

**Frontend display:**

| PO Line Item | Item | Qty | Rate |
|-------------|------|-----|------|
| PO-001-LI-01 | Item A | 8 | ₹XX.XX |

#### Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| PO qty exceeds total available across all indents (after tolerance) | Error: quantity exceeds available indent outstanding. |
| Only one indent exists for the item | Single record in DB, standard display. No FIFO needed. |
| User reduces qty after initial entry | Re-apply FIFO from the beginning with the new qty. |
| Indent line item has 0 outstanding | Skip it in FIFO; move to next. |

### 5.3 Open PO from Open Indent

When the source indent is of type **Open**, the PO inherits the Open PO type. The behaviour at PO stage mirrors the indent:

- The **max quantity from the item master** is carried forward as the PO quantity (user cannot edit quantity).
- The **rate** is entered manually by the user (this is the only additional field vs the indent).
- Financial year scoping from the indent carries through.


---

## 6. Direct PO — Line Item Validation Logic

When creating a PO **directly** (no indent), the system must apply the same validation rules that would have been enforced at indent stage, since no prior validation has occurred.

The validation logic is determined by the **PO Type + Expense Type** combination, mirroring the indent validation matrix.

---

### 6.1 Logic 1 — Max/Min Quantity Validation with Stock Check

**Applies to:** Regular PO with General, Maintenance, Production, or Overhaul expense types.

This is identical to Indent Logic 1. The system performs all checks at PO creation time.

#### Step-by-step:

**Step 1 — Check for open indent against the item**
When the user selects an item, the system checks if an open indent already exists for that item. If it does, an **error message is displayed** on item selection. This prevents duplicate procurement.

**Step 2 — Check for existing PO against the item**
Additionally, the system checks if an open/active PO already exists for the same item. If it does, display an **error message** and prevent selection.

**Step 3 — Check stock + outstanding against max quantity**
The system evaluates: `branch_stock + outstanding_po_qty > max_qty`

- If **no max quantity exists** for the item, the user may enter any value. Skip Step 4.
- If the above condition is **true**, display an error message and prevent entry.
- If the condition is **false**, proceed to Step 4.

> **Note:** For direct POs, `outstanding_po_qty` must also be factored into the stock check since there is no indent acting as a prior control.

**Step 4 — Calculate allowable PO quantity (max and min)**
Apply the following formula to determine the maximum PO quantity the user can request:

```
max_po_qty = IF(
    (max_qty - branch_stock - outstanding_indent_qty - outstanding_po_qty) < reorder_qty,
    reorder_qty,
    ROUNDUP((max_qty - branch_stock - outstanding_indent_qty - outstanding_po_qty) / reorder_qty, 0) * reorder_qty
)
```

The **minimum PO quantity** is taken from the item master's `min_qty` value.

The user may enter any quantity between `min_qty` and `max_po_qty`.

#### Formula Explanation

The formula is identical to the indent formula but includes `outstanding_po_qty` in the deduction to account for quantities already committed via other direct POs.

#### Worked Example

| Parameter | Value |
|-----------|-------|
| max_qty (from item master) | 100 |
| min_qty (from item master) | 20 |
| reorder_qty | 10 |
| branch_stock | 50 |
| outstanding_indent_qty | 10 |
| outstanding_po_qty | 5 |

**Calculation:**

```
available = max_qty - branch_stock - outstanding_indent_qty - outstanding_po_qty
         = 100 - 50 - 10 - 5
         = 35

Is 35 < reorder_qty (10)?  → No

max_po_qty = ROUNDUP(35 / 10, 0) * 10
           = ROUNDUP(3.5, 0) * 10
           = 4 * 10
           = 40
```

**Result:** User can enter a quantity between **20** (min_qty) and **40** (max_po_qty).

---

### 6.2 Logic 2 — Open Entry Validation with Financial Year Check

**Applies to:** Open PO with General, Maintenance, or Production expense types.

This is identical to Indent Logic 2, applied at PO stage.

#### Step-by-step:

**Step 1 — Check for existing open PO (financial year scoped)**
The system checks if an open PO already exists for the item **within the current financial year**. If one exists with an active status (i.e., not in cancelled/closed/rejected states), display an error message and clear the field.

**Step 2 — Check for existing open indent (financial year scoped)**
Additionally, check if an open indent exists for the item in the current FY. If one exists, display an **informational message** (warning) — the user may continue but should be aware procurement is already in progress via the indent route.

**Step 3 — Check if max/min exists**
If no max/min quantity is defined for the item, display an error message and clear the field. The user cannot proceed without max/min values.

**Step 4 — Check for outstanding indent quantity from Regular/BOM indents**
The system checks if there is any outstanding indent quantity from Regular or BOM indents for the same item. If there is, display an **informational message** (warning), but **allow the user to continue**.

**Step 5 — Set quantity and rate**
The **max quantity** from the item master is taken as the PO quantity value. The user **cannot edit the quantity**. The user enters the **rate** manually.

---

### 6.3 Logic 3 — No Validation (Capital/Overhaul)

**Applies to:** Regular PO with Capital expense type. Also applies when PO Type is Regular or Open and Expense Type is Capital or Overhaul — **but only when no max/min quantity is available for that item**.

No quantity validation is applied. The user can enter any value for the PO quantity. No other verification is required.

**Explicit triggers for Logic 3:**
1. PO Type = Regular, Expense Type = Capital → Always Logic 3.
2. PO Type = Regular, Expense Type = Overhaul → Logic 1 applies (has stock check), BUT if no max_qty exists for the item, the user may enter any value (Logic 1 Step 2 skip path).
3. Any combination where the item has no max/min qty defined and expense type is Capital or Overhaul → Free entry.

---

## 7. Summary Matrix — Direct PO Validation

| PO Type | Expense Type | Line Item Logic | Key Behaviour |
|---------|-------------|-----------------|---------------|
| Regular | General | 1 | Stock check + max/min formula (includes outstanding PO qty) |
| Regular | Maintenance | 1 | Stock check + max/min formula (includes outstanding PO qty) |
| Regular | Production | 1 | Stock check + max/min formula (includes outstanding PO qty) |
| Regular | Overhaul | 1 | Stock check + max/min formula (includes outstanding PO qty) |
| Regular | Capital | 3 | Free entry, no validation |
| Open | General | 2 | FY check + max qty as value + rate entry |
| Open | Maintenance | 2 | FY check + max qty as value + rate entry |
| Open | Production | 2 | FY check + max qty as value + rate entry |

> **Note:** Open PO with Capital or Overhaul expense types is **not a valid combination**. The system should not allow this selection. This mirrors the indent module where Open indent type only supports General, Maintenance, and Production.

---

## 8. Summary Matrix — Indent-Based PO Validation

| Source Indent Type | Source Expense Type | Inherited PO Type | Line Item Logic | Key Behaviour |
|--------------------|--------------------|--------------------|-----------------|---------------|
| Regular | General | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| Regular | Maintenance | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| Regular | Production | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| Regular | Overhaul | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| Regular | Capital | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| Open | General | Open | Trust indent | Max qty carried forward + rate entry |
| Open | Maintenance | Open | Trust indent | Max qty carried forward + rate entry |
| Open | Production | Open | Trust indent | Max qty carried forward + rate entry |
| BOM | General | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| BOM | Maintenance | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| BOM | Production | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| BOM | Capital | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |
| BOM | Overhaul | Regular | Trust indent | Qty ≤ indent outstanding (+ tolerance) |

---

## 9. Key Terminology

| Term | Definition |
|------|-----------|
| **Purchase Order (PO)** | A formal order placed with a supplier for procurement of materials or services. |
| **Direct PO** | A PO created without a preceding indent. Only available when indent is not mandatory per company config. |
| **Indent-Based PO** | A PO created against one or more approved indents. |
| **FIFO Consumption** | First In, First Out method for consuming indent outstanding quantities when multiple indents are clubbed into a single PO line item. |
| **Tolerance** | A percentage allowance (per item) by which PO quantity may exceed indent outstanding quantity. Stored in the Item Master. |
| **Company Config** | A configuration table that stores system-wide settings, including whether indent usage is mandatory for PO creation. |
| **Party Master** | Master data for all business parties. Suppliers are identified by party_type = 'supplier'. |
| **outstanding_po_qty** | Quantity from existing POs that has not yet been received/fulfilled. Relevant for direct PO stock checks. |
| **Financial Year (FY)** | The fiscal year used to scope checks (1st April to 31st March). |

---

## 10. Error & Message Reference

### 10.1 Indent-Based PO

| Trigger | Message Type | User Action |
|---------|-------------|-------------|
| PO qty exceeds indent outstanding (+ tolerance) for a single indent line item | Error | Reduce quantity to within allowed range. |
| PO qty exceeds total indent outstanding across all clubbed indents (+ tolerance) | Error | Reduce quantity or add more indents. |
| Selected indent has no outstanding quantity | Warning | Indent is fully consumed; select a different indent. |
| Tolerance not defined for item | Info | System uses 0% tolerance (exact match). |

### 10.2 Direct PO — Logic 1

| Trigger | Message Type | User Action |
|---------|-------------|-------------|
| Open indent exists for selected item | Error | Item cannot be selected; user must use indent-based PO route. |
| Open/active PO exists for selected item | Error | Item cannot be selected; user must resolve existing PO. |
| Branch stock + outstanding indent + outstanding PO > max qty | Error | Entry blocked; user cannot proceed. |
| No max qty defined for item | None | User may enter any value; skip formula. |

### 10.3 Direct PO — Logic 2

| Trigger | Message Type | User Action |
|---------|-------------|-------------|
| Open PO exists in current FY for the item | Error | Field cleared; user cannot proceed. |
| Open indent exists in current FY for the item | Warning | Informational only; user may continue. |
| No max/min defined for item | Error | Field cleared; user cannot proceed. |
| Outstanding Regular/BOM indent qty exists for the item | Warning | Informational only; user may continue. |

### 10.4 Direct PO — Logic 3

No error messages. Free entry is allowed.

---

## 10.5. Backend Validation Views (Data Sources)

Three database views provide pre-computed data for the validation logic described above. These eliminate the need for ad-hoc queries when checking stock, outstanding quantities, and min/max values.

### `vw_item_balance_qty_by_branch_new` — Primary Validation Source

**ORM Model:** `VwItemBalanceQtyByBranchNew` (in `src/models/procurement.py`)

This is the **main view used for min/max validation** on both indent and PO creation. It aggregates per `branch_id` + `item_id`:

| View Column | Maps to Validation Term | Description |
|-------------|------------------------|-------------|
| `cur_stock` | `branch_stock` | Current stock at branch (inward − drcr − issue) |
| `bal_qty_ind_to_validate` | `outstanding_indent_qty` | Outstanding indent qty from Regular/BOM indents only (excludes Open) |
| `bal_tot_ind_qty` | Total outstanding indent qty | All indent types combined |
| `open_bal_ind_tot_qty` | Open indent outstanding qty | Outstanding from Open-type indents only |
| `bal_tot_po_qty` | Total outstanding PO qty | All PO types combined |
| `open_bal_tot_po_qty` | Open PO outstanding qty | Outstanding from Open-type POs only |
| `maxqty` | `max_qty` | Max stock qty from `item_minmax_mst` (0 if not set) |
| `minqty` | `min_qty` | Min order qty from `item_minmax_mst` (0 if not set) |
| `min_order_qty` | `reorder_qty` | Reorder qty from `item_minmax_mst` (0 if not set) |

**Usage in Direct PO Logic 1 (Step 3 & 4):**
```
-- For direct PO, outstanding_po_qty excludes Open PO qty:
outstanding_po_qty = bal_tot_po_qty - open_bal_tot_po_qty

-- Step 3: Check if entry is blocked
cur_stock + bal_qty_ind_to_validate + outstanding_po_qty > maxqty  →  blocked

-- Step 4: Calculate max PO qty
available = maxqty - cur_stock - bal_qty_ind_to_validate - outstanding_po_qty
max_po_qty = IF(available < min_order_qty, min_order_qty, ROUNDUP(available / min_order_qty, 0) * min_order_qty)
min_po_qty = minqty
```

**Usage in Indent-Based Open PO (Section 5.3):**
```
-- Formula for Open PO from Open indent:
max_qty_for_branch - po_balance_qty_for_branch - current_stock_for_branch
= maxqty - bal_tot_po_qty - cur_stock
```

**Usage in Direct PO Logic 2 (Step 3 & 4):**
```
-- Check if max/min exists
maxqty = 0 AND minqty = 0  →  error, cannot proceed

-- Outstanding Regular/BOM indent check
bal_qty_ind_to_validate > 0  →  show warning (informational only)
```

### `vw_proc_indent_outstanding_new` — Per-Line Indent Outstanding

**ORM Model:** `VwProcIndentOutstandingNew` (in `src/models/procurement.py`)

Provides per-indent-detail-line outstanding quantities for approved/closed indents (`status_id IN (3, 5)`).

| View Column | Description |
|-------------|-------------|
| `indent_dtl_id` | Primary key — unique indent detail line |
| `branch_id` | Branch scope |
| `item_id` / `item_name` | Item reference with display name |
| `indent_qty` | Original indent quantity |
| `bal_ind_qty` | Balance outstanding (for Open = full qty; for Regular/BOM = indent_qty − cancelled − PO consumed) |
| `indent_type_id` | 'Regular', 'Open', or 'BOM' |
| `expense_type_id` / `expense_type_name` | Expense type reference |

**Key behaviour:** For Open indent types, `bal_ind_qty` always equals `indent_qty` (the full quantity is always "outstanding" since open indents are recurring).

**Usage for PO creation:** This view provides the list of approved indents with outstanding quantities for the indent-selection step (Section 5). Filter by `branch_id` and `bal_ind_qty > 0` to get available indent lines.

### `vw_proc_po_outstanding_new` — Per-Line PO Outstanding

**ORM Model:** `VwProcPoOutstandingNew` (in `src/models/procurement.py`)

Provides per-PO-detail-line outstanding quantities. Joins PO header/detail with inward and debit/credit note adjustments.

| View Column | Description |
|-------------|-------------|
| `po_dtl_id` | Primary key — unique PO detail line |
| `branch_id` | Branch scope |
| `po_type` | 'Regular' or 'Open' |
| `item_id` / `item_code` | Item reference |
| `qty` / `rate` | Original PO quantity and rate |
| `bal_po_qty` | Balance outstanding (po_qty − inward_qty + drcr_qty) |
| `maxqty` / `minqty` / `min_order_qty` | Min/max/reorder from `item_minmax_mst` |

**Usage for Direct PO Logic 1 (Step 2):** Query this view to check if an active PO exists for the same item: `SELECT * FROM vw_proc_po_outstanding_new WHERE item_id = :item_id AND branch_id = :branch_id AND bal_po_qty > 0`.

**Usage for Direct PO Logic 2 (Step 1):** Check for existing open PO in current FY: filter by `po_type = 'Open'` and `po_date` within the current financial year.

---

## 11. Configuration Dependencies

| Config Key | Location | Impact |
|------------|----------|--------|
| `indent_mandatory` | Company Config Table | Determines whether direct PO creation is available. When ON, only indent-based POs are allowed. |
| `tolerance_pct` | Item Master | Per-item tolerance percentage for PO qty vs indent outstanding qty. Default: 0%. |
| `max_qty` | Item Master | Maximum stock quantity. Used in validation Logics 1 and 2. |
| `min_qty` | Item Master | Minimum order quantity. Used in validation Logic 1. |
| `reorder_qty` | Item Master | Standard reorder quantity. Used as rounding unit in Logic 1 formula. |

---

## 12. Decision Flowchart — PO Creation Path

```
START: User initiates PO creation
│
├─ Is indent_mandatory = ON?
│   ├─ YES → Only indent-based PO path available
│   │         → User selects indent(s) with outstanding qty
│   │         → PO Type & Expense Type inherited
│   │         → Apply tolerance check per line item
│   │         → Apply FIFO if multiple indents for same item
│   │         → User enters rate
│   │         → DONE
│   │
│   └─ NO → User chooses: Indent-based OR Direct?
│       │
│       ├─ INDENT-BASED → (same as above)
│       │
│       └─ DIRECT →
│           → User selects PO Type (Regular / Open)
│           → User selects Expense Type
│           → Determine validation logic from matrix (Section 7)
│           │
│           ├─ Logic 1 → Stock check + max/min formula
│           ├─ Logic 2 → FY check + max qty as value + rate
│           └─ Logic 3 → Free entry + rate
│
END
```