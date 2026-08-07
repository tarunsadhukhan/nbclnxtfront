/**
 * Mapper functions for Jute Purchase Order.
 * Maps API responses to UI types and vice versa.
 */

import type {
  BranchRecord,
  MukamRecord,
  VehicleTypeRecord,
  JuteSupplierRecord,
  JutePartyRecord,
  JuteItemRecord,
  JuteQualityRecord,
  JutePOSetupData,
  JutePODetails,
  JutePOLineItemDetails,
  JutePOFormValues,
  JutePOLineItem,
  Option,
} from "../types/jutePOTypes";
import { buildDefaultFormValues, generateLineId } from "./jutePOFactories";
import {
  calculateWeight,
  calculateWeightFromPercentage,
  calculateQuantityFromWeight,
  formatNumber,
} from "./jutePOCalculations";

// =============================================================================
// RECORD MAPPERS (API -> UI Types)
// =============================================================================

export const mapBranchRecords = (records: unknown[]): BranchRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.branch_id;
      if (!id) return null;
      return {
        branch_id: Number(id),
        branch_name: String(data?.branch_name ?? id),
        branch_code: data?.branch_code ? String(data.branch_code) : undefined,
      } satisfies BranchRecord;
    })
    .filter(Boolean) as BranchRecord[];

export const mapMukamRecords = (records: unknown[]): MukamRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.mukam_id;
      if (!id) return null;
      return {
        mukam_id: Number(id),
        mukam_name: String(data?.mukam_name ?? id),
        mukam_code: data?.mukam_code ? String(data.mukam_code) : undefined,
      } satisfies MukamRecord;
    })
    .filter(Boolean) as MukamRecord[];

export const mapVehicleTypeRecords = (records: unknown[]): VehicleTypeRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.vehicle_type_id;
      if (!id) return null;
      return {
        vehicle_type_id: Number(id),
        vehicle_type: String(data?.vehicle_type ?? id),
        capacity_weight: Number(data?.capacity_weight ?? 0),
      } satisfies VehicleTypeRecord;
    })
    .filter(Boolean) as VehicleTypeRecord[];

export const mapJuteSupplierRecords = (records: unknown[]): JuteSupplierRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.supplier_id;
      if (!id) return null;
      return {
        supplier_id: Number(id),
        supplier_code: String(data?.supplier_code ?? id),
        supplier_name: String(data?.supplier_name ?? id),
        mukam_id: data?.mukam_id ? Number(data.mukam_id) : undefined,
      } satisfies JuteSupplierRecord;
    })
    .filter(Boolean) as JuteSupplierRecord[];

export const mapJutePartyRecords = (records: unknown[]): JutePartyRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.party_map_id ?? data?.party_id;
      if (!id) return null;
      return {
        party_map_id: Number(data?.party_map_id ?? id),
        supplier_id: Number(data?.supplier_id ?? 0),
        party_id: Number(data?.party_id ?? id),
        party_name: String(data?.party_name ?? id),
      } satisfies JutePartyRecord;
    })
    .filter(Boolean) as JutePartyRecord[];

export const mapJuteItemRecords = (records: unknown[]): JuteItemRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.item_grp_id ?? data?.item_id;
      if (!id) return null;
      return {
        item_id: Number(id),
        item_code: String(data?.item_grp_code ?? data?.item_code ?? id),
        // API returns item_grp_name (with recursive path like "Jute > Raw Jute")
        item_desc: String(data?.item_grp_name ?? data?.item_grp_desc ?? data?.item_name ?? data?.item_desc ?? id),
        item_grp_id: data?.parent_grp_id ? Number(data.parent_grp_id) : undefined,
        item_grp_desc: data?.parent_grp_name ? String(data.parent_grp_name) : undefined,
        default_uom_id: data?.default_uom_id ? Number(data.default_uom_id) : undefined,
        default_uom: data?.default_uom ? String(data.default_uom) : undefined,
      } satisfies JuteItemRecord;
    })
    .filter(Boolean) as JuteItemRecord[];

export const mapJuteQualityRecords = (records: unknown[]): JuteQualityRecord[] =>
  (records || [])
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.item_id;
      if (!id) return null;
      return {
        item_id: Number(id),
        quality_name: String(data?.quality_name ?? data?.jute_quality ?? id),
        item_grp_id: Number(data?.item_grp_id ?? 0),
      } satisfies JuteQualityRecord;
    })
    .filter(Boolean) as JuteQualityRecord[];

