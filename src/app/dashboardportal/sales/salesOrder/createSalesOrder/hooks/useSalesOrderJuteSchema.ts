import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";
import type { Option } from "../types/salesOrderTypes";

export type UseSalesOrderJuteSchemaParams = {
	mukamOptions: Option[];
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
};

export const useSalesOrderJuteSchema = ({
	mukamOptions,
	mode,
	headerFieldsDisabled,
}: UseSalesOrderJuteSchemaParams): Schema =>
	React.useMemo(() => {
		const disabled = headerFieldsDisabled;
		const fields: Field[] = [
			{ name: "jute_mr_no", label: "MR No.", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "jute_mukam_id", label: "Mukam", type: "select", options: mukamOptions, disabled, grid: { xs: 12, md: 4 } },
			{ name: "jute_claim_amount", label: "Claim Amount", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "jute_claim_description", label: "Claim Description", type: "textarea", disabled, grid: { xs: 12 } },
		];
		return { fields } satisfies Schema;
	}, [mukamOptions, mode, headerFieldsDisabled]);
