# GST Taxation — Procurement Module (Frontend)

> Guide for how GST should work in all procurement UI flows.
> Companion to backend doc: `vowerp3be/docs/GST_PROCUREMENT.md`
> Last updated: 2026-02-26

---

## 1. GST Architecture Overview

### 1.1 Configuration Flag

GST visibility is controlled by `co_config.india_gst` (boolean) from the setup API:
- `india_gst = true` → Show GST fields, calculate tax, include in totals
- `india_gst = false` → Hide GST fields entirely

### 1.2 State Comparison Pattern

| Condition | Tax Type | Split |
|-----------|----------|-------|
| `supplierState === shippingState` | Intra-state | CGST = tax% / 2, SGST = tax% / 2 |
| `supplierState !== shippingState` | Inter-state | IGST = tax% (full) |
| Either state is missing | Zero tax | Return all zeros |

### 1.3 Core Utilities

| Pattern | Description |
|---------|-------------|
| `calculateLineTax()` | Pure function: (amount, taxPct, supplierState, shippingState, indiaGst) → {igst, cgst, sgst, total} |
| `useTaxCalculations` hook | React effect that recalculates all line items when states/config change |
| `*TotalsDisplay` component | Shows combined line items + additional charges GST breakdown |

---

## 2. PO GST Frontend — Reference Implementation

### 2.1 File Map

| Concern | File | Key Lines |
|---------|------|-----------|
| Types | `purchaseOrder/createPO/types/poTypes.ts` | `EditableLineItem` — igstAmount, cgstAmount, sgstAmount, taxAmount, taxPercentage |
| Calculation | `purchaseOrder/createPO/utils/poCalculations.ts` | `calculateLineTax()` lines 6-36 |
| State resolution | `purchaseOrder/createPO/hooks/usePOAddresses.ts` | lines 89-105 — derives billingState, shippingState, supplierBranchState |
| Tax recalc hook | `purchaseOrder/createPO/hooks/usePOTaxCalculations.ts` | lines 32-74 — recalculates on state/config change |
| Additional charges GST | `purchaseOrder/createPO/hooks/usePOAdditionalCharges.ts` | `calculateChargeTax()` lines 69-99 |
| Totals display | `purchaseOrder/createPO/components/POTotalsDisplay.tsx` | lines 70-91 — conditional GST breakdown |
| Save payload | `purchaseOrder/createPO/hooks/usePOFormSubmission.ts` | lines 54-68 — sends igst/cgst/sgst/tax amounts per item |

### 2.2 `calculateLineTax()` Function

```typescript
export const calculateLineTax = (
  amount: number,
  taxPercentage: number,
  supplierState: string,
  shippingState: string,
  indiaGst: boolean
): { igst: number; cgst: number; sgst: number; total: number } => {
  if (!indiaGst || !taxPercentage || !supplierState || !shippingState) {
    return { igst: 0, cgst: 0, sgst: 0, total: 0 };
  }

  const taxAmount = (amount * taxPercentage) / 100;

  if (supplierState === shippingState) {
    const half = Number((taxAmount / 2).toFixed(2));
    return { igst: 0, cgst: half, sgst: half, total: Number(taxAmount.toFixed(2)) };
  } else {
    return { igst: Number(taxAmount.toFixed(2)), cgst: 0, sgst: 0, total: Number(taxAmount.toFixed(2)) };
  }
};
```

### 2.3 Tax Recalculation Hook Pattern

```typescript
// usePOTaxCalculations.ts (simplified)
useEffect(() => {
  if (!coConfig?.india_gst || !supplierBranchState || !shippingState) return;

  setLineItems(prev => prev.map(item => {
    const tax = calculateLineTax(item.amount, item.taxPercentage, supplierBranchState, shippingState, true);
    return { ...item, igstAmount: tax.igst, cgstAmount: tax.cgst, sgstAmount: tax.sgst, taxAmount: tax.total };
  }));
}, [coConfig?.india_gst, supplierBranchState, shippingState]);
```

### 2.4 Save Payload (What's Sent to Backend)

Per line item:
```typescript
{
  igst_amount: item.igstAmount,
  cgst_amount: item.cgstAmount,
  sgst_amount: item.sgstAmount,
  tax_amount: item.taxAmount,
  tax_percentage: item.taxPercentage,
}
```

Per additional charge:
```typescript
{
  igst_amount: charge.igst_amount,
  sgst_amount: charge.sgst_amount,
  cgst_amount: charge.cgst_amount,
  tax_amount: charge.tax_amount,
  tax_pct: charge.tax_pct,
  apply_tax: charge.apply_tax,
}
```

