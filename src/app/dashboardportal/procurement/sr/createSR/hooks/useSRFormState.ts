import * as React from "react";
import type { SRHeader } from "../types/srTypes";

/**
 * Editable inward-level fields exposed on the SR screen.
 * Dates are kept as 'YYYY-MM-DD' strings to match <input type="date"> values.
 * invoice_amount is a string so the input reflects what the user typed and we
 * parse to a number only on save.
 */
export type EditableSRHeader = {
	challan_no: string;
	challan_date: string;
	invoice_no: string;
	invoice_date: string;
	invoice_amount: string;
	invoice_recvd_date: string;
	vehicle_number: string;
	driver_name: string;
	driver_contact_no: string;
	inspection_date: string;
	consignment_no: string;
	consignment_date: string;
	ewaybillno: string;
	ewaybill_date: string;
	despatch_remarks: string;
	receipts_remarks: string;
};

const EMPTY_EDITABLE_HEADER: EditableSRHeader = {
	challan_no: "",
	challan_date: "",
	invoice_no: "",
	invoice_date: "",
	invoice_amount: "",
	invoice_recvd_date: "",
	vehicle_number: "",
	driver_name: "",
	driver_contact_no: "",
	inspection_date: "",
	consignment_no: "",
	consignment_date: "",
	ewaybillno: "",
	ewaybill_date: "",
	despatch_remarks: "",
	receipts_remarks: "",
};

// Dates can arrive with a time component (e.g. '2026-04-23T00:00:00') — trim to date input format.
const toDateInput = (value?: string): string => (value ? value.slice(0, 10) : "");

const buildEditableHeader = (header: SRHeader | null): EditableSRHeader => {
	if (!header) return { ...EMPTY_EDITABLE_HEADER };
	return {
		challan_no: header.challan_no ?? "",
		challan_date: toDateInput(header.challan_date),
		invoice_no: header.invoice_no ?? "",
		invoice_date: toDateInput(header.invoice_date),
		invoice_amount: header.invoice_amount ? String(header.invoice_amount) : "",
		invoice_recvd_date: toDateInput(header.invoice_recvd_date),
		vehicle_number: header.vehicle_number ?? "",
		driver_name: header.driver_name ?? "",
		driver_contact_no: header.driver_contact_no ?? "",
		inspection_date: toDateInput(header.inspection_date),
		consignment_no: header.consignment_no ?? "",
		consignment_date: toDateInput(header.consignment_date),
		ewaybillno: header.ewaybillno ?? "",
		ewaybill_date: toDateInput(header.ewaybill_date),
		despatch_remarks: header.despatch_remarks ?? "",
		receipts_remarks: header.receipts_remarks ?? "",
	};
};

type UseSRFormStateParams = {
	initialSRDate?: string;
	initialSRRemarks?: string;
};

type UseSRFormStateReturn = {
	srDate: string;
	setSRDate: React.Dispatch<React.SetStateAction<string>>;
	srRemarks: string;
	setSRRemarks: React.Dispatch<React.SetStateAction<string>>;
	editableHeader: EditableSRHeader;
	setEditableHeaderField: <K extends keyof EditableSRHeader>(
		field: K,
		value: EditableSRHeader[K],
	) => void;
	resetFormState: (header: SRHeader | null) => void;
};

/**
 * Manages SR form state: SR-owned fields (date, remarks) plus inward-level
 * corrections the SR preparer can override before approval.
 */
export const useSRFormState = ({
	initialSRDate,
	initialSRRemarks,
}: UseSRFormStateParams = {}): UseSRFormStateReturn => {
	const [srDate, setSRDate] = React.useState(
		initialSRDate || new Date().toISOString().slice(0, 10),
	);
	const [srRemarks, setSRRemarks] = React.useState(initialSRRemarks || "");
	const [editableHeader, setEditableHeader] = React.useState<EditableSRHeader>(
		{ ...EMPTY_EDITABLE_HEADER },
	);

	const setEditableHeaderField = React.useCallback(
		<K extends keyof EditableSRHeader>(field: K, value: EditableSRHeader[K]) => {
			setEditableHeader((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const resetFormState = React.useCallback((header: SRHeader | null) => {
		if (header?.sr_date) {
			setSRDate(header.sr_date.slice(0, 10));
		} else {
			setSRDate(new Date().toISOString().slice(0, 10));
		}
		setSRRemarks(header?.sr_remarks || "");
		setEditableHeader(buildEditableHeader(header));
	}, []);

	return {
		srDate,
		setSRDate,
		srRemarks,
		setSRRemarks,
		editableHeader,
		setEditableHeaderField,
		resetFormState,
	};
};
