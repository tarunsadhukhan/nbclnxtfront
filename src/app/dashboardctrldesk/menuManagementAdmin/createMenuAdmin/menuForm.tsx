"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  OutlinedInput,
  Checkbox,
  ListItemText
} from "@mui/material";
import { GridColDef } from '@mui/x-data-grid';
import { PencilIcon } from '@heroicons/react/solid';
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesconsole } from "@/utils/api";

interface menuFormData {
  menu_id: string | null;
  menu_name: string | null;
  parent_id: string | null;
  parent_name: string | null;
  active: string | null;
  module_id: string | null;
  module_name: string | null;
  menu_icon: string | null;
  menu_path: string | null;
  menu_type_id: string | null;
  menu_type_name: string | null;
  order_by: string | null;
}

interface menuFormProps {
  initialValues?: Partial<menuFormData> | null;
  allModules: any[];
  allparentnames: any[]; // Added this property
  menutypes: any[]; // Added this property
  onSubmit: (data: menuFormData) => void;
  loading: boolean;
  isEdit: boolean;
}

const validateMenuName = async (menuName: string | null, menuId: string | null) => {
  if (!menuName) return "Menu Name is required";
  if  (!menuId) menuId = "0";

  try {
    const response = await fetchWithCookie(
      `${apiRoutesconsole.GET_PORTAL_MENU_NAME}/${menuName}/${menuId}`,
      "GET"
    );
    console.log("Full response from menu name validation:", response, response.data.data);
    if (response && response.data) {
      if (response.data.data.isDuplicate) {
        return "Menu Name already exists";
      }
    } else {
      console.error("Unexpected response structure:", response);
      return "Error validating menu name";
    }
  } catch (error) {
    console.error("Error validating menu name:", error);
    return "Error validating menu name";
  }
};

const MenuForm: React.FC<menuFormProps> = ({
  initialValues,
  allModules,
  allparentnames,
  menutypes,
  onSubmit,
  loading,
  isEdit,
}) => {
  console.log("Rendering MenuForm component");
  console.log("initialValues:", initialValues);
  console.log("allModules:", allModules);
  console.log("allparentnames:", allparentnames);
  console.log("menutypes:", menutypes);

  const methods = useForm<menuFormData>({
    defaultValues: {
      menu_id: "",
      menu_name: "",
      parent_id: "",
      parent_name: "",
      active: "1", // Set default value for active to 1
      module_id: "",
      module_name: "",
      menu_icon: "",
      menu_path: "",
      menu_type_id: "",
      menu_type_name: "",
      order_by: "",
    },
  });

  const { handleSubmit, watch, control, reset, setValue, getValues, setFocus } = methods;
  const watchedModule = watch("module_id");
  const router = useRouter();
   
  // States for filtered options
  const [filteredParentNames, setFilteredParentNames] = useState<any[]>([]);

  useEffect(() => {
    if (watchedModule || watchedModule === "") {
      console.log("watchedModule:", watchedModule);
      console.log(`Module selected: ${watchedModule}`);
      console.log("All parent names:", allparentnames);
      console.log("All parent names length:", allparentnames.length,watchedModule );
      // Filter parent names for the selected module
      const filtered = allparentnames.filter((parent) =>
        parent.module_id === Number(watchedModule)
      );
      console.log("Filtered parent names:", filtered);
      // Set filtered parent names
      setFilteredParentNames(filtered);

      // Reset parent_id if the current value is not in the filtered list
      const currentParentId = getValues("menu_id");
      const isValidParent = filtered.some(
        (parent) => parent.menu_id.toString() === currentParentId
      );
      
      if (!isValidParent) {
        setValue("menu_id","");
      }
      console.log("Filtered parent names:", filtered, filteredParentNames, currentParentId);
    } else {
      setFilteredParentNames([]);
      setValue("menu_id", "");
    }
  }, [watchedModule, allparentnames, setValue, getValues]);

  useEffect(() => {
    if (initialValues) {
      reset(initialValues); // Update form values when initialValues change
    }
  }, [initialValues, reset]);

  const onSubmitHandler = (data: menuFormData) => {
    onSubmit(data);
  };

  const onError = (errors: any) => {
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setFocus(firstError as keyof menuFormData);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Card sx={{ p: 3, maxWidth: '600px', mx: 'auto', mt: 2 }}>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmitHandler, onError)} className="space-y-4">
            <Controller
              name="menu_name"
              control={methods.control}
              rules={{
                required: "Menu Name is required",
                validate: async (value) => {
                  const menuId = methods.getValues("menu_id"); // Get the current menu_id
                  return await validateMenuName(value, menuId);
                },
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Menu Name"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Menu Name"
                  error={!!error}
                  helperText={error?.message}
                  required
                  onBlur={() => {
                    methods.trigger("menu_name");
                  }}
                />
              )}
            />
            <Controller
              name="module_id"
              control={methods.control}
              rules={{ required: "Module is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error}>
                  <InputLabel>Module</InputLabel>
                  <Select {...field} label="Module">
                    {allModules.map((module) => (
                      <MenuItem key={module.con_module_id} value={module.con_module_id}>
                        {module.con_module_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />

            <Controller
              name="parent_id"
              control={methods.control}
              rules={{ required: "Parent Menu is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error}>
                  <InputLabel>Parent Menu</InputLabel>
                  <Select {...field} label="Parent Menu">
                    {filteredParentNames.map((parent) => (
                      <MenuItem key={parent.menu_id} value={parent.menu_id}>
                        {parent.menu_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />

            <Controller
              name="menu_type_id"
              control={methods.control}
              rules={{ required: "Menu Type is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error}>
                  <InputLabel>Menu Type</InputLabel>
                  <Select {...field} label="Menu Type">
                    {menutypes.map((type) => (
                      <MenuItem key={type.menu_type_id} value={type.menu_type_id}>
                        {type.menu_type}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />

            <Controller
              name="menu_path"
              control={methods.control}
              rules={{ required: "Menu Path is required" }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Menu Path"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Menu Path"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="menu_icon"
              control={methods.control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.ico"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = reader.result as string;
                          field.onChange(base64); // Save the base64 string as HTML in the database
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <FormHelperText>
                    Upload an icon (jpg, jpeg, png, ico)
                  </FormHelperText>
                </FormControl>
              )}
            />

            <Controller
              name="active"
              control={methods.control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select {...field} label="Status">
                    <MenuItem value="1">Active</MenuItem>
                    <MenuItem value="0">Inactive</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="order_by"
              control={methods.control}
              rules={{ required: "Order By is required" }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Order By"
                  type="number"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Order"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <div className="flex justify-end mt-4">
                <Button
                  variant="outlined"
                  className="button-normal button-normal:hover"
                  onClick={() => {
                    router.push("/dashboardctrldesk/menuManagementAdmin");
                  }}
                >
                  Cancel
                </Button>
              </div>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  backgroundColor: '#9BC837',
                  '&:hover': {
                    backgroundColor: '#8BB72E',
                  },
                }}
              >
                {isEdit ? 'Update Menu' : 'Create Menu'}
              </Button>
            </Box>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default MenuForm;