---

## 3. SR GST Frontend — Working But Incomplete Save

### 3.1 File Map

| Concern | File |
|---------|------|
| Types | `sr/createSR/types/srTypes.ts` — SRLineItem has igst_amount, cgst_amount, sgst_amount, tax_amount |
| Calculation | `sr/createSR/utils/srCalculations.ts` — `calculateLineTax()` (duplicated from PO) |
| Line item hook | `sr/createSR/hooks/useSRLineItems.ts` — `recalculateLineItem()` |
| Additional charges | `sr/createSR/hooks/useSRAdditionalCharges.ts` — `calculateChargeTax()` |
| Totals display | `sr/createSR/components/SRTotalsDisplay.tsx` |
| Save payload | `sr/createSR/hooks/useSRApproval.ts` |

### 3.2 Known Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S1 | **CRITICAL** | SR save payload **does NOT include** per-line GST data (igst, cgst, sgst, tax_amount). Only sends accepted_rate, amount, discount, warehouse_id. | `useSRApproval.ts:73-81` |
| S2 | **CRITICAL** | SR `calculateLineTax()` does NOT validate states before calculation. If `supplierState` or `shippingState` is undefined, `undefined === undefined` returns true → incorrectly assumes same-state → splits into CGST/SGST instead of returning zero. | `srCalculations.ts:22` |
| S3 | **HIGH** | SR lacks `useEffect` for automatic recalculation when states change. PO has `usePOTaxCalculations` effect; SR does not. Tax only recalculates on individual field changes, not address changes. | `useSRLineItems.ts` |
| S4 | **HIGH** | Same issue for additional charges — no auto-recalculation effect on state change. | `useSRAdditionalCharges.ts` |
| S5 | **MEDIUM** | Additional charges GST IS sent in payload but backend ignores it. | `useSRApproval.ts:85-98` |

### 3.3 Fixes Needed

1. **S1** — Add GST fields to SR line item save payload:
   ```typescript
   const lineItemsPayload = lineItems.map((item) => ({
     ...existingFields,
     igst_amount: item.igst_amount,     // ADD
     cgst_amount: item.cgst_amount,     // ADD
     sgst_amount: item.sgst_amount,     // ADD
     tax_amount: item.tax_amount,       // ADD
     tax_percentage: item.tax_percentage, // ADD
   }));
   ```

2. **S2** — Add state validation to SR `calculateLineTax()`:
   ```typescript
   if (!indiaGst || !taxPercentage || !supplierState || !shippingState) {
     return { igst: 0, cgst: 0, sgst: 0, total: 0 };
   }
   ```

3. **S3/S4** — Add `useEffect` for automatic recalculation (modeled on `usePOTaxCalculations`).

---

## 4. Inward GST Frontend — GAP ANALYSIS

### 4.1 Current State

| Component | Status | File |
|-----------|--------|------|
| `EditableLineItem` type | Only has `taxPercentage?: number` — **no GST breakdown** | `inward/createInward/types/inwardTypes.ts:19-35` |
| GST calculation | **NONE** | — |
| State/branch fields | **NONE** (no supplier_branch, billing_branch, shipping_branch) | `inward/createInward/utils/inwardFactories.ts:29-48` |
| Line items table | No tax columns (only PO No, Item Group, Item, Qty, UOM, Remarks) | `inward/createInward/components/InwardLineItemsTable.tsx:23-198` |
| Totals display | **NONE** | — |
| Save payload | No GST fields sent | `inward/createInward/page.tsx:368-394` |
| Preview | No tax columns | `inward/createInward/components/InwardPreview.tsx` |
| Setup data | `india_gst` IS available in `coConfig` | `inwardTypes.ts:92` |

### 4.2 What Needs to Be Built

**Phase 1: Type System**

Add to `EditableLineItem` in `inwardTypes.ts`:
```typescript
igstAmount?: number;
cgstAmount?: number;
sgstAmount?: number;
taxAmount?: number;
```

**Phase 2: Form Schema**

Add to `useInwardFormSchemas.ts` and `inwardFactories.ts`:
- `supplier_branch` dropdown (to get supplier state)
- `billing_branch` dropdown (company billing state)
- `shipping_branch` dropdown (company shipping state, optional — defaults to billing)

**Phase 3: Tax Calculation**

Create `useInwardTaxCalculations.ts` hook (modeled on `usePOTaxCalculations`):
- Import shared `calculateLineTax()` utility
- Recalculate all line items when states or `india_gst` change
- Return `taxType` ("IGST" or "CGST & SGST") for display

