"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle, Box } from "@mui/material";
import MuiForm, { Schema } from "@/components/ui/muiform";

interface TestSelectProps {
  open: boolean;
  onClose: () => void;
}

const TestSelect: React.FC<TestSelectProps> = ({ open, onClose }) => {
  const schema: Schema = {
    title: "Test Select",
    fields: [
      {
        name: "testSelect",
        label: "Test Select",
        type: "select",
        required: true,
        options: [
          { label: "Option 1", value: "opt1" },
          { label: "Option 2", value: "opt2" },
          { label: "Option 3", value: "opt3" },
        ],
        grid: { xs: 12 },
      },
    ],
  };

  const initialValues = {
    testSelect: "",
  };

  const handleFormSubmit = async (vals: Record<string, any>) => {
  void 0;
  onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Test Select</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <MuiForm
            schema={schema}
            initialValues={initialValues}
            mode="create"
            hideModeToggle
            onSubmit={handleFormSubmit}
            onCancel={onClose}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TestSelect;
