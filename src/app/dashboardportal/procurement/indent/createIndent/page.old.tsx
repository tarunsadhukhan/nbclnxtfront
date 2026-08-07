"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import MuiForm, { type MuiFormMode, type Schema } from "@/components/ui/muiform";
import IndentPreview from "../components/IndentPreview";
import {
  SearchableSelect,
  useDeferredOptionCache,
  useLineItems,
  useTransactionPreview,
  useTransactionSetup,
  type TransactionLineColumn,
  ApprovalActionsBar,
  type ApprovalInfo,
  type ApprovalActionPermissions,
  type ApprovalStatusId,
} from "@/components/ui/transaction";
import { useBranchOptions } from "@/utils/branchUtils";
import {
  createIndent,
  fetchIndentSetup1,
  fetchIndentSetup2,
  getIndentById,
  updateIndent,
  approveIndent,
  openIndent,
  cancelDraftIndent,
  reopenIndent,
  sendIndentForApproval,
  rejectIndent,
  type IndentLine,
} from "@/utils/indentService";
import type { IndentDetails } from "@/utils/indentService";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { buildLabelMap, createLabelResolver } from "@/utils/labelUtils";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Option = { label: string; value: string };

type EditableLineItem = {
  id: string;
  department: string;
  itemGroup: string;
  item: string;
  itemMake: string;
  quantity: string;
  uom: string;
  remarks: string;
};

type DepartmentRecord = { id: string; name: string; branchId?: string };
type ProjectRecord = { id: string; name: string; branchId?: string };
type ExpenseRecord = { id: string; name: string };
type ItemGroupRecord = { id: string; label: string };

type ItemOption = Option & { defaultUomId?: string; defaultUomLabel?: string };

type ItemGroupCacheEntry = {
  items: ItemOption[];
  makes: Option[];
  uomsByItemId: Record<string, Option[]>;
  itemLabelById: Record<string, string>;
  makeLabelById: Record<string, string>;
  uomLabelByItemId: Record<string, Record<string, string>>;
};

type IndentSetupData = {
  departments: DepartmentRecord[];
  projects: ProjectRecord[];
  expenses: ExpenseRecord[];
  itemGroups: ItemGroupRecord[];
};

const mapDepartmentRecords = (records: unknown[]): DepartmentRecord[] =>
  records
    .map((row) => {
      const data = row as any;
      const id = data?.dept_id ?? data?.department_id ?? data?.id;
      if (!id) return null;
      return {
        id: String(id),
        name: data?.dept_desc ?? data?.dept_name ?? data?.name ?? String(id),
        branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
      } satisfies DepartmentRecord;
    })
    .filter(Boolean) as DepartmentRecord[];

const mapProjectRecords = (records: unknown[]): ProjectRecord[] =>
  records
    .map((row) => {
      const data = row as any;
      const id = data?.project_id ?? data?.prj_id ?? data?.id;
      if (!id) return null;
      return {
        id: String(id),
        name: data?.prj_name ?? data?.project_name ?? data?.name ?? String(id),
        branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
      } satisfies ProjectRecord;
    })
    .filter(Boolean) as ProjectRecord[];

const mapExpenseRecords = (records: unknown[]): ExpenseRecord[] =>
  records
    .map((row) => {
      const data = row as any;
      const id = data?.expense_type_id ?? data?.id;
      if (!id) return null;
      return {
        id: String(id),
        name: data?.expense_type_name ?? data?.name ?? String(id),
      } satisfies ExpenseRecord;
    })
    .filter(Boolean) as ExpenseRecord[];

const mapItemGroupRecords = (records: unknown[]): ItemGroupRecord[] =>
  records
    .map((row) => {
      const data = row as any;
      const id = data?.item_grp_id ?? data?.id;
      if (!id) return null;
      const code = data?.item_grp_code_display ?? data?.code;
      const name = data?.item_grp_name_display ?? data?.name;
      const labelParts = [code, name].filter(Boolean);
      return {
        id: String(id),
        label: labelParts.length ? labelParts.join(" — ") : String(id),
      } satisfies ItemGroupRecord;
    })
    .filter(Boolean) as ItemGroupRecord[];

const mapIndentSetupResponse = (response: unknown): IndentSetupData => {
  const result = response as Record<string, unknown>;
  return {
    departments: mapDepartmentRecords((result?.departments as unknown[]) ?? []),
    projects: mapProjectRecords((result?.projects as unknown[]) ?? []),
    expenses: mapExpenseRecords((result?.expense_types as unknown[]) ?? []),
    itemGroups: mapItemGroupRecords((result?.item_groups as unknown[]) ?? []),
  } satisfies IndentSetupData;
};

const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
  const result = response as Record<string, unknown>;
  const itemsRaw = Array.isArray(result.items) ? result.items : [];
  const makesRaw = Array.isArray(result.makes) ? result.makes : [];
  const uomsRaw = Array.isArray(result.uoms) ? result.uoms : [];

  const items: ItemOption[] = itemsRaw
    .map((row) => {
      const data = row as any;
      const id = data?.item_id ?? data?.id;
      if (!id) return null;
      const value = String(id);
      const code = data?.item_code;
      const name = data?.item_name;
      const labelParts = [code, name].filter(Boolean);
      return {
        value,
        label: labelParts.length ? labelParts.join(" — ") : value,
        defaultUomId: data?.uom_id != null ? String(data.uom_id) : undefined,
        defaultUomLabel: data?.uom_name ? String(data.uom_name) : undefined,
      } satisfies ItemOption;
    })
    .filter(Boolean) as ItemOption[];

  const makes: Option[] = makesRaw
    .map((row) => {
      const data = row as any;
      const id = data?.item_make_id ?? data?.id;
      if (!id) return null;
      return {
        value: String(id),
        label: data?.item_make_name ?? data?.name ?? String(id),
      } satisfies Option;
    })
    .filter(Boolean) as Option[];

  const uomsByItemId: Record<string, Option[]> = {};
  const uomLabelByItemId: Record<string, Record<string, string>> = {};

  uomsRaw.forEach((row) => {
    const data = row as any;
    const itemId = data?.item_id ?? data?.id;
    const uomId = data?.map_to_id ?? data?.uom_id ?? data?.mapToId;
    if (!itemId || !uomId) return;
    const itemKey = String(itemId);
    const uomKey = String(uomId);
    const label = data?.uom_name ? String(data.uom_name) : uomKey;
    if (!uomsByItemId[itemKey]) uomsByItemId[itemKey] = [];
    if (!uomLabelByItemId[itemKey]) uomLabelByItemId[itemKey] = {};
    if (!uomsByItemId[itemKey].some((opt) => opt.value === uomKey)) {
      uomsByItemId[itemKey].push({ value: uomKey, label });
    }
    uomLabelByItemId[itemKey][uomKey] = label;
  });

  items.forEach((item) => {
    if (!item.defaultUomId) return;
    const bucket = uomsByItemId[item.value] ?? [];
    if (!bucket.some((opt) => opt.value === item.defaultUomId)) {
      bucket.unshift({
        value: item.defaultUomId,
        label: item.defaultUomLabel ?? item.defaultUomId,
      });
    }
    uomsByItemId[item.value] = bucket;
    if (!uomLabelByItemId[item.value]) uomLabelByItemId[item.value] = {};
    uomLabelByItemId[item.value][item.defaultUomId] = item.defaultUomLabel ?? item.defaultUomId ?? item.defaultUomId;
  });

  const itemLabelById: Record<string, string> = {};
  items.forEach((item) => {
    itemLabelById[item.value] = item.label;
  });

  const makeLabelById: Record<string, string> = {};
  makes.forEach((make) => {
    makeLabelById[make.value] = make.label;
  });

  return {
    items,
    makes,
    uomsByItemId,
    itemLabelById,
    makeLabelById,
    uomLabelByItemId,
  } satisfies ItemGroupCacheEntry;
};

