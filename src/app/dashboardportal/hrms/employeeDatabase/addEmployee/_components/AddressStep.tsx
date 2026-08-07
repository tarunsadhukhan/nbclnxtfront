"use client";

import React, { useMemo, useCallback } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MuiForm, { type Schema, type Field } from "@/components/ui/muiform";
import type { AddressDetails } from "../../types/employeeTypes";
import type { useEmployeeSetup } from "../../hooks/useEmployeeSetup";

interface AddressStepProps {
  addresses: AddressDetails[];
  onAdd: (addr: AddressDetails) => void;
  onUpdate: (index: number, data: Partial<AddressDetails>) => void;
  onRemove: (index: number) => void;
  disabled: boolean;
  setup: ReturnType<typeof useEmployeeSetup>;
}

const ADDRESS_TYPE_OPTIONS = [
  { label: "Permanent", value: "1" },
  { label: "Current", value: "2" },
  { label: "Temporary", value: "3" },
];

const addressSchema: Schema = {
  fields: [
    { name: "address_type", label: "Address Type", type: "select", options: ADDRESS_TYPE_OPTIONS, required: true, grid: { xs: 12, sm: 4 } },
    { name: "address_line_1", label: "Address Line 1", type: "text", required: true, grid: { xs: 12, sm: 8 } },
    { name: "address_line_2", label: "Address Line 2", type: "text", grid: { xs: 12, sm: 6 } },
    { name: "city_name", label: "City", type: "text", grid: { xs: 12, sm: 6 } },
    { name: "pin_code", label: "PIN Code", type: "number", required: true, grid: { xs: 12, sm: 4 } },
    { name: "is_correspondent_address", label: "Correspondence Address", type: "checkbox", grid: { xs: 12, sm: 4 } },
  ] satisfies Field[],
};

function blankAddress(): AddressDetails {
  return {
    tbl_hrms_ed_contact_details_id: 0,
    eb_id: 0,
    address_type: 1,
    country_id: null,
    state_id: null,
    city_name: null,
    address_line_1: "",
    address_line_2: null,
    pin_code: 0,
    is_correspondent_address: 0,
  };
}

/** Isolated row component so initialValues stay referentially stable per address */
const AddressRow = React.memo(function AddressRow({
  addr,
  index,
  disabled,
  canRemove,
  onUpdate,
  onRemove,
}: {
  addr: AddressDetails;
  index: number;
  disabled: boolean;
  canRemove: boolean;
  onUpdate: (index: number, data: Partial<AddressDetails>) => void;
  onRemove: (index: number) => void;
}) {
  const initialValues = useMemo(
    () => ({
      address_type: String(addr.address_type),
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 ?? "",
      city_name: addr.city_name ?? "",
      pin_code: addr.pin_code || "",
      is_correspondent_address: addr.is_correspondent_address,
    }),
    [addr.address_type, addr.address_line_1, addr.address_line_2, addr.city_name, addr.pin_code, addr.is_correspondent_address],
  );

  const handleChange = useCallback(
    (vals: Record<string, unknown>) => onUpdate(index, vals as Partial<AddressDetails>),
    [onUpdate, index],
  );

  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);

  return (
    <Box className="relative rounded-md border p-4">
      <Box className="mb-2 flex items-center justify-between">
        <Typography variant="subtitle2">Address {index + 1}</Typography>
        {!disabled && canRemove && (
          <IconButton size="small" aria-label="Remove address" onClick={handleRemove}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </IconButton>
        )}
      </Box>
      <MuiForm
        schema={addressSchema}
        initialValues={initialValues}
        mode={disabled ? "view" : "edit"}
        onValuesChange={handleChange}
        hideModeToggle
        hideSubmit
      />
    </Box>
  );
});

export default function AddressStep({ addresses, onAdd, onUpdate, onRemove, disabled }: AddressStepProps) {
  const handleAdd = useCallback(() => onAdd(blankAddress()), [onAdd]);

  return (
    <Box className="flex flex-col gap-6">
      {addresses.map((addr, idx) => (
        <AddressRow
          key={idx}
          addr={addr}
          index={idx}
          disabled={disabled}
          canRemove={addresses.length > 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}

      {!disabled && (
        <Button variant="outline" className="self-start" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add Address
        </Button>
      )}

      {addresses.length === 0 && !disabled && (
        <Typography variant="body2" color="textSecondary" className="mt-2">
          No addresses yet. Click &quot;Add Address&quot; to start.
        </Typography>
      )}
    </Box>
  );
}
