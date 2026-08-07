// Types for User Management page

export interface User {
  id: number;
  user_id: number;
  email_id: string;
  name: string;
  active: number;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  page_size: number;
}

// Types for CreateUser page
export interface Company {
  company_id: number;
  company_name: string;
  branches?: Branch[];
}

export interface Branch {
  branch_id: number;
  branch_name: string;
  company_id: number;
  role_id?: string | null;
}

export interface Role {
  role_id: string;
  role_name: string;
}

export interface UserSetupData {
  companies: Company[];
  roles: Role[];
  user?: {
    user_id: string;
    user_name: string;
    is_active: boolean;
    name?: string;
    branch_roles: {
      branch_id: number;
      role_id: string;
    }[];
  };
}

export interface MenuItem {
  id: string;
  label: string;
  children?: {
    id: string;
    label: string;
    assignment?: string | null;
  }[];
}

export interface AssignmentOption {
  label: string;
  value: string | null;
}

export interface BranchRoleAssignment {
  company_id: number;
  branch_id: number;
  role_id: string;
}

export interface CreateUserPayload {
  user_name: string;
  password: string;
  name: string;
  is_active: boolean;
  branch_roles: BranchRoleAssignment[];
}

export interface EditUserPayload {
  user_id: string;
  is_active: boolean;
  branch_roles: BranchRoleAssignment[];
}

