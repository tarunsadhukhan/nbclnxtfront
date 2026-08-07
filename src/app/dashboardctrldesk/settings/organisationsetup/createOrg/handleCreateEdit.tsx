"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesconsole } from "@/utils/api";
import OrgForm from "./orgForm";
import { Button } from "@/components/ui/button";

const HandleCreateEditOrg = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [statusAll, setStatusAll] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (orgId) {
        // Edit flow
        const { data } = await fetchWithCookie(`${apiRoutesconsole.GET_ORG_BY_ID}/${orgId}`);
        if (data) {
          setAllModules(data.allModules || []);
          setCountries(data.countries || []);
          setStates(data.states || []);
          setStatusAll(data.statusAll || []);
          
          // Find the state object first
          const stateId = data.data.con_org_state_id?.toString();
          const foundState = data.states.find((s: any) => s.state_id.toString() === stateId);
          
          // Get the country ID from the state
          const countryId = foundState ? foundState.country_id?.toString() : "";
          
          console.log("Loading org data - State ID:", stateId);
          console.log("Loading org data - Found state:", foundState);
          console.log("Loading org data - Country ID:", countryId);
          
          // Parse modules_selected if it's a JSON string
          let modulesSelected = data.selectedModules?.map((m: any) => m.module_id) || [];
          if (data.data.con_modules_selected && typeof data.data.con_modules_selected === 'string') {
            try {
              const parsed = JSON.parse(data.data.con_modules_selected);
              modulesSelected = parsed;
            } catch (e) {
              console.error("Error parsing modules:", e);
            }
          }
          
          const formValues = {
            con_org_name: data.data.con_org_name || "",
            con_org_shortname: data.data.con_org_shortname || "",
            con_org_contact_person: data.data.con_org_contact_person || "",
            con_org_email_id: data.data.con_org_email_id || "",
            con_org_mobile: data.data.con_org_mobile || "",
            con_org_address: data.data.con_org_address || "",
            con_org_pincode: data.data.con_org_pincode?.toString() || "",
            con_org_state_id: stateId || "",
            con_org_remarks: data.data.con_org_remarks || "",
            active: data.data.active?.toString() || "1",
            con_org_master_status: data.data.con_org_master_status?.toString() || "",
            con_modules_selected: modulesSelected,
            con_org_main_url: data.data.con_org_main_url || "",
            con_org_country_id: countryId,
          };
          
          console.log("Setting initial form values:", formValues);
          
          setInitialValues(formValues);
        }
      } else {
        // Create flow
        const { data } = await fetchWithCookie(apiRoutesconsole.CREATE_ORG_SETUP);
        if (data) {
          setAllModules(data.allModules || []);
          setCountries(data.countries || []);
          setStates(data.states || []);
          setStatusAll(data.statusAll || []);
          setInitialValues(null); // OrgForm will use its own default values
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [orgId]);

  const handleSubmit = useCallback(
    async (formData: any) => {
      const payload: any = {
        ...formData,
        con_org_pincode: formData.con_org_pincode ? Number(formData.con_org_pincode) : null,
        con_org_state_id: formData.con_org_state_id ? Number(formData.con_org_state_id) : null,
        con_org_master_status: formData.con_org_master_status ? Number(formData.con_org_master_status) : null,
        con_modules_selected: formData.con_modules_selected,
      };
      let apiUrl = "";
      if (orgId) {
        apiUrl = apiRoutesconsole.EDIT_ORG;
        payload["con_org_id"] = Number(orgId);
      } else {
        apiUrl = apiRoutesconsole.CREATE_ORG;
      }
      const { data, error } = await fetchWithCookie(apiUrl, "POST", payload);
      console.log("API response:", payload);
      if (!error) {
        router.push("/dashboardctrldesk/settings/organisationsetup");
      }
    },
    [orgId, router]
  );

  return (
    <main className="p-6">
    <h1 className="text-xl font-bold mb-4">
        {orgId ? 'Edit Organisation' : 'Create Organisation'}
    </h1>
    <OrgForm
      initialValues={initialValues}
      allModules={allModules}
      countries={countries}
      states={states}
      statusAll={statusAll}
      onSubmit={handleSubmit}
      loading={loading}
      isEdit={!!orgId}
    />
    <div className="flex justify-end mt-4">
      <Button
        variant="default"
        className="button-normal button-normal:hover"
        onClick={() => {
          router.push("/dashboardctrldesk/settings/organisationsetup");
        }}
      >
        Cancel
      </Button>
    </div>
    </main>
  );
};

export default HandleCreateEditOrg;
