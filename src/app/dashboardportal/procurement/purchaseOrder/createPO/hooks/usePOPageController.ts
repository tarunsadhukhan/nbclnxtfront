import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import { useBranchOptions } from "@/utils/branchUtils";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import {
  fetchPOSetup1,
  fetchPOSetup2,
  type POLine,
  type PODetails,
} from "@/utils/poService";
import {
  SearchableSelect,
  useDeferredOptionCache,
  useTransactionSetup,
  type ApprovalInfo,
  type ApprovalActionPermissions,
  type ApprovalStatusId,
} from "@/components/ui/transaction";
import { mapItemGroupDetailResponse, mapPOSetupResponse } from "../utils/poMappers";
import {
  calculateExpectedDate,
  calculateLineAmount as calculateLineAmountUtil,
  calculateTotals,
} from "../utils/poCalculations";
import { buildDefaultFormValues, createBlankLine } from "../utils/poFactories";
import {
  EMPTY_BRANCH_ADDRESSES,
  EMPTY_EXPENSES,
  EMPTY_ITEM_GROUPS,
  EMPTY_PROJECTS,
  EMPTY_SETUP_PARAMS,
  EMPTY_SUPPLIERS,
  EMPTY_SUPPLIER_BRANCHES,
  PO_STATUS_IDS,
  PO_STATUS_LABELS,
  isAmountDiscountMode,
  isPercentageDiscountMode,
} from "../utils/poConstants";
import { usePOFormState } from "./usePOFormState";
import { usePOAddresses } from "./usePOAddresses";
import { usePOTaxCalculations } from "./usePOTaxCalculations";
import { usePOLineItems } from "./usePOLineItems";
import { usePOHeaderSchema, usePOFooterSchema } from "./usePOFormSchemas";
import { usePOFormSubmission } from "./usePOFormSubmission";
import { usePOApproval } from "./usePOApproval";
import { usePOLineItemColumns } from "../components/POLineItemsTable";
import type {
  BranchAddressRecord,
  EditableLineItem,
  ExpenseRecord,
  ItemGroupCacheEntry,
  ItemGroupRecord,
  ItemOption,
  Option,
  POSetupData,
  ProjectRecord,
  SupplierBranchRecord,
  SupplierRecord,
} from "../types/poTypes";
import { usePOSelectOptions } from "./usePOSelectOptions";
