"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesconsole } from "@/utils/api";
//import BranchForm from "./BranchForm";
import DeptForm from "./DeptForm"; // Assuming you have a similar form for departments
import { Button } from "@/components/ui/button";
import Swal from 'sweetalert2';

const HandleCreateEditDept = () => {  const router = useRouter();
  const searchParams = useSearchParams();
  const deptId = searchParams.get("deptId");
  const branchId = searchParams.get("branchId");
  const branchName = searchParams.get("branchName");

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (deptId) {        // Edit flow
        const { data } = await fetchWithCookie(`${apiRoutesconsole.GET_DEPARTMENT_BY_ID}/${deptId}`);
        if (data) {
          console.log("Edit department data:", data);
          
          // If we have company ID and name from URL parameters, create a company object
          // This ensures the company is available even if the API doesn't return it
          let enhancedBranchs = data.company || [];
          if (branchId && branchName) {
            // Check if the company from URL is already in the list
            const branchExists = enhancedBranchs.some(
              (c: any) => c.co_id.toString() === branchId
            );
            
            // If not, add it to the list
            if (!branchExists) {
              enhancedBranchs = [
                ...enhancedBranchs,
                { co_id: Number(branchId), co_name: branchName }
              ];
            }
          }
          
          setBranches(enhancedBranchs);
           
          // Find the selected objects based on IDs
          // Use companyId from URL if available, otherwise from API response
          const branch_id = branchId ? Number(branchId) : data.data.branch_id;
          const selectedBranch = enhancedBranchs.find((c: any) => c.branch_id === branch_id);
            const formValues = {
            dept_id: data.data.dept_id?.toString() || "",
            co_id:  data.data.co_id?.toString() || "",
            branch_id: branchId || data.data.branch_id?.toString() || "",
            dept_desc: data.data.dept_desc || "",
            dept_code: data.data.dept_code || "",
            order_id: data.data.order_id?.toString() || "",
          };
          
          console.log("Setting initial form values:", formValues);
          setInitialValues(formValues); // Pass formValues to DeptForm
          setBranches(enhancedBranchs); // Ensure branches are set for dropdown population
        }
      } else {        // Create flow
        const { data } = await fetchWithCookie(apiRoutesconsole.CREATE_DEPARTMENT);
        if (data) {
          console.log("Create branch setup data:", data);
          
          // Map branches to their companies for validation
          const branchData = data.branch || [];
          const deptData = data.depts || [];
          // Add branches array to each company for validation purposes
          const enhancedBranchs = branchData.map((company: any) => {
            // Find all branches for this company
            const companyBranches = branchData.filter((branch: any) => branch.co_id === company.co_id);
            return {
              ...company,
              branches: companyBranches
            };
          });
          
          console.log("Enhanced companies with branches:", enhancedBranchs);
          
          setCompanies(enhancedBranchs);
          setInitialValues(null); // BranchForm will use its own default values
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
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        dept_desc: formData.dept_desc ? formData.dept_desc : null,
        dept_code: formData.dept_code ? formData.dept_code : null,
        order_id: formData.order_id ? formData.order_id : null,
      };
      console.log("Form submission payload:", payload); 
    //  alert(`Form submission payload: ${JSON.stringify(payload)}`);     
      let apiUrl = "";
      const locaload: any = {
        ...formData,
        co_id: formData.co_id ? Number(formData.co_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        dept_desc: formData.dept_desc ? formData.dept_desc : null,
        dept_code: formData.dept_code ? formData.dept_code : null,
        order_id: formData.order_id ? formData.order_id : null,
      };


      localStorage.setItem("deptData", JSON.stringify(payload));          

      if (deptId) {
        apiUrl = apiRoutesconsole.EDIT_DEPARTMENT;
        payload.branch_id = Number(branchId);
        console.log("Editing branch with ID:", branchId, payload);
      } else {
  
        apiUrl = apiRoutesconsole.CREATE_DEPARTMENT;
        console.log("Creating new branch:", payload);
      }
//            alert(`Form submission payload: ${JSON.stringify(payload)} apiUrl: ${apiUrl}`);     
      
      const { data, error } = await fetchWithCookie(apiUrl, "POST", payload);
      console.log("API response:", data);
  //   alert(`API response: ${JSON.stringify(data)}`);
      if (!error) {
        Swal.fire({
          title: 'Success!',
          text: data?.message || 'Department has been successfully saved.',
          icon: 'success',
          confirmButtonText: 'OK',
        
        }).then(() => {
          router.push("/dashboardadmin/deptManagement");
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: 'An error occurred while saving the department.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then(() => {
          router.push("/dashboardadmin/deptManagement");
        });;
      }
    },
    [branchId, router]
  );

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">
        {deptId ? 'Edit Department' : 'Create Department'}
      </h1>
      <DeptForm
        initialValues={initialValues}
    //    branches={branches}
        onSubmit={handleSubmit}
        loading={loading}
        isEdit={!!deptId}
      />
{/*       <div className="flex justify-end mt-4">
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
 */}    </main>
  );
};

export default HandleCreateEditDept;
