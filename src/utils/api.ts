const API_URL=process.env.NEXT_PUBLIC_API_BASE_URL || '/apix';



const apiRoutes ={
    //ctrl desk and console
    MENU_CTRLDESK : `${API_URL}/companyRoutes/console_menu_items`,
    SUPERADMINLOGINCONSOLE : `${API_URL}/authRoutes/loginconsole`,
    USERLOGINCONSOLE : `${API_URL}/authRoutes/login`,
    PROTECTED : `${API_URL}/authRoutes/protected`,
    VERIFYSESSION : `${API_URL}/authRoutes/verify-session`,
    VALIDATE_SUBDOMAIN : `${API_URL}/authRoutes/validate-subdomain`,
    MENU_CONSOLE: `${API_URL}/companyAdmin/company_console_menu_items`,
    ROLES_CONSOLE: `${API_URL}/companyRoutes/roles`,
    ROLES_COMP_CONSOLE: `${API_URL}/companyAdmin/roles_tenant_admin`,
    GETMENUMAPPINGCOMPANY: `${API_URL}/companyAdmin/menu-mapping-data`,
    CREATEROLE: `${API_URL}/companyRoutes/create-role`,
    TENANT_ALL_MENUS: `${API_URL}/companyAdmin/admin_tenant_menu_full`,
    GET_TENANT_ADMIN_MENU_ROLE: `${API_URL}/companyAdmin/tenant_console_menu_items_roleid`,
    ADMIN_TENANT_MENU_BY_ROLEID: `${API_URL}/companyAdmin/admin_tenant_menu_by_roleid`,
    CREATE_ROLE_TENANT_ADMIN: `${API_URL}/companyAdmin/create_role_tenant_admin`,
    EDIT_ROLE_TENANT_MENU: `${API_URL}/companyAdmin/edit_role_tenant_admin`,
    GET_USER_TENANT_ADMIN: `${API_URL}/companyAdmin/get_user_tenant_admin`,
    CREATE_USER_TENANT_ADMIN: `${API_URL}/companyAdmin/create_user_tenant_admin`,
    EDIT_USER_TENANT_MENU: `${API_URL}/companyAdmin/edit_user_tenant_admin`,
    ROLES_DROPDOWN_TENANT_ADMIN: `${API_URL}/companyAdmin/get_roles_tenant_admin_assign`,
    ROLES_PORTAL: `${API_URL}/admin/PortalData/get_roles_portal`,
    USERS_PORTAL: `${API_URL}/admin/PortalData/get_users_portal`,
    PORTAL_MENU_FULL: `${API_URL}/admin/PortalData/portal_menu_full`,
    GET_PORTAL_MENU_BY_ROLEID: `${API_URL}/admin/PortalData/portal_menu_by_roleid`,
    CREATE_PORTAL_ROLE: `${API_URL}/admin/PortalData/create_role_portal`,
    EDIT_PORTAL_ROLE: `${API_URL}/admin/PortalData/edit_role_portal`,
    PORTAL_USER_CREATE_FULL: `${API_URL}/admin/PortalData/get_user_create_setup_data`,
    CREATE_PORTAL_USER: `${API_URL}/admin/PortalData/create_user_portal`,
    EDIT_PORTAL_USER: `${API_URL}/admin/PortalData/edit_user_portal`,
    RESET_PORTAL_USER_PASSWORD: `${API_URL}/admin/PortalData/reset_user_password`,
    CHANGE_PASSWORD: `${API_URL}/authRoutes/change-password`,
    PORTAL_USER_EDIT_BY_USERID: `${API_URL}/admin/PortalData/get_user_edit_setup_data`,
    PORTAL_CO_BRANCH_SUBMENU: `${API_URL}/admin/PortalData/co_branch_submenu`,
    PORTAL_APPROVAL_LEVELS_DATA: `${API_URL}/admin/PortalData/approval_level_data_setup`,
    PORTAL_APPROVAL_LEVELS_DATA_SUBMIT: `${API_URL}/admin/PortalData/approval_level_data_setup_submit`,
    PORTAL_MENU_ITEMS: `${API_URL}/admin/PortalData/portal_menu_items`,
    PORTAL_MENU_PERMISSIONS: `${API_URL}/admin/PortalData/portal_menu_permissions`,
    PORTAL_MENU_PERMISSION_CHECK: `${API_URL}/admin/PortalData/portal_menu_permissions/check`,
    REPORT_MENU_TREE: `${API_URL}/admin/PortalData/report_menu_tree`,


    ROLES_CONSOLE_CONSOLE: `${API_URL}/consoleAdmin/roles_console_admin`,
};
const apiRoutesconsole = {
    //ctrl desk and console
    ROLES_CTRLDSK: `${API_URL}/ctrldskAdmin/roles_ctrldsk_admin`,
    CREATE_ROLE_CONSOLE_ADMIN: `${API_URL}/consoleAdmin/create_role_console_admin`,
    CTRLDSK_ALL_MENUS: `${API_URL}/ctrldskAdmin/admin_ctrldsk_menu_full`,
    CREATE_ROLE_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/create_role_ctrldsk_admin`,
    EDIT_ROLE_CTRLDSK_MENU: `${API_URL}/ctrldskAdmin/edit_role_ctrldsk_admin`,
    ADMIN_CTRLDSK_MENU_BY_ROLEID: `${API_URL}/ctrldskAdmin/admin_ctrldsk_menu_by_roleid`,

    
    GET_USER_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/get_user_ctrldsk_admin`,
    EDIT_USER_CTRLDSK_MENU: `${API_URL}/ctrldskAdmin/edit_user_ctrldsk_admin`,
    ROLES_DROPDOWN_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/get_roles_ctrldsk_admin_assign`,
    CREATE_USER_CTRLDESK_ADMIN: `${API_URL}/ctrldskAdmin/create_user_ctrldsk_admin`,

    EDIT_USER_CTRLDESK_MENU: `${API_URL}/ctrldskAdmin/edit_user_ctrldsk_admin`,
    
    GET_ORG_ALL: `${API_URL}/ctrldskAdmin/get_org_data_all`,
    GET_ORG_BY_ID: `${API_URL}/ctrldskAdmin/get_org_data_by_id`,
    CREATE_ORG_SETUP: `${API_URL}/ctrldskAdmin/create_org_setup_data`,
    CREATE_ORG: `${API_URL}/ctrldskAdmin/create_org_data`,
    EDIT_ORG: `${API_URL}/ctrldskAdmin/edit_org_data`,



    GET_CO_ALL: `${API_URL}/companyAdmin/get_co_data_all`,
    GET_CO_BY_ID: `${API_URL}/companyAdmin/get_co_data_by_id`,
    CREATE_CO_SETUP: `${API_URL}/companyAdmin/create_co_setup_data`,
    CREATE_CO: `${API_URL}/companyAdmin/create_co_data`,
    EDIT_CO: `${API_URL}/companyAdmin/edit_co_data`,
    UPLOAD_CO_LOGO: `${API_URL}/companyAdmin/upload_co_logo`,
    GET_CO_LOGO: `${API_URL}/companyAdmin/get_co_logo`,
    DELETE_CO_LOGO: `${API_URL}/companyAdmin/delete_co_logo`,

    CO_CONFIG: `${API_URL}/companyAdmin/co_config`,
    EDIT_CO_CONFIG: `${API_URL}/companyAdmin/company_config`,


    GET_PORTAL_ALLMENU_CTRLDSK_ADMIN_BY_ID: `${API_URL}/ctrldskAdmin/portal_allmenu_details_by_id`,
    GET_PORTAL_ALLMENU_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/portal_allmenu_details`,
    GET_PORTAL_MENU_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/portal_menu_details`,
    EDIT_PORTAL_MENU_CTRLDSK_MENU: `${API_URL}/ctrldskAdmin/edit_user_ctrldsk_admin`,
    GET_PORTAL_PARENT_MENU: `${API_URL}/ctrldskAdmin/portal_parentmenudetails`,
    GET_PORTAL_MODULE_NAME: `${API_URL}/ctrldskAdmin/portalmodulename`,
    GET_PORTAL_MENU_TYPE: `${API_URL}/ctrldskAdmin/portalmenutypedetails`,     
    GET_PORTAL_MENU_NAME: `${API_URL}/ctrldskAdmin/portalmenuname`,     
    PORTAL_MENU_CREATE: `${API_URL}/ctrldskAdmin/portalmenucreate`,     
    PORTAL_MENU_EDIT: `${API_URL}/ctrldskAdmin/portalmenuedit`,     
    ORG_MODULE_MAP: `${API_URL}/ctrldskAdmin/orgmodulemapdetails`,
    ADMIN_CTRLDSK_MODULE_BY_ORGID: `${API_URL}/ctrldskAdmin/admin_ctrldsk_module_by_orgid`,
    ORGS_DROPDOWN_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/admin_ctrldsk_dropdown_org`,
    EDIT_ORG_MODULE_MAP_CTRLDSK: `${API_URL}/ctrldskAdmin/edit_org_module_map_ctrldesk`,

    // Portal admin user management (ctrldesk)
    GET_ORGS_DROPDOWN_PORTAL_USER: `${API_URL}/ctrldskAdmin/get_orgs_dropdown_portal_user`,
    CREATE_PORTAL_ADMIN_USER: `${API_URL}/ctrldskAdmin/create_portal_admin_user`,
    GET_PORTAL_ADMIN_USERS: `${API_URL}/ctrldskAdmin/get_portal_admin_users`,


    GET_BRANCH_ALL: `${API_URL}/companyAdmin/get_branch_data_all`,
    GET_BRANCH_BY_ID: `${API_URL}/companyAdmin/get_branch_data_by_id`,
    CREATE_BRANCH_SETUP: `${API_URL}/companyAdmin/create_branch_setup_data`,
    CREATE_BRANCH: `${API_URL}/companyAdmin/create_branch_data`,
    EDIT_BRANCH: `${API_URL}/companyAdmin/edit_branch_data`,

    GET_DEPARTMENT_ALL: `${API_URL}/companyAdmin/get_department_data_all`,
    CREATE_DEPARTMENT: `${API_URL}/companyAdmin/create_department_data`,
    EDIT_DEPARTMENT: `${API_URL}/companyAdmin/edit_department_data`,
    GET_DEPARTMENT_BY_ID: `${API_URL}/companyAdmin/get_department_data_by_id`,
    GET_SUBDEPARTMENT_ALL: `${API_URL}/companyAdmin/get_subdepartment_data_all`,

    CO_INVOICE_TYPE_MAP_SETUP: `${API_URL}/companyAdmin/co_invoice_type_map_setup`,
    CO_INVOICE_TYPE_MAP_SAVE: `${API_URL}/companyAdmin/co_invoice_type_map_save`,
};

