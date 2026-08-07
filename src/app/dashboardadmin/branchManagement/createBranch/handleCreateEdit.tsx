"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesconsole } from "@/utils/api";
import BranchForm from "./BranchForm";
import { Button } from "@/components/ui/button";

const HandleCreateEditBranch = () => {  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const companyId = searchParams.get("companyId");
  const companyName = searchParams.get("companyName");

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (branchId) {        // Edit flow
        const { data } = await fetchWithCookie(`${apiRoutesconsole.GET_BRANCH_BY_ID}/${branchId}`);
        if (data) {
          console.log("Edit branch data:", data);
          
          // If we have company ID and name from URL parameters, create a company object
          // This ensures the company is available even if the API doesn't return it
          let enhancedCompanies = data.company || [];
          if (companyId && companyName) {
            // Check if the company from URL is already in the list
            const companyExists = enhancedCompanies.some(
              (c: any) => c.co_id.toString() === companyId
            );
            
            // If not, add it to the list
            if (!companyExists) {
              enhancedCompanies = [
                ...enhancedCompanies,
                { co_id: Number(companyId), co_name: companyName }
              ];
            }
          }
          
          setCompanies(enhancedCompanies);
          setCountries(data.countries || []);
          setStates(data.states || []);
          
          // Find the selected objects based on IDs
          // Use companyId from URL if available, otherwise from API response
          const co_id = companyId ? Number(companyId) : data.data.co_id;
          const selectedCompany = enhancedCompanies.find((c: any) => c.co_id === co_id);
          const selectedCountry = data.countries?.find((c: any) => c.country_id === data.data.country_id);
          const selectedState = data.states?.find((s: any) => s.state_id === data.data.state_id);
            const formValues = {
            co_id: companyId || data.data.co_id?.toString() || "",
            branch_name: data.data.branch_name || "",
            branch_prefix: data.data.branch_prefix || "",
            branch_address1: data.data.branch_address1 || "",
            branch_address2: data.data.branch_address2 || "",
            branch_zipcode: data.data.branch_zipcode?.toString() || "",
            branch_email: data.data.branch_email || "",
            contact_no: data.data.contact_no || "",
            country_id: data.data.country_id?.toString() || "",
            state_id: data.data.state_id?.toString() || "",
            active: data.data.active === 1 || data.data.active === true
          };
          
          console.log("Setting initial form values:", formValues);
          setInitialValues(formValues);
        }
      } else {        // Create flow
        const { data } = await fetchWithCookie(apiRoutesconsole.CREATE_BRANCH_SETUP);
        if (data) {
          console.log("Create branch setup data:", data);

          // Map branches to their companies for validation
          const companyData = data.company || [];
          const branchesData = data.branches || [];

          // Add branches array to each company for validation purposes
          let enhancedCompanies = companyData.map((company: any) => {
            // Find all branches for this company
            const companyBranches = branchesData.filter((branch: any) => branch.co_id === company.co_id);
            return {
              ...company,
              branches: companyBranches
            };
          });

          // Defensive injection — mirror edit-flow pattern. If the company
          // from URL isn't in the setup response, append it so the dropdown
          // can still render the pre-selected value.
          if (companyId && companyName) {
            const exists = enhancedCompanies.some(
              (c: any) => c.co_id.toString() === companyId
            );
            if (!exists) {
              enhancedCompanies = [
                ...enhancedCompanies,
                { co_id: Number(companyId), co_name: companyName, branches: [] },
              ];
            }
          }

          console.log("Enhanced companies with branches:", enhancedCompanies);

          setCompanies(enhancedCompanies);
          setCountries(data.countries || []);
          setStates(data.states || []);

          if (companyId) {
            setInitialValues({
              co_id: companyId,
              branch_name: "",
              branch_prefix: "",
              branch_address1: "",
              branch_address2: "",
              branch_zipcode: "",
              branch_email: "",
              contact_no: "",
              country_id: "",
              state_id: "",
              active: true,
            });
          } else {
            setInitialValues(null); // BranchForm will use its own default values
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [branchId]);

  const handleSubmit = useCallback(
    async (formData: any) => {
      const payload: any = {
        ...formData,
        branch_zipcode: formData.branch_zipcode || "",
        co_id: formData.co_id ? Number(formData.co_id) : null,
        country_id: formData.country_id ? Number(formData.country_id) : null,
        state_id: formData.state_id ? Number(formData.state_id) : null,
        active: formData.active ? 1 : 0
      };
      
      let apiUrl = "";
      if (branchId) {
        apiUrl = apiRoutesconsole.EDIT_BRANCH;
        payload.branch_id = Number(branchId);
        console.log("Editing branch with ID:", branchId, payload);
      } else {
        apiUrl = apiRoutesconsole.CREATE_BRANCH;
        console.log("Creating new branch:", payload);
      }
      
      const { data, error } = await fetchWithCookie(apiUrl, "POST", payload);
      console.log("API response:", data);
      
      if (!error) {
        router.push("/dashboardadmin/branchManagement");
      }
    },
    [branchId, router]
  );

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">
        {branchId ? 'Edit Branch' : 'Create Branch'}
      </h1>
      <BranchForm
        initialValues={initialValues}
        companies={companies}
        countries={countries}
        states={states}
        onSubmit={handleSubmit}
        loading={loading}
        isEdit={!!branchId}
      />
      <div className="flex justify-end mt-4">
        <Button
          variant="default"
          className="button-normal button-normal:hover"
          onClick={() => {
            router.push("/dashboardadmin/branchManagement");
          }}
        >
          Cancel
        </Button>
      </div>
    </main>
  );
};

export default HandleCreateEditBranch;
