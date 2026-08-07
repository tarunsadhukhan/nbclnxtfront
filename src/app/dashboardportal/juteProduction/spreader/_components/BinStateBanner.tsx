"use client";

import * as React from "react";
import { Alert, Box, Chip, Typography } from "@mui/material";
import type { BinState } from "../types/spreaderTypes";

type Props = {
	state: BinState | null;
	itemName?: string | null;
	loading?: boolean;
};

function formatDt(s: string | null | undefined) {
	if (!s) return "";
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return s;
	return d.toLocaleString();
}

export default function BinStateBanner({ state, itemName, loading }: Props) {
	if (loading) {
		return (
			<Alert severity="info" sx={{ mt: 1 }}>
				Checking bin state…
			</Alert>
		);
	}
	if (!state || state.active_grp == null) {
		return (
			<Alert severity="success" sx={{ mt: 1 }}>
				Bin is empty. A new group will be created for the next entry.
			</Alert>
		);
	}
	const win = state.window;
	const allowed = win?.allowed ?? true;
	return (
		<Alert
			severity={allowed ? "info" : "error"}
			sx={{ mt: 1 }}
			action={
				<Chip
					size="small"
					label={`Group #${state.active_grp}`}
					color={allowed ? "primary" : "error"}
					variant="outlined"
				/>
			}
		>
			<Box>
				<Typography variant="body2" sx={{ fontWeight: 600 }}>
					Open group locked to item: {itemName ?? `#${state.locked_item_id ?? "?"}`}
				</Typography>
				{win ? (
					<Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
						Window base {formatDt(win.base_dt)} → allowed until {formatDt(win.allowed_end_dt)}
						{!allowed && win.reason ? ` · ${win.reason}` : ""}
					</Typography>
				) : null}
			</Box>
		</Alert>
	);
}