// =============================================================================
// SETUP DATA MAPPER
// =============================================================================

export const mapJutePOSetupResponse = (response: unknown): JutePOSetupData => {
  const data = response as Record<string, unknown>;
  return {
    branches: mapBranchRecords((data?.branches as unknown[]) ?? []),
    mukams: mapMukamRecords((data?.mukams as unknown[]) ?? []),
    vehicle_types: mapVehicleTypeRecords((data?.vehicle_types as unknown[]) ?? []),
    jute_items: mapJuteItemRecords((data?.jute_groups as unknown[]) ?? (data?.jute_items as unknown[]) ?? []),
    suppliers: mapJuteSupplierRecords((data?.suppliers as unknown[]) ?? []),
    channel_options: (data?.channel_options as JutePOSetupData["channel_options"]) ?? [],
    unit_options: (data?.unit_options as JutePOSetupData["unit_options"]) ?? [],
    crop_year_options: (data?.crop_year_options as JutePOSetupData["crop_year_options"]) ?? [],
  };
};

// =============================================================================
// OPTION BUILDERS
// =============================================================================

export const buildBranchOptions = (branches: BranchRecord[]): Option[] =>
  branches.map((b) => ({ label: b.branch_name, value: String(b.branch_id) }));

export const buildMukamOptions = (mukams: MukamRecord[]): Option[] =>
  mukams.map((m) => ({ label: m.mukam_name, value: String(m.mukam_id) }));

export const buildVehicleTypeOptions = (vehicleTypes: VehicleTypeRecord[]): Option[] =>
  vehicleTypes.map((v) => ({
    label: `${v.vehicle_type} (${v.capacity_weight} Qtl)`,
    value: String(v.vehicle_type_id),
  }));

export const buildSupplierOptions = (suppliers: JuteSupplierRecord[]): Option[] =>
  suppliers.map((s) => ({ label: s.supplier_name, value: String(s.supplier_id) }));

export const buildPartyOptions = (parties: JutePartyRecord[]): Option[] =>
  parties.map((p) => ({ label: p.party_name, value: String(p.party_id) }));

export const buildJuteItemOptions = (items: JuteItemRecord[]): Option[] =>
  items.map((i) => ({ label: i.item_desc, value: String(i.item_id) }));

export const buildQualityOptions = (qualities: JuteQualityRecord[]): Option[] =>
  qualities.map((q) => ({ label: q.quality_name, value: String(q.item_id) }));

// =============================================================================
// LABEL MAP BUILDERS
// =============================================================================

export const buildLabelMap = <T>(
  items: T[],
  getId: (item: T) => string | number,
  getLabel: (item: T) => string
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const item of items) {
    map[String(getId(item))] = getLabel(item);
  }
  return map;
};

export const createLabelResolver =
  (map: Record<string, string>) =>
  (id: string): string =>
    map[id] ?? id;

// =============================================================================
// FORM VALUES MAPPERS (for edit/view mode)
// =============================================================================

export const mapPODetailsToFormValues = (
  details: JutePODetails,
  defaults: JutePOFormValues
): JutePOFormValues => ({
  branch: details.branch_id ? String(details.branch_id) : defaults.branch,
  withWithoutIndent: "WITHOUT", // Always without indent for now
  indentNo: "",
  poDate: details.po_date ? details.po_date.slice(0, 10) : defaults.poDate,
  mukam: details.mukam_id ? String(details.mukam_id) : defaults.mukam,
  juteUnit: details.jute_unit || defaults.juteUnit,
  supplier: details.supplier_id ? String(details.supplier_id) : defaults.supplier,
  partyName: details.party_id ? String(details.party_id) : defaults.partyName,
  vehicleType: details.vehicle_type_id ? String(details.vehicle_type_id) : defaults.vehicleType,
  vehicleQty: details.vehicle_qty ? String(details.vehicle_qty) : defaults.vehicleQty,
  channelType: details.channel_code || defaults.channelType,
  creditTerm: details.credit_term || defaults.creditTerm,
  deliveryTimeline: details.delivery_timeline || defaults.deliveryTimeline,
  expectedDate: defaults.expectedDate, // Will be calculated
  freightCharge: details.frieght_charge ? String(details.frieght_charge) : defaults.freightCharge,
  remarks: details.remarks || defaults.remarks,
});

export type WeightCalcParams = {
  vehicleCapacity: number;
  vehicleQty: number;
  juteUnit: string;
};

