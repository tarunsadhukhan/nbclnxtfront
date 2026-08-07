import React from "react";
import { buildLabelMap, createLabelResolver } from "@/utils/labelUtils";
import type {
	DepartmentRecord,
	ExpenseRecord,
	IndentLabelResolvers,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	Option,
	ProjectRecord,
} from "../types/indentTypes";
import { OPEN_INDENT_ALLOWED_EXPENSE_IDS } from "../utils/indentConstants";

type UseIndentSelectOptionsParams = {
	departments: readonly DepartmentRecord[];
	projects: readonly ProjectRecord[];
	expenses: readonly ExpenseRecord[];
	itemGroups: readonly ItemGroupRecord[];
	branchIdForSetup?: string;
	indentType: string;
	itemGroupCache: Partial<Record<string, ItemGroupCacheEntry>>;
};

/**
 * Memoizes select options and label maps for the Indent form and line items.
 */
export const useIndentSelectOptions = ({
	departments,
	projects,
	expenses,
	itemGroups,
	branchIdForSetup,
	indentType,
	itemGroupCache,
}: UseIndentSelectOptionsParams) => {
	// Department options filtered by branch
	const departmentOptions = React.useMemo<Option[]>(() => {
		if (!departments.length) return [];
		const branchFilter = branchIdForSetup;
		return departments
			.filter((dept) => !branchFilter || !dept.branchId || dept.branchId === branchFilter)
			.map((dept) => ({ label: dept.name || dept.id, value: dept.id }));
	}, [departments, branchIdForSetup]);

	// Project options filtered by branch
	const projectOptions = React.useMemo<Option[]>(() => {
		if (!projects.length) return [];
		const branchFilter = branchIdForSetup;
		return projects
			.filter((project) => !branchFilter || !project.branchId || project.branchId === branchFilter)
			.map((project) => ({ label: project.name || project.id, value: project.id }));
	}, [projects, branchIdForSetup]);

	// Expense options filtered by indent type
	const expenseOptions = React.useMemo<Option[]>(() => {
		return expenses
			.filter((exp) => {
				if (indentType !== "Open") return true;
				return OPEN_INDENT_ALLOWED_EXPENSE_IDS.has(String(exp.id));
			})
			.map((exp) => ({
				label: exp.name || String(exp.id),
				value: String(exp.id),
			}));
	}, [expenses, indentType]);

	// Item group options
	const itemGroupOptions = React.useMemo<Option[]>(
		() => itemGroups.map((grp) => ({ label: grp.label || grp.id, value: grp.id })),
		[itemGroups]
	);

	// Label maps for preview and tooltips
	const departmentLabelMap = React.useMemo(
		() => buildLabelMap([...departments], (dept) => dept.id, (dept) => dept.name ?? dept.id),
		[departments]
	);

	const expenseLabelMap = React.useMemo(
		() => buildLabelMap([...expenses], (exp) => String(exp.id), (exp) => exp.name ?? String(exp.id)),
		[expenses]
	);

	const projectLabelMap = React.useMemo(
		() => buildLabelMap([...projects], (project) => project.id, (project) => project.name ?? project.id),
		[projects]
	);

	const itemGroupLabelMap = React.useMemo(
		() => buildLabelMap([...itemGroups], (group) => group.id, (group) => group.label ?? group.id),
		[itemGroups]
	);

	// Label resolvers
	const getExpenseLabel = React.useMemo(() => createLabelResolver(expenseLabelMap, ""), [expenseLabelMap]);
	const getProjectLabel = React.useMemo(() => createLabelResolver(projectLabelMap, ""), [projectLabelMap]);
	const getDepartmentLabel = React.useMemo(() => createLabelResolver(departmentLabelMap), [departmentLabelMap]);
	const getItemGroupLabel = React.useMemo(() => createLabelResolver(itemGroupLabelMap), [itemGroupLabelMap]);

	// Item and UOM option getters
	const getItemOptions = React.useCallback(
		(itemGroupId: string) => itemGroupCache[itemGroupId]?.items ?? [],
		[itemGroupCache]
	);

	const getMakeOptions = React.useCallback(
		(itemGroupId: string) => itemGroupCache[itemGroupId]?.makes ?? [],
		[itemGroupCache]
	);

	const getUomOptions = React.useCallback(
		(itemGroupId: string, itemId: string) => itemGroupCache[itemGroupId]?.uomsByItemId[itemId] ?? [],
		[itemGroupCache]
	);

	// Item/make/uom label getters
	const getItemLabel = React.useCallback(
		(groupId: string, itemId: string) => {
			if (!groupId || !itemId) return "-";
			return itemGroupCache[groupId]?.itemLabelById[itemId] ?? itemId;
		},
		[itemGroupCache]
	);

	const getItemNameLabel = React.useCallback(
		(groupId: string, itemId: string) => {
			if (!groupId || !itemId) return "-";
			return itemGroupCache[groupId]?.itemNameById[itemId] ?? itemId;
		},
		[itemGroupCache]
	);

	const getItemCodeLabel = React.useCallback(
		(groupId: string, itemId: string) => {
			if (!groupId || !itemId) return "-";
			return itemGroupCache[groupId]?.itemCodeById[itemId] ?? itemId;
		},
		[itemGroupCache]
	);

	const getItemMakeLabel = React.useCallback(
		(groupId: string, makeId: string) => {
			if (!groupId || !makeId) return "-";
			return itemGroupCache[groupId]?.makeLabelById[makeId] ?? makeId;
		},
		[itemGroupCache]
	);

	const getUomLabel = React.useCallback(
		(groupId: string, itemId: string, uomId: string) => {
			if (!groupId || !itemId || !uomId) return "-";
			const cache = itemGroupCache[groupId];
			if (!cache) return uomId;
			const labels = cache.uomLabelByItemId[itemId];
			if (labels && labels[uomId]) return labels[uomId];
			const defaultMatch = cache.items.find((opt) => opt.value === itemId && opt.defaultUomId === uomId);
			if (defaultMatch) return defaultMatch.defaultUomLabel ?? defaultMatch.defaultUomId ?? uomId;
			return uomId;
		},
		[itemGroupCache]
	);

	// Combined label resolvers object for components
	const labelResolvers: IndentLabelResolvers = React.useMemo(
		() => ({
			department: getDepartmentLabel,
			itemGroup: getItemGroupLabel,
			item: getItemLabel,
			itemName: getItemNameLabel,
			itemCode: getItemCodeLabel,
			itemMake: getItemMakeLabel,
			uom: getUomLabel,
		}),
		[getDepartmentLabel, getItemGroupLabel, getItemLabel, getItemNameLabel, getItemCodeLabel, getItemMakeLabel, getUomLabel]
	);

	return {
		departmentOptions,
		projectOptions,
		expenseOptions,
		itemGroupOptions,
		getExpenseLabel,
		getProjectLabel,
		getItemOptions,
		getMakeOptions,
		getUomOptions,
		labelResolvers,
	};
};
