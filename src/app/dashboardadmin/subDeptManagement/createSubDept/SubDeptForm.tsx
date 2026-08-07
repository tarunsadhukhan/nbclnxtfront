"use client";

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { 
  TextField, 
  Button, 
  Card, 
  CardContent,
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  Switch,
  FormControlLabel
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";


type SubDept = {
  co_id: number;
  co_name: string;
  branch_id: number;
  branch_name: string;
  dept_id: string;
  dept_desc: string;
  dept_code: string;
  sub_dept_id: string;
  sub_dept_desc: string;
  sub_dept_code: string;
  order_no: string;
};

interface SubDeptFormData {
  co_id: string;  // Company ID
  co_name?: string;  // Optional for new branches
  branch_id?: string;  // Optional for new branches
  branch_name: string;
  dept_desc: string;
  dept_code: string;
  order_no: string;
  dept_id?: string; // Added to allow initialValues.dept_id
  sub_dept_id?: string; // Added to allow initialValues.sub_dept_id
  sub_dept_desc?: string; // Added to allow initialValues.sub_dept_desc
  sub_dept_code?: string; // Added to allow initialValues.sub_dept_code
}

interface SubDeptFormProps {
  initialValues?: Partial<SubDeptFormData> | null;
  onSubmit: (data: SubDeptFormData) => void;
  loading: boolean;
  isEdit: boolean;
}

const BranchForm: React.FC<SubDeptFormProps> = ({
  initialValues,
  onSubmit,
  loading,
  isEdit,
}) => {
  const methods = useForm<SubDeptFormData>({
    defaultValues: {
      dept_desc: "",
      dept_code: "",
      sub_dept_desc: "",
      sub_dept_code: "",
      order_no: "",
      branch_id: "",
    },
  });
  const router = useRouter();
  const { handleSubmit, watch, control, reset, setValue, getValues, formState: { errors }, setError, clearErrors } = methods;
  const watchedCompany = watch("co_id");
  const watchedBranchId = watch("branch_id");
  const watchedDepartment = watch("dept_desc");
  const [internalLoading, setInternalLoading] = useState(true);
  const [allDepartments, setAllDepartments] = useState<SubDept[]>([]);
  
  // States for filtered options
  const [filteredStates, setFilteredStates] = useState<any[]>([]);
  const [existingBranches, setExistingBranches] = useState<string[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);

  const [existingDepartments, setExistingDepartments] = useState<string[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<any[]>([]);


  // For debounced validation
  const [branchNameError, setBranchNameError] = useState<string | null>(null);
  const companyNameTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Add states for companies and branches
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // Function to check branch name uniqueness with debounce
  const checkCompanyNameUniqueness = useCallback((value: string) => {
    // Clear any previous timer
    if (companyNameTimerRef.current) {
      clearTimeout(companyNameTimerRef.current);
    }
    
    // If empty value or no company selected, don't validate
    if (!value || !watchedCompany) {
      setBranchNameError(null);
      return;
    }
    
    // In edit mode, if we're keeping the same branch name, don't validate
    if (isEdit && initialValues?.branch_name === value) {
      console.log("Edit mode: Using the same branch name, skipping validation");
      setBranchNameError(null);
      return;
    }
    
    console.log(`Starting 2-second timer for validating branch name: "${value}"`);
    
    // Set a new timer for 2 seconds
    companyNameTimerRef.current = setTimeout(() => {
      const lowercaseName = value.toLowerCase();
      console.log(`Validating branch name after 2 seconds: "${value}"`);
      console.log(`Company ID: ${watchedCompany}`);
      console.log(`Existing branch names: ${JSON.stringify(existingBranches)}`);
      
      // Check if the branch name exists for the selected company
      const exists = existingBranches.some((name) => name === lowercaseName);
      
      if (exists) {
        const errorMessage = `Branch name "${value}" already exists for this company`;
        console.log(`Validation failed: ${errorMessage}`);
        
        // Set error state
        setBranchNameError(errorMessage);
        setError("branch_name", { type: "manual", message: errorMessage });
        
        // Clear the branch name field
        console.log("Clearing branch name field");
        setValue("branch_name", "");
      } else {
        // Clear any previous error
        console.log(`Validation passed for branch name: "${value}"`);
        setBranchNameError(null);
        clearErrors("branch_name");
      }
    }, 2000); // 2 seconds delay
  }, [watchedCompany, existingBranches, isEdit, initialValues, setError, clearErrors, setValue]);
    // Effect to validate branch name uniqueness

    useEffect(() => {
    if (watchedCompany && companies) {
      console.log('Checking branches for company ID:', watchedCompany);
      // Find selected company
      const selectedCompany = companies.find(c => c.co_id.toString() === watchedCompany);
      
      if (selectedCompany && selectedCompany.branches) {
        console.log('Found company with branches:', selectedCompany);
        
        // Extract branch names from the selected company
        const branchNames = selectedCompany.branches.map((branch: any) => {
          return branch.branch_name.toLowerCase();
        }).filter((name: string) => name !== ''); // Filter out any empty strings
        
        console.log("Existing branch names for this company:", branchNames);
        setExistingBranches(branchNames);
      } else {
        console.log('No branches found for company ID:', watchedCompany);
        setExistingBranches([]);
      }
    }
  }, [watchedCompany, companies]);
  
  // Effect to trigger debounced branch name validation
  useEffect(() => {
    // Only validate if we have a branch name and company
    if (watchedBranchId && watchedCompany) {
      console.log(`Debounced validation will start for: "${watchedBranchId}" in 2 seconds`);
      checkCompanyNameUniqueness(watchedBranchId); // Corrected function name
    }

    // Cleanup the timer when component unmounts or when dependencies change
    return () => {
      if (companyNameTimerRef.current) {
        clearTimeout(companyNameTimerRef.current);
      }
    };
  }, [watchedBranchId, watchedCompany, checkCompanyNameUniqueness]);
  
  // Effect to filter cities when state changes
  
  // Handle initial values loading
   const validateBranchName = (value: string) => {
    if (!value) return "Branch Name is required";
    
    // In edit mode, if we're keeping the same branch name, it's valid
    if (isEdit && initialValues?.branch_name === value) {
      return true;
    }
    
    // If no company is selected yet, we can't validate branch uniqueness
    if (!watchedCompany) {
      return true;
    }
    
    // Check if branch name already exists in the selected company
    // First convert to lowercase for case-insensitive comparison
    const lowercaseName = value.toLowerCase();
    if (existingBranches.includes(lowercaseName)) {
      return `Branch name "${value}" already exists for this company`;
    }
    
    return true;
  };

  // Update validation logic to trigger on blur and display error messages dynamically
const validateSubDeptField = (field: 'dept_desc' | 'dept_code' | 'sub_dept_code' | 'sub_dept_desc' | 'order_no', value: string) => {
  
//  alert(isEdit)
  if (!isEdit ) {  
  console.log(`Starting validation for ${field} with value:`, value);
  const branchId = getValues('branch_id');
  console.log(`Validating ${field} for branch ID:`, branchId);
//alert('apped')

  if (!value) {
    const message = `${field === 'dept_desc' ? 'Department Name' : field === 'dept_code' ? 'Department Code' : field === 'sub_dept_desc' ? 'Sub Department Name' : field === 'sub_dept_code' ? 'Sub Department Code' : 'Order No'} is requiredssss`;
    console.log(message);
    return message;
  }


  if (!branchId) {
    console.log('Branch ID is not set, skipping duplicate check.');
    return true;
  }
 
  const isDuplicate = allDepartments.some((subdept) => {
//     alert(`allDepartments: ${JSON.stringify(allDepartments)}, this is ${value}`);
    if (field === 'sub_dept_desc') {
      return subdept.dept_desc === value && subdept.sub_dept_desc === value && subdept.branch_id.toString() === branchId;
    } else if (field === 'sub_dept_code') {
      return subdept.dept_code === value && subdept.sub_dept_code === value && subdept.branch_id.toString() === branchId;
    } else if (field === 'order_no') {
  //    alert(`value: ${value}, dept.order_id: ${dept.order_id}`)
      return subdept.order_no.toString() === value && subdept.branch_id.toString() === branchId;
    }
    return false;
  });



  //    alert(`Checking for duplicates in ${field}: ${value}, ${isDuplicate}, ${branchId}`);

  console.log(`Checking for duplicates in ${field}:`, value, isDuplicate);

  if (isDuplicate) {
    const duplicateMessage = `${field === 'sub_dept_desc' ? 'Sub Department Name' : field === 'sub_dept_code' ? 'Sub Department code' : field === 'dept_desc' ? 'Department Name' : field === 'dept_code' ? 'Department Code' : 'Order No'} "${value}" already exists for the selected branch`;
    console.log(duplicateMessage);
 //   alert(`duplicate: ${duplicateMessage}`);
    return duplicateMessage;
  }
  } else {
 // alert('edit')  
  console.log(`Starting validation for ${field} with value:`, value);   
  const branchId = getValues('branch_id');
  console.log(`Validating ${field} for branch ID:`, branchId);
//alert('apped')
 if (!value) {
    const message = `${field === 'sub_dept_desc' ? 'Sub Department Name' : field === 'sub_dept_code' ? ' Sub Department Code' :field === 'dept_desc' ? 'Department000 Name' : field === 'dept_code' ? 'Department Code' : 'Order ID'} is requiredssss`;
    console.log(message);
    return message;
  }


  if (!branchId) {
    console.log('Branch ID is not set, skipping duplicate check.');
    return true;
  }
 
  let isDuplicate = false; // Define isDuplicate in a consistent scope

  if (field === 'sub_dept_desc') {
    if ((initialValues?.sub_dept_desc ?? "") !== value) {
      console.log(`Comparing for duplicates in ${field}:`, value, initialValues?.dept_desc);
      isDuplicate = allDepartments.some((subdept) => {
        return subdept.dept_desc === value && subdept.sub_dept_desc === value && subdept.branch_id.toString() === branchId;
      });
      console.log(`After others Checking for duplicates in ${field}:`, value, isDuplicate, branchId);
    }
    console.log(`Others1 Checking for duplicates in ${field}:`, value, isDuplicate);
  } else
  if (field === 'dept_code' ) {

    if (field === 'dept_code' && (initialValues?.dept_code ?? "") !== value) {
      console.log(`Comparing for duplicates in ${field}:`, value, initialValues?.dept_code);    
      const isDuplicate = allDepartments.some((dept) => {
        if (field === 'dept_code') {
          return dept.dept_code === value && dept.branch_id.toString() === branchId;
        }
        return false;
      });
    } 
    console.log(`others Checking for duplicates in ${field}:`, value, isDuplicate);
  }
  else
  if (field === 'order_no' ) {

    if (field === 'order_no' && (initialValues?.order_no ?? "") !== value) {
    console.log(`Comparing for duplicates in ${field}:`, value,initialValues?.order_no);    
    const isDuplicate = allDepartments.some((dept) => {
      if (field === 'order_no') {
        return dept.order_no === value && dept.branch_id.toString() === branchId ;
      }
      return false;
    });
    } 
  console.log(`others Checking for duplicates in ${field}:`, value, isDuplicate);
  }

  if (isDuplicate) {
    const duplicateMessage = `${field === 'dept_desc' ? 'Department Name' : field === 'dept_code' ? 'Department Code' : 'Order ID'} "${value}" already exists for the selected branch`;
    console.log(duplicateMessage);
    return duplicateMessage;
  }


}
  console.log(`${field} validation passed.`);

  return true;
};

  // Fetch all branches and companies from API
  const fetchAllBranches = async () => {
    try {

        const { data, error } = await fetchWithCookie(
        `${apiRoutesconsole.GET_BRANCH_ALL}`,
        "GET"
      );
   //   const response = await fetch('/api/get_branch_all'); // Replace with actual API endpoint
   //   const data = await response.json();

      setAllBranches(data.data || []);

      // Extract unique companies from the branch data
      const uniqueCompanies = Array.from(
        new Map(
          data.data.map((branch: any) => [
            branch.co_id,
            { co_id: branch.co_id, co_name: branch.co_name }
          ])
        ).values()
      );

      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };


  const fetchAllDepartments = async () => {
    setInternalLoading(true);

    try {
      const { data, error } = await fetchWithCookie(
        `${apiRoutesconsole.GET_DEPARTMENT_ALL}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || 'Failed to fetch departments');
      }

      setAllDepartments(data.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setInternalLoading(false);
    }
  };
  


  // Add top-level debugging to ensure component renders
  console.log("SubDeptForm component rendered");
  console.log("Current watchedBranchId:", watchedBranchId);
  console.log("Current allDepartments:", allDepartments);

  // Effect to fetch data on component mount
  useEffect(() => {
    if (initialValues) {
      reset(initialValues); // Populate form fields with initial values
    }
  }, [initialValues, reset]);

  useEffect(() => {
    fetchAllBranches();
    fetchAllDepartments();
  }, []);

  useEffect(() => {
  console.log("Initial values:", initialValues,watchedCompany);
    if (watchedCompany) {
      const filtered = allBranches.filter(branch => branch.co_id.toString() === watchedCompany);
      setFilteredBranches(filtered);

      if (filtered.length > 0) {
        setValue("branch_id", initialValues?.branch_id || filtered[0].branch_id.toString());
      } else {
        setValue("branch_id", "");
      }
    } else {
      setFilteredBranches([]);
      setValue("branch_id", "");
    }
  }, [watchedCompany, allBranches, setValue, initialValues]);


console.log('wb',  watchedBranchId)

  // Ensure filteredDepartments updates correctly when branch changes
  useEffect(() => {
    console.log("Watched branch id:", watchedBranchId);
    if (watchedBranchId) {
      const filtered = allDepartments.filter(dept => dept.branch_id.toString() === watchedBranchId);
      setFilteredDepartments(filtered);

      if (filtered.length > 0) {
        setValue("dept_id", initialValues?.dept_id || filtered[0].dept_id.toString());
      } else {
        setValue("dept_id", "");
      }
    } else {
      setFilteredDepartments([]);
      setValue("dept_id", "");
    }
  }, [watchedBranchId, allDepartments, setValue, initialValues]);


// Debugging: Log filteredDepartments whenever it changes
useEffect(() => {
  console.log("Updated filteredDepartments:", filteredDepartments);
}, [filteredDepartments]);

  // Add debugging to ensure useEffect is triggered and logs are displayed

  if (internalLoading) return <CircularProgress />;

  return (
    <Card sx={{ p: 3, maxWidth: "600px", mx: "auto", mt: 2 }}>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="co_id"
              control={control}
              rules={{ required: "Company is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error} required>
                  <InputLabel>Company</InputLabel>
                  <Select
                    {...field}
                    label="Company"
                    value={field.value || ""}
                  >
                    {companies.map((company) => (
                      <MenuItem key={company.co_id} value={company.co_id.toString()}>
                        {company.co_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />              
            <Controller
              name="branch_id"
              control={control}
              rules={{ required: "Branch is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error} required>
                  <InputLabel>Branch</InputLabel>
                  <Select
                    {...field}
                    label="Branch"
                    value={field.value || ""}
                  >
                    {filteredBranches.map((branch) => (
                      <MenuItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.branch_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />              


            <FormControl fullWidth error={!!errors.dept_desc}>
              <InputLabel id="dept-desc-label">Department</InputLabel>
              <Controller
                name="dept_desc"
                control={control}
                rules={{
                  required: "Department is required",
                }}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="dept-desc-label"
                    label="Department"
                    onChange={(e) => {
                      field.onChange(e);
                      const selectedDept = filteredDepartments.find(
                        (dept) => dept.dept_desc === e.target.value
                      );
                      if (selectedDept) {
                        setValue("dept_code", selectedDept.dept_code);
                      }
                    }}
                  >
                    {filteredDepartments.map((dept) => (
                      <MenuItem key={dept.dept_id} value={dept.dept_desc}>
                        {dept.dept_desc}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.dept_desc?.message}</FormHelperText>
            </FormControl>
            

                         
            <Controller
              name="sub_dept_desc"
              control={control}
              rules={{ 
                required: "Sub Department Name is required",
                validate: (value: string | undefined): true | string => {
                  if (typeof value !== "string") return "Sub Department Name is required";
                  console.log('Validating dept_desc:', value);
                  const result = validateSubDeptField('dept_desc', value);
                  console.log('Validation result for dept_desc:', result);
                  return result === true ? true : result; // Ensure the error message is returned
                },
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Sub Department Name"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Sub Department Name"
                  error={!!error}
                  helperText={error?.message} // Display the error message
                  required
                  onBlur={() => {
                    if (!field.value) {
                      setError('dept_desc', { type: 'manual', message: 'Sub Department Name is required' });
                    } else {
                      clearErrors('dept_desc');
                    }
                  }}
                />
              )}
            />
            <Controller
              name="dept_code"
              control={control}
              rules={{ 
                required: "Department Code is required",
                validate: (value) => validateSubDeptField('dept_code', value),
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Department Code"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Department Code"
                  error={!!error}
                  helperText={error?.message}
                  required
                  onBlur={() => {
                    if (!field.value ) {
                      setError('dept_code', { type: 'manual', message: 'Department Code is required' });
                    } else {
                      clearErrors('dept_code');
                    }
                  }}
                />
              )}
            />
            
            <Controller
              name="order_no"
              control={control}
              rules={{ 
                required: "Department Code is required",
                validate: (value) => validateSubDeptField('order_no', value),
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Order By"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Dept Order to show"
                  error={!!error}
                  helperText={error?.message}
                  required
                  onBlur={() => {
                    if (!field.value ) {
                      setError('order_no', { type: 'manual', message: 'Department Order is required' });
                    } else {
                      clearErrors('order_no');
                    }
                  }}
                />
              )}
            />
            

            
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={!methods.formState.isValid}
                sx={{
                  backgroundColor: methods.formState.isValid ? '#9BC837' : '#d3d3d3',
                  '&:hover': {
                    backgroundColor: methods.formState.isValid ? '#8BB72E' : '#d3d3d3',
                  }
                }}
              >
                {isEdit ? "Update" : "Create"} DepartmentS
              </Button>

              <Button
                color="primary"
                sx={{
                  backgroundColor: '#9BC837',
                  '&:hover': {
                    backgroundColor: '#8BB72E',
                  }
                }}
                className="button-normal button-normal:hover"
                onClick={() => {
                  router.push("/dashboardadmin/deptManagement");
                }}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default BranchForm;