const INDENT_TYPE_OPTIONS = [
  { label: "Regular Indent", value: "regular" },
  { label: "Open Indent", value: "open" },
  { label: "BOM", value: "bom" },
];

const EMPTY_DEPARTMENTS: DepartmentRecord[] = [];
const EMPTY_PROJECTS: ProjectRecord[] = [];
const EMPTY_EXPENSES: ExpenseRecord[] = [];
const EMPTY_ITEM_GROUPS: ItemGroupRecord[] = [];
const EMPTY_SETUP_PARAMS: { readonly branchId?: string } = {};

const buildDefaultFormValues = () => ({
  branch: "",
  indent_type: "",
  expense_type: "",
  date: new Date().toISOString().slice(0, 10),
  indent_no: "",
  project: "",
  requester: "",
  remarks: "",
});

let lineIdSeed = 0;
const generateLineId = () => {
  lineIdSeed += 1;
  return `line-${lineIdSeed}`;
};

const createBlankLine = (): EditableLineItem => ({
  id: generateLineId(),
  department: "",
  itemGroup: "",
  item: "",
  itemMake: "",
  quantity: "",
  uom: "",
  remarks: "",
});

const lineHasAnyData = (line: EditableLineItem) =>
  Boolean(
    line.department ||
      line.itemGroup ||
      line.item ||
      line.itemMake ||
      line.quantity ||
      line.uom ||
      line.remarks
  );

const lineIsComplete = (line: EditableLineItem) => {
  const qty = Number(line.quantity);
  return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0);
};

