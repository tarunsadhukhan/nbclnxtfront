"use client";

import React from "react";

type SoExtensionData = {
	jute?: Record<string, unknown>;
	govtskg?: Record<string, unknown>;
	juteyarn?: Record<string, unknown>;
};

type Props = {
	soExtensionData?: SoExtensionData | null;
	invoiceTypeId?: string | null;
};

const LabelValue = ({ label, value }: { label: string; value?: string | number | null }) => {
	if (value == null || value === "") return null;
	return (
		<div style={{ display: "inline-block", minWidth: 200, marginRight: 24, marginBottom: 8 }}>
			<div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>{label}</div>
			<div style={{ fontSize: 14 }}>{String(value)}</div>
		</div>
	);
};

export const DOSalesOrderExtensionDisplay: React.FC<Props> = ({ soExtensionData, invoiceTypeId }) => {
	if (!soExtensionData || !invoiceTypeId) return null;

	const typeId = String(invoiceTypeId);

	// Invoice-type IDs (canonical, see backend constants.py INVOICE_TYPE_IDS):
	// 3 = Govt Sacking -> govtskg, 4 = Jute Yarn -> juteyarn, 5 = Raw Jute -> jute.
	// The backend (deliveryOrder.py get_delivery_order_by_id) keys soExtensionData
	// exactly this way, so each branch must pair the matching id + key.
	if (typeId === "5" && soExtensionData.jute) {
		const d = soExtensionData.jute;
		return (
			<div style={{ padding: "12px 16px", backgroundColor: "#f9f9f9", borderRadius: 4, marginBottom: 16, border: "1px solid #e0e0e0" }}>
				<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#555" }}>Jute Details (from Sales Order)</div>
				<LabelValue label="MR No." value={d.mr_no as string} />
				<LabelValue label="Mukam" value={d.mukam_name as string} />
				<LabelValue label="Claim Amount" value={d.claim_amount as number} />
				<LabelValue label="Claim Description" value={d.claim_description as string} />
			</div>
		);
	}

	if (typeId === "3" && soExtensionData.govtskg) {
		const d = soExtensionData.govtskg;
		return (
			<div style={{ padding: "12px 16px", backgroundColor: "#f9f9f9", borderRadius: 4, marginBottom: 16, border: "1px solid #e0e0e0" }}>
				<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#555" }}>Govt SKG Details (from Sales Order)</div>
				<LabelValue label="PCSO No." value={d.pcso_no as string} />
				<LabelValue label="PCSO Date" value={d.pcso_date as string} />
				<LabelValue label="Administrative Office" value={d.administrative_office_address as string} />
				<LabelValue label="Destination Rail Head" value={d.destination_rail_head as string} />
				<LabelValue label="Loading Point" value={d.loading_point as string} />
			</div>
		);
	}

	if (typeId === "4" && soExtensionData.juteyarn) {
		const d = soExtensionData.juteyarn;
		return (
			<div style={{ padding: "12px 16px", backgroundColor: "#f9f9f9", borderRadius: 4, marginBottom: 16, border: "1px solid #e0e0e0" }}>
				<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#555" }}>Jute Yarn Details (from Sales Order)</div>
				<LabelValue label="PCSO No." value={d.pcso_no as string} />
				<LabelValue label="Container No." value={d.container_no as string} />
				<LabelValue label="Customer Ref. No." value={d.customer_ref_no as string} />
			</div>
		);
	}

	return null;
};
