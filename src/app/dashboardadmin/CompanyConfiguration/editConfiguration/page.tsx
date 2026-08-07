"use client";

// Opt out of static prerendering because this page uses client-side navigation hooks
export const dynamic = 'force-dynamic';

import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
// useSearchParams and useRouter cause prerender-time issues; use browser APIs in a client effect instead
// to avoid Suspense requirements during build.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch, FormControlLabel, FormGroup } from '@mui/material';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";

type Currency = {
  currency_id: number;
  currency_prefix: string;
};

type CompanyData = {
  co_id: number;
  currency_id: number | null;
  india_gst: number;
  india_tds: number;
  india_tcs: number;
  back_date_allowable: number;
  indent_required: number;
  po_required: number;
  material_inspection: number;
  quotation_required: number;
  do_required: number;
  gst_linked: number;
};

type ApiResponse = {
  company: CompanyData;
  currencies: Currency[];
};

// For form state
type CompanyConfig = {
  coId: number;
  currency_id: number | null;
  india_gst: boolean;
  india_tds: boolean;
  india_tcs: boolean;
  back_date_allowable: boolean;
  indent_required: boolean;
  po_required: boolean;
  material_inspection: boolean;
  quotation_required: boolean;
  do_required: boolean;
  gst_linked: boolean;
};