**Phase 4: UI Components**

Update `InwardLineItemsTable.tsx` — add columns:
- Tax % (read-only, from item master)
- IGST Amount (read-only, calculated)
- CGST Amount (read-only, calculated)
- SGST Amount (read-only, calculated)
- Tax Total (read-only, calculated)

Create `InwardTotalsDisplay.tsx` (modeled on `POTotalsDisplay`):
- Net amount (before tax)
- IGST / CGST / SGST breakdown (conditional on `india_gst`)
- Grand total

Update `InwardPreview.tsx` — add tax columns and totals section.

**Phase 5: Save Payload**

Update `page.tsx` submission (lines 368-394):
```typescript
const itemsPayload = filledLineItems.map((item) => ({
  ...existingFields,
  tax_percentage: item.taxPercentage,
  igst_amount: item.igstAmount,
  cgst_amount: item.cgstAmount,
  sgst_amount: item.sgstAmount,
  tax_amount: item.taxAmount,
}));

const createPayload = {
  ...existingPayload,
  supplier_branch: String(values.supplier_branch ?? ""),
  billing_branch: String(values.billing_branch ?? ""),
  shipping_branch: String(values.shipping_branch ?? ""),
};
```

---

## 5. DR/CR Notes GST Frontend — GAP ANALYSIS

### 5.1 Current State

| Component | Status | File |
|-----------|--------|------|
| Line item type | No GST fields (only quantity, rate, amount) | `drcrNote/view/page.tsx:26-38` |
| View page table | No tax columns (Item Group, Item, UOM, Type, Qty, Rate, Amount) | `drcrNote/view/page.tsx:354-417` |
| Totals | Only `gross_amount` and `net_amount` — no GST breakdown | `drcrNote/view/page.tsx:571-590` |
| Creation page | **Does not exist** — DR/CR notes are view-only (auto-created from SR approval) | — |
| GST calculation | **NONE** | — |

### 5.2 What Needs to Be Built

**View/Display (read-only):**

1. Add GST columns to `DrcrNoteLineItem` type:
   ```typescript
   igst_amount?: number;
   cgst_amount?: number;
   sgst_amount?: number;
   tax_amount?: number;
   tax_percentage?: number;
   ```

2. Add columns to detail view table (after Amount column):
   - IGST, CGST, SGST, Tax Total

3. Add GST breakdown to totals section:
   - Total IGST, Total CGST, Total SGST

**Note:** Since DR/CR notes are auto-created by the backend on SR approval, the frontend is display-only. GST calculation happens entirely on the backend.

---

## 6. Code Deduplication Plan

### 6.1 Problem

`calculateLineTax()` is duplicated with slight differences between PO and SR:

| Aspect | PO (`poCalculations.ts:6-36`) | SR (`srCalculations.ts:8-38`) |
|--------|------|------|
| Null state check | Returns zero if either state missing | Does NOT check states before calculation |
| Tax amount calc | After state check | Before state check |
| State comparison | After validation | Without validation (bug) |

`calculateChargeTax()` is also duplicated between `usePOAdditionalCharges.ts:69-99` and `useSRAdditionalCharges.ts:40-70`.

### 6.2 Solution: Shared Utility

Create `src/utils/gstCalculations.ts`:

```typescript
/**
 * Calculate GST split for a line item based on state comparison.
 * Returns IGST (inter-state) or CGST+SGST (intra-state) amounts.
 */
export const calculateLineTax = (
  amount: number,
  taxPercentage: number,
  supplierState: string | undefined,
  shippingState: string | undefined,
  indiaGst: boolean
): { igst: number; cgst: number; sgst: number; total: number } => {
  if (!indiaGst || !taxPercentage || !supplierState || !shippingState) {
    return { igst: 0, cgst: 0, sgst: 0, total: 0 };
  }

  const taxAmount = (amount * taxPercentage) / 100;

  if (supplierState === shippingState) {
    const half = Number((taxAmount / 2).toFixed(2));
    return { igst: 0, cgst: half, sgst: half, total: Number(taxAmount.toFixed(2)) };
  }
  return { igst: Number(taxAmount.toFixed(2)), cgst: 0, sgst: 0, total: Number(taxAmount.toFixed(2)) };
};

/**
 * Calculate GST for an additional charge amount.
 * Same logic as line items — just different parameter names.
 */
export const calculateChargeTax = (
  netAmount: number,
  taxPct: number,
  supplierState: string | undefined,
  shippingState: string | undefined,
  indiaGst: boolean
): { igst: number; cgst: number; sgst: number; total: number } => {
  return calculateLineTax(netAmount, taxPct, supplierState, shippingState, indiaGst);
};

/**
 * Get the tax type label based on state comparison.
 */
export const getTaxTypeLabel = (
  supplierState: string | undefined,
  shippingState: string | undefined,
  indiaGst: boolean
): string => {
  if (!indiaGst) return "";
  if (!supplierState || !shippingState) return "";
  return supplierState === shippingState ? "CGST & SGST" : "IGST";
};
```

