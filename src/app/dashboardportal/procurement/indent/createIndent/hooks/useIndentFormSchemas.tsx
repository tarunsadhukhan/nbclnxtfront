import React from "react";
import type { Schema, MuiFormMode, CustomFieldRenderProps } from "@/components/ui/muiform";
import type { Option } from "../types/indentTypes";
import { INDENT_TYPE_OPTIONS, OPEN_INDENT_ALLOWED_EXPENSE_IDS } from "../utils/indentConstants";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

type UseIndentFormSchemaParams = {
	mode: MuiFormMode;
	branchOptions: readonly Option[];
	expenseOptions: readonly Option[];
	projectOptions: readonly Option[];
	/** When true, indent_type and expense_type are disabled to prevent changes after line item entry */
	hasLineItemData?: boolean;
	/** Current indent type value — template selector is only enabled for "BOM" */
	indentTypeValue?: string;
	/** Existing indent title suggestions for the creatable autocomplete */
	indentTitles?: readonly string[];
	/** Called when the user selects an existing indent title (template reuse) */
	onIndentTitleSelect?: (title: string) => void;
};

/**
 * Generates the form schema for the Indent header form.
 */
export const useIndentFormSchema = ({
	mode,
	branchOptions,
	expenseOptions,
	projectOptions,
	hasLineItemData = false,
	indentTypeValue = "",
	indentTitles = [],
	onIndentTitleSelect,
}: UseIndentFormSchemaParams): Schema => {
	const isBOM = indentTypeValue === "BOM";
	return React.useMemo(
		() => ({
			fields: [
				{
					name: "branch",
					label: "Branch",
					type: "select",
					required: true,
					options: branchOptions as Option[],
					disabled: mode !== "create",
					grid: { xs: 12, md: 4 },
				},
				{
					name: "indent_type",
					label: "Indent Type",
					type: "select",
					required: true,
					options: INDENT_TYPE_OPTIONS as Option[],
					disabled: mode === "view" || hasLineItemData,
					helperText: hasLineItemData ? "Cannot change after line item entry" : undefined,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "expense_type",
					label: "Expense Type",
					type: "select",
					required: true,
					options: expenseOptions as Option[],
					disabled: mode === "view" || hasLineItemData,
					helperText: hasLineItemData ? "Cannot change after line item entry" : undefined,
					customValidate: (value: unknown, values: Record<string, unknown>) => {
						const indentType = String(values.indent_type ?? "");
						if (indentType !== "Open") return null;
						const expense = String(value ?? "");
						if (!expense) return "Required";
						return OPEN_INDENT_ALLOWED_EXPENSE_IDS.has(expense)
							? null
							: "Select expense type 3, 5, or 6 for Open indents";
					},
					grid: { xs: 12, md: 4 },
				},
				{
					name: "date",
					label: "Indent Date",
					type: "date",
					required: true,
					grid: { xs: 12, md: 6 },
				},
				{
					name: "indent_no",
					label: "Indent No",
					type: "text",
					disabled: true,
					helperText: "Generated after the indent is created",
					grid: { xs: 12, md: 6 },
				},
				{
					name: "project",
					label: "Project",
					type: "select",
					options: projectOptions as Option[],
					grid: { xs: 12, md: 6 },
				},
				{
					name: "requester",
					label: "",
					type: "custom" as const,
					grid: { xs: 12, md: 6 },
					render: ({ value, onChange, disabled }: CustomFieldRenderProps) => {
						const strVal = typeof value === "string" ? value : "";
						const fieldDisabled = disabled || !isBOM;
						return (
							<Autocomplete
								freeSolo
								size="small"
								options={isBOM ? (indentTitles as string[]) : []}
								value={strVal}
								inputValue={strVal}
								disabled={fieldDisabled}
								onChange={(_event: unknown, newValue: string | null) => {
									if (!isBOM) return;
									const selected = typeof newValue === "string" ? newValue : "";
									onChange(selected);
									if (selected && (indentTitles as string[]).includes(selected) && onIndentTitleSelect) {
										onIndentTitleSelect(selected);
									}
								}}
								onInputChange={(_event: unknown, newInput: string, reason: string) => {
									if (!isBOM) return;
									if (reason === "input" || reason === "reset") onChange(newInput);
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Indent Name"
										placeholder={isBOM ? "Type a new name or select an existing one" : "Available for BOM indent type only"}
										fullWidth
										size="small"
									/>
								)}
							/>
						);
					},
				},
				{
					name: "remarks",
					label: "Remarks",
					type: "textarea",
					grid: { xs: 12 },
					minRows: 1,
					maxRows: 4,
				},
			],
		}),
		[branchOptions, mode, expenseOptions, projectOptions, hasLineItemData, isBOM, indentTitles, onIndentTitleSelect]
	);
};
