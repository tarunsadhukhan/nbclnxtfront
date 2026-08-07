# Indent Page — Procurement Module

## 1. Overview

The **Indent** page is part of the Procurement module. It allows users to create indents (material/service requests) based on a combination of **Indent Type** and **Expense Type**. The system enforces validation rules at both the header and line-item levels depending on this combination.

This document serves as:

- **AI Agent Context** — a reference for automated decision-making and validation logic.
- **Developer Technical Spec** — a definitive source for implementing business rules.
- **End-User Documentation** — a guide for understanding how indent creation works.

---

## 2. Core Concepts

### 2.1 Indent Types

| Indent Type | Description |
|-------------|-------------|
| **Regular** | A standard indent raised for routine procurement needs. |
| **Open**    | An open-ended indent, typically used for recurring or flexible requirements. |
| **BOM**     | A Bill of Materials indent, used for structured material lists that can be saved and reused. |

### 2.2 Expense Types

| Expense Type    | Description |
|-----------------|-------------|
| **General**     | General-purpose expenses not tied to a specific category. |
| **Maintenance** | Expenses related to maintenance activities. |
| **Production**  | Expenses related to production processes. |
| **Overhaul**    | Expenses related to overhaul or refurbishment activities. |
| **Capital**     | Capital expenditure items. |

---

## 3. Header Rules

When a user creates an indent, the system applies **header-level rules** based on the selected Indent Type and Expense Type combination.

### 3.1 Regular Indent Type

| Expense Type  | Indent Name Field | Line Item Logic |
|---------------|-------------------|-----------------|
| General       | Hidden (auto/system-assigned) | 1 |
| Maintenance   | Hidden | 1 |
| Production    | Hidden | 1 |
| Overhaul      | Hidden | 1 |
| Capital       | Hidden | 2 |

### 3.2 Open Indent Type

| Expense Type  | Indent Name Field | Line Item Logic |
|---------------|-------------------|-----------------|
| General       | Hidden | 3 |
| Maintenance   | Hidden | 3 |
| Production    | Hidden | 3 |

### 3.3 BOM Indent Type

| Expense Type  | Indent Name Field | Line Item Logic |
|---------------|-------------------|-----------------|
| General       | BOM selection (see below) | 1 |
| Maintenance   | BOM selection (see below) | 1 |
| Production    | BOM selection (see below) | 1 |
| Capital       | BOM selection (see below) | 2 |
| Overhaul      | BOM selection (see below) | 2 |

**BOM Selection Behavior:**
When the Indent Type is **BOM**, the system prompts the user with two options:

1. **Create a new BOM** — The Indent Name field becomes a text entry field where the user types a name for the new BOM.
2. **Use an existing BOM** — The system presents a reference list of previously saved BOMs (from past indents saved as reusable templates) for the user to select from.

---

## 4. Indent View Fields

The indent listing view displays the following fields:

| Field | Description |
|-------|-------------|
| **Status (Header)** | Current status of the indent at the header level. |
| **Indent Type** | Regular, Open, or BOM. |
| **Expense Type** | General, Maintenance, Production, Overhaul, or Capital. |
| **Indent Line Item ID** | Unique identifier for each line item within the indent. |
| **Current Indent Outstanding** | Outstanding quantity for the indent (can be 0), tracked against the detail ID. |
| **Balance Outstanding against Item ID** | Remaining balance outstanding for the item. **Available only for Maintenance, Production, and General expense types.** |

---

## 5. Line Item Validation Logic

Each line item added to an indent is validated according to one of three logic sets, determined by the Indent Type + Expense Type combination (see Section 3).

---

### 5.1 Logic 1 — Max/Min Quantity Validation with Stock Check

**Applies to:** Regular (General, Maintenance, Production, Overhaul) and BOM (General, Maintenance, Production).

This is the most rigorous validation. It checks existing indents, stock levels, and calculates allowable indent quantities.

#### Step-by-step:

**Step 1 — Check for open indent against the item**
When the user selects an item, the system checks if an open indent already exists for that item. If it does, an **error message is displayed** on item selection. This check must be performed at the point of item selection (i.e., the open indent status must be available alongside the item list).

**Step 2 — Check stock + outstanding against max quantity**
The system evaluates: `branch_stock + outstanding_indent_qty > max_qty`

