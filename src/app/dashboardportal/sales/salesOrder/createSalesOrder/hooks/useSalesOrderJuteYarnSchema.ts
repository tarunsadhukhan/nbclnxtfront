import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";

export type UseSalesOrderJuteYarnSchemaParams = {
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
};

export const useSalesOrderJuteYarnSchema = ({
	mode,
	headerFieldsDisabled,
}: UseSalesOrderJuteYarnSchemaParams): Schema =>
	React.useMemo(() => {
		const disabled = headerFieldsDisabled;
		const fields: Field[] = [
			{ name: "juteyarn_pcso_no", label: "PCSO No.", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "juteyarn_container_no", label: "Container No.", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "juteyarn_customer_ref_no", label: "Customer Ref. No.", type: "text", disabled, grid: { xs: 12, md: 4 } },
		];
		return { fields } satisfies Schema;
	}, [mode, headerFieldsDisabled]);
