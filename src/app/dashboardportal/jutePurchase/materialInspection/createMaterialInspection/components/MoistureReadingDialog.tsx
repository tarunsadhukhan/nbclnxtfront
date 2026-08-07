/**
 * @file MoistureReadingDialog.tsx
 * @description Dialog for entering moisture readings for QC line items.
 * Allows adding multiple readings and calculates the average.
 */

import * as React from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	List,
	ListItem,
	ListItemText,
	TextField,
	Typography,
} from "@mui/material";
import { Droplets, Trash2 } from "lucide-react";

export type MoistureReadingDialogProps = {
	open: boolean;
	onClose: () => void;
	readings: number[];
	onChange: (readings: number[], average: number | null) => void;
	lineItemLabel?: string;
};

export function MoistureReadingDialog({
	open,
	onClose,
	readings,
	onChange,
	lineItemLabel,
}: MoistureReadingDialogProps) {
	const [inputValue, setInputValue] = React.useState("");

	const calculateAverage = React.useCallback((values: number[]): number | null => {
		if (!values.length) return null;
		const sum = values.reduce((acc, v) => acc + v, 0);
		return sum / values.length;
	}, []);

	const handleAdd = () => {
		const value = parseFloat(inputValue);
		if (Number.isNaN(value) || value < 0) return;
		const next = [...readings, value];
		onChange(next, calculateAverage(next));
		setInputValue("");
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAdd();
		}
	};

	const handleRemove = (index: number) => {
		const next = readings.filter((_, i) => i !== index);
		onChange(next, calculateAverage(next));
	};

	const average = calculateAverage(readings);

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
			<DialogTitle>
				Moisture Readings
				{lineItemLabel && (
					<Typography variant="body2" color="text.secondary">
						{lineItemLabel}
					</Typography>
				)}
			</DialogTitle>
			<DialogContent>
				<Box display="flex" gap={1} mt={1} mb={2}>
					<TextField
						label="Add Reading (%)"
						type="number"
						fullWidth
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyPress={handleKeyPress}
						inputProps={{ min: 0, max: 100, step: 0.01 }}
						autoFocus
					/>
					<Button variant="contained" onClick={handleAdd} disabled={!inputValue}>
						Add
					</Button>
				</Box>

				{readings.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No readings added yet. Enter moisture percentage values.
					</Typography>
				) : (
					<List dense>
						{readings.map((val, idx) => (
							<ListItem
								key={`reading-${idx}-${val}`}
								secondaryAction={
									<IconButton
										edge="end"
										aria-label="delete"
										onClick={() => handleRemove(idx)}
										size="small"
									>
										<Trash2 size={16} />
									</IconButton>
								}
							>
								<ListItemText primary={`${val.toFixed(2)} %`} />
							</ListItem>
						))}
					</List>
				)}

				<Box mt={2} p={1.5} bgcolor="grey.100" borderRadius={1}>
					<Typography variant="subtitle2">
						Average Moisture:{" "}
						<strong>
							{average !== null && !Number.isNaN(average) ? `${average.toFixed(2)} %` : "-"}
						</strong>
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Based on {readings.length} reading{readings.length !== 1 ? "s" : ""}
					</Typography>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} variant="contained">
					Done
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export type MoistureButtonProps = {
	onClick: () => void;
	hasReadings?: boolean;
	averageMoisture?: number | null;
	disabled?: boolean;
};

export function MoistureButton({
	onClick,
	hasReadings,
	averageMoisture,
	disabled,
}: MoistureButtonProps) {
	return (
		<Button
			variant={hasReadings ? "contained" : "outlined"}
			size="small"
			color={hasReadings ? "success" : "primary"}
			startIcon={<Droplets size={14} />}
			onClick={onClick}
			disabled={disabled}
			sx={{
				minWidth: 0,
				px: 1,
				py: 0.25,
				fontSize: "0.7rem",
			}}
		>
			{hasReadings && averageMoisture != null
				? `${averageMoisture.toFixed(1)}%`
				: "Add"}
		</Button>
	);
}