- If **no max quantity exists** for the item, the user may enter any value. Skip Step 3.
- If the above condition is **true**, display an error message and prevent entry.
- If the condition is **false**, proceed to Step 3.

**Step 3 — Calculate allowable indent quantity (max and min)**
Apply the following formula to determine the maximum indent quantity the user can request:

```
max_indent_qty = IF(
    (max_qty - branch_stock - outstanding_indent_qty) < reorder_qty,
    reorder_qty,
    ROUNDUP((max_qty - branch_stock - outstanding_indent_qty) / reorder_qty, 0) * reorder_qty
)
```

The **minimum indent quantity** is taken from the item master's `min_qty` value.

The user may enter any quantity between `min_qty` and `max_indent_qty`.

#### Formula Explanation

The formula ensures:

- If the available-to-indent quantity (`max_qty - branch_stock - outstanding_indent_qty`) falls below the reorder quantity, the system allows at least one reorder quantity.
- Otherwise, the quantity is rounded up to the nearest multiple of the reorder quantity.

#### Worked Example

| Parameter | Value |
|-----------|-------|
| max_qty (from item master) | 100 |
| min_qty (from item master) | 20 |
| reorder_qty | 10 |
| branch_stock | 60 |
| outstanding_indent_qty | 10 |

**Calculation:**

```
available = max_qty - branch_stock - outstanding_indent_qty
         = 100 - 60 - 10
         = 30

Is 30 < reorder_qty (10)?  → No

max_indent_qty = ROUNDUP(30 / 10, 0) * 10
               = ROUNDUP(3, 0) * 10
               = 3 * 10
               = 30
```

**Result:** User can enter a quantity between **20** (min_qty) and **30** (max_indent_qty).

---

### 5.2 Logic 2 —  Open Entry Validation with Financial Year Check

**Applies to:**  Open (General, Maintenance, Production).

This logic includes financial-year-scoped checks and enforces max quantity as the value.

#### Step-by-step:

**Step 1 — Check for existing open indent (financial year scoped)**
The system checks if an open indent already exists for the item **within the current financial year**. If one exists in status_id other than 4,5,6. for this it needs to map the header from the item_id for the indent_id and then retreive it. display an error message and clear the field. 

**Step 2 — Check if max/min exists**
If no max/min quantity is defined for the item, display an error message and clear the field. The user cannot proceed without max/min values.

**Step 3 — Check for outstanding indent quantity from Regular/BOM indents**
The system checks if there is any outstanding indent quantity from Regular or BOM indents for the same item. If there is, display an **informational message** (warning), but **allow the user to continue**.

**Step 4 — Set quantity**
The **max quantity** from the item master is taken as the indent quantity value. The user cannot edit this value.

---

### 5.3 Logic 3 — (No Validation) Capital/Overhaul 

**Applies to:** Regular (Capital, Overhaul) and BOM (Capital, Overhaul).

No quantity validation is applied. The user can enter any value for the indent quantity. no other verification either needs to be done. 

---

## 6. Summary Matrix

| Indent Type | Expense Type  | Indent Name | Line Item Logic | Key Behavior |
|-------------|---------------|-------------|-----------------|--------------|
| Regular     | General       | Hidden      | 1 | Stock check + max/min formula |
| Regular     | Maintenance   | Hidden      | 1 | Stock check + max/min formula |
| Regular     | Production    | Hidden      | 1 | Stock check + max/min formula |
| Regular     | Overhaul      | Hidden      | 1 | Stock check + max/min formula |
| Regular     | Capital       | Hidden      | 2 | FY check + max qty as value |
| Open        | General       | Hidden      | 3 | Free entry |
| Open        | Maintenance   | Hidden      | 3 | Free entry |
| Open        | Production    | Hidden      | 3 | Free entry |
| BOM         | General       | BOM select  | 1 | Stock check + max/min formula |
| BOM         | Maintenance   | BOM select  | 1 | Stock check + max/min formula |
| BOM         | Production    | BOM select  | 1 | Stock check + max/min formula |
| BOM         | Capital       | BOM select  | 2 | FY check + max qty as value |
| BOM         | Overhaul      | BOM select  | 2 | FY check + max qty as value |

---

## 7. Key Terminology

