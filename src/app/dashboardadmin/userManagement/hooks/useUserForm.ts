import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";
import type {
  Company,
  Branch,
  Role,
  UserSetupData,
  MenuItem,
  AssignmentOption,
  BranchRoleAssignment,
} from "../types";

interface UseUserFormReturn {
  // Form state
  userName: string;
  setUserName: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  isActive: boolean;
  setIsActive: (value: boolean) => void;

  // Mode
  isEditMode: boolean;
  userId: string | null;

  // Loading state
  loading: boolean;
  submitting: boolean;
  error: string | null;

  // Menu data
  menuItems: MenuItem[];
  assignmentOptions: AssignmentOption[];
  branchRoleAssignments: Record<number, string>;

  // Actions
  handleAssignmentChange: (itemId: string, value: string | null) => void;
  handleSubmit: () => Promise<{ success: boolean; message?: string }>;
}

// Helper function to prepare menu items from companies and branches
// Filters out companies that have no branches
const prepareMenuItems = (companies: Company[]): MenuItem[] => {
  if (!companies || !Array.isArray(companies)) return [];

  return companies
    .filter((company) => company.branches && company.branches.length > 0)
    .map((company) => {
      const companyId = `company_id_${company.company_id}`;

      const children =
        company.branches?.map((branch) => {
          const branchId = `company_branch_id_${branch.branch_id}`;
          return {
            id: branchId,
            label: branch.branch_name,
            assignment: branch.role_id ?? null,
          };
        }) || [];

      return {
        id: companyId,
        label: company.company_name,
        children,
      };
    });
};

// Helper function to prepare assignment options from roles
const prepareAssignmentOptions = (roles: Role[]): AssignmentOption[] => {
  if (!roles || !Array.isArray(roles)) return [];

  return [
    { label: "Not Assigned", value: null },
    ...roles.map((role) => ({
      label: role.role_name,
      value: role.role_id,
    })),
  ];
};

// Helper function to prepare hierarchical data for branch role formatting
// Only includes companies that have branches
const prepareHierarchicalData = (companies: Company[]): any[] => {
  if (!companies || !Array.isArray(companies)) return [];

  const result: any[] = [];

  // Filter out companies without branches
  const companiesWithBranches = companies.filter(
    (company) => company.branches && company.branches.length > 0
  );

  companiesWithBranches.forEach((company) => {
    result.push({
      company_id: company.company_id,
      company_name: company.company_name,
      parent_id: null,
    });

    if (company.branches && Array.isArray(company.branches)) {
      company.branches.forEach((branch) => {
        result.push({
          company_id: branch.branch_id,
          company_name: branch.branch_name,
          parent_id: company.company_id,
          role_id: branch.role_id || "0",
        });
      });
    }
  });

  return result;
};

// Format branch role assignments for API submission
const formatBranchRoles = (
  branchRoleAssignments: Record<number, string>,
  hierarchicalData: any[]
): BranchRoleAssignment[] => {
  const result: BranchRoleAssignment[] = [];

  Object.entries(branchRoleAssignments).forEach(([branchIdStr, roleId]) => {
    const branchId = parseInt(branchIdStr);
    const branch = hierarchicalData.find(
      (item) => item.company_id === branchId && item.parent_id !== null
    );

    if (branch && roleId && roleId !== "0") {
      result.push({
        company_id: branch.parent_id,
        branch_id: branchId,
        role_id: roleId,
      });
    }
  });

  return result;
};

