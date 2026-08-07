"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesconsole } from "@/utils/api";
import CoForm from "@/app/dashboardadmin/companyManagement/createCompany/CoForm"
import { Button } from "@/components/ui/button";

const HandleCreateEditCo = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coId = searchParams.get("coId");

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (coId) {
        // Edit flow
        const { data } = await fetchWithCookie(`${apiRoutesconsole.GET_CO_BY_ID}/${coId}`);
        if (data) {
          setAllModules(data.allModules || []);
          setCountries(data.countries || []);
          setStates(data.states || []);
          
          // Find the country and state objects based on IDs
          const selectedCountry = data.countries?.find((c: any) => c.country_id === data.data.country_id);
          const selectedState = data.states?.find((s: any) => s.state_id === data.data.state_id);
          
          console.log("Loading company data:", data.data);
          
          const formValues = {
            co_name: data.data.co_name || "",
            co_prefix: data.data.co_prefix || "",
            co_address1: data.data.co_address1 || "",
            co_address2: data.data.co_address2 || "",
            co_zipcode: data.data.co_zipcode?.toString() || "",
            country_id: data.data.country_id?.toString() || "",
            state_id: data.data.state_id?.toString() || "",
            co_cin_no: data.data.co_cin_no || "",
            co_email_id: data.data.co_email_id || "",
            co_pan_no: data.data.co_pan_no || "",
            alert_email_id: data.data.alert_email_id || "",
          };
          
          console.log("Setting initial form values:", formValues);
          
          setInitialValues(formValues);
        }
      } else {
        // Create flow
        const { data } = await fetchWithCookie(apiRoutesconsole.CREATE_CO_SETUP);
        if (data) {
          setAllModules(data.allModules || []);
          setCountries(data.countries || []);
          setStates(data.states || []);
          
          setInitialValues(null); // CoForm will use its own default values
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [coId]);

  const handleSubmit = useCallback(
    async (formData: any) => {
      const payload: any = {
        ...formData,
        co_zipcode: formData.co_zipcode ? Number(formData.co_zipcode) : "",
        country_id: formData.country_id ? Number(formData.country_id) : null,
        state_id: formData.state_id ? Number(formData.state_id) : null,
      };
      
      let apiUrl = "";
      if (coId) {
        apiUrl = apiRoutesconsole.EDIT_CO;
        payload.co_id = coId; // Add co_id to the payload for editing
        console.log("Editing company with ID:", payload);
      } else {
        apiUrl = apiRoutesconsole.CREATE_CO;
        // console.log("Creating new company:", payload);
      }
      
      const { data, error } = await fetchWithCookie(apiUrl, "POST", payload);
      console.log("API response:", data);
      
      if (!error) {
        router.push("/dashboardadmin/companyManagement");
      }
    },
    [coId, router]
  );

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">
        {coId ? 'Edit Company' : 'Create Company'}
      </h1>
      <CoForm
        initialValues={initialValues}
        allModules={allModules}
        countries={countries}
        states={states}
        alert_email_id={initialValues?.alert_email_id ?? []}
        onSubmit={handleSubmit}
        loading={loading}
        isEdit={!!coId}
        coId={coId}
      />
      <div className="flex justify-end mt-4">
        <Button
          variant="default"
          className="button-normal button-normal:hover"
          onClick={() => {
            router.push("/dashboardadmin/companyManagement");
          }}
        >
          Cancel
        </Button>
      </div>
    </main>
  );
};

export default HandleCreateEditCo;