| Term | Definition |
|------|-----------|
| **Indent** | A formal request for procurement of materials or services. |
| **BOM (Bill of Materials)** | A saved, reusable list of items that can be loaded into a new indent. |
| **max_qty** | Maximum stock quantity defined in the item master. |
| **min_qty** | Minimum order/indent quantity defined in the item master. |
| **reorder_qty** | The standard reorder quantity for an item; used as the rounding unit. |
| **branch_stock** | Current stock available at the branch/location. |
| **outstanding_indent_qty** | Quantity from existing indents that has not yet been fulfilled. |
| **Financial Year (FY)** | The fiscal year used to scope indent checks (relevant for Logic 2). Fiscal year is considered from 1st April of the year to 31st March of the following year. |

---

## 9. Backend Validation Views (Data Sources)

Three database views provide pre-computed data for the validation logic described above. These eliminate the need for ad-hoc queries when checking stock, outstanding quantities, and min/max values.

### 9.1 `vw_item_balance_qty_by_branch_new` — Primary Validation Source

**ORM Model:** `VwItemBalanceQtyByBranchNew` (in `src/models/procurement.py`)

This is the **main view used for min/max validation** on indent creation. It aggregates per `branch_id` + `item_id`:

| View Column | Maps to Validation Term | Description |
|-------------|------------------------|-------------|
| `cur_stock` | `branch_stock` | Current stock at branch (inward − drcr − issue) |
| `bal_qty_ind_to_validate` | `outstanding_indent_qty` (Logic 1) | Outstanding indent qty from Regular/BOM indents only (excludes Open) |
| `bal_tot_ind_qty` | Total outstanding indent qty | All indent types combined |
| `open_bal_ind_tot_qty` | Open indent outstanding qty | Outstanding from Open-type indents only |
| `bal_tot_po_qty` | Total outstanding PO qty | All PO types combined |
| `open_bal_tot_po_qty` | Open PO outstanding qty | Outstanding from Open-type POs only |
| `maxqty` | `max_qty` | Max stock qty from `item_minmax_mst` (0 if not set) |
| `minqty` | `min_qty` | Min order qty from `item_minmax_mst` (0 if not set) |
| `min_order_qty` | `reorder_qty` | Reorder qty from `item_minmax_mst` (0 if not set) |

**Usage in Logic 1 (Step 2 & 3):**
```
-- Step 2: Check if entry is blocked
cur_stock + bal_qty_ind_to_validate > maxqty  →  blocked

-- Step 3: Calculate max indent qty
available = maxqty - cur_stock - bal_qty_ind_to_validate
max_indent_qty = IF(available < min_order_qty, min_order_qty, ROUNDUP(available / min_order_qty, 0) * min_order_qty)
min_indent_qty = minqty
```

**Usage in Logic 2 (Step 3 — informational check):**
```
-- Check if Regular/BOM outstanding exists for the item
bal_qty_ind_to_validate > 0  →  show warning (informational only)
```

### 9.2 `vw_proc_indent_outstanding_new` — Per-Line Indent Outstanding

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

**Key behaviour:** For Open indent types, `bal_ind_qty` always equals `indent_qty` (the full quantity is always "outstanding" since open indents are recurring/flexible).

**Usage:** Used by `vw_item_balance_qty_by_branch_new` as a source for indent outstanding aggregation. Can also be queried directly to check whether an open indent exists for a specific item (Logic 1 Step 1, Logic 2 Step 1).

### 9.3 `vw_proc_po_outstanding_new` — Per-Line PO Outstanding

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

**Usage:** Used by `vw_item_balance_qty_by_branch_new` as a source for PO outstanding aggregation. Not directly needed for indent validation but provides context for PO-stage checks.

---

## 8. Error & Message Reference

| Trigger | Message Type | User Action |
|---------|-------------|-------------|
| Open indent exists for selected item (Logic 1) | Error | Item cannot be selected; user must resolve existing indent. |
| Branch stock + outstanding > max qty (Logic 1) | Error | Entry blocked; user cannot proceed. |
| No max qty defined for item (Logic 1) | None | User may enter any value; skip formula. |
| Open indent exists in current FY (Logic 2) | Error | Field cleared; user cannot proceed. |
| No max/min defined (Logic 2) | Error | Field cleared; user cannot proceed. |
| Outstanding Regular/BOM indent qty exists (Logic 2) | Warning | Informational only; user may continue. |