export function useUserForm(): UseUserFormReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");
  const isEditMode = !!userId;

  // Form state
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Menu data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<AssignmentOption[]>([]);
  const [branchRoleAssignments, setBranchRoleAssignments] = useState<Record<number, string>>({});
  const [hierarchicalData, setHierarchicalData] = useState<any[]>([]);

  // Fetch setup data on mount
  useEffect(() => {
    const fetchSetupData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch basic setup data (companies, roles)
        const setupResponse = await fetchWithCookie(apiRoutes.PORTAL_USER_CREATE_FULL);

        if (setupResponse.error) {
          throw new Error(setupResponse.error);
        }

        if (!setupResponse.data) {
          throw new Error("No setup data received from API");
        }

        const setupData = setupResponse.data as UserSetupData;

        // Process roles data
        if (setupData.roles && Array.isArray(setupData.roles)) {
          setAssignmentOptions(prepareAssignmentOptions(setupData.roles));
        } else {
          setAssignmentOptions([{ label: "Not Assigned", value: null }]);
        }

        // Prepare menu items and hierarchical data
        setMenuItems(prepareMenuItems(setupData.companies));
        setHierarchicalData(prepareHierarchicalData(setupData.companies));

        // If edit mode, fetch user data
        if (isEditMode && userId) {
          const userApiUrl = `${apiRoutes.PORTAL_USER_EDIT_BY_USERID}/${userId}`;
          const userResponse = await fetchWithCookie(userApiUrl);

          if (userResponse.error) {
            throw new Error(userResponse.error);
          }

          if (!userResponse.data) {
            throw new Error("No user data received from API");
          }

          const userData = userResponse.data;

          // Set user info
          if (userData.user) {
            setUserName(userData.user.user_name);
            setIsActive(userData.user.is_active);
            if (userData.user.name) {
              setName(userData.user.name);
            }
          }

          // Process branch role assignments
          if (userData.companies && Array.isArray(userData.companies)) {
            const branchRoles: Record<number, string> = {};

            userData.companies.forEach((company: Company) => {
              if (company.branches && Array.isArray(company.branches)) {
                company.branches.forEach((branch: Branch) => {
                  if (branch.role_id) {
                    branchRoles[branch.branch_id] = branch.role_id;
                  }
                });
              }
            });

            setBranchRoleAssignments(branchRoles);

            // Update menu items with role assignments
            setMenuItems(prepareMenuItems(userData.companies));
            setHierarchicalData(prepareHierarchicalData(userData.companies));
          }

          // Update assignment options if roles are included in user response
          if (userData.roles && Array.isArray(userData.roles)) {
            setAssignmentOptions(prepareAssignmentOptions(userData.roles));
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSetupData();
  }, [isEditMode, userId]);

  // Handle assignment change in the Menu component
  const handleAssignmentChange = useCallback((itemId: string, value: string | null) => {
    const matches = itemId.match(/company_branch_id_(\d+)$/);
    if (matches && matches[1]) {
      const branchId = parseInt(matches[1]);
      setBranchRoleAssignments((prev) => ({
        ...prev,
        [branchId]: value || "0",
      }));
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    setSubmitting(true);
    setError(null);

    try {
      const formattedBranchRoles = formatBranchRoles(branchRoleAssignments, hierarchicalData);

      let submitData;

      if (isEditMode) {
        submitData = {
          user_id: userId,
          is_active: isActive,
          branch_roles: formattedBranchRoles,
        };
      } else {
        if (!userName || !password) {
          throw new Error("Username and password are required");
        }
        submitData = {
          user_name: userName,
          password: password,
          name: name,
          is_active: isActive,
          branch_roles: formattedBranchRoles,
        };
      }

      const apiUrl = isEditMode
        ? `${apiRoutes.EDIT_PORTAL_USER}?userId=${userId}`
        : apiRoutes.CREATE_PORTAL_USER;

      const response = await fetchWithCookie(apiUrl, "POST", submitData);

      if (response.error) {
        throw new Error(response.error);
      }

      router.push("/dashboardadmin/userManagement");
      return { success: true, message: `User ${isEditMode ? "updated" : "created"} successfully` };
    } catch (err: any) {
      const message = err.message || "An unknown error occurred";
      setError(message);
      return { success: false, message };
    } finally {
      setSubmitting(false);
    }
  }, [
    isEditMode,
    userId,
    userName,
    password,
    name,
    isActive,
    branchRoleAssignments,
    hierarchicalData,
    router,
  ]);

  return {
    userName,
    setUserName,
    password,
    setPassword,
    name,
    setName,
    isActive,
    setIsActive,
    isEditMode,
    userId,
    loading,
    submitting,
    error,
    menuItems,
    assignmentOptions,
    branchRoleAssignments,
    handleAssignmentChange,
    handleSubmit,
  };
}

