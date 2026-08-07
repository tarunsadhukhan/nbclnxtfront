"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
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
  ListItemText,
  Alert,
} from "@mui/material";
import axios from "axios";
import { apiRoutesconsole } from "@/utils/api";

interface CoFormData {
  co_name: string;
  co_prefix: string;
  co_address1: string;
  co_address2: string;
  co_zipcode: string;
  country_id: string;
  state_id: string;
  co_cin_no: string;
  co_email_id: string;
  co_pan_no: string;
  alert_email_id: string;
}

interface CoFormProps {
  initialValues?: Partial<CoFormData> | null;
  allModules: any[];
  countries: any[];
  states: any[];
  alert_email_id: string[];
  onSubmit: (data: CoFormData) => void;
  loading: boolean;
  isEdit: boolean;
  coId?: string | null;
}

const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

const CoForm: React.FC<CoFormProps> = ({
  initialValues,
  allModules,
  countries,
  states,
  onSubmit,
  loading,
  isEdit,
  coId,
}) => {
  const methods = useForm<CoFormData>({
    defaultValues: {
      co_name: "",
      co_prefix: "",
      co_address1: "",
      co_address2: "",
      co_zipcode: "",
      country_id: "",
      state_id: "",
      co_cin_no: "",
      co_email_id: "",
      co_pan_no: "",
      alert_email_id: "",
    },
  });

  const { handleSubmit, watch, control, reset, setValue } = methods;
  const watchedCountry = watch("country_id");

  // States for filtered options
  const [filteredStates, setFilteredStates] = useState<any[]>([]);
  const prevCountryRef = useRef<string>("");

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing logo on edit
  useEffect(() => {
    if (isEdit && coId) {
      axios
        .get(`${apiRoutesconsole.GET_CO_LOGO}/${coId}`, { withCredentials: true })
        .then((res) => {
          const logo = res.data?.data?.co_logo;
          if (logo) setLogoPreview(logo);
        })
        .catch(() => {});
    }
  }, [isEdit, coId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Only JPEG and PNG images are allowed");
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError("File size must not exceed 2 MB");
      return;
    }

    if (!coId) {
      setLogoError("Please save the company first before uploading a logo");
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("co_id", coId);
      const res = await axios.post(apiRoutesconsole.UPLOAD_CO_LOGO, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogoPreview(res.data.co_logo);
    } catch (err: any) {
      setLogoError(err.response?.data?.detail || "Failed to upload logo");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoDelete = async () => {
    if (!coId) return;
    try {
      await axios.delete(`${apiRoutesconsole.DELETE_CO_LOGO}/${coId}`, {
        withCredentials: true,
      });
      setLogoPreview(null);
    } catch (err: any) {
      setLogoError(err.response?.data?.detail || "Failed to delete logo");
    }
  };
  
  // Effect to update states when country changes.
  // Only clear state_id when the user actually changes country — not on initial hydration.
  useEffect(() => {
    if (!watchedCountry) return;

    const filtered = states.filter(
      (state) => state.country_id.toString() === watchedCountry
    );
    setFilteredStates(filtered);

    if (prevCountryRef.current && prevCountryRef.current !== watchedCountry) {
      setValue("state_id", "");
    }
    prevCountryRef.current = watchedCountry;
  }, [watchedCountry, states, setValue]);

  // Handle initial values loading
  useEffect(() => {
    if (initialValues && !loading) {
      // Seed the prev-country ref so the watch effect treats this as hydration,
      // not a user-initiated change (prevents state_id from being wiped).
      prevCountryRef.current = initialValues.country_id || "";
      reset(initialValues);
    }
  }, [initialValues, reset, loading]);

  if (loading) return <CircularProgress />;

  return (
    <Card sx={{ p: 3, maxWidth: "600px", mx: "auto", mt: 2 }}>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="co_name"
              control={control}
              rules={{ required: "Company Name is required" }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Company Name"
                  fullWidth
                  margin="normal"
                  placeholder="Enter Company Name"
                  error={!!error}
                  helperText={error?.message}
                  required
                />
              )}
            />
            
            <Controller
              name="co_prefix"
              control={control}
              rules={{ required: "Prefix is required" }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Prefix"
                  fullWidth
                  margin="normal"
                  placeholder="Enter prefix"
                  error={!!error}
                  helperText={error?.message}
                  required
                />
              )}
            />
                        
            <Controller
              name="co_email_id"
              control={control}
              rules={{ 
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  placeholder="Enter email"
                  error={!!error}
                  helperText={error?.message}
                  required
                />
              )}
            />
            
            <Controller
              name="co_address1"
              control={control}
              rules={{ required: "Address is required" }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Address"
                  fullWidth
                  margin="normal"
                  placeholder="Enter address"
                  error={!!error}
                  helperText={error?.message}
                  required
                />
              )}
            />

            <Controller
              name="co_address2"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Address Line 2"
                  fullWidth
                  margin="normal"
                  placeholder="Address line 2"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />
            
            <Controller
              name="co_zipcode"
              control={control}
              rules={{ required: "Zipcode is required" }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Zipcode"
                  type="number"
                  fullWidth
                  margin="normal"
                  placeholder="Enter zipcode"
                  error={!!error}
                  helperText={error?.message}
                  required
                />
              )}
            />

            <Controller
              name="country_id"
              control={control}
              rules={{ required: "Country is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error} required>
                  <InputLabel>Country</InputLabel>
                  <Select
                    {...field}
                    label="Country"
                    value={field.value || ""}
                  >
                    {countries.map((c) => (
                      <MenuItem key={c.country_id} value={c.country_id.toString()}>
                        {c.country}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />
            
            <Controller
              name="state_id"
              control={control}
              rules={{ required: "State is required" }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth margin="normal" error={!!error} required>
                  <InputLabel>State</InputLabel>
                  <Select
                    {...field}
                    label="State"
                    value={field.value || ""}
                    disabled={!watchedCountry}
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                  >
                    {filteredStates.map((s) => (
                      <MenuItem key={s.state_id} value={s.state_id.toString()}>
                        {s.state}
                      </MenuItem>
                    ))}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />
            
            <Controller
              name="co_cin_no"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="CIN Number"
                  fullWidth
                  margin="normal"
                  placeholder="Enter CIN Number"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="co_pan_no"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="PAN Number"
                  fullWidth
                  margin="normal"
                  placeholder="Enter PAN Number"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="alert_email_id"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Alert Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  placeholder="Enter alert email"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />
            
            {/* Company Logo */}
            {isEdit && (
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Company Logo
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  JPEG or PNG, max 2 MB. Images larger than 500x500px will be resized automatically.
                </Typography>

                {logoPreview && (
                  <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      style={{ maxHeight: 80, maxWidth: 200, border: "1px solid #ddd", borderRadius: 4, padding: 4 }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={handleLogoDelete}
                    >
                      Remove
                    </Button>
                  </Box>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoUploading ? "Uploading..." : logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>

                {logoError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {logoError}
                  </Alert>
                )}
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  backgroundColor: '#9BC837',
                  '&:hover': {
                    backgroundColor: '#8BB72E',
                  }
                }}
              >
                {isEdit ? "Update" : "Create"} Company
              </Button>
            </Box>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default CoForm;