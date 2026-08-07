"use client";

import React from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import type { GovtSackingSourceDetail } from "../types/salesInvoiceTypes";

type Props = {
	source: GovtSackingSourceDetail;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
				{label}
			</Typography>
			<Typography variant="body2" sx={{ wordBreak: "break-word" }}>
				{value || "—"}
			</Typography>
		</div>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<Typography variant="overline" color="text.secondary" sx={{ display: "block", letterSpacing: 0.5, mt: 1 }}>
			{children}
		</Typography>
	);
}

export function GovtSackingSourcePreview({ source }: Props) {
	const { header, lines } = source;
	const firstLine = lines[0];

	return (
		<Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Source Govt Sacking Invoice (read-only — copied forward automatically)
			</Typography>
			<Divider sx={{ mb: 2 }} />

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field label="Buyer" value={header.party_name} />
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field
						label="Source Invoice No"
						value={`${header.invoice_no ?? "—"} (${header.invoice_date ?? "—"})`}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field label="Buyer Order No / Date" value={`${header.buyer_order_no ?? "—"} / ${header.buyer_order_date ?? "—"}`} />
				</Grid>

				<Grid size={{ xs: 12, md: 4 }}>
					<Field
						label="Sale No / Date"
						value={`${header.sales_order_no_formatted ?? header.sales_order_no ?? "—"} / ${header.sales_order_date ?? "—"}`}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field
						label="Delivery Order No / Date"
						value={`${header.delivery_order_no_formatted ?? header.delivery_order_no ?? "—"} / ${header.delivery_order_date ?? "—"}`}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field label="PCSO No / Date" value={`${header.pcso_no ?? "—"} / ${header.pcso_date ?? "—"}`} />
				</Grid>

				<Grid size={{ xs: 12 }}><SectionLabel>Billing &amp; Shipping (populated from source)</SectionLabel></Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<Field label="Billed To" value={header.billing_party_name ?? header.party_name} />
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>Address</Typography>
					<Typography variant="body2" sx={{ wordBreak: "break-word" }}>{header.billing_address ?? "—"}</Typography>
					{header.billing_gst_no ? (
						<Typography variant="caption" color="text.secondary">
							GSTIN: {header.billing_gst_no}
						</Typography>
					) : null}
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<Field label="Shipped To" value={header.shipping_party_name ?? header.party_name} />
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>Address</Typography>
					<Typography variant="body2" sx={{ wordBreak: "break-word" }}>{header.shipping_address ?? "—"}</Typography>
				</Grid>

				<Grid size={{ xs: 12 }}><SectionLabel>Transport / Dispatch</SectionLabel></Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field label="Transporter" value={header.transporter_name} />
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field label="Transporter State" value={header.transporter_state_name} />
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Field label="Transporter Doc No / Date" value={`${header.transporter_doc_no ?? "—"} / ${header.transporter_doc_date ?? "—"}`} />
				</Grid>
				<Grid size={{ xs: 12, md: 8 }}>
					<Field label="Transporter Address" value={header.transporter_address} />
				</Grid>
				<Grid size={{ xs: 6, md: 2 }}>
					<Field label="Vehicle No (default)" value={header.vehicle_no} />
				</Grid>
				<Grid size={{ xs: 6, md: 2 }}>
					<Field label="Container No (default)" value={header.container_no} />
				</Grid>

				<Grid size={{ xs: 12 }}><SectionLabel>Govt Sacking Details</SectionLabel></Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<Field label="Administrative Office Address" value={header.administrative_office_address} />
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<Field label="Destination Rail Head" value={header.destination_rail_head} />
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<Field label="Loading Point" value={header.loading_point} />
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<Field label="Mode of Transport" value={header.mode_of_transport} />
				</Grid>

				{firstLine ? (
					<>
						<Grid size={{ xs: 12 }}><SectionLabel>Source Line Item</SectionLabel></Grid>
						<Grid size={{ xs: 12, md: 6 }}>
							<Field label="Item" value={firstLine.item_name} />
						</Grid>
						<Grid size={{ xs: 6, md: 2 }}>
							<Field label="Qty" value={`${firstLine.quantity ?? "—"} ${firstLine.uom_name ?? ""}`.trim()} />
						</Grid>
						<Grid size={{ xs: 6, md: 2 }}>
							<Field label="HSN" value={firstLine.hsn_code} />
						</Grid>
						<Grid size={{ xs: 6, md: 2 }}>
							<Field label="Pack Sheet" value={firstLine.pack_sheet} />
						</Grid>
						<Grid size={{ xs: 6, md: 3 }}>
							<Field label="Net Weight" value={firstLine.net_weight} />
						</Grid>
						<Grid size={{ xs: 6, md: 3 }}>
							<Field label="Total Weight" value={firstLine.total_weight} />
						</Grid>
					</>
				) : null}
			</Grid>
		</Paper>
	);
}

export default GovtSackingSourcePreview;
