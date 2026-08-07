"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesconsole } from "@/utils/api";
import MenuForm from "@/app/dashboardctrldesk/menuManagementAdmin/createMenuAdmin/menuForm";
import { Button } from "@/components/ui/button";
import Swal from 'sweetalert2';

// Define the menuFormData type
type menuFormData = {
  menu_id?: string | number | null;
  parent_id?: string | number | null;
  module_id?: string | number | null;
  menu_type_id?: string | number | null;
  order_by?: string | number | null;
  menu_name?: string | null;
  parent_name?: string | null;
  active?: string | number | null;
  module_name?: string | null;
  menu_icon?: string | null;
  menu_path?: string | null;
  menu_type_name?: string | null;
  
  [key: string]: any;
};

const HandleCreateEditCo = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coId = searchParams.get("coId");

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [parentNames, setParentNames] = useState<any[]>([]);
  const [menTypes, setMenuType] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      console.log("Fetching data for menu creation/editing...", coId);
      if (coId) {
        // Edit flow
        const { data, error } = await fetchWithCookie(`${apiRoutesconsole.GET_PORTAL_ALLMENU_CTRLDSK_ADMIN_BY_ID}/${coId}`);
        console.log("API response for editing menu----:", data);
        console.log("API parent data for editing menu----:", data.allparentnames);
        console.log("API module data for editing menu----:", data?.allModules); 
        console.log("API menu type data for editing menu----:", data?.menutypes);
        if (error || !data) {
          console.error("Error fetching menu details for editing:", error);
          setLoading(false);
          return;
        }

        if (data.data) {
          setAllModules(data.allModules || []);
          setParentNames(data.allparentnames || []);
          setMenuType(data.menutypes || []);

          console.log("Loading menu data:", data.data);
          console.log("Selected parent name:", data.allparentnames);

          const formValues = {
            menu_name: data.data?.menu_name || "",
            menu_id: data.data?.menu_id?.toString() || "",
            parent_id: data.data?.menu_parent_id?.toString() || "", // Corrected key
            module_id: data.data?.module_id?.toString() || "",
            menu_type_id: data.data?.menu_type_id?.toString() || "",
            order_by: data.data?.order_by?.toString() || "",
            menu_path: data.data?.menu_path || "",
            active: data.data?.active?.toString() || "",
            menu_icon: data.data?.menu_icon || null,
            
          };

          console.log("Setting initial form values:", formValues);

          setInitialValues(formValues);
        }
      } else {
        // Create flow
        const { data, error } = await fetchWithCookie(apiRoutesconsole.GET_PORTAL_ALLMENU_CTRLDSK_ADMIN);
        if (error || !data) {
          console.error("Error fetching data for creating menu:", error);
          setLoading(false);
          return;
        }
        console.log("API response for creating menu:", 'no data');
        if (data) {
          setAllModules(data.allModules || []);
          setParentNames(data.allparentnames || []);
          setMenuType(data.menutypes || []);
          setInitialValues(null); // CoForm will use its own default values
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [coId]);

  const handleSubmit = useCallback(
    async (formData: menuFormData) => {
      const payload: menuFormData = {
      //  ...formData,
        menu_id: formData.menu_id ? Number(formData.menu_id) : null,
        menu_name: formData.menu_name ? formData.menu_name : null,
        menu_path: formData.menu_path ? formData.menu_path : null,
        active: formData.active ? Number(formData.active) : null,
        menu_parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        module_id: formData.module_id ? Number(formData.module_id) : null,
        menu_type_id: formData.menu_type_id ? Number(formData.menu_type_id) : null,
        order_by: formData.order_by ? Number(formData.order_by) : null,
        menu_icon: formData.menu_icon ? formData.menu_icon : null,
      };

      let apiUrl = "";
      if (coId) {
        apiUrl = apiRoutesconsole.PORTAL_MENU_EDIT;
        payload.menu_id = Number(coId);
        console.log("Editing menu with ID:", payload);
      } else {
        console.log("Creating new menu:", payload.menu_icon?.length);
        apiUrl = apiRoutesconsole.PORTAL_MENU_CREATE;
        console.log("Creating new menu:", payload);
      }

      const { data, error } = await fetchWithCookie(apiUrl, "POST", payload);
      console.log("API response:", data);

      if (!error) {
        Swal.fire({
          title: 'Success!',
          text: data?.message || 'Operation completed successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          router.push("/dashboardctrldesk/menuManagementAdmin");
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: error || 'An error occurred.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    },
    [coId, router]
  );

  console.log("Rendering HandleCreateEditCo component");
  console.log("coId:", coId);
  console.log("initialValues:", initialValues);
  console.log("allModules:", allModules);
  console.log("parentNames:", parentNames);
  console.log("menTypes:", menTypes);

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4 sticky top-0 bg-white z-10">
        {coId ? 'Edit Menu' : 'Create Menu'}
      </h1>
      <div className="overflow-auto">
        <MenuForm
          initialValues={initialValues}
          allModules={allModules}
          allparentnames={parentNames}
          menutypes={menTypes}
          onSubmit={handleSubmit}
          loading={loading}
          isEdit={!!coId}
        />
      </div>
    </main>
  );
};

export default HandleCreateEditCo;