export const mapLineItemDetailsToLineItem = (
  details: JutePOLineItemDetails,
  calcParams?: WeightCalcParams
): JutePOLineItem => {
  const quantity = details.quantity ?? 0;
  const rate = details.rate ?? 0;
  const hasPercentage =
    details.percentage !== null &&
    details.percentage !== undefined &&
    Number.isFinite(Number(details.percentage));
  const percentageValue = hasPercentage ? Number(details.percentage) : 0;

  let weight = 0;
  let derivedQty = quantity;
  if (calcParams) {
    if (hasPercentage) {
      weight = calculateWeightFromPercentage(
        percentageValue,
        calcParams.vehicleCapacity,
        calcParams.vehicleQty,
      );
      derivedQty = Math.round(calculateQuantityFromWeight(weight, calcParams.juteUnit));
    } else {
      weight = calculateWeight(
        quantity,
        calcParams.vehicleCapacity,
        calcParams.vehicleQty,
        calcParams.juteUnit
      );
    }
  }

  return {
    id: generateLineId(),
    itemId: String(details.item_grp_id ?? details.item_id),
    itemName: details.jute_group_name ?? undefined,
    quality: details.item_id ? String(details.item_id) : "",
    qualityName: details.quality_name || undefined,
    cropYear: details.crop_year ? `${details.crop_year}-${(details.crop_year % 100) + 1}` : "",
    marka: details.marka || "",
    percentage: hasPercentage ? formatNumber(percentageValue, 2) : "",
    quantity: hasPercentage
      ? derivedQty > 0 ? formatNumber(derivedQty, 0) : ""
      : String(quantity),
    uom: details.uom || "",
    rate: String(rate),
    allowableMoisture: details.allowable_moisture
      ? String(details.allowable_moisture)
      : "",
    weight: weight > 0 ? formatNumber(weight, 2) : "",
    amount: details.amount ? String(details.amount) : "",
  };
};

// =============================================================================
// PAYLOAD MAPPERS (UI -> API)
// =============================================================================

type LineItemPayload = {
  item_grp_id: number;
  item_id: number | null;
  crop_year: string | null;
  marka: string | null;
  quantity: number;
  rate: number;
  allowable_moisture: number | null;
  jute_unit: string;
  percentage?: number | null;
};

const buildLineItemPayloads = (
  lineItems: JutePOLineItem[],
  juteUnit: string,
  isLegacyPO: boolean,
): LineItemPayload[] =>
  lineItems
    .filter((li) => li.itemId && Number(li.quantity) > 0)
    .map((li) => {
      const base: LineItemPayload = {
        item_grp_id: Number(li.itemId),
        item_id: li.quality ? Number(li.quality) : null,
        crop_year: li.cropYear || null,
        marka: li.marka || null,
        quantity: Math.round(Number(li.quantity)),
        rate: Number(li.rate),
        allowable_moisture: li.allowableMoisture
          ? Number(li.allowableMoisture)
          : null,
        jute_unit: juteUnit,
      };
      if (!isLegacyPO) {
        base.percentage = Number(li.percentage);
      }
      return base;
    });

export const mapFormValuesToCreatePayload = (
  formValues: JutePOFormValues,
  lineItems: JutePOLineItem[],
  coId: number,
  isLegacyPO = false,
) => ({
  co_id: coId,
  branch_id: Number(formValues.branch),
  po_date: formValues.poDate,
  mukam_id: Number(formValues.mukam),
  jute_unit: formValues.juteUnit,
  supplier_id: Number(formValues.supplier),
  party_id: formValues.partyName ? Number(formValues.partyName) : null,
  vehicle_type_id: Number(formValues.vehicleType),
  vehicle_quantity: Number(formValues.vehicleQty),
  channel_code: formValues.channelType,
  credit_term: formValues.creditTerm ? Number(formValues.creditTerm) : null,
  delivery_timeline: formValues.deliveryTimeline ? Number(formValues.deliveryTimeline) : null,
  freight_charge: formValues.freightCharge ? Number(formValues.freightCharge) : null,
  remarks: formValues.remarks || null,
  line_items: buildLineItemPayloads(lineItems, formValues.juteUnit, isLegacyPO),
});

// Alias functions for page.tsx compatibility
export const mapFormToCreatePayload = (
  formValues: JutePOFormValues,
  lineItems: JutePOLineItem[],
  coId: number,
  isLegacyPO = false,
) => mapFormValuesToCreatePayload(formValues, lineItems, coId, isLegacyPO);