Then update PO, SR, Inward, DR/CR to import from this shared location.

---

## 7. Known Frontend Bugs (All Modules)

### 7.1 PO Frontend Bugs

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| FP1 | **CRITICAL** | Billing vs Shipping state validation is backwards. Code checks `billingAddr.stateName !== shippingAddr.stateName` and blocks the PO. But billing and shipping CAN be different states — GST compares supplier state vs shipping state, not billing vs shipping. | `usePOFormSubmission.ts:44-47` |
| FP2 | **CRITICAL** | GST recalculation doesn't fire until BOTH states are loaded. During async loading, if user saves, tax amounts could be stale or zero. | `usePOTaxCalculations.ts:39` |
| FP3 | **CRITICAL** | If either state is undefined when user clicks Save, all tax silently set to 0. No warning shown. | `poCalculations.ts:13` |
| FP4 | **MEDIUM** | Additional charge `tax_pct` not returned by GET PO API → when editing, charges load with `tax_pct=0`. If user edits qty/rate, tax gets recalculated as 0. | `usePOAdditionalCharges.ts:181-198` |
| FP5 | **MEDIUM** | Both PO and SR don't clear tax fields when `india_gst` toggles to false. Stale tax values persist in state. | Both modules |

### 7.2 SR Frontend Bugs

(See Section 3.2 above — S1 through S5)

---

## 8. Implementation Roadmap (Frontend)

### Phase 1: Shared Utility (Prerequisite)

1. Create `src/utils/gstCalculations.ts` with shared functions
2. Update PO imports to use shared utility
3. Fix PO bug FP1 (wrong state validation pair)
4. Fix PO bug FP3 (add warning when states missing)

### Phase 2: SR Fixes

5. Fix S2 — Add state validation to SR `calculateLineTax()` (use shared utility)
6. Fix S1 — Add GST fields to SR save payload
7. Fix S3/S4 — Add `useEffect` for state-change recalculation

### Phase 3: Inward GST

8. Add GST fields to Inward types
9. Add supplier/billing/shipping branch fields to Inward form
10. Create `useInwardTaxCalculations` hook
11. Add GST columns to Inward line items table
12. Create `InwardTotalsDisplay` component
13. Include GST in Inward save payload
14. Update Inward preview

### Phase 4: DR/CR Notes Display

15. Add GST columns to DR/CR Note view table
16. Add GST breakdown to DR/CR Note totals
17. Update DR/CR Note list page with tax column

---

## 9. GST Fields Reference — Per Module

### Line Item GST Fields

| Field | Type | PO | SR | Inward (TODO) | DRCR (TODO) |
|-------|------|----|----|---------------|-------------|
| `taxPercentage` | number | Yes | Yes | Yes (exists) | No |
| `igstAmount` / `igst_amount` | number | Yes | Yes | **ADD** | **ADD** |
| `cgstAmount` / `cgst_amount` | number | Yes | Yes | **ADD** | **ADD** |
| `sgstAmount` / `sgst_amount` | number | Yes | Yes | **ADD** | **ADD** |
| `taxAmount` / `tax_amount` | number | Yes | Yes | **ADD** | **ADD** |

### Additional Charges GST Fields

| Field | PO | SR | Inward (TODO) |
|-------|----|----|---------------|
| `tax_pct` | Yes | Yes | **ADD** |
| `igst_amount` | Yes | Yes | **ADD** |
| `cgst_amount` | Yes | Yes | **ADD** |
| `sgst_amount` | Yes | Yes | **ADD** |
| `tax_amount` | Yes | Yes | **ADD** |
| `apply_tax` | Yes | Yes | **ADD** |

### Header/Form State Fields

| Field | PO | SR | Inward (TODO) |
|-------|----|----|---------------|
| `supplierBranchState` / `supplier_state_name` | Yes | Yes | **ADD** |
| `shippingState` / `shipping_state_name` | Yes | Yes | **ADD** |
| `billingState` / `billing_state_name` | Yes | Yes | **ADD** |
| `india_gst` (from coConfig/header) | Yes | Yes | Yes (exists) |
