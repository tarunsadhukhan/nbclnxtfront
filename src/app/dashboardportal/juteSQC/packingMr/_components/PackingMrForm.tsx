"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	IconButton,
	MenuItem,
	Paper,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Plus as PlusIcon, Save as SaveIcon, X as XIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	PACKING_MR_READINGS,
	DEFAULT_QUALITY_GROUP,
	QUALITY_GROUPS,
	packingMrCreateSchema,
	type PackingMrCreatePayload,
	type PackingMrSetup,
	type QualityGroup,
} from "../types/packingMrTypes";
import { computePackingMrPreview } from "../utils/packingMrCalc";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: PackingMrSetup;
	onSaved: () => void;
};

const blankReadings = (): string[] => Array(PACKING_MR_READINGS).fill("");

/**
 * R-08-25 Packing MR% SINGLE quality-column entry form.
 *
 * One save = one (date, quality column): header (entry_date, quality_group,
 * optional cloth quality, optional construction_code) + EXACTLY 10 MR% readings.
 * A live average is shown; the server recomputes avg_mr and is AUTHORITATIVE.
 * After save the quality_group is kept and readings cleared so the operator can
 * quickly add the next quality column for the same date/group.
 */
export default function PackingMrForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [qualityGroup, setQualityGroup] = React.useState<QualityGroup>(DEFAULT_QUALITY_GROUP);
	const [itemId, setItemId] = React.useState<number | "">("");
	const [constructionCode, setConstructionCode] = React.useState("");
	const [readings, setReadings] = React.useState<string[]>(blankReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const itemById = React.useMemo(() => {
		const m = new Map<number, (typeof setup.qualities)[number]>();
		for (const c of setup.qualities) m.set(c.item_id, c);
		return m;
	}, [setup.qualities]);

	const preview = computePackingMrPreview(readings);

	const setReadingAt = React.useCallback((index: number, value: string) => {
		setReadings((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}, []);

	const addReading = React.useCallback(() => {
		setReadings((prev) => [...prev, ""]);
	}, []);

	// Remove one reading field; keep at least one so a column always has a slot.
	const removeReadingAt = React.useCallback((index: number) => {
		setReadings((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}, []);

	const resetForm = React.useCallback(() => {
		setItemId("");
		setConstructionCode("");
		setReadings(blankReadings());
		// Keep quality group so a run of same-group columns is fast.
	}, []);

	const handleSave = async () => {
		const selectedItem = itemId === "" ? undefined : itemById.get(Number(itemId));
		const candidate = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			quality_group: qualityGroup,
			item_id: itemId === "" ? undefined : Number(itemId),
			quality_label: selectedItem?.item_name || undefined,
			construction_code: constructionCode.trim() || undefined,
			// Blank reading "" must become NaN (not Number("")===0) so the schema's
			// finite/positive refine flags missing readings instead of silently sending 0.
			readings: readings.map((r) => (r.trim() === "" ? NaN : Number(r))),
		};

		const parsed = packingMrCreateSchema.safeParse(candidate);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Please complete every field.");
			return;
		}

		setSaving(true);
		setError(null);
		const body: PackingMrCreatePayload = parsed.data;
		const { error: err } = await fetchWithCookie<{
			data: { message: string; packing_mr_id: number };
		}>(apiRoutesPortalMasters.PACKING_MR_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Saved packing MR% quality column");
		resetForm();
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">
				Packing MR% quality column — MR% readings for one quality (add as many as needed)
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
					gap: 2,
				}}
			>
				<TextField
					select
					size="small"
					label="Quality group"
					value={qualityGroup}
					onChange={(e) => setQualityGroup(e.target.value as QualityGroup)}
					fullWidth
				>
					{QUALITY_GROUPS.map((g) => (
						<MenuItem key={g} value={g}>
							{g}
						</MenuItem>
					))}
				</TextField>

				<Autocomplete
					options={setup.qualities}
					getOptionLabel={(opt) => opt.item_name}
					renderOption={(props, opt) => (
						<li {...props} key={opt.item_id}>
							{opt.item_name}
							{opt.item_code ? ` (${opt.item_code})` : ""}
						</li>
					)}
					value={itemId === "" ? null : itemById.get(Number(itemId)) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
					size="small"
					renderInput={(params) => (
						<TextField {...params} label="Cloth quality" placeholder="Cloth quality (optional)" />
					)}
				/>

				<TextField
					size="small"
					label="Construction"
					value={constructionCode}
					onChange={(e) => setConstructionCode(e.target.value)}
					placeholder="Construction (optional)"
					fullWidth
				/>
			</Box>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" },
					gap: 2,
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={`mr-${i}`}
						type="number"
						size="small"
						label={`MR% ${i + 1}`}
						value={r}
						onChange={(e) => setReadingAt(i, e.target.value)}
						inputProps={{ step: "any", min: 0, "aria-label": `MR% reading ${i + 1}` }}
						InputProps={{
							endAdornment:
								readings.length > 1 ? (
									<IconButton
										size="small"
										edge="end"
										aria-label={`Remove MR% reading ${i + 1}`}
										onClick={() => removeReadingAt(i)}
										sx={{ mr: -0.5 }}
									>
										<XIcon size={14} />
									</IconButton>
								) : null,
						}}
					/>
				))}
			</Box>

			<Box>
				<Button
					size="small"
					variant="outlined"
					startIcon={<PlusIcon size={16} />}
					onClick={addReading}
					sx={{ minHeight: 40 }}
				>
					Add reading
				</Button>
			</Box>

			<Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Average MR%
					</Typography>
					<Typography variant="body1" fontWeight={600}>
						{preview.avgMr != null ? preview.avgMr.toFixed(1) : "—"}
					</Typography>
				</Box>
			</Box>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSave}
					disabled={saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Quality Column"}
				</Button>
			</Box>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Paper>
	);
}
