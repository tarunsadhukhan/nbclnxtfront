import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";
import type {
  ApprovalLevelsData,
  ApprovalLevelRow,
  DropdownField,
  ApprovalFormSelections,
  createEmptyRow,
} from "../types";

interface UseApprovalHierarchyReturn {
  // Dropdown state
  dropdownFields: DropdownField[];
  isDropdownLoading: boolean;
  selections: ApprovalFormSelections;
  handleSelectionChange: (fieldId: string, value: string) => void;
  
  // Approval levels state
  approvalLevelsData: ApprovalLevelsData | undefined;
  isApprovalLevelsLoading: boolean;
  updateApprovalRows: (newRows: ApprovalLevelRow[]) => void;
  
  // Form submission
  handleSubmit: () => Promise<{ success: boolean; message?: string }>;
  isSubmitting: boolean;
  
  // Derived state
  canShowTable: boolean;
}

const EMPTY_DROPDOWN_FIELDS: DropdownField[] = [
  { id: "company", label: "Company", items: [] },
  { id: "branch", label: "Branch", dependsOn: "company", items: {} },
  { id: "menu", label: "Menu", dependsOn: "branch", items: {} },
];

const INITIAL_SELECTIONS: ApprovalFormSelections = {
  company: "",
  branch: "",
  menu: "",
};

export function useApprovalHierarchy(): UseApprovalHierarchyReturn {
  // Dropdown state
  const [dropdownFields, setDropdownFields] = useState<DropdownField[]>(EMPTY_DROPDOWN_FIELDS);
  const [isDropdownLoading, setIsDropdownLoading] = useState(true);
  const [selections, setSelections] = useState<ApprovalFormSelections>(INITIAL_SELECTIONS);
  
  // Approval levels state
  const [approvalLevelsData, setApprovalLevelsData] = useState<ApprovalLevelsData | undefined>(undefined);
  const [isApprovalLevelsLoading, setIsApprovalLevelsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      setIsDropdownLoading(true);
      try {
        const result = await fetchWithCookie(apiRoutes.PORTAL_CO_BRANCH_SUBMENU, "GET");
        
        if (result.data && !result.error) {
          if (Array.isArray(result.data)) {
            // API returns array format directly
            setDropdownFields(result.data);
          } else {
            // Handle object format (legacy)
            const apiDropdownFields: DropdownField[] = [
              {
                id: "company",
                label: "Company",
                items: result.data.companies || [],
              },
              {
                id: "branch",
                label: "Branch",
                dependsOn: "company",
                items: result.data.branchesByCompany || {},
              },
              {
                id: "menu",
                label: "Menu",
                dependsOn: "branch",
                items: result.data.menusByBranch || {},
              },
            ];
            setDropdownFields(apiDropdownFields);
          }
        } else {
          console.error("Failed to fetch dropdown data:", result.error);
          setDropdownFields(EMPTY_DROPDOWN_FIELDS);
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        setDropdownFields(EMPTY_DROPDOWN_FIELDS);
      } finally {
        setIsDropdownLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Handle dropdown selection change
  const handleSelectionChange = useCallback((fieldId: string, value: string) => {
    setSelections((prev) => {
      const newSelections = { ...prev, [fieldId]: value };
      
      // Reset dependent fields
      if (fieldId === "company") {
        newSelections.branch = "";
        newSelections.menu = "";
      } else if (fieldId === "branch") {
        newSelections.menu = "";
      }
      
      return newSelections;
    });
    
    // Reset approval data when selections change
    setApprovalLevelsData(undefined);
  }, []);

  // Fetch approval levels data when menu and branch are selected
  useEffect(() => {
    const fetchApprovalLevelsData = async () => {
      const { menu: menuId, branch: branchId } = selections;
      
      if (!menuId || !branchId) {
        return;
      }
      
      setIsApprovalLevelsLoading(true);
      
      try {
        const result = await fetchWithCookie(
          apiRoutes.PORTAL_APPROVAL_LEVELS_DATA,
          "POST",
          { menuId, branchId }
        );
        
        if (result.data && !result.error) {
          // API response has menu ID as top-level key
          const menuData = result.data[menuId];
          
          if (menuData) {
            setApprovalLevelsData({
              maxLevel: menuData.maxLevel || 0,
              userOptions: menuData.userOptions || [],
              data: menuData.data || [],
            });
          } else if (result.data.maxLevel !== undefined) {
            // Fallback: data directly in response
            setApprovalLevelsData({
              maxLevel: result.data.maxLevel || 0,
              userOptions: result.data.userOptions || [],
              data: result.data.data || result.data.approvalLevels || [],
            });
          } else {
            // Empty structure
            setApprovalLevelsData({
              maxLevel: 0,
              userOptions: [],
              data: [],
            });
          }
        } else {
          console.error("Failed to fetch approval levels data:", result.error);
          setApprovalLevelsData(undefined);
        }
      } catch (error) {
        console.error("Error fetching approval levels data:", error);
        setApprovalLevelsData(undefined);
      } finally {
        setIsApprovalLevelsLoading(false);
      }
    };

    fetchApprovalLevelsData();
  }, [selections.menu, selections.branch]);

  // Update approval rows
  const updateApprovalRows = useCallback((newRows: ApprovalLevelRow[]) => {
    setApprovalLevelsData((prev) =>
      prev ? { ...prev, data: newRows } : undefined
    );
  }, []);

  // Submit approval data
  const handleSubmit = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!approvalLevelsData) {
      return { success: false, message: "No approval data to submit" };
    }

    const filteredApprovalLevels = approvalLevelsData.data.filter(
      (row) => row.users.length > 0
    );

    const submitData = {
      branchId: selections.branch,
      menuId: selections.menu,
      data: filteredApprovalLevels,
    };

    setIsSubmitting(true);

    try {
      const result = await fetchWithCookie(
        apiRoutes.PORTAL_APPROVAL_LEVELS_DATA_SUBMIT,
        "POST",
        submitData
      );

      if (result.data && !result.error) {
        return { success: true, message: "Approval configuration saved successfully" };
      } else {
        return { success: false, message: result.error || "Failed to save approval configuration" };
      }
    } catch (error) {
      console.error("Error submitting approval levels data:", error);
      return { success: false, message: "An error occurred while saving" };
    } finally {
      setIsSubmitting(false);
    }
  }, [approvalLevelsData, selections.branch, selections.menu]);

  // Derived state
  const canShowTable = useMemo(() => {
    return Boolean(selections.menu && approvalLevelsData && !isApprovalLevelsLoading);
  }, [selections.menu, approvalLevelsData, isApprovalLevelsLoading]);

  return {
    dropdownFields,
    isDropdownLoading,
    selections,
    handleSelectionChange,
    approvalLevelsData,
    isApprovalLevelsLoading,
    updateApprovalRows,
    handleSubmit,
    isSubmitting,
    canShowTable,
  };
}

