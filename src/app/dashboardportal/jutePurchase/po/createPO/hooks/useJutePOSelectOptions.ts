"use client";

/**
 * @hook useJutePOSelectOptions
 * @description Manages dropdown options and label resolvers for Jute PO.
 * Handles cascading logic: mukam → supplier, supplier → party.
 */

import * as React from "react";
import type {
  Option,
  BranchRecord,
  MukamRecord,
  VehicleTypeRecord,
  JuteItemRecord,
  JuteSupplierRecord,
  JutePOLabelResolvers,
} from "../types/jutePOTypes";
import {
  buildBranchOptions,
  buildMukamOptions,
  buildVehicleTypeOptions,
  buildJuteItemOptions,
  buildSupplierOptions,
  buildLabelMap,
  createLabelResolver,
} from "../utils/jutePOMappers";
import { CHANNEL_OPTIONS, UNIT_OPTIONS, CROP_YEAR_OPTIONS } from "../utils/jutePOConstants";

type UseJutePOSelectOptionsParams = {
  branches: BranchRecord[];
  mukams: MukamRecord[];
  vehicleTypes: VehicleTypeRecord[];
  juteItems: JuteItemRecord[];
  suppliers: JuteSupplierRecord[];
  parties: Option[];
  qualitiesByItem: Record<string, Option[]>;
};

type UseJutePOSelectOptionsReturn = {
  // Options
  branchOptions: Option[];
  mukamOptions: Option[];
  vehicleTypeOptions: Option[];
  supplierOptions: Option[];
  partyOptions: Option[];
  juteItemOptions: Option[];
  channelOptions: Option[];
  unitOptions: Option[];
  cropYearOptions: Option[];
  
  // Quality options getter (by item)
  getQualityOptions: (itemId: string) => Option[];
  
  // Vehicle capacity getter
  getVehicleCapacity: (vehicleTypeId: string) => number;
  
  // Label resolvers
  labelResolvers: JutePOLabelResolvers;
};

export function useJutePOSelectOptions({
  branches,
  mukams,
  vehicleTypes,
  juteItems,
  suppliers,
  parties,
  qualitiesByItem,
}: UseJutePOSelectOptionsParams): UseJutePOSelectOptionsReturn {
  // Build options
  const branchOptions = React.useMemo(() => buildBranchOptions(branches), [branches]);
  const mukamOptions = React.useMemo(() => buildMukamOptions(mukams), [mukams]);
  const vehicleTypeOptions = React.useMemo(() => buildVehicleTypeOptions(vehicleTypes), [vehicleTypes]);
  
  // Build supplier options from JuteSupplierRecord[]
  const supplierOptions = React.useMemo(() => buildSupplierOptions(suppliers), [suppliers]);
  
  // Parties are already Option[]
  const partyOptions = parties;
  
  const juteItemOptions = React.useMemo(() => buildJuteItemOptions(juteItems), [juteItems]);

  // Static options
  const channelOptions = React.useMemo<Option[]>(
    () => CHANNEL_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    []
  );
  const unitOptions = React.useMemo<Option[]>(
    () => UNIT_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    []
  );
  const cropYearOptions = React.useMemo<Option[]>(
    () => CROP_YEAR_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    []
  );

  // Build label maps
  const branchLabelMap = React.useMemo(
    () => buildLabelMap(branches, (b) => b.branch_id, (b) => b.branch_name),
    [branches]
  );
  const mukamLabelMap = React.useMemo(
    () => buildLabelMap(mukams, (m) => m.mukam_id, (m) => m.mukam_name),
    [mukams]
  );
  const vehicleTypeLabelMap = React.useMemo(
    () => buildLabelMap(vehicleTypes, (v) => v.vehicle_type_id, (v) => v.vehicle_type),
    [vehicleTypes]
  );
  const supplierLabelMap = React.useMemo(
    () => buildLabelMap(suppliers, (s) => s.supplier_id, (s) => s.supplier_name),
    [suppliers]
  );
  const partyLabelMap = React.useMemo(
    () => buildLabelMap(parties, (p) => p.value, (p) => p.label),
    [parties]
  );
  const itemLabelMap = React.useMemo(
    () => buildLabelMap(juteItems, (i) => i.item_id, (i) => i.item_desc),
    [juteItems]
  );

  // Vehicle capacity map
  const vehicleCapacityMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of vehicleTypes) {
      map[String(v.vehicle_type_id)] = v.capacity_weight;
    }
    return map;
  }, [vehicleTypes]);

  // Get vehicle capacity by ID
  const getVehicleCapacity = React.useCallback(
    (vehicleTypeId: string): number => vehicleCapacityMap[vehicleTypeId] ?? 0,
    [vehicleCapacityMap]
  );

  // Get quality options for an item
  const getQualityOptions = React.useCallback(
    (itemId: string): Option[] => {
      return qualitiesByItem[itemId] ?? [];
    },
    [qualitiesByItem]
  );

  // Quality label map for resolvers
  const qualityLabelMap = React.useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const [itemId, options] of Object.entries(qualitiesByItem)) {
      map[itemId] = buildLabelMap(options, (o) => o.value, (o) => o.label);
    }
    return map;
  }, [qualitiesByItem]);

  // Create label resolvers
  const labelResolvers = React.useMemo<JutePOLabelResolvers>(
    () => ({
      branch: createLabelResolver(branchLabelMap),
      mukam: createLabelResolver(mukamLabelMap),
      supplier: createLabelResolver(supplierLabelMap),
      party: createLabelResolver(partyLabelMap),
      vehicleType: createLabelResolver(vehicleTypeLabelMap),
      item: createLabelResolver(itemLabelMap),
      quality: (itemId: string, qualityId: string) => {
        const itemQualityMap = qualityLabelMap[itemId];
        return itemQualityMap?.[qualityId] ?? qualityId;
      },
    }),
    [branchLabelMap, mukamLabelMap, supplierLabelMap, partyLabelMap, vehicleTypeLabelMap, itemLabelMap, qualityLabelMap]
  );

  return {
    branchOptions,
    mukamOptions,
    vehicleTypeOptions,
    supplierOptions,
    partyOptions,
    juteItemOptions,
    channelOptions,
    unitOptions,
    cropYearOptions,
    getQualityOptions,
    getVehicleCapacity,
    labelResolvers,
  };
}
