/**
 * @file MRApprovalDialog.tsx
 * @description Dialog for collecting MR date before final approval.
 * MR date is mandatory for final approval, and MR number will be auto-generated.
 */

import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Typography,
	Box,
	CircularProgress,
} from "@mui/material";

type MRApprovalDialogProps = {
	open: boolean;
	loading: boolean;
	onClose: () => void;
	onConfirm: (mrDate: string) => void;
	defaultDate?: string;
};

/**
 * Dialog for entering MR date before approval.
 * MR date is mandatory for final approval.
 */
export function MRApprovalDialog({
	open,
	loading,
	onClose,
	onConfirm,
	defaultDate,
}: MRApprovalDialogProps) {
	// Default to today's date if not provided
	const today = new Date().toISOString().slice(0, 10);
	const [mrDate, setMrDate] = React.useState(defaultDate || today);
	const [error, setError] = React.useState<string | null>(null);

	// Reset state when dialog opens
	React.useEffect(() => {
		if (open) {
			setMrDate(defaultDate || today);
			setError(null);
		}
	}, [open, defaultDate, today]);

	const handleConfirm = () => {
		if (!mrDate) {
			setError("MR Date is required for approval");
			return;
		}
		
		// Validate date format (YYYY-MM-DD)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(mrDate)) {
			setError("Invalid date format. Please use YYYY-MM-DD format.");
			return;
		}

		setError(null);
		onConfirm(mrDate);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !loading) {
			handleConfirm();
		}
	};

	return (
		<Dialog 
			open={open} 
			onClose={loading ? undefined : onClose}
			maxWidth="xs"
			fullWidth
		>
			<DialogTitle>Approve Material Receipt</DialogTitle>
			<DialogContent>
				<Box sx={{ pt: 1 }}>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Please enter the MR Date for approval. An MR Number will be automatically generated.
					</Typography>
					
					<TextField
						label="MR Date"
						type="date"
						value={mrDate}
						onChange={(e) => {
							setMrDate(e.target.value);
							setError(null);
						}}
						onKeyDown={handleKeyDown}
						fullWidth
						required
						error={!!error}
						helperText={error}
						disabled={loading}
						InputLabelProps={{
							shrink: true,
						}}
						inputProps={{
							max: today, // Don't allow future dates
						}}
						autoFocus
					/>
					
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
						MR Number will be generated based on branch and financial year.
					</Typography>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button 
					onClick={onClose} 
					disabled={loading}
					color="inherit"
				>
					Cancel
				</Button>
				<Button 
					onClick={handleConfirm} 
					disabled={loading || !mrDate}
					variant="contained"
					color="success"
					startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
				>
					{loading ? "Approving..." : "Approve"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default MRApprovalDialog;
