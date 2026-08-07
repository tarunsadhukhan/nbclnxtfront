export interface Menu {
    id: number;
    name: string;
    subMenus: SubMenu[];
  }
  
  export interface SubMenu {
    id: number;
    name: string;
    permission?: number;
  }
  
  export interface UserRoleMapping {
    user_role_map_id: number;
    user_id: number;
    role_id: number;
    co_id: number;
    branch_id: number;
    created_by_con_user: number;
    created_at: string;
  }
  
  export const PERMISSION_VALUES = {
    read: 1,
    write: 2,
    modify: 3
  } as const;
  
  export type PermissionType = keyof typeof PERMISSION_VALUES;