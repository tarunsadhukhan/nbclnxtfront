"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Autocomplete,
  Checkbox,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import type { ApprovalLevelRow, UserOption } from "./types";
import { createEmptyRow } from "./types";

interface ApprovalLevelsTableProps {
  maxLevel: number;
  userOptions: UserOption[];
  data: ApprovalLevelRow[];
  onChange?: (rows: ApprovalLevelRow[]) => void;
}

const MAX_USERS_PER_LEVEL = 3;

export default function ApprovalLevelsTable({
  maxLevel,
  userOptions,
  data,
  onChange,
}: ApprovalLevelsTableProps) {
  // Normalize rows: ensure at least one row exists and a blank next-level
  // row is always available when the last level has users selected
  const rows = useMemo(() => {
    if (data.length === 0) {
      return [createEmptyRow(1)];
    }
    const lastRow = data[data.length - 1];
    if (lastRow.users.length > 0) {
      return [...data, createEmptyRow(lastRow.level + 1)];
    }
    return data;
  }, [data]);

  // Handle user selection change for a row
  const handleUserChange = useCallback(
    (rowIdx: number, selectedUserIds: string[]) => {
      const updated = rows.map((row, idx) =>
        idx === rowIdx
          ? { ...row, users: selectedUserIds.slice(0, MAX_USERS_PER_LEVEL) }
          : row
      );

      // Only add a new row if:
      // 1. This is the last row
      // 2. The user selected at least one user
      // 3. There isn't already a trailing empty row
      const isLastRow = rowIdx === rows.length - 1;
      const hasUsersNow = selectedUserIds.length > 0;
      const lastRowHasUsers = updated[updated.length - 1].users.length > 0;

      if (isLastRow && hasUsersNow && lastRowHasUsers) {
        const nextLevel = updated[updated.length - 1].level + 1;
        updated.push(createEmptyRow(nextLevel));
      }

      onChange?.(updated);
    },
    [rows, onChange]
  );

  // Handle input change for max values
  const handleInputChange = useCallback(
    (
      rowIdx: number,
      field: keyof Omit<ApprovalLevelRow, "level" | "users">,
      value: string
    ) => {
      // Only allow numeric input
      const numericValue = value.replace(/[^0-9.]/g, "");
      const updated = rows.map((row, idx) =>
        idx === rowIdx ? { ...row, [field]: numericValue } : row
      );
      onChange?.(updated);
    },
    [rows, onChange]
  );

  // Handle row deletion
  const handleDeleteRow = useCallback(
    (rowIdx: number) => {
      // Don't delete if it's the only row
      if (rows.length <= 1) {
        // Just clear the row instead
        onChange?.([createEmptyRow(1)]);
        return;
      }

      const updated = rows.filter((_, idx) => idx !== rowIdx);
      // Re-number the levels
      const renumbered = updated.map((row, idx) => ({
        ...row,
        level: idx + 1,
      }));
      onChange?.(renumbered);
    },
    [rows, onChange]
  );

  // Get user options as MUI Autocomplete format
  const userOptionsForAutocomplete = useMemo(
    () =>
      userOptions.map((u) => ({
        label: u.name,
        value: u.id,
      })),
    [userOptions]
  );

  // Check if row can be deleted (has at least one user or is not the only row)
  const canDeleteRow = useCallback(
    (rowIdx: number) => {
      return rows.length > 1 || rows[rowIdx].users.length > 0;
    },
    [rows]
  );

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Approval Levels Configuration
      </Typography>

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  backgroundColor: "#3ea6da",
                  color: "white",
                  fontWeight: 600,
                },
              }}
            >
              <TableCell width={80} align="center">
                Level
              </TableCell>
              <TableCell width={300}>Users (Max 3)</TableCell>
              <TableCell>Max Single Entry Value</TableCell>
              <TableCell>Max Day Entry Value</TableCell>
              <TableCell>Max Month Entry Value</TableCell>
              <TableCell width={60} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow
                key={`level-${row.level}-${rowIdx}`}
                sx={{
                  "&:hover": { backgroundColor: "action.hover" },
                  "& td": { py: 1.5 },
                }}
              >
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: "primary.main" }}
                  >
                    {row.level}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Autocomplete
                    multiple
                    size="small"
                    options={userOptionsForAutocomplete}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) =>
                      option.value === value.value
                    }
                    value={userOptionsForAutocomplete.filter((opt) =>
                      row.users.includes(opt.value)
                    )}
                    onChange={(_, newValue) => {
                      handleUserChange(
                        rowIdx,
                        newValue.map((v) => v.value)
                      );
                    }}
                    getOptionDisabled={() =>
                      row.users.length >= MAX_USERS_PER_LEVEL
                    }
                    disableCloseOnSelect
                    renderOption={(props, option, { selected }) => {
                      const { key, ...otherProps } = props;
                      const isDisabled =
                        !selected && row.users.length >= MAX_USERS_PER_LEVEL;
                      return (
                        <li
                          key={key}
                          {...otherProps}
                          style={{
                            opacity: isDisabled ? 0.5 : 1,
                            pointerEvents: isDisabled ? "none" : "auto",
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={selected}
                            disabled={isDisabled}
                            sx={{ mr: 1 }}
                          />
                          {option.label}
                        </li>
                      );
                    }}
                    renderTags={(selected, getTagProps) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((option, index) => {
                          const { key, ...tagProps } = getTagProps({ index });
                          return (
                            <Chip
                              key={key}
                              {...tagProps}
                              label={option.label}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={
                          row.users.length === 0 ? "Select users..." : ""
                        }
                        size="small"
                      />
                    )}
                    sx={{ minWidth: 250 }}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    value={row.maxSingle}
                    onChange={(e) =>
                      handleInputChange(rowIdx, "maxSingle", e.target.value)
                    }
                    placeholder="0.00"
                    type="text"
                    inputProps={{ inputMode: "decimal" }}
                    fullWidth
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    value={row.maxDay}
                    onChange={(e) =>
                      handleInputChange(rowIdx, "maxDay", e.target.value)
                    }
                    placeholder="0.00"
                    type="text"
                    inputProps={{ inputMode: "decimal" }}
                    fullWidth
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    value={row.maxMonth}
                    onChange={(e) =>
                      handleInputChange(rowIdx, "maxMonth", e.target.value)
                    }
                    placeholder="0.00"
                    type="text"
                    inputProps={{ inputMode: "decimal" }}
                    fullWidth
                  />
                </TableCell>

                <TableCell align="center">
                  {canDeleteRow(rowIdx) && (
                    <Tooltip title="Remove level">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteRow(rowIdx)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {userOptions.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, textAlign: "center" }}
        >
          No users available for this menu and branch combination.
        </Typography>
      )}
    </Box>
  );
}

export type { ApprovalLevelRow };