const apiRoutesPortalMasters = {
    GET_ALL_ITEM_GRP: `${API_URL}/itemMaster/get_all_item_groups`,
    CREATE_ITEM_GRP_SETUP: `${API_URL}/itemMaster/createItemGroupSetup`,
    CREATE_ITEM_GRP: `${API_URL}/itemMaster/createItemGroup`,
    EDIT_ITEM_GRP: `${API_URL}/itemMaster/editItemGroup`,
    UPDATE_ITEM_GRP_ACTIVE: `${API_URL}/itemMaster/updateItemGroupActive`,
    ITEM_GROUP_DETAILS: `${API_URL}/itemMaster/itemGroupDetails`, // Added for details dialog
    GET_ITEM_TABLE: `${API_URL}/itemMaster/get_item_table`,
    ITEM_CREATE_SETUP: `${API_URL}/itemMaster/item_create_setup`,
    ITEM_CREATE: `${API_URL}/itemMaster/item_create`,
    ITEM_BULK_VALIDATE: `${API_URL}/itemMaster/item_bulk_validate`,
    ITEM_BULK_CREATE: `${API_URL}/itemMaster/item_bulk_create`,
    ITEM_EDIT_SETUP: `${API_URL}/itemMaster/item_edit_setup`,
    ITEM_EDIT: `${API_URL}/itemMaster/item_edit`,
    ITEM_VIEW: `${API_URL}/itemMaster/item_view`,
    ITEM_MAKE_TABLE: `${API_URL}/itemMaster/item_make_table`,
    ITEM_MAKE_CREATE_SETUP: `${API_URL}/itemMaster/item_make_create_setup`,
    ITEM_MAKE_CREATE: `${API_URL}/itemMaster/item_make_create`,
    ITEM_SEARCH: `${API_URL}/itemMaster/item_search`,

        // Item BOM Master endpoints
    BOM_LIST: `${API_URL}/itemBomMaster/get_bom_list`,
    BOM_TREE: `${API_URL}/itemBomMaster/get_bom_tree`,
    BOM_CHILDREN: `${API_URL}/itemBomMaster/get_bom_children`,
    BOM_PARENTS: `${API_URL}/itemBomMaster/get_bom_parents`,
    BOM_CREATE_SETUP: `${API_URL}/itemBomMaster/bom_create_setup`,
    BOM_ADD_COMPONENT: `${API_URL}/itemBomMaster/bom_add_component`,
    BOM_ADD_COMPONENTS_BULK: `${API_URL}/itemBomMaster/bom_add_components_bulk`,
    BOM_EDIT_COMPONENT: `${API_URL}/itemBomMaster/bom_edit_component`,
    BOM_REMOVE_COMPONENT: `${API_URL}/itemBomMaster/bom_remove_component`,
    BOM_REORDER_SIBLINGS: `${API_URL}/itemBomMaster/bom_reorder_siblings`,
    BOM_UPDATE_STATUS: `${API_URL}/itemBomMaster/bom_update_status`,

    // BOM Costing endpoints
    BOM_COSTING_LIST: `${API_URL}/bomCosting/bom_costing_list`,
    BOM_COSTING_DETAIL: `${API_URL}/bomCosting/bom_costing_detail`,
    BOM_COSTING_CREATE_SETUP: `${API_URL}/bomCosting/bom_costing_create_setup`,
    BOM_COSTING_CREATE: `${API_URL}/bomCosting/bom_costing_create`,
    BOM_COSTING_UPDATE: `${API_URL}/bomCosting/bom_costing_update`,
    BOM_COST_ENTRY_SAVE: `${API_URL}/bomCosting/bom_cost_entry_save`,
    BOM_COST_ENTRY_BULK_SAVE: `${API_URL}/bomCosting/bom_cost_entry_bulk_save`,
    BOM_COST_ENTRY_DELETE: `${API_URL}/bomCosting/bom_cost_entry_delete`,
    BOM_COST_ROLLUP: `${API_URL}/bomCosting/bom_cost_rollup`,
    BOM_COST_SNAPSHOT_LIST: `${API_URL}/bomCosting/bom_cost_snapshot_list`,
    BOM_COST_SNAPSHOT_DETAIL: `${API_URL}/bomCosting/bom_cost_snapshot_detail`,
    BOM_COST_SUMMARY: `${API_URL}/bomCosting/bom_cost_summary`,

    // Cost Element Master endpoints
    COST_ELEMENT_TREE: `${API_URL}/bomCostElement/cost_element_tree`,
    COST_ELEMENT_LIST: `${API_URL}/bomCostElement/cost_element_list`,
    COST_ELEMENT_CREATE: `${API_URL}/bomCostElement/cost_element_create`,
    COST_ELEMENT_UPDATE: `${API_URL}/bomCostElement/cost_element_update`,
    COST_ELEMENT_TOGGLE_ACTIVE: `${API_URL}/bomCostElement/cost_element_toggle_active`,
    COST_ELEMENT_SEED: `${API_URL}/bomCostElement/cost_element_seed`,

    // Standard Rate Card endpoints
    STD_RATE_CARD_LIST: `${API_URL}/stdRateCard/std_rate_card_list`,
    STD_RATE_CARD_CURRENT: `${API_URL}/stdRateCard/std_rate_card_current`,
    STD_RATE_CARD_CREATE: `${API_URL}/stdRateCard/std_rate_card_create`,
    STD_RATE_CARD_UPDATE: `${API_URL}/stdRateCard/std_rate_card_update`,
    STD_RATE_CARD_TOGGLE_ACTIVE: `${API_URL}/stdRateCard/std_rate_card_toggle_active`,
    STD_RATE_CARD_APPLY: `${API_URL}/stdRateCard/std_rate_card_apply`,

    DEPT_MASTER_TABLE: `${API_URL}/deptMaster/dept_master_table`,
    DEPT_MASTER_VALIDATE_TABLE: `${API_URL}/deptMaster/dept_master_validate_table`,
    DEPT_MASTER_CREATE_SETUP: `${API_URL}/deptMaster/dept_master_create_setup`,
    DEPT_MASTER_CREATE: `${API_URL}/deptMaster/dept_master_create`,
    DEPT_MASTER_VIEW: `${API_URL}/deptMaster/dept_master_view`,

    SUBDEPT_MASTER_TABLE : `${API_URL}/deptMaster/subdept_master_table`,
    SUBDEPT_MASTER_CREATE_SETUP : `${API_URL}/deptMaster/subdept_master_create_setup`,
    SUBDEPT_MASTER_CREATE : `${API_URL}/deptMaster/subdept_master_create`,
    SUBDEPT_MASTER_VIEW : `${API_URL}/deptMaster/subdept_master_view`,

    MECHINE_TYPE_MASTER_TABLE : `${API_URL}/mechMaster/mechine_type_master_table`,
    MECHINE_TYPE_MASTER_CREATE_SETUP : `${API_URL}/mechMaster/mechine_type_master_create_setup`,
    MECHINE_TYPE_MASTER_CREATE : `${API_URL}/mechMaster/mechine_type_master_create`,
    MECHINE_TYPE_MASTER_VIEW : `${API_URL}/mechMaster/mechine_type_master_view`,

    MECHINE_MASTER_TABLE : `${API_URL}/mechMaster/mechine_master_table`,
    MECHINE_MASTER_CREATE_SETUP : `${API_URL}/mechMaster/mechine_master_create_setup`,
    MECHINE_MASTER_CREATE : `${API_URL}/mechMaster/mechine_master_create`,
    MECHINE_MASTER_EDIT_SETUP : `${API_URL}/mechMaster/mechine_master_edit_setup`,
    MECHINE_MASTER_EDIT : `${API_URL}/mechMaster/mechine_master_edit`,
    MECHINE_MASTER_VIEW : `${API_URL}/mechMaster/mechine_master_view`,
    MECHINE_MASTER_BY_ID : `${API_URL}/mechMaster/mechine_master_by_id`
    ,
    PROJECT_MASTER_TABLE: `${API_URL}/projectMaster/project_master_table`,
    PROJECT_MASTER_CREATE_SETUP: `${API_URL}/projectMaster/project_master_create_setup`,
    PROJECT_MASTER_CREATE: `${API_URL}/projectMaster/project_master_create`,
    PROJECT_MASTER_EDIT: `${API_URL}/projectMaster/project_master_edit`,
    PROJECT_MASTER_VIEW: `${API_URL}/projectMaster/project_master_view`,


    PARTY_TABLE: `${API_URL}/partyMaster/get_party_table`,
    PARTY_CREATE_SETUP: `${API_URL}/partyMaster/party_create_setup`,
    PARTY_CREATE: `${API_URL}/partyMaster/party_create`,
    PARTY_EDIT_SETUP: `${API_URL}/partyMaster/party_edit_setup`,
    PARTY_EDIT: `${API_URL}/partyMaster/party_edit`,

    WAREHOUSE_TABLE: `${API_URL}/warehouseMaster/get_warehouse_table`,
    WAREHOUSE_CREATE_SETUP: `${API_URL}/warehouseMaster/warehouse_create_setup`,
    WAREHOUSE_CREATE: `${API_URL}/warehouseMaster/warehouse_create`,
    WAREHOUSE_EDIT_SETUP: `${API_URL}/warehouseMaster/warehouse_edit_setup`,
    WAREHOUSE_EDIT: `${API_URL}/warehouseMaster/warehouse_edit`,

    COSTFACTOR_TABLE: `${API_URL}/costFactorMaster/get_cost_factor_table`,
    COSTFACTOR_CREATE_SETUP: `${API_URL}/costFactorMaster/cost_factor_create_setup`,
    COSTFACTOR_CREATE: `${API_URL}/costFactorMaster/cost_factor_create`,
    COSTFACTOR_EDIT_SETUP: `${API_URL}/costFactorMaster/cost_factor_edit_setup`,
    COSTFACTOR_EDIT: `${API_URL}/costFactorMaster/cost_factor_edit`,

    JUTE_QUALITY_TABLE: `${API_URL}/juteQualityMaster/get_jute_quality_table`,
    JUTE_QUALITY_BY_ID: `${API_URL}/juteQualityMaster/get_jute_quality_by_id`,
    JUTE_QUALITY_CREATE_SETUP: `${API_URL}/juteQualityMaster/jute_quality_create_setup`,
    JUTE_QUALITY_EDIT_SETUP: `${API_URL}/juteQualityMaster/jute_quality_edit_setup`,
    JUTE_QUALITY_CREATE: `${API_URL}/juteQualityMaster/jute_quality_create`,
    JUTE_QUALITY_EDIT: `${API_URL}/juteQualityMaster/jute_quality_edit`,

    // Jute Supplier Master endpoints (global - not company-specific)
    JUTE_SUPPLIER_TABLE: `${API_URL}/juteSupplierMaster/get_jute_supplier_table`,
    JUTE_SUPPLIER_BY_ID: `${API_URL}/juteSupplierMaster/get_jute_supplier_by_id`,
    JUTE_SUPPLIER_EDIT_SETUP: `${API_URL}/juteSupplierMaster/jute_supplier_edit_setup`,
    JUTE_SUPPLIER_CREATE: `${API_URL}/juteSupplierMaster/jute_supplier_create`,
    JUTE_SUPPLIER_EDIT: `${API_URL}/juteSupplierMaster/jute_supplier_edit`,

    // Jute Supplier Map endpoints (company-specific mappings)
    JUTE_SUPPLIER_MAP_TABLE: `${API_URL}/juteSupplierMap/get_jute_supplier_map_table`,
    JUTE_SUPPLIER_MAP_BY_ID: `${API_URL}/juteSupplierMap/get_jute_supplier_map_by_id`,
    JUTE_SUPPLIER_MAP_CREATE_SETUP: `${API_URL}/juteSupplierMap/jute_supplier_map_create_setup`,
    JUTE_SUPPLIER_MAP_AVAILABLE_PARTIES: `${API_URL}/juteSupplierMap/get_available_parties_for_supplier`,
    JUTE_SUPPLIER_MAP_CREATE: `${API_URL}/juteSupplierMap/jute_supplier_map_create`,
    JUTE_SUPPLIER_MAP_DELETE: `${API_URL}/juteSupplierMap/jute_supplier_map_delete`,

    // Jute Agent Map endpoints (agent branch to party branch mappings)
    JUTE_AGENT_MAP_TABLE: `${API_URL}/juteAgentMap/get_jute_agent_map_table`,
    JUTE_AGENT_MAP_BY_ID: `${API_URL}/juteAgentMap/get_jute_agent_map_by_id`,
    JUTE_AGENT_MAP_CREATE_SETUP: `${API_URL}/juteAgentMap/jute_agent_map_create_setup`,
    JUTE_AGENT_MAP_PARTY_BRANCHES: `${API_URL}/juteAgentMap/get_party_branches_for_agent`,
    JUTE_AGENT_MAP_CREATE: `${API_URL}/juteAgentMap/jute_agent_map_create`,
    JUTE_AGENT_MAP_DELETE: `${API_URL}/juteAgentMap/jute_agent_map_delete`,

    // Yarn Type Master endpoints
    YARN_TYPE_TABLE: `${API_URL}/yarnTypeMaster/get_yarn_type_table`,
    YARN_TYPE_BY_ID: `${API_URL}/yarnTypeMaster/get_yarn_type_by_id`,
    YARN_TYPE_EDIT_SETUP: `${API_URL}/yarnTypeMaster/yarn_type_edit_setup`,
    YARN_TYPE_CREATE: `${API_URL}/yarnTypeMaster/yarn_type_create`,
    YARN_TYPE_EDIT: `${API_URL}/yarnTypeMaster/yarn_type_edit`,

    // Yarn Master endpoints (jute_yarn_mst)
    YARN_TABLE: `${API_URL}/yarnMaster/get_yarn_table`,
    YARN_BY_ID: `${API_URL}/yarnMaster/get_yarn_by_id`,
    YARN_CREATE_SETUP: `${API_URL}/yarnMaster/yarn_create_setup`,
    YARN_EDIT_SETUP: `${API_URL}/yarnMaster/yarn_edit_setup`,
    YARN_CREATE: `${API_URL}/yarnMaster/yarn_create`,
    YARN_EDIT: `${API_URL}/yarnMaster/yarn_edit`,

    // Batch Plan Master endpoints (jute_batch_plan)
    BATCH_PLAN_TABLE: `${API_URL}/batchPlanMaster/get_batch_plan_table`,
    BATCH_PLAN_BY_ID: `${API_URL}/batchPlanMaster/get_batch_plan_by_id`,
    BATCH_PLAN_CREATE_SETUP: `${API_URL}/batchPlanMaster/batch_plan_create_setup`,
    BATCH_PLAN_EDIT_SETUP: `${API_URL}/batchPlanMaster/batch_plan_edit_setup`,
    BATCH_PLAN_CREATE: `${API_URL}/batchPlanMaster/batch_plan_create`,
    BATCH_PLAN_EDIT: `${API_URL}/batchPlanMaster/batch_plan_edit`,
    BATCH_PLAN_QUALITIES_FOR_ITEM: `${API_URL}/batchPlanMaster/get_qualities_for_item`,

    // Jute PO endpoints
    JUTE_PO_TABLE: `${API_URL}/jutePO/get_jute_po_table`,
    JUTE_PO_BY_ID: `${API_URL}/jutePO/get_jute_po_by_id`,
    JUTE_PO_LINE_ITEMS: `${API_URL}/jutePO/get_jute_po_line_items`,
    JUTE_PO_CREATE_SETUP: `${API_URL}/jutePO/jute_po_create_setup`,
    JUTE_PO_SUPPLIERS_BY_MUKAM: `${API_URL}/jutePO/get_suppliers_by_mukam`,
    JUTE_PO_PARTIES_BY_SUPPLIER: `${API_URL}/jutePO/get_parties_by_supplier`,
    JUTE_PO_QUALITIES_BY_ITEM: `${API_URL}/jutePO/get_qualities_by_item`,
    JUTE_PO_CREATE: `${API_URL}/jutePO/jute_po_create`,
    JUTE_PO_UPDATE: `${API_URL}/jutePO/jute_po_update`,
    JUTE_PO_OPEN: `${API_URL}/jutePO/open_jute_po`,
    JUTE_PO_APPROVE: `${API_URL}/jutePO/approve_jute_po`,
    JUTE_PO_REJECT: `${API_URL}/jutePO/reject_jute_po`,
    JUTE_PO_CANCEL_DRAFT: `${API_URL}/jutePO/cancel_draft_jute_po`,
    JUTE_PO_REOPEN: `${API_URL}/jutePO/reopen_jute_po`,
    JUTE_PO_DOWNLOAD: `${API_URL}/jutePO/download_po_table`,

    // Jute Gate Entry endpoints
    JUTE_GATE_ENTRY_TABLE: `${API_URL}/juteGateEntry/get_jute_gate_entry_table`,
    JUTE_GATE_ENTRY_BY_ID: `${API_URL}/juteGateEntry/get_jute_gate_entry_by_id`,
    JUTE_GATE_ENTRY_CREATE_SETUP: `${API_URL}/juteGateEntry/jute_gate_entry_create_setup`,
    JUTE_GATE_ENTRY_CREATE: `${API_URL}/juteGateEntry/jute_gate_entry_create`,
    JUTE_GATE_ENTRY_UPDATE: `${API_URL}/juteGateEntry/jute_gate_entry_update`,
    JUTE_GATE_ENTRY_PARTIES_BY_SUPPLIER: `${API_URL}/juteGateEntry/get_parties_by_supplier`,
    JUTE_GATE_ENTRY_QUALITIES_BY_ITEM: `${API_URL}/juteGateEntry/get_qualities_by_item`,
    JUTE_GATE_ENTRY_PO_DETAILS: `${API_URL}/juteGateEntry/get_po_details`,
    JUTE_GATE_ENTRY_DOWNLOAD: `${API_URL}/juteGateEntry/download_gate_entry_table`,

    // Jute Material Inspection endpoints
    JUTE_MATERIAL_INSPECTION_TABLE: `${API_URL}/juteMaterialInspection/get_inspection_table`,
    JUTE_MATERIAL_INSPECTION_BY_ID: `${API_URL}/juteMaterialInspection/get_inspection_by_id`,
    JUTE_MATERIAL_INSPECTION_SETUP: `${API_URL}/juteMaterialInspection/get_inspection_setup`,
    JUTE_MATERIAL_INSPECTION_QUALITIES: `${API_URL}/juteMaterialInspection/get_qualities_by_item`,
    JUTE_MATERIAL_INSPECTION_COMPLETE: `${API_URL}/juteMaterialInspection/complete_inspection`,
    JUTE_MATERIAL_INSPECTION_MR_LINE: `${API_URL}/juteMaterialInspection/get_mr_line_item`,
    JUTE_MATERIAL_INSPECTION_SAVE_MOISTURE: `${API_URL}/juteMaterialInspection/save_moisture_readings`,
    JUTE_MATERIAL_INSPECTION_DOWNLOAD: `${API_URL}/juteMaterialInspection/download_inspection_table`,

    // Jute MR endpoints
    JUTE_MR_TABLE: `${API_URL}/juteMR/get_mr_table`,
    JUTE_MR_BY_ID: `${API_URL}/juteMR/get_mr_by_id`,
    JUTE_MR_UPDATE: `${API_URL}/juteMR/update_mr`,
    JUTE_MR_AGENT_OPTIONS: `${API_URL}/juteMR/get_agent_options`,
    JUTE_MR_WAREHOUSE_OPTIONS: `${API_URL}/juteMR/get_warehouse_options`,
    JUTE_MR_PARTY_BRANCHES: `${API_URL}/juteMR/get_party_branches`,
    JUTE_MR_OPEN: `${API_URL}/juteMR/open_mr`,
    JUTE_MR_PENDING: `${API_URL}/juteMR/pending_mr`,
    JUTE_MR_APPROVE: `${API_URL}/juteMR/approve_mr`,
    JUTE_MR_REJECT: `${API_URL}/juteMR/reject_mr`,
    JUTE_MR_CANCEL: `${API_URL}/juteMR/cancel_mr`,
    JUTE_MR_DOWNLOAD: `${API_URL}/juteMR/download_mr_table`,
    JUTE_MATERIAL_INSPECTION_UPDATE_LINE: `${API_URL}/juteMaterialInspection/update_line_item`,

    // Jute Bill Pass endpoints
    JUTE_BILL_PASS_TABLE: `${API_URL}/juteBillPass/get_bill_pass_list`,
    JUTE_BILL_PASS_BY_ID: `${API_URL}/juteBillPass/get_bill_pass_by_id`,
    JUTE_BILL_PASS_LINE_ITEMS: `${API_URL}/juteBillPass/get_bill_pass_line_items`,
    JUTE_BILL_PASS_UPDATE: `${API_URL}/juteBillPass/update_bill_pass`,
    JUTE_BILL_PASS_DOWNLOAD: `${API_URL}/juteBillPass/download_bill_pass_list`,

    // Generic File Attachment endpoints (S3-backed)
    ATTACHMENT_UPLOAD:   `${API_URL}/attachments/upload`,
    ATTACHMENT_LIST:     `${API_URL}/attachments/`,
    ATTACHMENT_DOWNLOAD: `${API_URL}/attachments`,   // append `/${id}/download` at call site
    ATTACHMENT_DELETE:   `${API_URL}/attachments`,   // append `/${id}` at call site

    // Jute Issue endpoints
    JUTE_ISSUE_TABLE: `${API_URL}/juteIssue/get_issue_table`,
    JUTE_ISSUE_BY_ID: `${API_URL}/juteIssue/get_issue_by_id`,
    JUTE_ISSUE_CREATE_SETUP: `${API_URL}/juteIssue/get_issue_create_setup`,
    JUTE_ISSUE_STOCK_OUTSTANDING: `${API_URL}/juteIssue/get_stock_outstanding`,
    JUTE_ISSUES_BY_DATE: `${API_URL}/juteIssue/get_issues_by_date`,
    JUTE_ISSUE_MAX_DATE: `${API_URL}/juteIssue/get_max_issue_date`,
    JUTE_ISSUE_CREATE: `${API_URL}/juteIssue/create_issue`,
    JUTE_ISSUE_UPDATE: `${API_URL}/juteIssue/update_issue`,
    JUTE_ISSUE_DELETE: `${API_URL}/juteIssue/delete_issue`,
    JUTE_ISSUE_OPEN: `${API_URL}/juteIssue/open_issues`,
    JUTE_ISSUE_APPROVE: `${API_URL}/juteIssue/approve_issues`,
    JUTE_ISSUE_REJECT: `${API_URL}/juteIssue/reject_issues`,
    JUTE_ISSUE_DOWNLOAD: `${API_URL}/juteIssue/download_issue_table`,

    // Batch Daily Assign
    BATCH_DAILY_ASSIGN_TABLE: `${API_URL}/batchDailyAssign/get_assign_table`,
    BATCH_DAILY_ASSIGN_BY_DATE: `${API_URL}/batchDailyAssign/get_assigns_by_date`,
    BATCH_DAILY_ASSIGN_CREATE_SETUP: `${API_URL}/batchDailyAssign/get_assign_create_setup`,
    BATCH_DAILY_ASSIGN_MAX_DATE: `${API_URL}/batchDailyAssign/get_max_assign_date`,
    BATCH_DAILY_ASSIGN_CREATE: `${API_URL}/batchDailyAssign/create_assign`,
    BATCH_DAILY_ASSIGN_DELETE: `${API_URL}/batchDailyAssign/delete_assign`,
    BATCH_DAILY_ASSIGN_OPEN: `${API_URL}/batchDailyAssign/open_assigns`,
    BATCH_DAILY_ASSIGN_APPROVE: `${API_URL}/batchDailyAssign/approve_assigns`,
    BATCH_DAILY_ASSIGN_REJECT: `${API_URL}/batchDailyAssign/reject_assigns`,
    BATCH_DAILY_ASSIGN_DOWNLOAD: `${API_URL}/batchDailyAssign/download_assign_table`,

    // Jute Reports
    JUTE_REPORT_STOCK: `${API_URL}/juteReports/stock`,
    JUTE_REPORT_QTY_WISE: `${API_URL}/juteReports/qty-wise`,
    JUTE_REPORT_TXN_SUMMARY: `${API_URL}/juteReports/txn-summary`,
    JUTE_REPORT_PERIOD_WISE: `${API_URL}/juteReports/period-wise`,
    JUTE_REPORT_WITH_VALUE: `${API_URL}/juteReports/with-value`,
    JUTE_REPORT_PERCENT_CLAIMS: `${API_URL}/juteReports/percent-claims`,
    JUTE_REPORT_MUKHAM_MOISTURE: `${API_URL}/juteReports/mukham-moisture`,
    JUTE_REPORT_MR_IN_STOCK: `${API_URL}/juteReports/mr-in-stock`,
    JUTE_REPORT_MR_WISE: `${API_URL}/juteReports/mr-wise`,
    JUTE_REPORT_GODOWN_WISE: `${API_URL}/juteReports/godown-wise`,
    JUTE_REPORT_BATCH_COST: `${API_URL}/juteReports/batch-cost`,
    JUTE_REPORT_MR_LIST: `${API_URL}/juteReports/mr-list`,
    JUTE_REPORT_TALLY_DOWNLOAD: `${API_URL}/juteReports/tally-download`,
    SALES_REPORT_JUTE_TALLY_DOWNLOAD: `${API_URL}/salesReports/jute-tally-download`,
    SALES_REPORT_JUTE_MR_SUMMARY: `${API_URL}/salesReports/jute-mr-summary`,
    SALES_REPORT_SALES_ORDER_LIST: `${API_URL}/salesReports/sales-order-list`,
    SALES_REPORT_SALES_ORDER_LIST_DOWNLOAD: `${API_URL}/salesReports/sales-order-list-download`,
    SALES_REPORT_INVOICE_LIST: `${API_URL}/salesReports/invoice-list`,
    SALES_REPORT_INVOICE_LIST_DOWNLOAD: `${API_URL}/salesReports/invoice-list-download`,

    // Jute SQC - Morrah Weight QC
    MORRAH_WT_TABLE: `${API_URL}/juteSQC/get_morrah_wt_table`,
    MORRAH_WT_BY_ID: `${API_URL}/juteSQC/get_morrah_wt_by_id`,
    MORRAH_WT_CREATE_SETUP: `${API_URL}/juteSQC/get_morrah_wt_create_setup`,
    MORRAH_WT_CREATE: `${API_URL}/juteSQC/create_morrah_wt`,

    GET_INDENT_SETUP_1: `${API_URL}/procurementIndent/get_indent_setup_1`,
    GET_INDENT_SETUP_2: `${API_URL}/procurementIndent/get_indent_setup_2`,
    INDENT_CREATE: `${API_URL}/procurementIndent/create_indent`,
    INDENT_UPDATE: `${API_URL}/procurementIndent/update_indent`,
    INDENT_TABLE: `${API_URL}/procurementIndent/get_indent_table`,
    GET_INDENT_BY_ID: `${API_URL}/procurementIndent/get_indent_by_id`,
    GET_ALL_APPROVED_INDENTS: `${API_URL}/procurementIndent/get_all_approved_indents`,
    GET_APPROVAL_FLOW: `${API_URL}/procurementIndent/get_approval_flow`,
    INDENT_APPROVE: `${API_URL}/procurementIndent/approve_indent`,
    INDENT_APPROVE_WITH_VALUE: `${API_URL}/procurementIndent/approve_indent_with_value`,
    INDENT_OPEN: `${API_URL}/procurementIndent/open_indent`,
    INDENT_CANCEL_DRAFT: `${API_URL}/procurementIndent/cancel_draft_indent`,
    INDENT_REOPEN: `${API_URL}/procurementIndent/reopen_indent`,
    INDENT_SEND_FOR_APPROVAL: `${API_URL}/procurementIndent/send_indent_for_approval`,
    INDENT_REJECT: `${API_URL}/procurementIndent/reject_indent`,
    VALIDATE_ITEM_FOR_INDENT: `${API_URL}/procurementIndent/validate_item_for_indent`,
    GET_INDENT_LINES_BY_TITLE: `${API_URL}/procurementIndent/get_indent_lines_by_title`,
    PO_TABLE: `${API_URL}/procurementPO/get_po_table`,
    GET_PO_SETUP_1: `${API_URL}/procurementPO/get_po_setup_1`,
    GET_PO_SETUP_2: `${API_URL}/procurementPO/get_po_setup_2`,
    GET_INDENT_LINE_ITEMS: `${API_URL}/procurementPO/get_indent_line_items`,
    GET_SUPPLIER_BRANCHES: `${API_URL}/procurementPO/get_supplier_branches`,
    PO_CREATE: `${API_URL}/procurementPO/create_po`,
    PO_SAVE: `${API_URL}/procurementPO/save_po`,
    PO_UPDATE: `${API_URL}/procurementPO/update_po`,
    GET_PO_BY_ID: `${API_URL}/procurementPO/get_po_by_id`,
    PO_APPROVE: `${API_URL}/procurementPO/approve_po`,
    PO_OPEN: `${API_URL}/procurementPO/open_po`,
    PO_CANCEL_DRAFT: `${API_URL}/procurementPO/cancel_draft_po`,
    PO_REOPEN: `${API_URL}/procurementPO/reopen_po`,
    PO_SEND_FOR_APPROVAL: `${API_URL}/procurementPO/send_po_for_approval`,
    PO_REJECT: `${API_URL}/procurementPO/reject_po`,
    PO_CLONE: `${API_URL}/procurementPO/clone_po`,
    PO_VALIDATE_ITEM: `${API_URL}/procurementPO/validate_item_for_po`,

    // Price Enquiry
    ENQUIRY_TABLE: `${API_URL}/priceEnquiry/get_enquiry_table`,
    GET_ENQUIRY_SETUP: `${API_URL}/priceEnquiry/get_enquiry_setup`,
    ENQUIRY_CREATE: `${API_URL}/priceEnquiry/create_enquiry`,
    ENQUIRY_UPDATE: `${API_URL}/priceEnquiry/update_enquiry`,
    GET_ENQUIRY_BY_ID: `${API_URL}/priceEnquiry/get_enquiry_by_id`,
    GET_APPROVED_INDENT_ITEMS_FOR_ENQUIRY: `${API_URL}/priceEnquiry/get_approved_indent_items`,
    ENQUIRY_ADD_RESPONSE: `${API_URL}/priceEnquiry/add_response`,
    ENQUIRY_UPDATE_RESPONSE: `${API_URL}/priceEnquiry/update_response`,
    ENQUIRY_GET_RESPONSE_BY_ID: `${API_URL}/priceEnquiry/get_response_by_id`,
    ENQUIRY_GET_COMPARISON: `${API_URL}/priceEnquiry/get_responses_for_comparison`,
    ENQUIRY_SELECT_RESPONSE: `${API_URL}/priceEnquiry/select_response`,
    ENQUIRY_GET_PO_PREFILL: `${API_URL}/priceEnquiry/get_po_prefill_data`,
    ENQUIRY_SEND_FOR_APPROVAL: `${API_URL}/priceEnquiry/send_for_approval`,
    ENQUIRY_APPROVE: `${API_URL}/priceEnquiry/approve_enquiry`,
    ENQUIRY_REJECT: `${API_URL}/priceEnquiry/reject_enquiry`,
    ENQUIRY_CANCEL: `${API_URL}/priceEnquiry/cancel_enquiry`,
    ENQUIRY_REOPEN: `${API_URL}/priceEnquiry/reopen_enquiry`,
    ENQUIRY_MARK_RFQ_SENT: `${API_URL}/priceEnquiry/mark_rfq_sent`,

    INWARD_TABLE: `${API_URL}/procurementInward/get_inward_table`,
    GET_INWARD_SETUP_1: `${API_URL}/procurementInward/get_inward_setup_1`,
    GET_INWARD_SETUP_2: `${API_URL}/procurementInward/get_inward_setup_2`,
    GET_APPROVED_POS_BY_SUPPLIER: `${API_URL}/procurementInward/get_approved_pos_by_supplier`,
    GET_PO_LINE_ITEMS_FOR_INWARD: `${API_URL}/procurementInward/get_po_line_items`,
    INWARD_CREATE: `${API_URL}/procurementInward/create_inward`,
    INWARD_UPDATE: `${API_URL}/procurementInward/update_inward`,
    GET_INWARD_BY_ID: `${API_URL}/procurementInward/get_inward_by_id`,
    INWARD_CANCEL: `${API_URL}/procurementInward/cancel_inward`,

    // Material Inspection endpoints
    INSPECTION_PENDING_LIST: `${API_URL}/materialInspection/get_pending_inspection_list`,
    INSPECTION_GET_BY_INWARD_ID: `${API_URL}/materialInspection/get_inspection_by_inward_id`,
    INSPECTION_COMPLETE: `${API_URL}/materialInspection/complete_inspection`,

    // Stores Receipt (SR) endpoints
    SR_PENDING_LIST: `${API_URL}/storesReceipt/get_sr_pending_list`,
    SR_GET_BY_INWARD_ID: `${API_URL}/storesReceipt/get_sr_by_inward_id`,
    SR_SETUP: `${API_URL}/storesReceipt/get_sr_setup`,
    SR_SAVE: `${API_URL}/storesReceipt/save_sr`,
    SR_OPEN: `${API_URL}/storesReceipt/open_sr`,
    SR_APPROVE: `${API_URL}/storesReceipt/approve_sr`,
    SR_REJECT: `${API_URL}/storesReceipt/reject_sr`,

    // DRCR Note endpoints
    DRCR_NOTE_LIST: `${API_URL}/drcrNote/get_drcr_note_list`,
    DRCR_NOTE_GET_BY_ID: `${API_URL}/drcrNote/get_drcr_note_by_id`,
    DRCR_NOTE_CREATE: `${API_URL}/drcrNote/create_drcr_note`,
    DRCR_NOTE_OPEN: `${API_URL}/drcrNote/open_drcr_note`,
    DRCR_NOTE_APPROVE: `${API_URL}/drcrNote/approve_drcr_note`,
    DRCR_NOTE_REJECT: `${API_URL}/drcrNote/reject_drcr_note`,
    DRCR_NOTE_GET_INWARD_FOR_CREATE: `${API_URL}/drcrNote/get_inward_for_drcr_note`,

    // Bill Pass endpoints
    BILL_PASS_LIST: `${API_URL}/billPass/get_bill_pass_list`,
    BILL_PASS_GET_BY_ID: `${API_URL}/billPass/get_bill_pass_by_id`,
    BILL_PASS_UPDATE: `${API_URL}/billPass/update_bill_pass`,

    // Procurement reports hub
    INDENT_ITEMWISE_REPORT: `${API_URL}/procurementReports/indent-itemwise`,
    INDENT_ITEMWISE_DOWNLOAD: `${API_URL}/procurementReports/indent-itemwise/download`,
    PO_ITEMWISE_REPORT: `${API_URL}/procurementReports/po-itemwise`,
    PO_ITEMWISE_DOWNLOAD: `${API_URL}/procurementReports/po-itemwise/download`,
    SR_ITEMWISE_REPORT: `${API_URL}/procurementReports/sr-itemwise`,
    SR_ITEMWISE_DOWNLOAD: `${API_URL}/procurementReports/sr-itemwise/download`,
    BILL_PASS_DOWNLOAD: `${API_URL}/billPass/download_bill_pass_list`,
    PO_TABLE_DOWNLOAD: `${API_URL}/procurementPO/download_po_table`,
    INDENT_TABLE_DOWNLOAD: `${API_URL}/procurementIndent/download_indent_table`,

    // Inventory Issue endpoints
    ISSUE_TABLE: `${API_URL}/inventoryIssue/get_issue_table`,
    ISSUE_GET_BY_ID: `${API_URL}/inventoryIssue/get_issue_by_id`,
    ISSUE_SETUP_1: `${API_URL}/inventoryIssue/get_issue_setup_1`,
    ISSUE_CREATE: `${API_URL}/inventoryIssue/create_issue`,
    ISSUE_UPDATE: `${API_URL}/inventoryIssue/update_issue`,
    ISSUE_UPDATE_STATUS: `${API_URL}/inventoryIssue/update_issue_status`,
    ISSUE_AVAILABLE_INVENTORY: `${API_URL}/inventoryIssue/get_available_inventory`,
    ISSUE_INVENTORY_LIST: `${API_URL}/inventoryIssue/get_inventory_list`,
    ISSUE_COST_FACTORS: `${API_URL}/inventoryIssue/get_cost_factors`,
    ISSUE_MACHINES: `${API_URL}/inventoryIssue/get_machines`,

    // Inventory Report endpoints
    INVENTORY_STOCK_REPORT: `${API_URL}/inventoryReports/inventory-stock`,
    ISSUE_ITEMWISE_REPORT: `${API_URL}/inventoryReports/issue-itemwise`,
    ITEM_LEDGER_REPORT: `${API_URL}/inventoryReports/item-ledger`,
    INVENTORY_MINMAX_REPORT: `${API_URL}/inventoryReports/inventory-minmax`,
    ITEM_MONTHWISE_REPORT: `${API_URL}/inventoryReports/item-monthwise`,
    ISSUE_CONSUMPTION_REPORT: `${API_URL}/inventoryReports/issue-consumption`,
    ISSUE_MACHINEWISE_REPORT: `${API_URL}/inventoryReports/issue-machinewise`,

    // Sales Enquiry endpoints (AMCL enquiry flow Phase 1)
    SALES_ENQUIRY_TABLE: `${API_URL}/salesEnquiry/get_enquiry_table`,
    SALES_ENQUIRY_BOARD: `${API_URL}/salesEnquiry/get_enquiry_board`,
    SALES_ENQUIRY_SETUP: `${API_URL}/salesEnquiry/get_enquiry_setup`,
    SALES_ENQUIRY_BY_ID: `${API_URL}/salesEnquiry/get_enquiry_by_id`,
    SALES_ENQUIRY_CREATE: `${API_URL}/salesEnquiry/create_enquiry`,
    SALES_ENQUIRY_UPDATE: `${API_URL}/salesEnquiry/update_enquiry`,
    SALES_ENQUIRY_OPEN: `${API_URL}/salesEnquiry/open_enquiry`,
    SALES_ENQUIRY_CANCEL_DRAFT: `${API_URL}/salesEnquiry/cancel_draft_enquiry`,
    SALES_ENQUIRY_SEND_FOR_APPROVAL: `${API_URL}/salesEnquiry/send_enquiry_for_approval`,
    SALES_ENQUIRY_APPROVE: `${API_URL}/salesEnquiry/approve_enquiry`,
    SALES_ENQUIRY_REJECT: `${API_URL}/salesEnquiry/reject_enquiry`,
    SALES_ENQUIRY_REOPEN: `${API_URL}/salesEnquiry/reopen_enquiry`,
    SALES_ENQUIRY_MOVE_STAGE: `${API_URL}/salesEnquiry/move_stage`,
    SALES_ENQUIRY_CLOSE: `${API_URL}/salesEnquiry/close_enquiry`,
    SALES_ENQUIRY_CONFIRM_LINE_COSTING: `${API_URL}/salesEnquiry/confirm_line_costing`,
    SALES_ENQUIRY_PRICE_CHECK_CREATE: `${API_URL}/salesEnquiry/create_price_check`,
    SALES_ENQUIRY_PRICE_CHECK_PENDING: `${API_URL}/salesEnquiry/get_price_check_pending_list`,
    SALES_ENQUIRY_PRICE_CHECK_BY_ID: `${API_URL}/salesEnquiry/get_price_check_by_id`,
    SALES_ENQUIRY_PRICE_CHECK_RESPOND: `${API_URL}/salesEnquiry/respond_price_check`,
    QUOTATION_ENQUIRY_LINES: `${API_URL}/salesQuotation/get_enquiry_lines_for_quotation`,
    SALES_ORDER_ENQUIRY_LINES: `${API_URL}/salesOrder/get_enquiry_lines_for_sales_order`,

    // ISO document number map (per company x menu)
    ISO_MAP_TABLE: `${API_URL}/isoMenuMap/get_iso_map_table`,
    ISO_MAP_SAVE: `${API_URL}/isoMenuMap/iso_map_save`,
    ISO_MAP_DELETE: `${API_URL}/isoMenuMap/iso_map_delete`,
    // HRMS / Production (labour) report endpoints
    ATTENDANCE_SUMMARY_REPORT: `${API_URL}/hrmsReports/attendance-summary`,
    WORKER_MASTER_REPORT: `${API_URL}/hrmsReports/worker-master`,
    MAN_MACHINE_REPORT: `${API_URL}/hrmsReports/man-machine`,
    ATTENDANCE_REGISTER_REPORT: `${API_URL}/hrmsReports/attendance-register`,
    EMPLOYEE_WORKING_REPORT: `${API_URL}/hrmsReports/employee-working`,
    FULL_ATTENDANCE_REPORT: `${API_URL}/hrmsReports/full-attendance`,
    ABSENTEEISM_REPORT: `${API_URL}/hrmsReports/absenteeism`,
    HALF_DAY_REPORT: `${API_URL}/hrmsReports/half-day`,
    OVERSTAY_REPORT: `${API_URL}/hrmsReports/overstay`,
    OCCUPATION_DEVIATION_REPORT: `${API_URL}/hrmsReports/occupation-deviation`,
    CASH_ATTENDANCE_REPORT: `${API_URL}/hrmsReports/cash-attendance`,
    EMPLOYEE_HEADCOUNT_REPORT: `${API_URL}/hrmsReports/employee-headcount`,
    SPELL_WISE_REPORT: `${API_URL}/hrmsReports/spell-wise`,
    BANK_STATEMENT_REPORT: `${API_URL}/hrmsReports/bank-statement`,
    HANDS_COMPLEMENT_REPORT: `${API_URL}/hrmsReports/hands-complement`,
    CASH_HANDS_PROCESS: `${API_URL}/hrmsReports/cash-hands-process`,
    CASH_HANDS_REPORT: `${API_URL}/hrmsReports/cash-hands`,
    CASH_HANDS_SUMMARY_REPORT: `${API_URL}/hrmsReports/cash-hands-summary`,
    CASH_HANDS_PDF: `${API_URL}/hrmsReports/cash-hands-pdf`,

    // Sales Quotation endpoints
    QUOTATION_TABLE: `${API_URL}/salesQuotation/get_quotation_table`,
    QUOTATION_SETUP_1: `${API_URL}/salesQuotation/get_quotation_setup_1`,
    QUOTATION_SETUP_2: `${API_URL}/salesQuotation/get_quotation_setup_2`,
    QUOTATION_GET_BY_ID: `${API_URL}/salesQuotation/get_quotation_by_id`,
    QUOTATION_CREATE: `${API_URL}/salesQuotation/create_quotation`,
    QUOTATION_UPDATE: `${API_URL}/salesQuotation/update_quotation`,
    QUOTATION_OPEN: `${API_URL}/salesQuotation/open_quotation`,
    QUOTATION_CANCEL_DRAFT: `${API_URL}/salesQuotation/cancel_draft_quotation`,
    QUOTATION_SEND_FOR_APPROVAL: `${API_URL}/salesQuotation/send_quotation_for_approval`,
    QUOTATION_APPROVE: `${API_URL}/salesQuotation/approve_quotation`,
    QUOTATION_REJECT: `${API_URL}/salesQuotation/reject_quotation`,
    QUOTATION_REOPEN: `${API_URL}/salesQuotation/reopen_quotation`,

    // Sales Order endpoints
    SALES_ORDER_TABLE: `${API_URL}/salesOrder/get_sales_order_table`,
    SALES_ORDER_BY_ID: `${API_URL}/salesOrder/get_sales_order_by_id`,
    SALES_ORDER_SETUP_1: `${API_URL}/salesOrder/get_sales_order_setup_1`,
    SALES_ORDER_SETUP_2: `${API_URL}/salesOrder/get_sales_order_setup_2`,
    SALES_ORDER_QUOTATION_LINES: `${API_URL}/salesOrder/get_quotation_lines`,
    SALES_ORDER_CREATE: `${API_URL}/salesOrder/create_sales_order`,
    SALES_ORDER_UPDATE: `${API_URL}/salesOrder/update_sales_order`,
    SALES_ORDER_OPEN: `${API_URL}/salesOrder/open_sales_order`,
    SALES_ORDER_CANCEL_DRAFT: `${API_URL}/salesOrder/cancel_draft_sales_order`,
    SALES_ORDER_SEND_FOR_APPROVAL: `${API_URL}/salesOrder/send_sales_order_for_approval`,
    SALES_ORDER_APPROVE: `${API_URL}/salesOrder/approve_sales_order`,
    SALES_ORDER_REJECT: `${API_URL}/salesOrder/reject_sales_order`,
    SALES_ORDER_REOPEN: `${API_URL}/salesOrder/reopen_sales_order`,

    // Sales Delivery Order endpoints
    DELIVERY_ORDER_TABLE: `${API_URL}/salesDeliveryOrder/get_delivery_order_table`,
    DELIVERY_ORDER_SETUP_1: `${API_URL}/salesDeliveryOrder/get_delivery_order_setup_1`,
    DELIVERY_ORDER_SETUP_2: `${API_URL}/salesDeliveryOrder/get_delivery_order_setup_2`,
    DELIVERY_ORDER_SALES_ORDER_LINES: `${API_URL}/salesDeliveryOrder/get_sales_order_lines`,
    DELIVERY_ORDER_GET_BY_ID: `${API_URL}/salesDeliveryOrder/get_delivery_order_by_id`,
    DELIVERY_ORDER_CREATE: `${API_URL}/salesDeliveryOrder/create_delivery_order`,
    DELIVERY_ORDER_UPDATE: `${API_URL}/salesDeliveryOrder/update_delivery_order`,
    DELIVERY_ORDER_OPEN: `${API_URL}/salesDeliveryOrder/open_delivery_order`,
    DELIVERY_ORDER_CANCEL_DRAFT: `${API_URL}/salesDeliveryOrder/cancel_draft_delivery_order`,
    DELIVERY_ORDER_SEND_FOR_APPROVAL: `${API_URL}/salesDeliveryOrder/send_delivery_order_for_approval`,
    DELIVERY_ORDER_APPROVE: `${API_URL}/salesDeliveryOrder/approve_delivery_order`,
    DELIVERY_ORDER_REJECT: `${API_URL}/salesDeliveryOrder/reject_delivery_order`,
    DELIVERY_ORDER_REOPEN: `${API_URL}/salesDeliveryOrder/reopen_delivery_order`,

    // Sales Invoice endpoints
    SALES_INVOICE_TABLE: `${API_URL}/salesInvoice/get_sales_invoice_table`,
    SALES_INVOICE_BY_ID: `${API_URL}/salesInvoice/get_sales_invoice_by_id`,
    SALES_INVOICE_SETUP_1: `${API_URL}/salesInvoice/get_sales_invoice_setup_1`,
    SALES_INVOICE_SETUP_2: `${API_URL}/salesInvoice/get_sales_invoice_setup_2`,
    SALES_INVOICE_DELIVERY_ORDER_LINES: `${API_URL}/salesInvoice/get_delivery_order_lines`,
    SALES_INVOICE_SALES_ORDER_LINES: `${API_URL}/salesInvoice/get_sales_order_lines`,
    SALES_INVOICE_CREATE: `${API_URL}/salesInvoice/create_sales_invoice`,
    SALES_INVOICE_UPDATE: `${API_URL}/salesInvoice/update_sales_invoice`,
    SALES_INVOICE_OPEN: `${API_URL}/salesInvoice/open_sales_invoice`,
    SALES_INVOICE_CANCEL_DRAFT: `${API_URL}/salesInvoice/cancel_draft_sales_invoice`,
    SALES_INVOICE_SEND_FOR_APPROVAL: `${API_URL}/salesInvoice/send_sales_invoice_for_approval`,
    SALES_INVOICE_APPROVE: `${API_URL}/salesInvoice/approve_sales_invoice`,
    SALES_INVOICE_REJECT: `${API_URL}/salesInvoice/reject_sales_invoice`,
    SALES_INVOICE_REOPEN: `${API_URL}/salesInvoice/reopen_sales_invoice`,
    SALES_INVOICE_TRANSPORTER_BRANCHES: `${API_URL}/salesInvoice/get_transporter_branches`,
    SALES_INVOICE_GOVT_SACKING_SOURCE_LIST: `${API_URL}/salesInvoice/govt_sacking_source_list`,
    SALES_INVOICE_GOVT_SACKING_SOURCE: `${API_URL}/salesInvoice/govt_sacking_source`,

    // HRMS Employee endpoints
    HRMS_EMPLOYEE_LIST: `${API_URL}/hrms/employee_list`,
    HRMS_EMPLOYEE_BY_ID: `${API_URL}/hrms/employee_by_id`,
    HRMS_EMPLOYEE_CREATE_SETUP: `${API_URL}/hrms/employee_create_setup`,
    HRMS_DESIGNATIONS_BY_BRANCH: `${API_URL}/hrms/get_designations_by_branch`,
    HRMS_DESIGNATIONS_BY_SUB_DEPT: `${API_URL}/hrms/get_designations_by_sub_dept`,
    HRMS_EMPLOYEE_CREATE: `${API_URL}/hrms/employee_create`,
    HRMS_EMPLOYEE_SECTION_SAVE: `${API_URL}/hrms/employee_section_save`,
    HRMS_EMPLOYEE_PROGRESS: `${API_URL}/hrms/employee_progress`,
    HRMS_EMPLOYEE_PHOTO_UPLOAD: `${API_URL}/hrms/employee_photo_upload`,
    HRMS_EMPLOYEE_PHOTO: `${API_URL}/hrms/employee_photo`,
    HRMS_EMPLOYEE_LOOKUP_BY_CODE: `${API_URL}/hrms/employee_lookup_by_code`,
    HRMS_CHECK_EMP_CODE_DUPLICATE: `${API_URL}/hrms/check_emp_code_duplicate`,
    HRMS_EMPLOYEE_STATUS_UPDATE: `${API_URL}/hrms/employee_status_update`,
    HRMS_EMPLOYEE_SALARY_SCHEMES: `${API_URL}/hrms/employee_salary_schemes`,
    HRMS_EMPLOYEE_SALARY: `${API_URL}/hrms/employee_salary`,
    HRMS_EMPLOYEE_SALARY_CHECK: `${API_URL}/hrms/employee_salary_check`,
    HRMS_EMPLOYEE_SALARY_SAVE: `${API_URL}/hrms/employee_salary_save`,

    // HRMS Pay Scheme endpoints
    HRMS_PAY_SCHEME_LIST: `${API_URL}/hrms/pay_scheme_list`,
    HRMS_PAY_SCHEME_BY_ID: `${API_URL}/hrms/pay_scheme_by_id`,
    HRMS_PAY_SCHEME_CREATE_SETUP: `${API_URL}/hrms/pay_scheme_create_setup`,
    HRMS_PAY_SCHEME_CREATE: `${API_URL}/hrms/pay_scheme_create`,
    HRMS_PAY_SCHEME_UPDATE: `${API_URL}/hrms/pay_scheme_update`,

    // HRMS Pay Component endpoints
    HRMS_PAY_COMPONENT_LIST: `${API_URL}/hrms/pay_component_list`,
    HRMS_PAY_COMPONENT_BY_ID: `${API_URL}/hrms/pay_component_by_id`,
    HRMS_PAY_COMPONENT_CREATE_SETUP: `${API_URL}/hrms/pay_component_create_setup`,
    HRMS_PAY_COMPONENT_CREATE: `${API_URL}/hrms/pay_component_create`,
    HRMS_PAY_COMPONENT_UPDATE: `${API_URL}/hrms/pay_component_update`,

    // HRMS Pay Param / Period endpoints
    HRMS_PAY_PARAM_LIST: `${API_URL}/hrms/pay_param_list`,
    HRMS_PAY_PARAM_CREATE_SETUP: `${API_URL}/hrms/pay_param_create_setup`,
    HRMS_PAY_PARAM_CREATE: `${API_URL}/hrms/pay_param_create`,
    HRMS_PAY_PARAM_UPDATE: `${API_URL}/hrms/pay_param_update`,

    // HRMS Pay Register endpoints
    HRMS_PAY_REGISTER_LIST: `${API_URL}/hrms/pay_register_list`,
    HRMS_PAY_REGISTER_BY_ID: `${API_URL}/hrms/pay_register_by_id`,
    HRMS_PAY_REGISTER_CREATE_SETUP: `${API_URL}/hrms/pay_register_create_setup`,
    HRMS_PAY_REGISTER_CREATE: `${API_URL}/hrms/pay_register_create`,
    HRMS_PAY_REGISTER_UPDATE: `${API_URL}/hrms/pay_register_update`,
    HRMS_PAY_REGISTER_SALARY: `${API_URL}/hrms/pay_register_salary`,
    HRMS_PAY_REGISTER_PROCESS: `${API_URL}/hrms/pay_register_process`,
    HRMS_PAY_REGISTER_EXPORT: `${API_URL}/hrms/pay_register_export`,
    HRMS_PAY_REGISTER_PAYSLIPS: `${API_URL}/hrms/pay_register_payslips`,

    // HRMS Pay Register Display Setup (tbl_payslip_print_component) endpoints
    HRMS_PAYSLIP_PRINT_COMPONENT_LIST: `${API_URL}/hrms/payslip_print_component_list`,
    HRMS_PAYSLIP_PRINT_COMPONENT_SETUP: `${API_URL}/hrms/payslip_print_component_setup`,
    HRMS_PAY_SCHEME_COMPONENTS: `${API_URL}/hrms/pay_scheme_components`,
    HRMS_PAYSLIP_PRINT_COMPONENT_BY_ID: `${API_URL}/hrms/payslip_print_component_by_id`,
    HRMS_PAYSLIP_PRINT_COMPONENT_CREATE: `${API_URL}/hrms/payslip_print_component_create`,
    HRMS_PAYSLIP_PRINT_COMPONENT_UPDATE: `${API_URL}/hrms/payslip_print_component_update`,
    HRMS_PAYSLIP_PRINT_COMPONENT_DELETE: `${API_URL}/hrms/payslip_print_component_delete`,

    // HRMS Pay Roll (pay_components_custom) endpoints
    HRMS_PAY_ROLL_SETUP: `${API_URL}/hrms/pay_roll_setup`,
    HRMS_PAY_ROLL_DATA: `${API_URL}/hrms/pay_roll_data`,
    HRMS_PAY_ROLL_SAVE: `${API_URL}/hrms/pay_roll_save`,
    HRMS_PAY_ROLL_FETCH_ATTENDANCE: `${API_URL}/hrms/pay_roll_fetch_attendance`,
    HRMS_PAY_ROLL_FETCH_GENERIC: `${API_URL}/hrms/pay_roll_fetch_generic`,
    HRMS_PAY_ROLL_FETCH_CUMULATIVE: `${API_URL}/hrms/pay_roll_fetch_cumulative`,
    HRMS_PAY_ROLL_UPLOAD: `${API_URL}/hrms/pay_roll_upload`,
    HRMS_PAY_ROLL_DOWNLOAD_TEMPLATE: `${API_URL}/hrms/pay_roll_download_template`,

    // Designation Master endpoints
    // Cash / Daily Rate Entry (outsider_rate_approve)
    DAILY_RATE_SETUP: `${API_URL}/hrmsMasters/daily_rate_setup`,
    DAILY_RATE_TABLE: `${API_URL}/hrmsMasters/get_daily_rate_table`,
    DAILY_RATE_BY_ID: `${API_URL}/hrmsMasters/get_daily_rate_by_id`,
    DAILY_RATE_CREATE: `${API_URL}/hrmsMasters/daily_rate_create`,
    DAILY_RATE_EDIT: `${API_URL}/hrmsMasters/daily_rate_edit`,
    DAILY_RATE_DELETE: `${API_URL}/hrmsMasters/daily_rate_delete`,

    // Canteen Details (canteen_details)
    CANTEEN_SETUP: `${API_URL}/hrms/canteen_setup`,
    CANTEEN_TABLE: `${API_URL}/hrms/get_canteen_table`,
    CANTEEN_BY_ID: `${API_URL}/hrms/get_canteen_by_id`,
    CANTEEN_CREATE: `${API_URL}/hrms/canteen_create`,
    CANTEEN_EDIT: `${API_URL}/hrms/canteen_edit`,
    CANTEEN_APPROVE: `${API_URL}/hrms/canteen_approve`,
    CANTEEN_DELETE: `${API_URL}/hrms/canteen_delete`,

    DESIGNATION_TABLE: `${API_URL}/hrmsMasters/get_designation_table`,
    DESIGNATION_BY_ID: `${API_URL}/hrmsMasters/get_designation_by_id`,
    DESIGNATION_CREATE_SETUP: `${API_URL}/hrmsMasters/designation_create_setup`,
    DESIGNATION_CREATE: `${API_URL}/hrmsMasters/designation_create`,
    DESIGNATION_EDIT: `${API_URL}/hrmsMasters/designation_edit`,

    // Worker Category Master endpoints
    CATEGORY_TABLE: `${API_URL}/hrmsMasters/get_category_table`,
    CATEGORY_BY_ID: `${API_URL}/hrmsMasters/get_category_by_id`,
    CATEGORY_CREATE_SETUP: `${API_URL}/hrmsMasters/category_create_setup`,
    CATEGORY_CREATE: `${API_URL}/hrmsMasters/category_create`,
    CATEGORY_EDIT: `${API_URL}/hrmsMasters/category_edit`,

    // Contractor Master endpoints
    CONTRACTOR_TABLE: `${API_URL}/contractorMaster/get_contractor_table`,
    CONTRACTOR_BY_ID: `${API_URL}/contractorMaster/get_contractor_by_id`,
    CONTRACTOR_CREATE_SETUP: `${API_URL}/contractorMaster/contractor_create_setup`,
    CONTRACTOR_CREATE: `${API_URL}/contractorMaster/contractor_create`,
    CONTRACTOR_EDIT: `${API_URL}/contractorMaster/contractor_edit`,

    // Bank Details Master endpoints
    BANK_DETAILS_TABLE: `${API_URL}/bankDetailsMaster/get_bank_details_table`,
    BANK_DETAILS_BY_ID: `${API_URL}/bankDetailsMaster/get_bank_detail_by_id`,
    BANK_DETAILS_CREATE_SETUP: `${API_URL}/bankDetailsMaster/bank_details_create_setup`,
    BANK_DETAILS_CREATE: `${API_URL}/bankDetailsMaster/bank_details_create`,
    BANK_DETAILS_EDIT: `${API_URL}/bankDetailsMaster/bank_details_edit`,

    // =============================================
    // Accounting Module endpoints
    // =============================================

    // Setup & Masters
    ACC_ACTIVATE_COMPANY: `${API_URL}/accounting/activate_company`,
    ACC_LEDGER_GROUPS: `${API_URL}/accounting/ledger_groups`,
    ACC_LEDGER_GROUP_CREATE: `${API_URL}/accounting/ledger_groups`,
    ACC_LEDGERS: `${API_URL}/accounting/ledgers`,
    ACC_LEDGER_CREATE: `${API_URL}/accounting/ledgers`,
    ACC_LEDGER_EDIT: `${API_URL}/accounting/ledgers`,
    ACC_PARTIES_DROPDOWN: `${API_URL}/accounting/parties_dropdown`,
    ACC_VOUCHER_TYPES: `${API_URL}/accounting/voucher_types`,
    ACC_FINANCIAL_YEARS: `${API_URL}/accounting/financial_years`,
    ACC_FINANCIAL_YEAR_CREATE: `${API_URL}/accounting/financial_years`,
    ACC_ACCOUNT_DETERMINATIONS: `${API_URL}/accounting/account_determinations`,
    ACC_ACCOUNT_DETERMINATIONS_UPDATE: `${API_URL}/accounting/account_determinations`,

    // Voucher Operations
    ACC_VOUCHERS: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_CREATE: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_DETAIL: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_OPEN: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_CANCEL: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_SEND_APPROVAL: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_APPROVE: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_REJECT: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_REOPEN: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_REVERSE: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_SETTLE_BILLS: `${API_URL}/accounting/vouchers`,

    // Reports
    ACC_REPORT_TRIAL_BALANCE: `${API_URL}/accounting/reports/trial_balance`,
    ACC_REPORT_PROFIT_LOSS: `${API_URL}/accounting/reports/profit_loss`,
    ACC_REPORT_BALANCE_SHEET: `${API_URL}/accounting/reports/balance_sheet`,
    ACC_REPORT_LEDGER: `${API_URL}/accounting/reports/ledger_report`,
    ACC_REPORT_DAY_BOOK: `${API_URL}/accounting/reports/day_book`,
    ACC_REPORT_CASH_BOOK: `${API_URL}/accounting/reports/cash_book`,
    ACC_REPORT_PARTY_OUTSTANDING: `${API_URL}/accounting/reports/party_outstanding`,
    ACC_REPORT_AGEING: `${API_URL}/accounting/reports/ageing_analysis`,
    ACC_REPORT_GST_SUMMARY: `${API_URL}/accounting/reports/gst_summary`,

    // Opening Balance
    ACC_OPENING_BILLS_IMPORT: `${API_URL}/accounting/opening_bills`,

    // Company Settings & Posting Queue
    ACC_COMPANY_SETTINGS: `${API_URL}/accounting/company_settings`,
    ACC_COMPANY_SETTINGS_UPDATE: `${API_URL}/accounting/company_settings`,
    ACC_POSTING_QUEUE: `${API_URL}/accounting/posting_queue`,
    ACC_POSTING_QUEUE_RETRY: `${API_URL}/accounting/posting_queue`,

    // Shift Master endpoints
    SHIFT_TABLE: `${API_URL}/hrmsMasters/get_shift_table`,
    SHIFT_BY_ID: `${API_URL}/hrmsMasters/get_shift_by_id`,
    SHIFT_CREATE_SETUP: `${API_URL}/hrmsMasters/shift_create_setup`,
    SHIFT_CREATE: `${API_URL}/hrmsMasters/shift_create`,
    SHIFT_EDIT: `${API_URL}/hrmsMasters/shift_edit`,

    // Spell Master endpoints
    SPELL_TABLE: `${API_URL}/hrmsMasters/get_spell_table`,
    SPELL_BY_ID: `${API_URL}/hrmsMasters/get_spell_by_id`,
    SPELL_CREATE_SETUP: `${API_URL}/hrmsMasters/spell_create_setup`,
    SPELL_CREATE: `${API_URL}/hrmsMasters/spell_create`,
    SPELL_EDIT: `${API_URL}/hrmsMasters/spell_edit`,

    // Machine Type Master endpoints
    MACHINE_TYPE_TABLE: `${API_URL}/machineTypeMaster/get_machine_type_table`,
    MACHINE_TYPE_BY_ID: `${API_URL}/machineTypeMaster/get_machine_type_by_id`,
    MACHINE_TYPE_CREATE: `${API_URL}/machineTypeMaster/machine_type_create`,
    MACHINE_TYPE_EDIT: `${API_URL}/machineTypeMaster/machine_type_edit`,
    MACHINE_TYPE_DELETE: `${API_URL}/machineTypeMaster/machine_type_delete`,

    // HRMS Leave Type Master endpoints
    LEAVE_TYPE_TABLE: `${API_URL}/hrmsMasters/get_leave_type_table`,
    LEAVE_TYPE_BY_ID: `${API_URL}/hrmsMasters/get_leave_type_by_id`,
    LEAVE_TYPE_CREATE: `${API_URL}/hrmsMasters/leave_type_create`,
    LEAVE_TYPE_EDIT: `${API_URL}/hrmsMasters/leave_type_edit`,

    // HRMS Bio Attendance (employee↔device mapping + bio data process)
    BIO_EMP_LINK_SETUP: `${API_URL}/hrmsMasters/bio_emp_link_setup`,
    BIO_EMP_LINK_TABLE: `${API_URL}/hrmsMasters/get_bio_emp_link_table`,
    BIO_EMP_LINK_BY_ID: `${API_URL}/hrmsMasters/get_bio_emp_link_by_id`,
    BIO_EMP_LINK_CREATE: `${API_URL}/hrmsMasters/bio_emp_link_create`,
    BIO_EMP_LINK_EDIT: `${API_URL}/hrmsMasters/bio_emp_link_edit`,
    BIO_EMP_LINK_DELETE: `${API_URL}/hrmsMasters/bio_emp_link_delete`,
    BIO_ATT_PROCESS_RUN: `${API_URL}/hrmsMasters/bio_att_process_run`,
    BIO_ATT_BASIC_LIST: `${API_URL}/hrmsMasters/bio_att_basic_list`,
    BIO_ATT_PROCESS_LIST: `${API_URL}/hrmsMasters/bio_att_process_list`,
    BIO_ATT_DAYWISE_REPORT: `${API_URL}/hrmsMasters/bio_att_daywise_report`,
    BIO_ATT_DAYWISE_REPORT_EXCEL: `${API_URL}/hrmsMasters/bio_att_daywise_report_excel`,
    BIO_ATT_INOUT_REPORT: `${API_URL}/hrmsMasters/bio_att_inout_report`,
    BIO_ATT_INOUT_REPORT_EXCEL: `${API_URL}/hrmsMasters/bio_att_inout_report_excel`,

    // HRMS Leave Request (transaction) endpoints
    LEAVE_REQUEST_TABLE: `${API_URL}/hrms/leave_request_list`,
    LEAVE_REQUEST_BY_ID: `${API_URL}/hrms/leave_request_by_id`,
    LEAVE_REQUEST_CREATE: `${API_URL}/hrms/leave_request_create`,
    LEAVE_REQUEST_EDIT: `${API_URL}/hrms/leave_request_edit`,
    LEAVE_REQUEST_APPROVE: `${API_URL}/hrms/leave_request_approve`,
    LEAVE_REQUEST_REJECT: `${API_URL}/hrms/leave_request_reject`,
    LEAVE_LEDGER_BY_EB: `${API_URL}/hrms/leave_ledger`,
    WORKER_BY_EB_NO: `${API_URL}/hrms/worker_by_eb_no`,

    // ============================================================
    // Jute Production — Spreader workflow
    // ============================================================
    SPREADER_ENTRY_CREATE_SETUP: `${API_URL}/spreaderProd/entry_create_setup`,
    SPREADER_ENTRY_BIN_STATE: `${API_URL}/spreaderProd/entry_bin_state`,
    SPREADER_ENTRY_CREATE: `${API_URL}/spreaderProd/entry_create`,
    SPREADER_ENTRIES_BY_DATE: `${API_URL}/spreaderProd/entries_by_date`,
    SPREADER_ENTRY_EDIT: `${API_URL}/spreaderProd/entry_edit`,
    SPREADER_ENTRY_DELETE: `${API_URL}/spreaderProd/entry_delete`,
    SPREADER_ISSUE_CREATE_SETUP: `${API_URL}/spreaderProd/issue_create_setup`,
    SPREADER_ISSUE_AVAILABLE_WEIGHTS: `${API_URL}/spreaderProd/issue_available_weights`,
    SPREADER_ISSUE_CREATE: `${API_URL}/spreaderProd/issue_create`,
    SPREADER_ISSUES_BY_DATE: `${API_URL}/spreaderProd/issues_by_date`,
    SPREADER_ISSUE_EDIT: `${API_URL}/spreaderProd/issue_edit`,
    SPREADER_ISSUE_DELETE: `${API_URL}/spreaderProd/issue_delete`,
    SPREADER_ROLL_STOCK: `${API_URL}/spreaderProd/roll_stock`,
    SPREADER_ROLL_STOCK_QUALITY_SUMMARY: `${API_URL}/spreaderProd/roll_stock_quality_summary`,
    JUTE_PROD_MATURITY_REPORT: `${API_URL}/juteProductionReports/maturity_time_report`,
    JUTE_PROD_SPREADER_SUMMARY: `${API_URL}/juteProductionReports/spreader_production_summary`,

    SPREADER_BIN_LIST: `${API_URL}/spreaderMasters/bin_list`,
    SPREADER_BIN_CREATE: `${API_URL}/spreaderMasters/bin_create`,
    SPREADER_BIN_EDIT: `${API_URL}/spreaderMasters/bin_edit`,
    ITEM_MATURITY_CREATE_SETUP: `${API_URL}/spreaderMasters/item_maturity_create_setup`,
    ITEM_MATURITY_LIST: `${API_URL}/spreaderMasters/item_maturity_list`,
    ITEM_MATURITY_CREATE: `${API_URL}/spreaderMasters/item_maturity_create`,
    ITEM_MATURITY_EDIT: `${API_URL}/spreaderMasters/item_maturity_edit`,
    SPREADER_MACHINE_WT_CREATE_SETUP: `${API_URL}/spreaderMasters/spreader_machine_wt_create_setup`,
    SPREADER_MACHINE_WT_LIST: `${API_URL}/spreaderMasters/spreader_machine_wt_list`,
    SPREADER_MACHINE_WT_CREATE: `${API_URL}/spreaderMasters/spreader_machine_wt_create`,
    SPREADER_MACHINE_WT_EDIT: `${API_URL}/spreaderMasters/spreader_machine_wt_edit`,
    DRAWING_ENTRY_CREATE_SETUP: `${API_URL}/drawingProd/entry_create_setup`,
    DRAWING_MACHINE_PREV_STATE: `${API_URL}/drawingProd/machine_prev_state`,
    DRAWING_ENTRY_CREATE: `${API_URL}/drawingProd/entry_create`,
    DRAWING_ENTRIES_BY_DATE: `${API_URL}/drawingProd/entries_by_date`,
    DRAWING_ENTRY_EDIT: `${API_URL}/drawingProd/entry_edit`,
    DRAWING_ENTRY_DELETE: `${API_URL}/drawingProd/entry_delete`,
    DRAWING_MACHINE_ATTR_LIST: `${API_URL}/drawingMasters/drawing_machine_attr_list`,
    DRAWING_MACHINE_ATTR_CREATE: `${API_URL}/drawingMasters/drawing_machine_attr_create`,
    DRAWING_MACHINE_ATTR_EDIT: `${API_URL}/drawingMasters/drawing_machine_attr_edit`,
    // HRMS Daily Attendance (transaction) endpoints
    ATTENDANCE_LIST: `${API_URL}/hrms/daily_attendance_list`,
    ATTENDANCE_BY_ID: `${API_URL}/hrms/daily_attendance_by_id`,
    ATTENDANCE_CREATE: `${API_URL}/hrms/daily_attendance_create`,
    ATTENDANCE_EDIT: `${API_URL}/hrms/daily_attendance_edit`,
    ATTENDANCE_APPROVE: `${API_URL}/hrms/daily_attendance_approve`,
    ATTENDANCE_REJECT: `${API_URL}/hrms/daily_attendance_reject`,
    ATTENDANCE_CREATE_SETUP: `${API_URL}/hrms/attendance_create_setup`,
    ATTENDANCE_LEAVE_STATUS: `${API_URL}/hrms/attendance_leave_status`,
    ATTENDANCE_MACHINES: `${API_URL}/hrms/attendance_machines_by_designation`,
    // Attendance register report (checklist page) — served by the Flask mobileapp
    // mounted at the backend root (no /hrms prefix).
    // vowerp3be/src/mobileapp/src/attendance/attendance.py
    ATTENDANCE_CHECKLIST_REPORT: `${API_URL}/attendance-report`,
    // Spinning / Doff production (router prefix /api/spinningProd)
    SPINNING_DOFF_SETUP: `${API_URL}/spinningProd/doff_entry_create_setup`,
    SPINNING_DOFF_PREV_STATE: `${API_URL}/spinningProd/doff_machine_prev_state`,
    SPINNING_DOFF_CREATE: `${API_URL}/spinningProd/doff_entry_create`,
    SPINNING_DOFF_BY_DATE: `${API_URL}/spinningProd/doff_entries_by_date`,
    SPINNING_DOFF_EDIT: `${API_URL}/spinningProd/doff_entry_edit`,
    SPINNING_DOFF_DELETE: `${API_URL}/spinningProd/doff_entry_delete`,
    SPINNING_DOFF_DEDUP: `${API_URL}/spinningProd/doff_dedup_run`,
    SPINNING_FRAME_MAP_GET: `${API_URL}/spinningProd/frame_map_get`,
    SPINNING_FRAME_MAP_SAVE: `${API_URL}/spinningProd/frame_map_save`,
    SPINNING_FRAME_MAP_MAPPED: `${API_URL}/spinningProd/frame_map_mapped`,
    // Spinning planning grid + Process/Lock (router prefix /api/spinningProd)
    SPINNING_PLANNING_GRID: `${API_URL}/spinningProd/planning_grid`,
    // Spinning process / staleness + quality mapper + sync (spec 5.3/5.4/5.6)
    SPINNING_PROCESS_STATUS: `${API_URL}/spinningProd/process_status`,
    SPINNING_PROCESS: `${API_URL}/spinningProd/process`,
    SPINNING_DOFF_SYNC: `${API_URL}/spinningProd/doff_sync`,
    SPINNING_QUALITY_MAP_GRID: `${API_URL}/spinningProd/quality_map_grid`,
    SPINNING_QUALITY_MAP_SAVE: `${API_URL}/spinningProd/quality_map_save`,
    SPINNING_DOFF_EDITOR_SETUP: `${API_URL}/spinningProd/doff_editor_setup`,
    // Winding production (router prefix /api/windingProd) — *_EDIT/*_UPDATE/*_DELETE and
    // WINDING_QUALITY_SAVE are base paths; caller appends /${id}?co_id=...
    // Entry is person-keyed (eb_id), never machine-keyed — winding-person-keyed-entry-spec.md
    WINDING_WORKERS: `${API_URL}/windingProd/workers`,
    // Doff
    WINDING_DOFF_SETUP: `${API_URL}/windingProd/doff_setup`,
    WINDING_DOFF_PREV_STATE: `${API_URL}/windingProd/doff_prev_state`,
    WINDING_DOFF_CREATE: `${API_URL}/windingProd/doff_create`,
    WINDING_DOFF_BY_DATE: `${API_URL}/windingProd/doff_by_date`,
    WINDING_DOFF_EDIT: `${API_URL}/windingProd/doff_edit`,
    WINDING_DOFF_DELETE: `${API_URL}/windingProd/doff_delete`,
    // Jugar
    WINDING_JUGAR_SETUP: `${API_URL}/windingProd/jugar_setup`,
    WINDING_JUGAR_STATE: `${API_URL}/windingProd/jugar_state`,
    WINDING_JUGAR_SAVE: `${API_URL}/windingProd/jugar_save`,
    WINDING_JUGAR_UPDATE: `${API_URL}/windingProd/jugar_update`,
    WINDING_JUGAR_BY_DATE: `${API_URL}/windingProd/jugar_by_date`,
    // Quality (person -> quality map)
    WINDING_QUALITY_SETUP: `${API_URL}/windingProd/quality_setup`,
    WINDING_QUALITY_SAVE: `${API_URL}/windingProd/quality_save`,
    WINDING_QUALITY_ADD: `${API_URL}/windingProd/quality_add`,
    WINDING_QUALITY_DELETE: `${API_URL}/windingProd/quality_delete`,
    WINDING_QUALITY_BY_DATE: `${API_URL}/windingProd/quality_by_date`,
    // Winding reports (router prefix /api/juteProductionReports)
    WINDING_SPELL_REPORT: `${API_URL}/juteProductionReports/winding_spell_report`,
    WINDING_QUALITY_WISE_REPORT: `${API_URL}/juteProductionReports/winding_quality_wise`,
    // Spinning standards master (router prefix /api/spngTargetMap) — *_EDIT/*_DELETE are base paths; caller appends /${id}
    SPNG_TARGET_MAP_SETUP: `${API_URL}/spngTargetMap/target_map_setup`,
    SPNG_TARGET_MAP_LIST: `${API_URL}/spngTargetMap/target_map_list`,
    SPNG_TARGET_MAP_CREATE: `${API_URL}/spngTargetMap/target_map_create`,
    SPNG_TARGET_MAP_EDIT: `${API_URL}/spngTargetMap/target_map_edit`,
    SPNG_TARGET_MAP_DELETE: `${API_URL}/spngTargetMap/target_map_delete`,
    SPNG_TARGET_MAP_GRID: `${API_URL}/spngTargetMap/target_map_grid`,
    SPNG_TARGET_MAP_BULK_SAVE: `${API_URL}/spngTargetMap/target_map_bulk_save`,
    // Spinning SQC (router prefix /api/juteSQC) — SPINNING_SQC_COUNT_DELETE is a base path; caller appends /${id}
    SPINNING_SQC_COUNT_SETUP: `${API_URL}/juteSQC/sqc_count_setup`,
    SPINNING_SQC_COUNT_SAVE: `${API_URL}/juteSQC/sqc_count_save`,
    SPINNING_SQC_COUNT_BY_DATE: `${API_URL}/juteSQC/sqc_count_by_date`,
    SPINNING_SQC_COUNT_DELETE: `${API_URL}/juteSQC/sqc_count_delete`,
    // Spreader SQC / R-08-04 Roll Weight (router prefix /api/juteSQC) — SPREADER_SQC_ROLL_WT_DELETE is a base path; caller appends /${id}
    SPREADER_SQC_ROLL_WT_SETUP: `${API_URL}/juteSQC/get_spreader_roll_wt_setup`,
    SPREADER_SQC_ROLL_WT_SAVE: `${API_URL}/juteSQC/create_spreader_roll_wt`,
    SPREADER_SQC_ROLL_WT_BY_DATE: `${API_URL}/juteSQC/get_spreader_roll_wt_by_date`,
    SPREADER_SQC_ROLL_WT_DELETE: `${API_URL}/juteSQC/spreader_roll_wt_delete`,
    // Spreader SQC / R-08-03 Sliver Weight (router prefix /api/juteSQC) — SPREADER_SLIVER_WT_DELETE is a base path; caller appends /${id}
    SPREADER_SLIVER_WT_SETUP: `${API_URL}/juteSQC/get_spreader_sliver_wt_setup`,
    SPREADER_SLIVER_WT_SAVE: `${API_URL}/juteSQC/create_spreader_sliver_wt`,
    SPREADER_SLIVER_WT_BY_DATE: `${API_URL}/juteSQC/get_spreader_sliver_wt_by_date`,
    SPREADER_SLIVER_WT_DELETE: `${API_URL}/juteSQC/spreader_sliver_wt_delete`,
    // Breaker Card SQC / R-08-05/06/07 Coarse-Side SWT (router prefix /api/juteSQC) — multi-row create; BREAKER_CARD_SWT_DELETE is a base path; caller appends /${id}
    BREAKER_CARD_SWT_SETUP: `${API_URL}/juteSQC/get_breaker_card_swt_setup`,
    BREAKER_CARD_SWT_SAVE: `${API_URL}/juteSQC/create_breaker_card_swt`,
    BREAKER_CARD_SWT_BY_DATE: `${API_URL}/juteSQC/get_breaker_card_swt_by_date`,
    BREAKER_CARD_SWT_DELETE: `${API_URL}/juteSQC/breaker_card_swt_delete`,
    // Inter Card & Tow Breaker SQC / R-08-07A Card Sliver Weight (router prefix /api/juteSQC) — multi-row create; CARD_SLIVER_WT_DELETE is a base path; caller appends /${id}
    CARD_SLIVER_WT_SETUP: `${API_URL}/juteSQC/get_card_sliver_wt_setup`,
    CARD_SLIVER_WT_SAVE: `${API_URL}/juteSQC/create_card_sliver_wt`,
    CARD_SLIVER_WT_BY_DATE: `${API_URL}/juteSQC/get_card_sliver_wt_by_date`,
    CARD_SLIVER_WT_DELETE: `${API_URL}/juteSQC/card_sliver_wt_delete`,
    // Finisher Drawing SQC / R-08-12/13/14 Finisher Drawing Sliver Weight (router prefix /api/juteSQC) — multi-row create; FIN_DRAW_SLIVER_WT_DELETE is a base path; caller appends /${id}
    FIN_DRAW_SLIVER_WT_SETUP: `${API_URL}/juteSQC/get_fin_draw_sliver_wt_setup`,
    FIN_DRAW_SLIVER_WT_SAVE: `${API_URL}/juteSQC/create_fin_draw_sliver_wt`,
    FIN_DRAW_SLIVER_WT_BY_DATE: `${API_URL}/juteSQC/get_fin_draw_sliver_wt_by_date`,
    FIN_DRAW_SLIVER_WT_DELETE: `${API_URL}/juteSQC/fin_draw_sliver_wt_delete`,
    // Drawhead & Finisher Card SQC / R-08-08/09/10 Draw Sliver Weight (router prefix /api/juteSQC) — multi-row create; DRAW_SLIVER_WT_DELETE is a base path; caller appends /${id}
    DRAW_SLIVER_WT_SETUP: `${API_URL}/juteSQC/get_draw_sliver_wt_setup`,
    DRAW_SLIVER_WT_SAVE: `${API_URL}/juteSQC/create_draw_sliver_wt`,
    DRAW_SLIVER_WT_BY_DATE: `${API_URL}/juteSQC/get_draw_sliver_wt_by_date`,
    DRAW_SLIVER_WT_DELETE: `${API_URL}/juteSQC/draw_sliver_wt_delete`,
    // Weaving Pick SQC / R-08-21 Loom Width & Picks (router prefix /api/juteSQC) — WEAVING_SQC_PICK_DELETE is a base path; caller appends /${id}
    WEAVING_SQC_PICK_SETUP:   `${API_URL}/juteSQC/weaving_sqc_pick_setup`,
    WEAVING_SQC_PICK_SAVE:    `${API_URL}/juteSQC/weaving_sqc_pick_save`,
    WEAVING_SQC_PICK_BY_DATE: `${API_URL}/juteSQC/weaving_sqc_pick_by_date`,
    WEAVING_SQC_PICK_DELETE:  `${API_URL}/juteSQC/weaving_sqc_pick_delete`,
    // R-08-15 Yarn QR & CV % (router prefix /api/juteSQC) — SPINNING_SQC_QR_CV_DELETE is a base path; caller appends /${id}
    SPINNING_SQC_QR_CV_SETUP: `${API_URL}/juteSQC/sqc_qr_cv_setup`,
    SPINNING_SQC_QR_CV_SAVE: `${API_URL}/juteSQC/sqc_qr_cv_save`,
    SPINNING_SQC_QR_CV_BY_DATE: `${API_URL}/juteSQC/sqc_qr_cv_by_date`,
    SPINNING_SQC_QR_CV_DELETE: `${API_URL}/juteSQC/sqc_qr_cv_delete`,
    // R-08-15A Yarn QR% & CV% (Special Purpose) (router prefix /api/juteSQC) — header + 12-reading grid; QR_CV_15A_SQC_DELETE is a base path; caller appends /${id}
    QR_CV_15A_SQC_SETUP: `${API_URL}/juteSQC/qr_cv_15a_setup`,
    QR_CV_15A_SQC_SAVE: `${API_URL}/juteSQC/qr_cv_15a_save`,
    QR_CV_15A_SQC_BY_DATE: `${API_URL}/juteSQC/qr_cv_15a_by_date`,
    QR_CV_15A_SQC_DELETE: `${API_URL}/juteSQC/qr_cv_15a_delete`,
    // R-08-17 Yarn TPI & TPI CV% (router prefix /api/juteSQC) — header + 20-reading TPI grid; YARN_TPI_SQC_DELETE is a base path; caller appends /${id}
    YARN_TPI_SQC_SETUP: `${API_URL}/juteSQC/yarn_tpi_setup`,
    YARN_TPI_SQC_SAVE: `${API_URL}/juteSQC/yarn_tpi_save`,
    YARN_TPI_SQC_BY_DATE: `${API_URL}/juteSQC/yarn_tpi_by_date`,
    YARN_TPI_SQC_DELETE: `${API_URL}/juteSQC/yarn_tpi_delete`,
    // R-08-18 Beam MR% (router prefix /api/juteSQC) — single reading-set per save (5 MR% readings); BEAM_MR_DELETE POSTs {beam_mr_id, co_id}
    BEAM_MR_CREATE_SETUP: `${API_URL}/juteSQC/get_beam_mr_create_setup`,
    BEAM_MR_CREATE: `${API_URL}/juteSQC/create_beam_mr`,
    BEAM_MR_BY_DATE: `${API_URL}/juteSQC/get_beam_mr_by_date`,
    BEAM_MR_TABLE: `${API_URL}/juteSQC/get_beam_mr_table`,
    BEAM_MR_DELETE: `${API_URL}/juteSQC/delete_beam_mr`,
    // R-08-20 Cutting Length (router prefix /api/juteSQC) — one save = one date's reading-set (header + 20 cut-length readings); CUTTING_LENGTH_DELETE POSTs {cutting_length_id, co_id}
    CUTTING_LENGTH_CREATE_SETUP: `${API_URL}/juteSQC/cutting_length_create_setup`,
    CUTTING_LENGTH_CREATE: `${API_URL}/juteSQC/create_cutting_length`,
    CUTTING_LENGTH_BY_DATE: `${API_URL}/juteSQC/get_cutting_length_by_date`,
    CUTTING_LENGTH_TABLE: `${API_URL}/juteSQC/get_cutting_length_table`,
    CUTTING_LENGTH_DELETE: `${API_URL}/juteSQC/delete_cutting_length`,
    // R-08-25 Packing MR% (router prefix /api/juteSQC) — one save = one (date, quality column) reading-set (header + 10 MR% readings); group roll-up by quality_group; PACKING_MR_DELETE POSTs {packing_mr_id, co_id}
    PACKING_MR_CREATE_SETUP: `${API_URL}/juteSQC/packing_mr_create_setup`,
    PACKING_MR_CREATE: `${API_URL}/juteSQC/create_packing_mr`,
    PACKING_MR_BY_DATE: `${API_URL}/juteSQC/get_packing_mr_by_date`,
    PACKING_MR_TABLE: `${API_URL}/juteSQC/get_packing_mr_table`,
    PACKING_MR_DELETE: `${API_URL}/juteSQC/delete_packing_mr`,
    // R-08-19 Fabric Construction (router prefix /api/juteSQC) — one save = one cloth-quality block (header + up to 5 sample rows); FABRIC_CONSTRUCTION_DELETE POSTs {fabric_const_id, co_id}
    FABRIC_CONSTRUCTION_CREATE_SETUP: `${API_URL}/juteSQC/get_fabric_construction_create_setup`,
    FABRIC_CONSTRUCTION_CREATE: `${API_URL}/juteSQC/create_fabric_construction`,
    FABRIC_CONSTRUCTION_BY_DATE: `${API_URL}/juteSQC/get_fabric_construction_by_date`,
    FABRIC_CONSTRUCTION_TABLE: `${API_URL}/juteSQC/get_fabric_construction_table`,
    FABRIC_CONSTRUCTION_DELETE: `${API_URL}/juteSQC/delete_fabric_construction`,
    // R-08-23 Bag Weight (router prefix /api/juteSQC) — one save = one (date, bag type) block (header std_bag_weight/std_mr_pct + up to 24 reading rows {mr, obs}); BAG_WEIGHT_DELETE POSTs {bag_weight_id, co_id}
    BAG_WEIGHT_CREATE_SETUP: `${API_URL}/juteSQC/bag_weight_create_setup`,
    BAG_WEIGHT_CREATE: `${API_URL}/juteSQC/create_bag_weight`,
    BAG_WEIGHT_BY_DATE: `${API_URL}/juteSQC/get_bag_weight_by_date`,
    BAG_WEIGHT_TABLE: `${API_URL}/juteSQC/get_bag_weight_table`,
    BAG_WEIGHT_DELETE: `${API_URL}/juteSQC/delete_bag_weight`,
    // Humidity Recording (router prefix /api/juteSQC) — plant-wide dept temp/RH log; one save = one (date, dept, round) reading-set (header + 1..3 spot readings {spot_label, reading_time, temp_c, rh_pct}); server computes avg_temp/avg_rh; HUMIDITY_DELETE POSTs {humidity_id, co_id}
    HUMIDITY_CREATE_SETUP: `${API_URL}/juteSQC/humidity_create_setup`,
    HUMIDITY_CREATE: `${API_URL}/juteSQC/create_humidity`,
    HUMIDITY_BY_DATE: `${API_URL}/juteSQC/get_humidity_by_date`,
    HUMIDITY_TABLE: `${API_URL}/juteSQC/get_humidity_table`,
    HUMIDITY_DELETE: `${API_URL}/juteSQC/delete_humidity`,
    // R-08-02 Emulsion (router prefix /api/juteSQC) — daily batching jute-oil recipe log; one save = ONE flat row per date (NO readings array). Header: oil_used/tank/measured oil_pct + std band (snapshot) + additive columns. Server computes theoretical_oil_pct (reference) and oil_pct_status (OK/LOW/HIGH); EMULSION_DELETE POSTs {emulsion_id, co_id}
    EMULSION_CREATE_SETUP: `${API_URL}/juteSQC/emulsion_create_setup`,
    EMULSION_CREATE: `${API_URL}/juteSQC/create_emulsion`,
    EMULSION_BY_DATE: `${API_URL}/juteSQC/get_emulsion_by_date`,
    EMULSION_TABLE: `${API_URL}/juteSQC/get_emulsion_table`,
    EMULSION_DELETE: `${API_URL}/juteSQC/delete_emulsion`,
    // R-08-24 Bag Checking (router prefix /api/juteSQC) — finished-bag acceptance inspection; one save = one (date, bag type) block (header: vendor_name/id_code free text + 7 std snapshots + N per-bag detail rows with 7 measures + defects); BAG_CHECK_DELETE POSTs {bag_check_id, co_id}
    BAG_CHECK_CREATE_SETUP: `${API_URL}/juteSQC/bag_check_create_setup`,
    BAG_CHECK_CREATE: `${API_URL}/juteSQC/create_bag_check`,
    BAG_CHECK_BY_DATE: `${API_URL}/juteSQC/get_bag_check_by_date`,
    BAG_CHECK_TABLE: `${API_URL}/juteSQC/get_bag_check_table`,
    BAG_CHECK_DELETE: `${API_URL}/juteSQC/delete_bag_check`,
    // R-08-21 Width & Picks (router prefix /api/juteSQC) — one save = one (date, cloth-quality) group (header std_width_cm/std_picks + N loom reading rows); WIDTH_PICKS_DELETE POSTs {width_picks_id, co_id}
    WIDTH_PICKS_CREATE_SETUP: `${API_URL}/juteSQC/width_picks_create_setup`,
    WIDTH_PICKS_CREATE: `${API_URL}/juteSQC/create_width_picks`,
    WIDTH_PICKS_BY_DATE: `${API_URL}/juteSQC/get_width_picks_by_date`,
    WIDTH_PICKS_TABLE: `${API_URL}/juteSQC/get_width_picks_table`,
    WIDTH_PICKS_DELETE: `${API_URL}/juteSQC/delete_width_picks`,
    // R-08-22 Stitch (router prefix /api/juteSQC) — finishing sewing-stitch-density QC; one save = one (date, sewing machine) reading-set (header std_stitch + 5 stitch counts); STITCH_DELETE POSTs {stitch_id, co_id}
    STITCH_CREATE_SETUP: `${API_URL}/juteSQC/stitch_create_setup`,
    STITCH_CREATE: `${API_URL}/juteSQC/create_stitch`,
    STITCH_BY_DATE: `${API_URL}/juteSQC/get_stitch_by_date`,
    STITCH_TABLE: `${API_URL}/juteSQC/get_stitch_table`,
    STITCH_DELETE: `${API_URL}/juteSQC/delete_stitch`,
    // R-08-28 Fabric Fault (router prefix /api/juteSQC) — weaving woven-cloth defect tally; one save = one inspected piece (header + fixed 15-fault count array); day roll-up server-computed; FABRIC_FAULT_DELETE POSTs {fabric_fault_id, co_id}
    FABRIC_FAULT_CREATE_SETUP: `${API_URL}/juteSQC/fabric_fault_create_setup`,
    FABRIC_FAULT_CREATE: `${API_URL}/juteSQC/create_fabric_fault`,
    FABRIC_FAULT_BY_DATE: `${API_URL}/juteSQC/get_fabric_fault_by_date`,
    FABRIC_FAULT_TABLE: `${API_URL}/juteSQC/get_fabric_fault_table`,
    FABRIC_FAULT_DELETE: `${API_URL}/juteSQC/delete_fabric_fault`,
    // RHMR (Temperature / Humidity per date + spell) — SPINNING_SQC_RHMR_DELETE is a base path; caller appends /${id}
    SPINNING_SQC_RHMR_SETUP: `${API_URL}/juteSQC/sqc_rhmr_setup`,
    SPINNING_SQC_RHMR_SEARCH: `${API_URL}/juteSQC/sqc_rhmr_search`,
    SPINNING_SQC_RHMR_SAVE: `${API_URL}/juteSQC/sqc_rhmr_save`,
    SPINNING_SQC_RHMR_DELETE: `${API_URL}/juteSQC/sqc_rhmr_delete`,
    // Spinning masters (router prefix /api/spinningMasters)
    TROLLY_LIST: `${API_URL}/spinningMasters/trolly_list`,
    TROLLY_CREATE: `${API_URL}/spinningMasters/trolly_create`,
    TROLLY_EDIT: `${API_URL}/spinningMasters/trolly_edit`,
    TROLLY_DELETE: `${API_URL}/spinningMasters/trolly_delete`,
    TROLLY_MACHINE_TYPES: `${API_URL}/spinningMasters/trolly_machine_types`,
    // Stoppage Hours (router prefix /api/stoppageProd) — STOPPAGE_ENTRY_EDIT/DELETE are
    // base paths; caller appends /${id}?co_id=...
    STOPPAGE_ENTRY_CREATE_SETUP: `${API_URL}/stoppageProd/entry_create_setup`,
    STOPPAGE_ENTRY_CREATE: `${API_URL}/stoppageProd/entry_create`,
    STOPPAGE_ENTRIES_BY_DATE: `${API_URL}/stoppageProd/entries_by_date`,
    STOPPAGE_ENTRY_EDIT: `${API_URL}/stoppageProd/entry_edit`,
    STOPPAGE_ENTRY_DELETE: `${API_URL}/stoppageProd/entry_delete`,
    // Beaming Quality Master (router prefix /api/beamingMasters) — BM_QUALITY_EDIT/DELETE/DETAIL are
    // base paths; caller appends /${id}?co_id=...
    BM_QUALITY_CREATE_SETUP: `${API_URL}/beamingMasters/bm_quality_create_setup`,
    BM_QUALITY_LIST: `${API_URL}/beamingMasters/bm_quality_list`,
    BM_QUALITY_CREATE: `${API_URL}/beamingMasters/bm_quality_create`,
    BM_QUALITY_EDIT: `${API_URL}/beamingMasters/bm_quality_edit`,
    BM_QUALITY_DELETE: `${API_URL}/beamingMasters/bm_quality_delete`,
    BM_QUALITY_DETAIL: `${API_URL}/beamingMasters/bm_quality_detail`,
    // Beaming Standards / Targets Map (router prefix /api/beamingTargetMap) — clone of spngTargetMap;
    // *_EDIT/*_DELETE are base paths; caller appends /${id}
    BEAMING_TARGET_MAP_SETUP: `${API_URL}/beamingTargetMap/target_map_setup`,
    BEAMING_TARGET_MAP_LIST: `${API_URL}/beamingTargetMap/target_map_list`,
    BEAMING_TARGET_MAP_CREATE: `${API_URL}/beamingTargetMap/target_map_create`,
    BEAMING_TARGET_MAP_EDIT: `${API_URL}/beamingTargetMap/target_map_edit`,
    BEAMING_TARGET_MAP_DELETE: `${API_URL}/beamingTargetMap/target_map_delete`,
    BEAMING_TARGET_MAP_GRID: `${API_URL}/beamingTargetMap/target_map_grid`,
    BEAMING_TARGET_MAP_BULK_SAVE: `${API_URL}/beamingTargetMap/target_map_bulk_save`,
    // Beaming Production Entry (router prefix /api/beamingProd) — BEAMING_ENTRY_EDIT/DELETE are
    // base paths; caller appends /${id}?co_id=...
    BEAMING_ENTRY_CREATE_SETUP: `${API_URL}/beamingProd/entry_create_setup`,
    BEAMING_ENTRIES_BY_DATE: `${API_URL}/beamingProd/entries_by_date`,
    BEAMING_MACHINE_STANDARDS: `${API_URL}/beamingProd/machine_standards`,
    BEAMING_ENTRY_CREATE: `${API_URL}/beamingProd/entry_create`,
    BEAMING_ENTRY_EDIT: `${API_URL}/beamingProd/entry_edit`,
    BEAMING_ENTRY_DELETE: `${API_URL}/beamingProd/entry_delete`,
    BEAMING_PLANNING_GRID: `${API_URL}/beamingProd/planning_grid`,
    BEAMING_PLANNING_GRID_SAVE: `${API_URL}/beamingProd/planning_grid_save`,
    // Finishing Spec Sheet (router prefix /api/finishingTargetMap) — clone of beamingTargetMap,
    // adding the `process` dimension on every call. *_EDIT/*_DELETE are base paths; caller appends /${id}
    FINISHING_TARGET_MAP_SETUP: `${API_URL}/finishingTargetMap/target_map_setup`,
    FINISHING_TARGET_MAP_GRID: `${API_URL}/finishingTargetMap/target_map_grid`,
    FINISHING_TARGET_MAP_BULK_SAVE: `${API_URL}/finishingTargetMap/target_map_bulk_save`,
    FINISHING_TARGET_MAP_LIST: `${API_URL}/finishingTargetMap/target_map_list`,
    FINISHING_TARGET_MAP_CREATE: `${API_URL}/finishingTargetMap/target_map_create`,
    FINISHING_TARGET_MAP_EDIT: `${API_URL}/finishingTargetMap/target_map_edit`,
    FINISHING_TARGET_MAP_DELETE: `${API_URL}/finishingTargetMap/target_map_delete`,
    // Finishing Quality Master (router prefix /api/finishingMasters) — cloth (type 1) & bag (type 2)
    // qualities. *_DETAIL/*_EDIT/*_DELETE are base paths; caller appends /${id}?co_id=...
    FINISHING_QUALITY_SETUP: `${API_URL}/finishingMasters/quality_setup`,
    FINISHING_QUALITY_LIST: `${API_URL}/finishingMasters/quality_list`,
    FINISHING_QUALITY_DETAIL: `${API_URL}/finishingMasters/quality_detail`,
    FINISHING_QUALITY_CREATE: `${API_URL}/finishingMasters/quality_create`,
    FINISHING_QUALITY_EDIT: `${API_URL}/finishingMasters/quality_edit`,
    FINISHING_QUALITY_DELETE: `${API_URL}/finishingMasters/quality_delete`,
    // Finishing Production Entry (router prefix /api/finishingProd) — built by the production-entry slice.
    FINISHING_PROD_ENTRY_SETUP: `${API_URL}/finishingProd/entry_setup`,
    FINISHING_PROD_ENTRY_SAVE: `${API_URL}/finishingProd/entry_save`,
    FINISHING_PROD_ENTRY_BY_DATE: `${API_URL}/finishingProd/entry_by_date`,
    FINISHING_PROD_ENTRY_DELETE: `${API_URL}/finishingProd/entry_delete`,
    // Labour processes (sacksewing): resolve emp_code -> eb_id + name, branch-scoped.
    FINISHING_PROD_EMPLOYEE_LOOKUP: `${API_URL}/finishingProd/employee_lookup`,
    // Finishing SQC — ACTUALS ONLY (router prefix /api/juteSQC, shared with Spinning/Beaming SQC).
    // Proxies to finishingTargetMap with value_role='actual'.
    FINISHING_SQC_SETUP: `${API_URL}/juteSQC/finishing_sqc_setup`,
    FINISHING_SQC_ACTUAL_GRID: `${API_URL}/juteSQC/finishing_sqc_actual_grid`,
    FINISHING_SQC_ACTUAL_SAVE: `${API_URL}/juteSQC/finishing_sqc_actual_save`,
    // Weaving Quality Master (router prefix /api/weavingMasters) — WEAVING_QUALITY_EDIT/DELETE are
    // base paths; caller appends /${id}?co_id=...
    WEAVING_QUALITY_SETUP: `${API_URL}/weavingMasters/weaving_quality_setup`,
    WEAVING_QUALITY_LIST: `${API_URL}/weavingMasters/weaving_quality_list`,
    WEAVING_QUALITY_CREATE: `${API_URL}/weavingMasters/weaving_quality_create`,
    WEAVING_QUALITY_EDIT: `${API_URL}/weavingMasters/weaving_quality_edit`,
    WEAVING_QUALITY_DELETE: `${API_URL}/weavingMasters/weaving_quality_delete`,
    // Weaving Standards / Targets Map (router prefix /api/weavingTargetMap) — quality-only;
    // *_EDIT/*_DELETE are base paths; caller appends /${id}
    WEAVING_TARGET_MAP_SETUP: `${API_URL}/weavingTargetMap/target_map_setup`,
    WEAVING_TARGET_MAP_LIST: `${API_URL}/weavingTargetMap/target_map_list`,
    WEAVING_TARGET_MAP_CREATE: `${API_URL}/weavingTargetMap/target_map_create`,
    WEAVING_TARGET_MAP_EDIT: `${API_URL}/weavingTargetMap/target_map_edit`,
    WEAVING_TARGET_MAP_DELETE: `${API_URL}/weavingTargetMap/target_map_delete`,
    WEAVING_TARGET_MAP_GRID: `${API_URL}/weavingTargetMap/target_map_grid`,
    WEAVING_TARGET_MAP_BULK_SAVE: `${API_URL}/weavingTargetMap/target_map_bulk_save`,
    // Weaving Production Entry (router prefix /api/weavingProd) — WEAVING_ENTRY_EDIT/DELETE are
    // base paths; caller appends /${id}?co_id=...
    WEAVING_ENTRY_CREATE_SETUP: `${API_URL}/weavingProd/entry_create_setup`,
    WEAVING_ENTRIES_BY_DATE: `${API_URL}/weavingProd/entries_by_date`,
    // Light table-direct read for the entry grid: inputs + open_jugar + jpc only.
    WEAVING_ENTRY_INPUTS_BY_DATE: `${API_URL}/weavingProd/entry_inputs_by_date`,
    WEAVING_MACHINE_STANDARDS: `${API_URL}/weavingProd/machine_standards`,
    WEAVING_ENTRY_CREATE: `${API_URL}/weavingProd/entry_create`,
    WEAVING_ENTRY_EDIT: `${API_URL}/weavingProd/entry_edit`,
    WEAVING_ENTRY_DELETE: `${API_URL}/weavingProd/entry_delete`,
    WEAVING_PLANNING_GRID: `${API_URL}/weavingProd/planning_grid`,
    WEAVING_PLANNING_GRID_SAVE: `${API_URL}/weavingProd/planning_grid_save`,
    // Loom -> Quality map (router prefix /api/weavingProd)
    WEAVING_QUALITY_MAP_GET: `${API_URL}/weavingProd/quality_map_get`,
    // Cheap saved-mapping-only read (no carry-forward) — used by the entry grid.
    WEAVING_QUALITY_MAP_SAVED: `${API_URL}/weavingProd/quality_map_saved`,
    WEAVING_QUALITY_MAP_SAVE: `${API_URL}/weavingProd/quality_map_save`,
    WEAVING_QUALITY_MAP_MAPPED: `${API_URL}/weavingProd/quality_map_mapped`,
    // Beam-change tab (router prefix /api/weavingProd)
    WEAVING_BEAM_MAP_GET: `${API_URL}/weavingProd/beam_map_get`,
    WEAVING_BEAM_MAP_SAVE: `${API_URL}/weavingProd/beam_map_save`,
    WEAVING_ADJUSTMENT_GET: `${API_URL}/weavingProd/adjustment_get`,
    WEAVING_ADJUSTMENT_SAVE: `${API_URL}/weavingProd/adjustment_save`,
    // Process + lock (router prefix /api/weavingProd)
    WEAVING_PROCESS: `${API_URL}/weavingProd/process`,
    WEAVING_PROCESS_STATUS: `${API_URL}/weavingProd/process_status`,
};

