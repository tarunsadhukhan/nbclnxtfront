import React from "react";
import type {
	Option,
	DepartmentRecord,
	ProjectRecord,
	ExpenseRecord,
	CostFactorRecord,
	MachineRecord,
	IssueLabelResolvers,
} from "../types/issueTypes";
import {
	buildLabelMap,
	createLabelResolver,
} from "@/utils/labelUtils";

type UseIssueSelectOptionsParams = {
	departments: readonly DepartmentRecord[];
	projects: readonly ProjectRecord[];
	expenses: readonly ExpenseRecord[];
	costFactors: readonly CostFactorRecord[];
	machines: readonly MachineRecord[];
	branchIdForSetup?: string;
	departmentIdForMachines?: string;
};

/**
 * Hook to memoize all select options and label resolvers for the Issue transaction page.
 * Items now come from InventorySearchTable, so item group/item/uom options are not needed.
 */
export const useIssueSelectOptions = ({
	departments,
	projects,
	expenses,
	costFactors,
	machines,
	branchIdForSetup,
	departmentIdForMachines,
}: UseIssueSelectOptionsParams) => {
	// --- DEPARTMENT OPTIONS (filtered by branch) ---
	const departmentOptions = React.useMemo<Option[]>(
		() =>
			departments
				.filter(
					(dept) =>
						!branchIdForSetup ||
						!dept.branchId ||
						dept.branchId === branchIdForSetup
				)
				.map((dept) => ({ label: dept.name, value: dept.id })),
		[departments, branchIdForSetup]
	);

	// --- PROJECT OPTIONS (filtered by branch) ---
	const projectOptions = React.useMemo<Option[]>(
		() =>
			projects
				.filter(
					(proj) =>
						!branchIdForSetup ||
						!proj.branchId ||
						proj.branchId === branchIdForSetup
				)
				.map((proj) => ({ label: proj.name, value: proj.id })),
		[projects, branchIdForSetup]
	);

	// --- EXPENSE TYPE OPTIONS ---
	const expenseOptions = React.useMemo<Option[]>(
		() => expenses.map((exp) => ({ label: exp.name, value: exp.id })),
		[expenses]
	);

	// --- COST FACTOR OPTIONS (filtered by branch) ---
	const costFactorOptions = React.useMemo<Option[]>(
		() =>
			costFactors
				.filter(
					(cf) =>
						!branchIdForSetup ||
						!cf.branchId ||
						cf.branchId === branchIdForSetup
				)
				.map((cf) => ({ label: cf.name, value: cf.id })),
		[costFactors, branchIdForSetup]
	);

	// --- MACHINE OPTIONS (filtered by department) ---
	const machineOptions = React.useMemo<Option[]>(
		() =>
			machines
				.filter(
					(m) =>
						!departmentIdForMachines ||
						!m.departmentId ||
						m.departmentId === departmentIdForMachines
				)
				.map((m) => ({ label: m.name, value: m.id })),
		[machines, departmentIdForMachines]
	);

	// --- LABEL MAPS ---
	const departmentLabelMap = React.useMemo(
		() =>
			buildLabelMap(
				[...departments],
				(d) => d.id,
				(d) => d.name
			),
		[departments]
	);

	const projectLabelMap = React.useMemo(
		() =>
			buildLabelMap(
				[...projects],
				(p) => p.id,
				(p) => p.name
			),
		[projects]
	);

	const expenseLabelMap = React.useMemo(
		() =>
			buildLabelMap(
				[...expenses],
				(e) => e.id,
				(e) => e.name
			),
		[expenses]
	);

	const costFactorLabelMap = React.useMemo(
		() =>
			buildLabelMap(
				[...costFactors],
				(cf) => cf.id,
				(cf) => cf.name
			),
		[costFactors]
	);

	const machineLabelMap = React.useMemo(
		() =>
			buildLabelMap(
				[...machines],
				(m) => m.id,
				(m) => m.name
			),
		[machines]
	);

	// --- LABEL RESOLVERS ---
	const getDepartmentLabel = React.useMemo(
		() => createLabelResolver(departmentLabelMap),
		[departmentLabelMap]
	);

	const getProjectLabel = React.useMemo(
		() => createLabelResolver(projectLabelMap),
		[projectLabelMap]
	);

	const getExpenseLabel = React.useMemo(
		() => createLabelResolver(expenseLabelMap),
		[expenseLabelMap]
	);

	const getCostFactorLabel = React.useMemo(
		() => createLabelResolver(costFactorLabelMap),
		[costFactorLabelMap]
	);

	const getMachineLabel = React.useMemo(
		() => createLabelResolver(machineLabelMap),
		[machineLabelMap]
	);

	// --- COMBINED LABEL RESOLVERS ---
	// Simplified since items now come from InventorySearchTable with names pre-populated
	const labelResolvers: IssueLabelResolvers = React.useMemo(
		() => ({
			department: getDepartmentLabel,
			project: getProjectLabel,
			expense: getExpenseLabel,
			costFactor: getCostFactorLabel,
			machine: getMachineLabel,
		}),
		[
			getDepartmentLabel,
			getProjectLabel,
			getExpenseLabel,
			getCostFactorLabel,
			getMachineLabel,
		]
	);

	return {
		// Options arrays
		departmentOptions,
		projectOptions,
		expenseOptions,
		costFactorOptions,
		machineOptions,
		// Individual resolvers
		getDepartmentLabel,
		getProjectLabel,
		getExpenseLabel,
		getCostFactorLabel,
		getMachineLabel,
		// Combined resolvers
		labelResolvers,
	};
};