export default function IndentTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
  const requestedId = searchParams?.get("id") || "";
  const menuIdFromUrl = searchParams?.get("menu_id") || "";

  const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";
  
  const branchOptions = useBranchOptions();
  const { coId } = useSelectedCompanyCoId();
  const { availableMenus, menuItems: sidebarMenuItems } = useSidebarContext();
  
  // Get menu_id from URL, or lookup from menuItems based on current path
  const getMenuId = React.useCallback((): string => {
    if (menuIdFromUrl) {
      console.log("[getMenuId] Found in URL", menuIdFromUrl);
      return menuIdFromUrl;
    }
    
    // Try to get from sidebar context first (most reliable)
    if (availableMenus && availableMenus.length > 0) {
      const currentPath = pathname?.toLowerCase() || "";
      console.log("[getMenuId] Checking availableMenus from context", { count: availableMenus.length, currentPath });
      
      // First, try exact path match
      const matchingMenu = availableMenus.find(
        (item) => {
          if (!item.menu_path) return false;
          const menuPath = item.menu_path.toLowerCase();
          return currentPath === menuPath || currentPath.startsWith(menuPath + "/");
        }
      );
      
      if (matchingMenu?.menu_id) {
        console.log("[getMenuId] Found by path match in context", { menu_id: matchingMenu.menu_id, menu_path: matchingMenu.menu_path });
        return String(matchingMenu.menu_id);
      }
      
      // Second, try to find by "indent" in path or name
      const indentMenu = availableMenus.find(
        (item) => {
          const path = (item.menu_path || "").toLowerCase();
          const name = (item.menu_name || "").toLowerCase();
          return path.includes("indent") || path.includes("/procurement/indent") || name.includes("indent");
        }
      );
      
      if (indentMenu?.menu_id) {
        console.log("[getMenuId] Found by indent keyword in context", { menu_id: indentMenu.menu_id, menu_path: indentMenu.menu_path, menu_name: indentMenu.menu_name });
        return String(indentMenu.menu_id);
      }
    }
    
    // Fallback to sidebarMenuItems from context
    if (sidebarMenuItems && sidebarMenuItems.length > 0) {
      console.log("[getMenuId] Checking sidebarMenuItems from context", { count: sidebarMenuItems.length });
      
      const currentPath = pathname?.toLowerCase() || "";
      const indentMenu = sidebarMenuItems.find(
        (item) => {
          const path = (item.menu_path || "").toLowerCase();
          const name = (item.menu_name || "").toLowerCase();
          return path.includes("indent") || path.includes("/procurement/indent") || name.includes("indent");
        }
      );
      
      if (indentMenu?.menu_id) {
        console.log("[getMenuId] Found in sidebarMenuItems", { menu_id: indentMenu.menu_id });
        return String(indentMenu.menu_id);
      }
    }
    
    // Try to get from localStorage menuItems by matching path
    if (typeof window !== "undefined" && pathname) {
      try {
        const storedMenuItems = localStorage.getItem("sidebar_menuItems");
        console.log("[getMenuId] Checking localStorage", { storedMenuItems: !!storedMenuItems, pathname });
        
        if (storedMenuItems) {
          const menuItems = JSON.parse(storedMenuItems) as Array<{ menu_id?: number; menu_path?: string; menu_name?: string }> | null;
          console.log("[getMenuId] Parsed menuItems", { count: Array.isArray(menuItems) ? menuItems.length : 0 });
          
          if (Array.isArray(menuItems) && menuItems.length > 0) {
            const currentPath = pathname.toLowerCase();
            const indentMenu = menuItems.find(
              (item) => {
                const path = (item.menu_path || "").toLowerCase();
                const name = (item.menu_name || "").toLowerCase();
                return path.includes("indent") || path.includes("/procurement/indent") || name.includes("indent");
              }
            );
            
            if (indentMenu?.menu_id) {
              console.log("[getMenuId] Found in localStorage menuItems", { menu_id: indentMenu.menu_id });
              return String(indentMenu.menu_id);
            }
          }
        }
      } catch (error) {
        console.error("[getMenuId] Error parsing menuItems", error);
      }
    }
    
    // Final fallback: return empty string (will show error if needed)
    console.warn("[getMenuId] Returning empty string - menu_id not found. Please add menu_id to URL or ensure menuItems are available.");
    return "";
  }, [menuIdFromUrl, pathname, availableMenus, sidebarMenuItems]);
  const [initialValues, setInitialValues] = React.useState<Record<string, unknown>>(buildDefaultFormValues);
  const [formValues, setFormValues] = React.useState<Record<string, unknown>>(buildDefaultFormValues);
  const { items: lineItems, setItems: setLineItems, replaceItems, removeItems: removeLineItems } = useLineItems<EditableLineItem>({
    createBlankItem: createBlankLine,
    hasData: lineHasAnyData,
    getItemId: (item) => item.id,
    maintainTrailingBlank: mode !== "view",
  });
  const [indentDetails, setIndentDetails] = React.useState<IndentDetails | null>(null);
  const [loading, setLoading] = React.useState<boolean>(mode !== "create");
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [approvalLoading, setApprovalLoading] = React.useState(false);

  // Helper to map status name/label to status ID
  const mapStatusToId = React.useCallback((status?: string | null): ApprovalStatusId | null => {
    if (!status) return null;
    const normalized = String(status).toLowerCase().trim();
    // Map common status names to IDs
    if (normalized.includes("draft") || normalized === "21") return 21;
    if (normalized === "open" || normalized === "1") return 1;
    if (normalized.includes("pending") || normalized.includes("approval") || normalized === "20") {
      return 20;
    }
    if (normalized === "approved" || normalized === "3") return 3;
    if (normalized === "rejected" || normalized === "4") return 4;
    if (normalized === "closed" || normalized === "5") return 5;
    if (normalized === "cancelled" || normalized === "6") return 6;
    return null;
  }, []);

  // Helper to get approval permissions - use API permissions if available, otherwise fallback to status-based logic
  const getApprovalPermissions = React.useCallback(
    (statusId: ApprovalStatusId | null, mode: MuiFormMode, apiPermissions?: ApprovalActionPermissions): ApprovalActionPermissions => {
      // If API provided permissions, use them (they already include all checks)
      if (apiPermissions) {
        return apiPermissions;
      }
      
      // Fallback to status-based logic if API permissions not available
      if (!statusId || mode === "view") {
        // In view mode, allow read-only actions
        return {
          canViewApprovalLog: true,
          canClone: true,
        };
      }

      // Drafted (21)
      if (statusId === 21) {
        return {
          canSave: true,
          canOpen: true,
          canCancelDraft: true,
        };
      }

      // Cancelled (6)
      if (statusId === 6) {
        return {
          canReopen: true,
          canClone: true,
          canViewApprovalLog: true,
        };
      }

      // Open (1) - Show Approve button (backend will handle transition to Pending Approval first)
      if (statusId === 1) {
        return {
          canSave: true,
          canApprove: true,  // Changed from canSendForApproval to canApprove
        };
      }

      // Pending Approval (20) - without API permissions, don't show approve/reject
      // (they will be calculated by backend when menu_id is provided)
      if (statusId === 20) {
        return {
          canViewApprovalLog: true,
        };
      }

      // Approved (3)
      if (statusId === 3) {
        return {
          canViewApprovalLog: true,
          canClone: true,
        };
      }

      // Rejected (4)
      if (statusId === 4) {
        return {
          canReopen: true,
          canClone: true,
          canViewApprovalLog: true,
        };
      }

      // Closed (5)
      if (statusId === 5) {
        return {
          canViewApprovalLog: true,
        };
      }

      return {};
    },
    []
  );

  const { cache: itemGroupCache, loading: itemGroupLoading, ensure: ensureItemGroupData, reset: resetItemGroupCache } =
    useDeferredOptionCache<string, ItemGroupCacheEntry>({
      fetcher: async (itemGroupId: string) => {
        // Validate that itemGroupId is numeric (backend expects numeric ID, not code)
        if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
          throw new Error(`Invalid item group ID: ${itemGroupId}. Expected numeric ID.`);
        }
        const response = await fetchIndentSetup2(itemGroupId);
        return mapItemGroupDetailResponse(response);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Unable to load item options.";
        toast({
          variant: "destructive",
          title: "Item data not available",
          description: message,
        });
      },
    });

  const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
  const createDefaultsSeededRef = React.useRef(false);

  const mapLineToEditable = React.useCallback((line: IndentLine): EditableLineItem => ({
    id: line.id ? String(line.id) : generateLineId(),
    department: line.department ?? "",
    itemGroup: line.itemGroup ?? "",
    item: line.item ?? "",
    itemMake: line.itemMake ?? "",
    quantity: line.quantity != null ? String(line.quantity) : "",
    uom: line.uom ?? "",
    remarks: line.remarks ?? "",
  }), []);


  React.useEffect(() => {
    if (mode !== "create") {
      createDefaultsSeededRef.current = false;
      return;
    }

    if (!createDefaultsSeededRef.current) {
      const base = buildDefaultFormValues();
      setInitialValues(base);
      setFormValues(base);
      setFormKey((prev) => prev + 1);
      setLineItems((prev) => (prev.length ? prev : [createBlankLine()]));
      createDefaultsSeededRef.current = true;
    }
  }, [mode]);

  React.useEffect(() => {
    if (mode !== "create") return;
    if (!branchOptions.length) return;

    setFormValues((prev) => {
      const currentBranch = (prev.branch as string) || "";
      if (currentBranch) return prev;
      const next = { ...prev, branch: branchOptions[0].value };
      setInitialValues(next);
      setFormKey((value) => value + 1);
      return next;
    });
  }, [mode, branchOptions]);

  React.useEffect(() => {
    if (mode === "create") {
      setIndentDetails(null);
      setPageError(null);
      setLoading(false);
      return;
    }

    if (!requestedId) {
      setIndentDetails(null);
      replaceItems([]);
      setPageError("Missing indent identifier in the URL.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    
    const menuId = getMenuId();

    getIndentById(requestedId, coId, menuId || undefined)
      .then((detail) => {
        if (cancelled) return;
        setIndentDetails(detail);
        const base = {
          branch: detail.branch ?? "",
          indent_type: detail.indentType ?? "",
          expense_type: detail.expenseType ?? "",
          date: detail.indentDate ?? "",
          indent_no: detail.indentNo ?? "",
          project: detail.project ?? "",
          requester: detail.requester ?? "",
          remarks: detail.remarks ?? "",
        };
        setInitialValues(base);
        setFormValues(base);
        setFormKey((prev) => prev + 1);
        const mappedLines = (detail.lines ?? []).map(mapLineToEditable);
        replaceItems(mappedLines.length ? mappedLines : [createBlankLine()]);
        setPageError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setIndentDetails(null);
        replaceItems([createBlankLine()]);
        setPageError(error instanceof Error ? error.message : "Unable to load indent details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, requestedId, mapLineToEditable]);

  const branchValue = React.useMemo(() => String(formValues.branch ?? ""), [formValues.branch]);
  const branchIdForSetup = React.useMemo(() => (branchValue && /^\d+$/.test(branchValue) ? branchValue : undefined), [branchValue]);
  const setupParams = React.useMemo(
    () => (branchIdForSetup ? { branchId: branchIdForSetup } : EMPTY_SETUP_PARAMS),
    [branchIdForSetup]
  );

  const {
    data: setupData,
    loading: setupLoading,
    error: setupError,
  } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, IndentSetupData>({
    coId,
    params: setupParams,
    fetcher: fetchIndentSetup1,
    mapData: mapIndentSetupResponse,
    deps: [branchIdForSetup],
  });

  const departments = setupData?.departments ?? EMPTY_DEPARTMENTS;
  const projects = setupData?.projects ?? EMPTY_PROJECTS;
  const expenses = setupData?.expenses ?? EMPTY_EXPENSES;
  const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;


  const expenseOptions = React.useMemo<Option[]>(() => {
    const indentType = String(formValues.indent_type ?? "").toLowerCase();
    return expenses
      .filter((exp) => {
        if (indentType !== "open") return true;
        const id = String(exp.id);
        return id === "3" || id === "5" || id === "6";
      })
      .map((exp) => ({
        label: exp.name || String(exp.id),
        value: String(exp.id),
      }));
  }, [expenses, formValues.indent_type]);

  React.useEffect(() => {
    if (mode === "view") return;
    const indentType = String(formValues.indent_type ?? "").toLowerCase();
    if (indentType !== "open") return;
    const allowed = new Set(["3", "5", "6"]);
    const current = String(formValues.expense_type ?? "");
    if (current && !allowed.has(current)) {
      setFormValues((prev) => ({ ...prev, expense_type: "" }));
    }
  }, [formValues.indent_type, formValues.expense_type, mode]);

  const departmentOptions = React.useMemo<Option[]>(() => {
    if (!departments.length) return [];
    const branchFilter = branchIdForSetup;
    return departments
      .filter((dept) => !branchFilter || !dept.branchId || dept.branchId === branchFilter)
      .map((dept) => ({ label: dept.name || dept.id, value: dept.id }));
  }, [departments, branchIdForSetup]);

  const projectOptions = React.useMemo<Option[]>(() => {
    if (!projects.length) return [];
    const branchFilter = branchIdForSetup;
    return projects
      .filter((project) => !branchFilter || !project.branchId || project.branchId === branchFilter)
      .map((project) => ({ label: project.name || project.id, value: project.id }));
  }, [projects, branchIdForSetup]);

  const itemGroupOptions = React.useMemo<Option[]>(
    () => itemGroups.map((grp) => ({ label: grp.label || grp.id, value: grp.id })),
    [itemGroups]
  );

  const departmentLabelMap = React.useMemo(
    () => buildLabelMap(departments, (dept) => dept.id, (dept) => dept.name ?? dept.id),
    [departments]
  );

  const expenseLabelMap = React.useMemo(
    () => buildLabelMap(expenses, (exp) => String(exp.id), (exp) => exp.name ?? String(exp.id)),
    [expenses]
  );
  const projectLabelMap = React.useMemo(
    () => buildLabelMap(projects, (project) => project.id, (project) => project.name ?? project.id),
    [projects]
  );
  const getExpenseLabel = React.useMemo(() => createLabelResolver(expenseLabelMap, ""), [expenseLabelMap]);
  const getProjectLabel = React.useMemo(() => createLabelResolver(projectLabelMap, ""), [projectLabelMap]);

  const itemGroupLabelMap = React.useMemo(
    () => buildLabelMap(itemGroups, (group) => group.id, (group) => group.label ?? group.id),
    [itemGroups]
  );

  const getItemOptions = React.useCallback(
    (itemGroupId: string) => itemGroupCache[itemGroupId]?.items ?? [],
    [itemGroupCache]
  );

  const getMakeOptions = React.useCallback(
    (itemGroupId: string) => itemGroupCache[itemGroupId]?.makes ?? [],
    [itemGroupCache]
  );

  const getUomOptions = React.useCallback(
    (itemGroupId: string, itemId: string) =>
      itemGroupCache[itemGroupId]?.uomsByItemId[itemId] ?? [],
    [itemGroupCache]
  );

  React.useEffect(() => {
    resetItemGroupCache();
  }, [coId, resetItemGroupCache]);


  const getDepartmentLabel = React.useMemo(() => createLabelResolver(departmentLabelMap), [departmentLabelMap]);

  const getItemGroupLabel = React.useMemo(() => createLabelResolver(itemGroupLabelMap), [itemGroupLabelMap]);

  const getItemLabel = React.useCallback(
    (groupId: string, itemId: string) => {
      if (!groupId || !itemId) return "-";
      return itemGroupCache[groupId]?.itemLabelById[itemId] ?? itemId;
    },
    [itemGroupCache]
  );

  const getItemMakeLabel = React.useCallback(
    (groupId: string, makeId: string) => {
      if (!groupId || !makeId) return "-";
      return itemGroupCache[groupId]?.makeLabelById[makeId] ?? makeId;
    },
    [itemGroupCache]
  );

  const getUomLabel = React.useCallback(
    (groupId: string, itemId: string, uomId: string) => {
      if (!groupId || !itemId || !uomId) return "-";
      const cache = itemGroupCache[groupId];
      if (!cache) return uomId;
      const labels = cache.uomLabelByItemId[itemId];
      if (labels && labels[uomId]) return labels[uomId];
      const defaultMatch = cache.items.find((opt) => opt.value === itemId && opt.defaultUomId === uomId);
      if (defaultMatch) return defaultMatch.defaultUomLabel ?? defaultMatch.defaultUomId ?? uomId;
      return uomId;
    },
    [itemGroupCache]
  );

  const labelResolvers = React.useMemo(
    () => ({
      department: getDepartmentLabel,
      itemGroup: getItemGroupLabel,
      item: getItemLabel,
      itemMake: getItemMakeLabel,
      uom: getUomLabel,
    }),
    [getDepartmentLabel, getItemGroupLabel, getItemLabel, getItemMakeLabel, getUomLabel]
  );

  const handleLineFieldChange = React.useCallback(
    (id: string, field: keyof EditableLineItem, rawValue: string) => {
      if (mode === "view") return;

      if (field === "itemGroup") {
        setLineItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  itemGroup: rawValue,
                  item: "",
                  itemMake: "",
                  uom: "",
                }
              : item
          )
        );
        if (rawValue && !itemGroupCache[rawValue] && !itemGroupLoading[rawValue]) {
          void ensureItemGroupData(rawValue);
        }
        return;
      }

      if (field === "item") {
        let groupToFetch: string | null = null;
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const currentGroup = item.itemGroup;
            if (rawValue && currentGroup && !itemGroupCache[currentGroup]) {
              groupToFetch = currentGroup;
            }
            let nextUom = item.uom;
            if (!rawValue) {
              nextUom = "";
            } else {
              const cache = itemGroupCache[currentGroup ?? ""];
              const options = cache?.uomsByItemId[rawValue] ?? [];
              const defaultUom = cache?.items.find((option) => option.value === rawValue)?.defaultUomId;
              if (nextUom && options.some((option) => option.value === nextUom)) {
                // keep existing UOM
              } else if (options.length) {
                nextUom = options[0].value;
              } else if (defaultUom) {
                nextUom = defaultUom;
              } else {
                nextUom = "";
              }
            }
            return {
              ...item,
              item: rawValue,
              uom: nextUom,
            };
          })
        );
        if (groupToFetch && !itemGroupCache[groupToFetch] && !itemGroupLoading[groupToFetch]) {
          void ensureItemGroupData(groupToFetch);
        }
        return;
      }

      if (field === "quantity") {
        const sanitized = rawValue.replace(/[^0-9.]/g, "");
        setLineItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, quantity: sanitized } : item))
        );
        return;
      }

      setLineItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: rawValue } as EditableLineItem : item
        )
      );
    },
    [mode, ensureItemGroupData, itemGroupCache, itemGroupLoading]
  );

  const canEdit = mode !== "view";

  const adjustTextareaHeight = React.useCallback((event: React.FormEvent<HTMLTextAreaElement>) => {
    const element = event.currentTarget;
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 24), 120)}px`;
  }, []);

  const lineItemColumns = React.useMemo<TransactionLineColumn<EditableLineItem>[]>(
    () => [
      {
        id: "department",
        header: "Department",
        width: "1.2fr",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-xs text-slate-700">{labelResolvers.department(item.department)}</span>;
          }

          const value = departmentOptions.find((option) => option.value === item.department) ?? null;
          return (
            <SearchableSelect<Option>
              options={departmentOptions}
              value={value}
              onChange={(next) => handleLineFieldChange(item.id, "department", next?.value ?? "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, valueOption) => option.value === valueOption.value}
              placeholder="Search department"
              noOptionsText="No options"
            />
          );
        },
        getTooltip: ({ item }) => {
          const label = labelResolvers.department(item.department);
          return label && label !== "-" ? label : undefined;
        },
      },
      {
        id: "itemGroup",
        header: "Item Group",
        width: "1.6fr",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-xs text-slate-700">{labelResolvers.itemGroup(item.itemGroup)}</span>;
          }

          const value = itemGroupOptions.find((option) => option.value === item.itemGroup) ?? null;
          return (
            <SearchableSelect<Option>
              options={itemGroupOptions}
              value={value}
              onChange={(next) => handleLineFieldChange(item.id, "itemGroup", next?.value ?? "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, valueOption) => option.value === valueOption.value}
              placeholder="Search item group"
              noOptionsText="No options"
            />
          );
        },
        getTooltip: ({ item }) => {
          const label = labelResolvers.itemGroup(item.itemGroup);
          return label && label !== "-" ? label : undefined;
        },
      },
      {
        id: "item",
        header: "Item",
        width: "1.6fr",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-xs text-slate-700">{labelResolvers.item(item.itemGroup, item.item)}</span>;
          }

          const options = getItemOptions(item.itemGroup);
          const value = options.find((option) => option.value === item.item) ?? null;
          const waitingForGroup = Boolean(item.itemGroup) && !options.length && itemGroupLoading[item.itemGroup];

          return (
            <SearchableSelect<ItemOption>
              options={options}
              value={value}
              onChange={(next) => handleLineFieldChange(item.id, "item", next?.value ?? "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, valueOption) => option.value === valueOption.value}
              placeholder={waitingForGroup ? "Loading items..." : "Search item"}
              disabled={!item.itemGroup || waitingForGroup}
              loading={waitingForGroup}
              noOptionsText={waitingForGroup ? "Loading..." : "No options"}
            />
          );
        },
        getTooltip: ({ item }) => {
          const label = labelResolvers.item(item.itemGroup, item.item);
          return label && label !== "-" ? label : undefined;
        },
      },
      {
        id: "itemMake",
        header: "Item Make",
        width: "1.1fr",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-xs text-slate-700">{labelResolvers.itemMake(item.itemGroup, item.itemMake)}</span>;
          }

          const options = getMakeOptions(item.itemGroup);
          const value = options.find((option) => option.value === item.itemMake) ?? null;
          const waitingForGroup = Boolean(item.itemGroup) && itemGroupLoading[item.itemGroup];

          return (
            <SearchableSelect<Option>
              options={options}
              value={value}
              onChange={(next) => handleLineFieldChange(item.id, "itemMake", next?.value ?? "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, valueOption) => option.value === valueOption.value}
              placeholder={options.length ? "Search make" : "No make options"}
              disabled={!item.itemGroup || waitingForGroup}
              noOptionsText={options.length ? "No matches" : "No options"}
            />
          );
        },
        getTooltip: ({ item }) => {
          const label = labelResolvers.itemMake(item.itemGroup, item.itemMake);
          return label && label !== "-" ? label : undefined;
        },
      },
      {
        id: "quantity",
        header: "Qty",
        width: "0.7fr",
        className: "flex flex-col gap-1",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-xs text-slate-700">{item.quantity || "-"}</span>;
          }

          return (
            <Input
              type="number"
              inputMode="decimal"
              value={item.quantity}
              onChange={(event) => handleLineFieldChange(item.id, "quantity", event.target.value)}
              placeholder="0"
              className="h-7 px-1.5 py-0.5 text-xs border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
          );
        },
        getTooltip: ({ item }) => {
          const qty = item.quantity.trim();
          return qty ? qty : undefined;
        },
      },
      {
        id: "uom",
        header: "UOM",
        width: "0.75fr",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return <span className="block truncate text-xs text-slate-700">{labelResolvers.uom(item.itemGroup, item.item, item.uom)}</span>;
          }

          const options = getUomOptions(item.itemGroup, item.item);
          const value = options.find((option) => option.value === item.uom) ?? null;
          const waitingForGroup = Boolean(item.itemGroup) && itemGroupLoading[item.itemGroup];

          return (
            <SearchableSelect<Option>
              options={options}
              value={value}
              onChange={(next) => handleLineFieldChange(item.id, "uom", next?.value ?? "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, valueOption) => option.value === valueOption.value}
              placeholder={waitingForGroup ? "Loading UOMs..." : "Search UOM"}
              disabled={!item.item || waitingForGroup}
              loading={waitingForGroup}
              noOptionsText={waitingForGroup ? "Loading..." : "No options"}
            />
          );
        },
        getTooltip: ({ item }) => {
          const label = labelResolvers.uom(item.itemGroup, item.item, item.uom);
          return label && label !== "-" ? label : undefined;
        },
      },
      {
        id: "remarks",
        header: "Remarks",
        width: "1.6fr",
        renderCell: ({ item }) => {
          if (!canEdit) {
            return (
              <span className="block truncate text-xs text-slate-700" title={item.remarks}>
                {item.remarks || "-"}
              </span>
            );
          }

          return (
            <textarea
              className="h-auto min-h-6 w-full resize-none border-0 bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={1}
              value={item.remarks}
              placeholder="Notes"
              onChange={(event) => {
                adjustTextareaHeight(event);
                handleLineFieldChange(item.id, "remarks", event.target.value);
              }}
              onInput={adjustTextareaHeight}
            />
          );
        },
        getTooltip: ({ item }) => {
          const remarks = item.remarks?.trim();
          return remarks ? remarks : undefined;
        },
      },
    ],
    [
      adjustTextareaHeight,
      canEdit,
      departmentOptions,
      getItemOptions,
      getMakeOptions,
      getUomOptions,
      handleLineFieldChange,
      itemGroupOptions,
      labelResolvers,
      itemGroupLoading,
    ]
  );

  const lineItemsPlaceholder = canEdit ? "Add items to build the indent." : "No line items available.";
  const lineItemsSubtitle = "List the materials or services you intend to procure.";

  const getLineItemId = React.useCallback((item: EditableLineItem) => item.id, []);

  React.useEffect(() => {
    if (!Object.keys(itemGroupCache).length) return;
    setLineItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (!item.item || item.uom) return item;
        const cache = itemGroupCache[item.itemGroup];
        if (!cache) return item;
        const options = cache.uomsByItemId[item.item] ?? [];
        const defaultUom = cache.items.find((opt) => opt.value === item.item)?.defaultUomId;
        const newUom = options[0]?.value ?? defaultUom ?? "";
        if (!newUom || newUom === item.uom) return item;
        changed = true;
        return { ...item, uom: newUom };
      });
      return changed ? next : prev;
    });
  }, [itemGroupCache, setLineItems]);

  React.useEffect(() => {
    lineItems.forEach((item) => {
      const groupId = item.itemGroup;
      if (!groupId) return;
      if (itemGroupCache[groupId] || itemGroupLoading[groupId]) return;
      void ensureItemGroupData(groupId);
    });
  }, [lineItems, itemGroupCache, itemGroupLoading, ensureItemGroupData]);

  const schema: Schema = React.useMemo(() => ({
    fields: [
      {
        name: "branch",
        label: "Branch",
        type: "select",
        required: true,
        options: branchOptions,
        disabled: mode !== "create",
        grid: { xs: 12, md: 4 },
      },
      {
        name: "indent_type",
        label: "Indent Type",
        type: "select",
        required: true,
        options: INDENT_TYPE_OPTIONS,
        grid: { xs: 12, md: 4 },
      },
      {
        name: "expense_type",
        label: "Expense Type",
        type: "select",
        required: true,
        options: expenseOptions,
        customValidate: (value, values) => {
          const indentType = String(values.indent_type ?? "").toLowerCase();
          if (indentType !== "open") return null;
          const expense = String(value ?? "");
          if (!expense) return "Required";
          return expense === "3" || expense === "5" || expense === "6"
            ? null
            : "Select expense type 3, 5, or 6 for Open indents";
        },
        grid: { xs: 12, md: 4 },
      },
      { name: "date", label: "Indent Date", type: "date", required: true, grid: { xs: 12, md: 6 } },
      {
        name: "indent_no",
        label: "Indent No",
        type: "text",
        disabled: true,
        helperText: "Generated after the indent is created",
        grid: { xs: 12, md: 6 },
      },
      {
        name: "project",
        label: "Project",
        type: "select",
        options: projectOptions,
        grid: { xs: 12, md: 6 },
      },
      { name: "requester", label: "Indent Name", type: "text", grid: { xs: 12, md: 6 } },
      { name: "remarks", label: "Remarks", type: "textarea", grid: { xs: 12 }, minRows: 1, maxRows: 4 },
    ],
  }), [branchOptions, mode, expenseOptions, projectOptions]);

  const filledLineItems = React.useMemo(
    () =>
      lineItems.filter(
        (item) =>
          item.department ||
          item.itemGroup ||
          item.item ||
          item.itemMake ||
          item.quantity ||
          item.uom ||
          item.remarks
      ),
    [lineItems]
  );

  const lineItemsValid = React.useMemo(() => {
    if (mode === "view" || pageError || setupError) return true;
    if (!filledLineItems.length) return false;
    return filledLineItems.every(lineIsComplete);
  }, [mode, filledLineItems, pageError, setupError]);

  const handleBulkRemoveLines = React.useCallback(
    (ids: string[]) => {
      if (mode === "view" || !ids.length) return;
      removeLineItems(ids);
    },
    [mode, removeLineItems]
  );

  const handleFormSubmit = React.useCallback(
    async (values: Record<string, unknown>) => {
      if (mode === "view" || pageError || setupError) return;

      if (!lineItemsValid) {
        toast({
          variant: "destructive",
          title: "Line items incomplete",
          description: "Add at least one item and make sure quantity is greater than zero.",
        });
        return;
      }

      const indentType = String(values.indent_type ?? "").toLowerCase();
      const expenseType = String(values.expense_type ?? "");
      if (
        indentType === "open" &&
        expenseType &&
        expenseType !== "3" &&
        expenseType !== "5" &&
        expenseType !== "6"
      ) {
        toast({
          variant: "destructive",
          title: "Select allowed expense type",
          description: "Open indents only support expense types 3, 5, or 6.",
        });
        return;
      }

      const itemsPayload = filledLineItems.map((item) => ({
        item_group: item.itemGroup || undefined,
        item: item.item || undefined,
        quantity: item.quantity || undefined,
        uom: item.uom || undefined,
        item_make: item.itemMake || undefined,
        remarks: item.remarks || undefined,
        department: item.department || undefined,
      }));

      const createPayload = {
        branch: String(values.branch ?? ""),
        indent_type: String(values.indent_type ?? ""),
        expense_type: String(values.expense_type ?? ""),
        date: String(values.date ?? ""),
        indent_no: values.indent_no ? String(values.indent_no) : undefined,
        project: values.project ? String(values.project) : undefined,
        requester: values.requester ? String(values.requester) : undefined,
        remarks: values.remarks ? String(values.remarks) : undefined,
        items: itemsPayload,
      };

      setSaving(true);
      try {
        if (mode === "edit" && requestedId) {
          const updatePayload: Partial<IndentDetails> = {
            id: requestedId,
            branch: createPayload.branch,
            indentType: createPayload.indent_type,
            expenseType: createPayload.expense_type,
            indentDate: createPayload.date,
            project: createPayload.project,
            requester: createPayload.requester,
            remarks: createPayload.remarks,
            lines: filledLineItems.map((item) => ({
              id: item.id,
              department: item.department || undefined,
              itemGroup: item.itemGroup || undefined,
              item: item.item || undefined,
              itemMake: item.itemMake || undefined,
              quantity: item.quantity ? Number(item.quantity) : undefined,
              uom: item.uom || undefined,
              remarks: item.remarks || undefined,
            })),
          };

          await updateIndent(updatePayload);
          toast({ title: "Indent updated" });
          router.replace(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(requestedId)}`);
        } else {
          const result = await createIndent(createPayload);
          toast({
            title: result?.message ?? "Indent created",
            description: result?.indent_no ? `Indent No: ${result.indent_no}` : undefined,
          });
          const indentId = result?.indent_id ?? result?.indentId;
          if (indentId) {
            router.replace(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(String(indentId))}`);
          }
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Unable to save indent",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setSaving(false);
      }
    },
    [filledLineItems, lineItemsValid, mode, pageError, setupError, requestedId, router]
  );

  const pageTitle = mode === "create" ? "Create Indent" : mode === "edit" ? "Edit Indent" : "Indent Details";
  const subtitle =
    mode === "create"
      ? "Capture header information and line items to raise a new indent."
      : mode === "edit"
      ? "Update the indent before sending it forward."
      : "Review the captured indent information.";

  const branchLabel = React.useMemo(() => {
    const value = String(formValues.branch ?? "");
    const option = branchOptions.find((opt) => opt.value === value);
    return option?.label || indentDetails?.branch || "";
  }, [formValues.branch, branchOptions, indentDetails?.branch]);

  const indentTypeLabel = React.useMemo(() => {
    const value = String(formValues.indent_type ?? "");
    return INDENT_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || indentDetails?.indentType || "";
  }, [formValues.indent_type, indentDetails?.indentType]);

  const expenseTypeLabel = React.useMemo(() => {
    const value = String(formValues.expense_type ?? "");
    const label = getExpenseLabel(value);
    return label || indentDetails?.expenseType || "";
  }, [formValues.expense_type, indentDetails?.expenseType, getExpenseLabel]);

  const projectLabel = React.useMemo(() => {
    const value = String(formValues.project ?? "");
    const label = getProjectLabel(value);
    return label || indentDetails?.project || "";
  }, [formValues.project, indentDetails?.project, getProjectLabel]);

  const previewItems = React.useMemo(
    () =>
      filledLineItems.map((item, index) => {
        const groupId = item.itemGroup;
        const itemId = item.item;
        const cache = groupId ? itemGroupCache[groupId] : undefined;
        
        // Helper to extract code and name from a label
        const extractCodeAndName = (label: string | undefined) => {
          if (!label) return { code: undefined, name: undefined };
          const separator = label.includes(" — ") ? " — " : label.includes(" - ") ? " - " : null;
          if (separator) {
            const parts = label.split(separator);
            return {
              code: parts[0]?.trim(),
              name: parts[1]?.trim(),
            };
          }
          return { code: label.trim(), name: undefined };
        };

        // Get item group code and name
        const groupLabel = groupId ? labelResolvers.itemGroup(groupId) : undefined;
        const groupData = extractCodeAndName(groupLabel);
        const itemGroupCode = groupData.code;
        const itemGroupName = groupData.name;

        // Get item code and name
        const itemLabel = groupId && itemId ? labelResolvers.item(groupId, itemId) : undefined;
        const itemData = extractCodeAndName(itemLabel);
        const itemCode = itemData.code;
        const itemName = itemData.name;

        return {
          srNo: index + 1,
          department: labelResolvers.department(item.department),
          itemGroup: labelResolvers.itemGroup(item.itemGroup),
          itemGroupCode: itemGroupCode,
          itemGroupName: itemGroupName,
          item: labelResolvers.item(item.itemGroup, item.item),
          itemCode: itemCode,
          itemName: itemName,
          itemMake: labelResolvers.itemMake(item.itemGroup, item.itemMake),
          quantity: item.quantity || "-",
          uom: labelResolvers.uom(item.itemGroup, item.item, item.uom),
          remarks: item.remarks || "-",
        };
      }),
    [filledLineItems, labelResolvers, itemGroupCache]
  );

  // Get company name from localStorage
  const companyName = React.useMemo(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const storedCompany = localStorage.getItem("sidebar_selectedCompany");
      if (storedCompany) {
        const parsed = JSON.parse(storedCompany) as { co_name?: string; name?: string; company_name?: string } | null;
        return parsed?.co_name || parsed?.name || parsed?.company_name || undefined;
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }, []);

  const previewHeader = {
    indentNo: (formValues.indent_no as string) || indentDetails?.indentNo,
    indentDate: (formValues.date as string) || indentDetails?.indentDate,
    branch: branchLabel,
    indentType: indentTypeLabel,
    expenseType: expenseTypeLabel,
    project: projectLabel,
    requester: (formValues.requester as string) || indentDetails?.requester,
    status: indentDetails?.status,
    updatedBy: indentDetails?.updatedBy,
    updatedAt: indentDetails?.updatedAt,
    companyName: companyName,
  };

  const { metadata } = useTransactionPreview({
    header: previewHeader,
    fields: [
      { label: "Indent No", accessor: (header) => header.indentNo || "Pending" },
      { label: "Indent Date", accessor: (header) => header.indentDate || "-" },
      {
        label: "Status",
        accessor: (header) => header.status,
        includeWhen: (header) => Boolean(header.status),
      },
      {
        label: "Updated By",
        accessor: (header) => header.updatedBy,
        includeWhen: (header) => Boolean(header.updatedBy),
      },
      {
        label: "Updated At",
        accessor: (header) => (header.updatedAt ? new Date(header.updatedAt).toLocaleString() : "-"),
        includeWhen: (header) => Boolean(header.updatedAt),
      },
    ],
  });

  // Approval info and permissions
  const approvalStatusId = React.useMemo(() => {
    return indentDetails?.statusId ?? mapStatusToId(indentDetails?.status) ?? 21;
  }, [indentDetails?.statusId, indentDetails?.status, mapStatusToId]);

  const approvalInfo: ApprovalInfo = React.useMemo(
    () => ({
      statusId: approvalStatusId,
      statusLabel: indentDetails?.status ?? "Drafted",
      approvalLevel: indentDetails?.approvalLevel ?? null,
      maxApprovalLevel: indentDetails?.maxApprovalLevel ?? null,
      isFinalLevel: indentDetails?.approvalLevel != null && indentDetails?.maxApprovalLevel != null
        ? indentDetails.approvalLevel >= indentDetails.maxApprovalLevel
        : false,
    }),
    [approvalStatusId, indentDetails]
  );

  const approvalPermissions = React.useMemo(
    () => getApprovalPermissions(approvalStatusId, mode, indentDetails?.permissions),
    [approvalStatusId, mode, indentDetails?.permissions, getApprovalPermissions]
  );

  const statusChip = React.useMemo(() => {
    if (!indentDetails?.status) return undefined;
    const normalized = indentDetails.status.toLowerCase();
    let color: "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" = "info";
    if (normalized === "approved") color = "success";
    else if (normalized === "rejected") color = "error";
    return { label: indentDetails.status, color };
  }, [indentDetails?.status]);

  const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
    if (mode === "view" || pageError || setupError) return undefined;
    return [
      {
        label: mode === "create" ? "Create Indent" : "Save Changes",
        onClick: () => formRef.current?.submit(),
        disabled: saving || !lineItemsValid || setupLoading,
        loading: saving,
      },
    ];
  }, [mode, pageError, setupError, saving, lineItemsValid, setupLoading]);

  // Approval action handlers (placeholders - will call actual APIs)
  const handleSave = React.useCallback(async () => {
    if (!formRef.current?.submit) return;
    await formRef.current.submit();
  }, []);

  const handleOpen = React.useCallback(async () => {
    console.log("[handleOpen] Called", { requestedId, formValues, indentDetails });
    
    if (!requestedId) {
      // For new indents, save first then open
      if (formRef.current?.submit) {
        await formRef.current.submit();
      }
      return;
    }
    
    const branchId = String(formValues.branch ?? indentDetails?.branch ?? "");
    const menuId = getMenuId();
    
    console.log("[handleOpen] Extracted values", { branchId, menuId, requestedId });
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "Branch required",
        description: "Branch is required to open indent.",
      });
      return;
    }
    if (!menuId) {
      toast({
        variant: "destructive",
        title: "Menu ID required",
        description: "Menu ID is required. Please ensure menu_id is provided in the URL or configuration.",
      });
      return;
    }
    
    console.log("[handleOpen] Calling API", { indentId: requestedId, branchId, menuId });
    setApprovalLoading(true);
    try {
      const result = await openIndent(requestedId, branchId, menuId);
      console.log("[handleOpen] API Response", result);
      
      toast({ 
        title: result.message || "Indent opened successfully",
        description: "Document number will be generated."
      });
      
      // Refresh data to get updated status
      const refreshMenuId = getMenuId();
      const detail = await getIndentById(requestedId, coId, refreshMenuId || undefined);
      setIndentDetails(detail);
      
      // Update form values if status changed
      if (detail.status) {
        setFormValues((prev) => ({ ...prev, status: detail.status }));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to open indent",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, formValues.branch, indentDetails?.branch, getMenuId, coId]);

  const handleCancelDraft = React.useCallback(async () => {
    if (!requestedId) return;
    
    const branchId = String(formValues.branch ?? indentDetails?.branch ?? "");
    const menuId = getMenuId();
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "Branch required",
        description: "Branch is required to cancel draft.",
      });
      return;
    }
    if (!menuId) {
      toast({
        variant: "destructive",
        title: "Menu ID required",
        description: "Menu ID is required. Please ensure menu_id is provided in the URL or configuration.",
      });
      return;
    }
    
    setApprovalLoading(true);
    try {
      const result = await cancelDraftIndent(requestedId, branchId, menuId);
      
      toast({ 
        title: result.message || "Draft cancelled successfully"
      });
      
      // Refresh data to get updated status
      const refreshMenuId = getMenuId();
      const detail = await getIndentById(requestedId, coId, refreshMenuId || undefined);
      setIndentDetails(detail);
      
      // Update form values if status changed
      if (detail.status) {
        setFormValues((prev) => ({ ...prev, status: detail.status }));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to cancel draft",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, formValues.branch, indentDetails?.branch, getMenuId, coId]);

  const handleReopen = React.useCallback(async () => {
    if (!requestedId) return;
    
    const branchId = String(formValues.branch ?? indentDetails?.branch ?? "");
    const menuId = getMenuId();
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "Branch required",
        description: "Branch is required to reopen indent.",
      });
      return;
    }
    if (!menuId) {
      toast({
        variant: "destructive",
        title: "Menu ID required",
        description: "Menu ID is required. Please ensure menu_id is provided in the URL or configuration.",
      });
      return;
    }
    
    setApprovalLoading(true);
    try {
      const result = await reopenIndent(requestedId, branchId, menuId);
      
      toast({ 
        title: result.message || "Indent reopened successfully"
      });
      
      // Refresh data to get updated status
      const refreshMenuId = getMenuId();
      const detail = await getIndentById(requestedId, coId, refreshMenuId || undefined);
      setIndentDetails(detail);
      
      // Update form values if status changed
      if (detail.status) {
        setFormValues((prev) => ({ ...prev, status: detail.status }));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to reopen indent",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, formValues.branch, indentDetails?.branch, getMenuId, coId]);

  const handleSendForApproval = React.useCallback(async () => {
    if (!requestedId) return;
    
    const branchId = String(formValues.branch ?? indentDetails?.branch ?? "");
    const menuId = getMenuId();
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "Branch required",
        description: "Branch is required to send for approval.",
      });
      return;
    }
    if (!menuId) {
      toast({
        variant: "destructive",
        title: "Menu ID required",
        description: "Menu ID is required. Please ensure menu_id is provided in the URL or configuration.",
      });
      return;
    }
    
    setApprovalLoading(true);
    try {
      const result = await sendIndentForApproval(requestedId, branchId, menuId);
      
      toast({ 
        title: result.message || "Sent for approval successfully",
        description: result.new_approval_level 
          ? `Approval level: ${result.new_approval_level}`
          : undefined
      });
      
      // Refresh data to get updated status and approval level
      const refreshMenuId = getMenuId();
      const detail = await getIndentById(requestedId, coId, refreshMenuId || undefined);
      setIndentDetails(detail);
      
      // Update form values if status changed
      if (detail.status) {
        setFormValues((prev) => ({ ...prev, status: detail.status }));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to send for approval",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, formValues.branch, indentDetails?.branch, getMenuId, coId]);

  const handleApprove = React.useCallback(async () => {
    console.log("[handleApprove] Called", { requestedId, indentDetails, formValues });
    
    if (!requestedId || !indentDetails) {
      console.log("[handleApprove] Early return - missing requestedId or indentDetails");
      return;
    }
    
    const branchId = String(formValues.branch ?? indentDetails?.branch ?? "");
    const menuId = getMenuId();
    
    console.log("[handleApprove] Extracted values", { branchId, menuId, requestedId, approvalLevel: approvalInfo.approvalLevel });
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "Branch required",
        description: "Branch is required for approval.",
      });
      return;
    }
    if (!menuId) {
      toast({
        variant: "destructive",
        title: "Menu ID required",
        description: "Menu ID is required for approval. Please ensure menu_id is provided in the URL or configuration.",
      });
      return;
    }
    
    console.log("[handleApprove] Calling API", { indentId: requestedId, branchId, menuId, approvalLevel: approvalInfo.approvalLevel });
    setApprovalLoading(true);
    try {
      const result = await approveIndent(
        requestedId,
        branchId,
        menuId,
        approvalInfo.approvalLevel ?? null
      );
      console.log("[handleApprove] API Response", result);
      
      toast({ 
        title: result.message || "Indent approved successfully",
        description: result.new_status_id === 3 
          ? "Indent has been fully approved." 
          : `Moved to approval level ${result.new_approval_level}.`
      });
      
      // Refresh data to get updated status and approval level
      const refreshMenuId = getMenuId();
      const detail = await getIndentById(requestedId, coId, refreshMenuId || undefined);
      setIndentDetails(detail);
      
      // Update form values if status changed
      if (detail.status) {
        setFormValues((prev) => ({ ...prev, status: detail.status }));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to approve indent",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, formValues.branch, indentDetails, approvalInfo.approvalLevel, getMenuId, coId]);

  const handleReject = React.useCallback(async (reason: string) => {
    if (!requestedId) return;
    
    const branchId = String(formValues.branch ?? indentDetails?.branch ?? "");
    const menuId = getMenuId();
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "Branch required",
        description: "Branch is required to reject indent.",
      });
      return;
    }
    if (!menuId) {
      toast({
        variant: "destructive",
        title: "Menu ID required",
        description: "Menu ID is required. Please ensure menu_id is provided in the URL or configuration.",
      });
      return;
    }
    
    setApprovalLoading(true);
    try {
      const result = await rejectIndent(requestedId, branchId, menuId, reason);
      
      toast({ 
        title: result.message || "Indent rejected successfully"
      });
      
      // Refresh data to get updated status
      const refreshMenuId = getMenuId();
      const detail = await getIndentById(requestedId, coId, refreshMenuId || undefined);
      setIndentDetails(detail);
      
      // Update form values if status changed
      if (detail.status) {
        setFormValues((prev) => ({ ...prev, status: detail.status }));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to reject indent",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setApprovalLoading(false);
    }
  }, [requestedId, formValues.branch, indentDetails?.branch, getMenuId, coId]);

  const handleViewApprovalLog = React.useCallback(() => {
    if (!requestedId) return;
    // API Query params that would be sent
    const queryParams = {
      indent_id: requestedId,
      co_id: coId,
    };
    console.log("[View Approval Log] Query Params:", JSON.stringify(queryParams, null, 2));
    console.log("[View Approval Log] Endpoint: GET /api/indent/approval-log");
    
    // TODO: Open approval log modal/page
    toast({ title: "Opening approval log...", description: "Feature coming soon" });
  }, [requestedId, coId]);

  const handleClone = React.useCallback(() => {
    if (!requestedId) return;
    // API Payload that would be sent
    const payload = {
      indent_id: requestedId,
      co_id: coId,
    };
    console.log("[Clone Indent] API Payload:", JSON.stringify(payload, null, 2));
    console.log("[Clone Indent] Endpoint: POST /api/indent/clone");
    
    // TODO: Clone indent
    toast({ title: "Cloning indent...", description: "Feature coming soon" });
  }, [requestedId, coId]);

  const secondaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
    if (!requestedId || pageError) return undefined;
    const actions: TransactionAction[] = [];
    if (mode === "view") {
      actions.push({
        label: "Edit",
        variant: "secondary",
        onClick: () => router.replace(`/dashboardportal/procurement/indent/createIndent?mode=edit&id=${encodeURIComponent(requestedId)}`),
      });
    }
    if (mode === "edit") {
      actions.push({
        label: "Cancel",
        variant: "ghost",
        onClick: () => router.replace(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(requestedId)}`),
      });
    }
    return actions.length ? actions : undefined;
  }, [mode, requestedId, router, pageError]);

  const alerts = pageError || setupError ? (
    <div className="space-y-2">
      {pageError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
      ) : null}
      {setupError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{setupError}</div>
      ) : null}
    </div>
  ) : null;

  return (
    <TransactionWrapper
      title={pageTitle}
      subtitle={subtitle}
      backAction={{ label: "Back", onClick: () => router.back() }}
      metadata={metadata}
      statusChip={statusChip}
      primaryActions={primaryActions}
      secondaryActions={secondaryActions}
      loading={loading || setupLoading}
      alerts={alerts}
      preview={
        <div className="space-y-4">
          {/* Approval Actions Bar */}
          {mode !== "create" && indentDetails ? (
            <ApprovalActionsBar
              approvalInfo={approvalInfo}
              permissions={approvalPermissions}
              menuCode="INDENT"
              onSave={approvalPermissions.canSave ? handleSave : undefined}
              onOpen={approvalPermissions.canOpen ? handleOpen : undefined}
              onCancelDraft={approvalPermissions.canCancelDraft ? handleCancelDraft : undefined}
              onReopen={approvalPermissions.canReopen ? handleReopen : undefined}
              onSendForApproval={approvalPermissions.canSendForApproval ? handleSendForApproval : undefined}
              onApprove={approvalPermissions.canApprove ? handleApprove : undefined}
              onReject={approvalPermissions.canReject ? handleReject : undefined}
              onViewApprovalLog={approvalPermissions.canViewApprovalLog ? handleViewApprovalLog : undefined}
              onClone={approvalPermissions.canClone ? handleClone : undefined}
              loading={approvalLoading}
              disabled={saving || loading || setupLoading}
            />
          ) : null}
          <IndentPreview
            header={previewHeader}
            items={previewItems}
            remarks={(formValues.remarks as string) || indentDetails?.remarks}
          />
        </div>
      }
      lineItems={{
        title: "Line Items",
        subtitle: lineItemsSubtitle,
        items: lineItems,
        getItemId: getLineItemId,
        canEdit,
        columns: lineItemColumns,
        onRemoveSelected: handleBulkRemoveLines,
        placeholder: lineItemsPlaceholder,
        selectionColumnWidth: "28px",
      }}
    >
      <div className="space-y-6">
        <MuiForm
          key={formKey}
          ref={formRef}
          schema={schema}
          initialValues={initialValues}
          mode={mode}
          hideModeToggle
          hideSubmit
          onSubmit={handleFormSubmit}
          onValuesChange={setFormValues}
        />

        {mode !== "view" ? (
          <p className="text-xs text-slate-500">
            Tip: Keep quantities greater than zero and fill in the UOM so downstream approval can proceed without delays.
          </p>
        ) : null}
      </div>
    </TransactionWrapper>
  );
}
