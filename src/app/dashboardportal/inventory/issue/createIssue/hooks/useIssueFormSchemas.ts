import React from "react";
import type { Schema, MuiFormMode } from "@/components/ui/muiform";
import type { Option } from "../types/issueTypes";

type UseIssueFormSchemaParams = {
	mode: MuiFormMode;
	branchOptions: readonly Option[];
	departmentOptions: readonly Option[];
	projectOptions: readonly Option[];
};

/**
 * Generates the form schema for the Issue header form.
 */
export const useIssueFormSchema = ({
	mode,
	branchOptions,
	departmentOptions,
	projectOptions,
}: UseIssueFormSchemaParams): Schema => {
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
					name: "department",
					label: "Department",
					type: "select",
					required: true,
					options: departmentOptions as Option[],
					grid: { xs: 12, md: 4 },
				},
				{
					name: "date",
					label: "Issue Date",
					type: "date",
					required: true,
					grid: { xs: 12, md: 4 },
				},
				{
					name: "issue_no",
					label: "Issue No",
					type: "text",
					disabled: true,
					helperText: "Generated after the issue is created",
					grid: { xs: 12, md: 4 },
				},
				{
					name: "project",
					label: "Project",
					type: "select",
					options: projectOptions as Option[],
					grid: { xs: 12, md: 4 },
				},
				{
					name: "issued_to",
					label: "Issued To",
					type: "text",
					grid: { xs: 12, md: 4 },
				},
				{
					name: "req_by",
					label: "Requested By",
					type: "text",
					grid: { xs: 12, md: 6 },
				},
				{
					name: "internal_note",
					label: "Internal Note",
					type: "textarea",
					grid: { xs: 12 },
					minRows: 1,
					maxRows: 4,
				},
			],
		}),
		[branchOptions, departmentOptions, mode, projectOptions]
	);
};
