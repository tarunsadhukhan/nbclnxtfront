"use client";

import * as React from "react";
import { Alert, Box, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "../../spinning/utils/spinningCalc";
import type { IdType, ValueRole } from "./_components/TargetGrid";
import TargetMapEditor, {
	ID_TYPE_LABELS,
	VALUE_ROLE_LABELS,
} from "./_components/TargetMapEditor";

// --- Header-bar options -----------------------------------------------------
// Actual entry now lives on the Spinning SQC page; this master keeps only the
// values you plan ahead of time: standard and target.

const ID_TYPE_OPTIONS: IdType[] = ["mcid", "qid"];
const VALUE_ROLE_OPTIONS: ValueRole[] = ["standard", "target"];

export default function SpngTargetMapPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedCompany, selectedBranches } = useSidebarContext();

	// Only branches the sidebar currently has selected, in company order.
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => selectedBranches.includes(b.branch_id)),
		[selectedCompany, selectedBranches]
	);
	const singleBranchId = branchOptions.length === 1 ? branchOptions[0].branch_id : null;

	// Header bar state.
	const [idType, setIdType] = React.useState<IdType | "">("");
	const [valueRole, setValueRole] = React.useState<ValueRole | "">("");
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());

	const ready = !!coId && !!idType && !!valueRole && !!effectiveDate;

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ mb: 2 }}>
				<Typography variant="h5" sx={{ fontWeight: 600 }}>
					Spinning Standards / Targets
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Standard and target values per machine or yarn, effective-dated. Pick a Type, Role and
					Effective Date, then edit values inline and Save. (Actuals are entered on the Spinning SQC
					page.)
				</Typography>
			</Box>

			{/* Header bar (always visible) */}
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
				<TextField
					select
					label="Type"
					size="small"
					value={idType}
					onChange={(e) => setIdType(e.target.value as IdType | "")}
					sx={{ minWidth: 160 }}
				>
					<MenuItem value="">
						<em>Select…</em>
					</MenuItem>
					{ID_TYPE_OPTIONS.map((t) => (
						<MenuItem key={t} value={t}>
							{ID_TYPE_LABELS[t]}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Role"
					size="small"
					value={valueRole}
					onChange={(e) => setValueRole(e.target.value as ValueRole | "")}
					sx={{ minWidth: 160 }}
				>
					<MenuItem value="">
						<em>Select…</em>
					</MenuItem>
					{VALUE_ROLE_OPTIONS.map((r) => (
						<MenuItem key={r} value={r}>
							{VALUE_ROLE_LABELS[r]}
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="date"
					label="Effective Date"
					size="small"
					value={effectiveDate}
					onChange={(e) => setEffectiveDate(e.target.value)}
					InputLabelProps={{ shrink: true }}
					sx={{ minWidth: 180 }}
				/>
			</Box>

			{!ready ? (
				<Alert severity="info">Select Type, Role and Effective Date to load the grid.</Alert>
			) : (
				<TargetMapEditor
					coId={coId}
					branchId={singleBranchId}
					idType={idType as IdType}
					valueRole={valueRole as ValueRole}
					effectiveDate={effectiveDate}
				/>
			)}
		</Box>
	);
}
