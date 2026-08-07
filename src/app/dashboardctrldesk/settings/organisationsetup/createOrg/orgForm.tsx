"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import FormFieldWrapper from "@/components/ui/FormFieldWrapper";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrgFormData {
  con_org_name: string;
  con_org_shortname: string;
  con_org_contact_person: string;
  con_org_email_id: string;
  con_org_mobile: string;
  con_org_address: string;
  con_org_pincode: string;
  con_org_state_id: string;
  con_org_remarks: string;
  active: string;
  con_org_master_status: string;
  con_modules_selected: string[];
  con_org_main_url: string;
  con_org_country_id: string;
}

interface OrgFormProps {
  initialValues?: Partial<OrgFormData> | null;
  allModules: any[];
  countries: any[];
  states: any[];
  statusAll: any[];
  onSubmit: (data: OrgFormData) => void;
  loading: boolean;
  isEdit: boolean;
}

const OrgForm: React.FC<OrgFormProps> = ({
  initialValues,
  allModules,
  countries,
  states,
  statusAll,
  onSubmit,
  loading,
  isEdit,
}) => {
  const methods = useForm<OrgFormData>({
    defaultValues: {
      con_org_name: "",
      con_org_shortname: "",
      con_org_contact_person: "",
      con_org_email_id: "",
      con_org_mobile: "",
      con_org_address: "",
      con_org_pincode: "",
      con_org_state_id: "",
      con_org_remarks: "",
      active: "1",
      con_org_master_status: "",
      con_modules_selected: [],
      con_org_main_url: "",
      con_org_country_id: "",
    },
  });

  const { handleSubmit, watch, control, reset, setValue, getValues } = methods;
  const watchedCountry = watch("con_org_country_id");
  
  // Handle initial values loading
  useEffect(() => {
    if (initialValues && !loading) {
      console.log("Setting form values from initialValues:", initialValues);
      reset(initialValues);
    }
  }, [initialValues, reset, loading]);

  if (loading) return <div>Loading...</div>;

  return (
    <Card className="p-6 max-w-md mx-auto mt-10">
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormFieldWrapper
            name="con_org_name"
            control={control}
            label="Organization Name"
            required
            placeholder="Enter organization name"
          />
          <FormFieldWrapper
            name="con_org_shortname"
            control={control}
            label="Short Name"
            required
            placeholder="Enter short name"
          />
          <FormFieldWrapper
            name="con_org_contact_person"
            control={control}
            label="Contact Person"
            required
            placeholder="Enter contact person"
          />
          <FormFieldWrapper
            name="con_org_email_id"
            control={control}
            label="Email"
            type="email"
            required
            placeholder="Enter email"
          />
          <FormFieldWrapper
            name="con_org_mobile"
            control={control}
            label="Mobile"
            required
            placeholder="Enter mobile"
          />
          <FormFieldWrapper
            name="con_org_address"
            control={control}
            label="Address"
            required
            placeholder="Enter address"
          />
          <FormFieldWrapper
            name="con_org_pincode"
            control={control}
            label="Pincode"
            type="number"
            required
            placeholder="Enter pincode"
          />
          <FormFieldWrapper
            name="con_org_country_id"
            control={control}
            label="Country"
            type="select"
            required
            options={countries.map((c) => ({
              value: c.country_id.toString(),
              label: c.country_name,
            }))}
            placeholder="Select country"
          />
          <FormFieldWrapper
            name="con_org_state_id"
            control={control}
            label="State"
            required
            customInput={
              <Controller
                control={control}
                name="con_org_state_id"
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {states
                        .filter(s => !watchedCountry || s.country_id?.toString() === watchedCountry)
                        .map((s) => (
                        <SelectItem key={s.state_id} value={s.state_id.toString()}>
                          {s.state_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            }
          />
          <FormFieldWrapper
            name="con_org_master_status"
            control={control}
            label="Status"
            type="select"
            required
            options={statusAll.map((s) => ({
              value: s.con_status_id.toString(),
              label: s.con_status_name,
            }))}
            placeholder="Select status"
          />
          <FormFieldWrapper
            name="con_modules_selected"
            control={control}
            label="Modules"
            required
            customInput={
              <Controller
                control={control}
                name="con_modules_selected"
                render={({ field }) => (
                  <select
                    multiple
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(
                        Array.from(e.target.selectedOptions, (option) => option.value)
                      )
                    }
                    className="w-full border rounded p-2"
                  >
                    {allModules.map((m) => (
                      <option key={m.con_module_id} value={m.con_module_id.toString()}>
                        {m.con_module_name}
                      </option>
                    ))}
                  </select>
                )}
              />
            }
          />
          <FormFieldWrapper
            name="con_org_main_url"
            control={control}
            label="Main URL"
            required
            placeholder="Enter main URL"
          />
          <FormFieldWrapper
            name="con_org_remarks"
            control={control}
            label="Remarks"
            placeholder="Enter remarks"
          />
          <Button type="submit" className="button-normal button-normal:hover">
            {isEdit ? "Update" : "Create"} Organization</Button>
        </form>
      </Form>
    </FormProvider>
    </Card>
  );
};

export default OrgForm;
// className="bg-[#9BC837] hover:bg-[#8BB72E] text-white">