export default function CompanyConfigEditPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  // read query params in effect (browser-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setCompanyId(sp.get("companyId"));
    setCompanyName(sp.get("companyName"));
  }, []);
    const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  
  const form = useForm<CompanyConfig>({
    defaultValues: {
      coId: Number(companyId),
      currency_id: null,
      india_gst: false,
      india_tds: false,
      india_tcs: false,
      back_date_allowable: false,
      indent_required: false,
      po_required: false,
      material_inspection: false,
      quotation_required: false,
      do_required: false,
      gst_linked: false,
    }
  });
    // Fetch company configuration when the component mounts
  // Expected API response format:
  // {
  //   company: {
  //     co_id: number,
  //     currency_id: number | null,
  //     india_gst: number, (0 or 1)
  //     ... other boolean fields as 0/1
  //   },
  //   currencies: [
  //     { currency_id: number, currency_prefix: string },
  //     ...
  //   ]
  // }
  useEffect(() => {
    if (!companyId) return;
    fetchCompanyConfig();
  }, [companyId]);
    const fetchCompanyConfig = async () => {
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        co_id: companyId as string,
      });
      
      const { data, error } = await fetchWithCookie(
        `${apiRoutesconsole.CO_CONFIG}?${queryParams.toString()}`,
        "GET"
      );
      
      if (error) {
        throw new Error(error);
      }
      
      if (data) {
        // Set the currencies from the API response
        setCurrencies(data.currencies || []);
        
        // Map the API response to our form values
        const companyData = data.company;
        
        if (companyData) {
          form.reset({
            coId: Number(companyId),
            currency_id: companyData.currency_id,
            india_gst: Boolean(companyData.india_gst),
            india_tds: Boolean(companyData.india_tds),
            india_tcs: Boolean(companyData.india_tcs),
            back_date_allowable: Boolean(companyData.back_date_allowable),
            indent_required: Boolean(companyData.indent_required),
            po_required: Boolean(companyData.po_required),
            material_inspection: Boolean(companyData.material_inspection),
            quotation_required: Boolean(companyData.quotation_required),
            do_required: Boolean(companyData.do_required),
            gst_linked: Boolean(companyData.gst_linked),
          });
        }
      }
      
    } catch (error) {
      console.error("Error fetching company configuration:", error);
      toast({
        title: "Error",
        description: "Failed to fetch company configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
    const handleSave = async (values: CompanyConfig) => {
  setSaving(true);
  try {
    const payload = {
      ...values,
      co_id: Number(companyId),
      // Convert boolean values to 0/1 for API
      india_gst: values.india_gst ? 1 : 0,
      india_tds: values.india_tds ? 1 : 0,
      india_tcs: values.india_tcs ? 1 : 0,
      back_date_allowable: values.back_date_allowable ? 1 : 0, 
      indent_required: values.indent_required ? 1 : 0,
      po_required: values.po_required ? 1 : 0,
      material_inspection: values.material_inspection ? 1 : 0,
      quotation_required: values.quotation_required ? 1 : 0,
      do_required: values.do_required ? 1 : 0,
      gst_linked: values.gst_linked ? 1 : 0
    };
    const { data, error } = await fetchWithCookie(
      apiRoutesconsole.EDIT_CO_CONFIG,
      "POST",
      payload
    );
    if (error) {
      throw new Error(error);
    }
    toast({
      title: "Success",
      description: "Company configuration saved successfully",
    });
  // use a full navigation as a fallback (safe in client-only interaction)
  window.location.href = '/dashboardadmin/CompanyConfiguration';
  } catch (error) {
    console.error("Error saving company configuration:", error);
    toast({
      title: "Error",
      description: "Failed to save company configuration",
      variant: "destructive",
    });
  } finally {
    setSaving(false);
  }
};
  const handleBack = () => {
  window.location.href = '/dashboardadmin/CompanyConfiguration';
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            Edit Configuration for {companyName || 'Company'}
          </h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            Company Configuration for {companyName ? decodeURIComponent(companyName) : "Company"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <span>Loading configuration...</span>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">                  {/* Currency Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="currency_id">Currency</Label>                    <Select
                      value={form.watch('currency_id')?.toString() || ''}
                      onValueChange={(value) => form.setValue('currency_id', value ? Number(value) : null)}
                      disabled={currencies.length === 0}
                    >                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={currencies.length ? "Select Currency" : "Loading currencies..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.currency_id} value={currency.currency_id.toString()}>
                            {currency.currency_prefix}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-6">
                  <h3 className="font-medium mb-4">Tax & Financial Settings</h3>
                  <FormGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* India GST */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('india_gst')}
                          onChange={(e) => form.setValue('india_gst', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="India GST"
                    />
                    
                    {/* India TDS */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('india_tds')}
                          onChange={(e) => form.setValue('india_tds', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="India TDS"
                    />
                    
                    {/* India TCS */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('india_tcs')}
                          onChange={(e) => form.setValue('india_tcs', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="India TCS"
                    />
                    
                    {/* GST Linked */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('gst_linked')}
                          onChange={(e) => form.setValue('gst_linked', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="GST Linked"
                    />
                  </FormGroup>
                </div>
                
                <div className="border-t pt-4 mt-6">
                  <h3 className="font-medium mb-4">Operational Settings</h3>
                  <FormGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Back Date Allowable */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('back_date_allowable')}
                          onChange={(e) => form.setValue('back_date_allowable', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="Back Date Allowable"
                    />
                    
                    {/* Indent Required */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('indent_required')}
                          onChange={(e) => form.setValue('indent_required', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="Indent Required"
                    />
                    
                    {/* PO Required */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('po_required')}
                          onChange={(e) => form.setValue('po_required', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="PO Required"
                    />
                    
                    {/* Material Inspection */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('material_inspection')}
                          onChange={(e) => form.setValue('material_inspection', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="Material Inspection"
                    />
                    
                    {/* Quotation Required */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('quotation_required')}
                          onChange={(e) => form.setValue('quotation_required', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="Quotation Required"
                    />
                    
                    {/* DO Required */}
                    <FormControlLabel                      control={
                        <Switch
                          checked={form.watch('do_required')}
                          onChange={(e) => form.setValue('do_required', e.target.checked)}
                          color="primary"
                          sx={{ 
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#3ea6da'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#3ea6da'
                            }
                          }}
                        />
                      }
                      label="DO Required"
                    />
                  </FormGroup>
                </div>
                
                <div className="flex justify-end gap-4">
                  <Button variant="outline" type="button" onClick={handleBack}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
