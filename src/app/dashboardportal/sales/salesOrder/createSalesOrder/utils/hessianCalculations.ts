// Sales Order hessian calc — thin re-export of the shared utility at
// `src/utils/hessianCalculations.ts`. Both SO and Sales Invoice pass the
// per-mapping qtyRounding resolved from uom_item_map_mst (falling back to 3).
export { computeHessianFields } from "@/utils/hessianCalculations";
export type { HessianComputedFields } from "@/utils/hessianCalculations";