// Support tickets (Zendesk-style). Raised from Portal/Tenant Admin widgets,
// managed by the VOW team from the Control Desk. Backend prefix /api/supportTicket.
const apiRoutesSupport = {
    META: `${API_URL}/supportTicket/meta`,
    // Reporter side — Portal
    PORTAL_RAISE: `${API_URL}/supportTicket/portal/raise`,
    PORTAL_MY_TICKETS: `${API_URL}/supportTicket/portal/my-tickets`,
    PORTAL_TICKET: `${API_URL}/supportTicket/portal/ticket`, // append /{id} (and /{id}/attachment)
    PORTAL_COMMENT: `${API_URL}/supportTicket/portal/comment`,
    PORTAL_ATTACHMENT: `${API_URL}/supportTicket/portal/attachment`, // append /{id}
    // Reporter side — Tenant Admin
    ADMIN_RAISE: `${API_URL}/supportTicket/admin/raise`,
    ADMIN_MY_TICKETS: `${API_URL}/supportTicket/admin/my-tickets`,
    ADMIN_TICKET: `${API_URL}/supportTicket/admin/ticket`, // append /{id} (and /{id}/attachment)
    ADMIN_COMMENT: `${API_URL}/supportTicket/admin/comment`,
    ADMIN_ATTACHMENT: `${API_URL}/supportTicket/admin/attachment`, // append /{id}
    // VOW management — Control Desk
    MANAGE_LIST: `${API_URL}/supportTicket/manage/list`,
    MANAGE_STATS: `${API_URL}/supportTicket/manage/stats`,
    MANAGE_ASSIGNEES: `${API_URL}/supportTicket/manage/assignees`,
    MANAGE_TICKET: `${API_URL}/supportTicket/manage/ticket`, // append /{id} (and /{id}/attachment)
    MANAGE_ASSIGN: `${API_URL}/supportTicket/manage/assign`,
    MANAGE_TRANSITION: `${API_URL}/supportTicket/manage/transition`,
    MANAGE_COMMENT: `${API_URL}/supportTicket/manage/comment`,
    MANAGE_ATTACHMENT: `${API_URL}/supportTicket/manage/attachment`, // append /{id}
};

export { apiRoutes, apiRoutesconsole, apiRoutesPortalMasters, apiRoutesSupport };

// NEXT_PUBLIC_API_BASE_URL=/api