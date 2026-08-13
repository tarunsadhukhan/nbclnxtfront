"use client";

import { useEffect, useState } from "react";
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

interface CompanyScopeDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Company / branch switcher — the same picker that used to be step 2 of login,
 * now reachable any time from User Settings › Company Selection.
 *
 * Applying writes the scope straight to localStorage and reloads the portal, so
 * every page refetches under the new co_id/branch_id (same trick the context's
 * handleCompanyChange uses).
 */
export default function CompanyScopeDialog({ open, onClose }: CompanyScopeDialogProps) {
  const { companies, selectedCompany, selectedBranches } = useSidebarContext();
  const [coId, setCoId] = useState<number | null>(null);
  const [branchIds, setBranchIds] = useState<number[]>([]);

  // Re-seed from the live scope each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCoId(selectedCompany?.co_id ?? companies[0]?.co_id ?? null);
    setBranchIds(selectedBranches);
  }, [open, companies, selectedCompany, selectedBranches]);

  const pickedCo = companies.find((c) => c.co_id === coId) ?? null;
  const canApply = Boolean(pickedCo) && branchIds.length > 0;

  const apply = () => {
    if (!pickedCo || branchIds.length === 0) return;
    localStorage.setItem("sidebar_selectedCompany", JSON.stringify(pickedCo));
    localStorage.setItem("sidebar_selectedBranches", JSON.stringify(branchIds));
    window.location.href = "/dashboardportal";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Company Selection</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Autocomplete
          options={companies}
          value={pickedCo}
          onChange={(_, picked) => {
            setCoId(picked?.co_id ?? null);
            // Default to the company's first branch.
            setBranchIds(picked?.branches.length ? [picked.branches[0].branch_id] : []);
          }}
          getOptionLabel={(c) => c.co_name}
          isOptionEqualToValue={(o, v) => o.co_id === v.co_id}
          size="small"
          autoHighlight
          openOnFocus
          noOptionsText="No matching company"
          slotProps={{ listbox: { sx: { fontSize: 13 } } }}
          sx={{ mt: 1, "& .MuiInputBase-input": { fontSize: 13 } }}
          renderInput={(params) => <TextField {...params} label="Company" />}
        />

        {pickedCo?.branches.length === 1 ? (
          // Nothing to choose — show the branch plainly. (Autocomplete's own
          // readOnly leaves the clear/dropdown/delete controls live.)
          <TextField
            label="Branch"
            size="small"
            fullWidth
            value={pickedCo.branches[0].branch_name}
            slotProps={{ input: { readOnly: true } }}
            sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
          />
        ) : (
          <Autocomplete
            multiple
            disabled={!pickedCo}
            options={pickedCo?.branches ?? []}
            value={(pickedCo?.branches ?? []).filter((b) => branchIds.includes(b.branch_id))}
            onChange={(_, picked) => setBranchIds(picked.map((b) => b.branch_id))}
            getOptionLabel={(b) => b.branch_name}
            isOptionEqualToValue={(o, v) => o.branch_id === v.branch_id}
            size="small"
            autoHighlight
            openOnFocus
            noOptionsText="No matching branch"
            slotProps={{ listbox: { sx: { fontSize: 13 } } }}
            sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
            renderInput={(params) => (
              <TextField {...params} label="Branch" placeholder={pickedCo ? "Select branch(es)..." : "Select a company first"} />
            )}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={onClose}>Cancel</Button>
        <Button size="small" variant="contained" onClick={apply} disabled={!canApply}>Select</Button>
      </DialogActions>
    </Dialog>
  );
}