export const mapFormToUpdatePayload = (
  formValues: JutePOFormValues,
  lineItems: JutePOLineItem[],
  isLegacyPO = false,
) => ({
  branch_id: Number(formValues.branch),
  po_date: formValues.poDate,
  mukam_id: Number(formValues.mukam),
  jute_unit: formValues.juteUnit,
  supplier_id: Number(formValues.supplier),
  party_id: formValues.partyName ? Number(formValues.partyName) : null,
  vehicle_type_id: Number(formValues.vehicleType),
  vehicle_quantity: Number(formValues.vehicleQty),
  channel_code: formValues.channelType,
  credit_term: formValues.creditTerm ? Number(formValues.creditTerm) : null,
  delivery_timeline: formValues.deliveryTimeline ? Number(formValues.deliveryTimeline) : null,
  freight_charge: formValues.freightCharge ? Number(formValues.freightCharge) : null,
  remarks: formValues.remarks || null,
  line_items: buildLineItemPayloads(lineItems, formValues.juteUnit, isLegacyPO),
});

// =============================================================================
// DETAILS RESPONSE MAPPER
// =============================================================================

export const mapJutePODetailsResponse = (data: unknown): JutePODetails => {
  const raw = data as Record<string, unknown>;
  return {
    jute_po_id: Number(raw?.jute_po_id ?? 0),
    po_num: String(raw?.po_num ?? ""),
    po_date: String(raw?.po_date ?? ""),
    branch_id: Number(raw?.branch_id ?? 0),
    mukam_id: Number(raw?.mukam_id ?? 0),
    mukam: raw?.mukam ? String(raw.mukam) : undefined,
    jute_unit: String(raw?.jute_unit ?? "LOOSE"),
    supplier_id: Number(raw?.supplier_id ?? 0),
    supp_code: String(raw?.supp_code ?? ""),
    supplier_name: raw?.supplier_name ? String(raw.supplier_name) : undefined,
    party_id: raw?.party_id ? Number(raw.party_id) : undefined,
    vehicle_type_id: Number(raw?.vehicle_type_id ?? 0),
    vehicle_capacity: raw?.vehicle_capacity ? Number(raw.vehicle_capacity) : undefined,
    vehicle_qty: Number(raw?.vehicle_qty ?? 1),
    channel_code: String(raw?.channel_code ?? ""),
    credit_term: raw?.credit_term ? String(raw.credit_term) : undefined,
    delivery_timeline: raw?.delivery_timeline ? String(raw.delivery_timeline) : undefined,
    frieght_charge: raw?.frieght_charge ? Number(raw.frieght_charge) : undefined,
    remarks: raw?.remarks ? String(raw.remarks) : undefined,
    status_id: Number(raw?.status_id ?? 21),
    status: raw?.status ? String(raw.status) : undefined,
    weight: raw?.weight ? Number(raw.weight) : undefined,
    po_val_wo_tax: raw?.po_val_wo_tax ? Number(raw.po_val_wo_tax) : undefined,
    created_by: raw?.created_by ? Number(raw.created_by) : undefined,
    updated_date_time: raw?.updated_date_time ? String(raw.updated_date_time) : undefined,
    line_items: Array.isArray(raw?.line_items) ? (raw.line_items as JutePOLineItemDetails[]) : undefined,
  } satisfies JutePODetails;
};

/**
 * Extracts form values from JutePODetails for form binding.
 */
export const extractFormValuesFromDetails = (details: JutePODetails): JutePOFormValues => {
  const defaults = buildDefaultFormValues() as JutePOFormValues;
  return mapPODetailsToFormValues(details, defaults);
};

// =============================================================================
// LINE ITEMS FROM API MAPPER
// =============================================================================

export const mapLineItemsFromAPI = (
  data: unknown[],
  calcParams?: WeightCalcParams
): JutePOLineItem[] => {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const li = item as JutePOLineItemDetails;
    return mapLineItemDetailsToLineItem(li, calcParams);
  });
};

/**
 * Determine whether a PO's line items came from a pre-percentage (legacy) PO.
 * A PO is considered legacy if every line item has percentage null/undefined.
 */
export const detectLegacyPO = (data: unknown[]): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every((row) => {
    const li = row as JutePOLineItemDetails;
    return li.percentage === null || li.percentage === undefined;
  });
};
