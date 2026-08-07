import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";

export type UseSalesOrderGovtskgSchemaParams = {
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
};

export const useSalesOrderGovtskgSchema = ({
	mode,
	headerFieldsDisabled,
}: UseSalesOrderGovtskgSchemaParams): Schema =>
	React.useMemo(() => {
		const disabled = headerFieldsDisabled;
		const fields: Field[] = [
			{ name: "govtskg_pcso_no", label: "PCSO No.", type: "text", required: true, disabled, grid: { xs: 12, md: 4 } },
			{ name: "govtskg_pcso_date", label: "PCSO Date", type: "date", required: true, disabled, grid: { xs: 12, md: 4 } },
			{ name: "govtskg_mode_of_transport", label: "Mode of Transport", type: "select", required: false, disabled, grid: { xs: 12, md: 4 }, options: [
				{ value: "CONCOR", label: "CONCOR" },
				{ value: "RAIL", label: "RAIL" },
				{ value: "ROAD", label: "ROAD" },
			] },
			{ name: "govtskg_rail_head", label: "Destination Rail Head", type: "text", required: false, disabled, grid: { xs: 12, md: 4 } },
			{ name: "govtskg_loading_point", label: "Loading Point", type: "text", required: false, disabled, grid: { xs: 12, md: 4 } },
			{ name: "govtskg_admin_office", label: "Destination", type: "text", required: false, disabled, grid: { xs: 12, md: 4 } },
		];
		return { fields } satisfies Schema;
	}, [mode, headerFieldsDisabled]);
