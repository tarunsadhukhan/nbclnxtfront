import React from "react";

export type UseUnsavedChangesOptions<TLineItem = unknown> = {
	formValues: Record<string, unknown>;
	lineItems: TLineItem[];
	/** Extract comparable data from a line item (strips ephemeral fields like id). */
	getComparableLineData?: (item: TLineItem) => unknown;
	/** Whether tracking is active. Set to false in create mode. */
	enabled?: boolean;
};

export type UseUnsavedChangesReturn = {
	hasUnsavedChanges: boolean;
	/** Snapshot the current state as the new baseline. */
	resetBaseline: () => void;
	/** Set baseline to specific values (e.g., after data fetch completes). */
	setBaseline: (formValues: Record<string, unknown>, lineItems: unknown[]) => void;
};

/**
 * Detects unsaved changes by comparing current form/line-item state to a stored
 * baseline snapshot. Designed for transaction pages that need to toggle between
 * Save and Approval buttons based on whether changes exist.
 *
 * Usage:
 * 1. Call `setBaseline(formValues, lineItems)` after initial data load
 * 2. Call `resetBaseline()` after approval actions that refresh data
 * 3. Read `hasUnsavedChanges` to decide which buttons to show
 */
export function useUnsavedChanges<TLineItem = unknown>({
	formValues,
	lineItems,
	getComparableLineData,
	enabled = true,
}: UseUnsavedChangesOptions<TLineItem>): UseUnsavedChangesReturn {
	const baselineRef = React.useRef<string>("");

	const serialize = React.useCallback(
		(fv: Record<string, unknown>, li: unknown[]) => {
			try {
				return JSON.stringify({ form: fv, lines: li });
			} catch {
				return "";
			}
		},
		[],
	);

	const currentSnapshot = React.useMemo(() => {
		if (!enabled) return "";
		const comparableLines = getComparableLineData
			? lineItems.map(getComparableLineData)
			: lineItems;
		return serialize(formValues, comparableLines);
	}, [formValues, lineItems, enabled, serialize, getComparableLineData]);

	const hasUnsavedChanges = React.useMemo(() => {
		if (!enabled || !baselineRef.current) return false;
		return baselineRef.current !== currentSnapshot;
	}, [enabled, currentSnapshot]);

	const resetBaseline = React.useCallback(() => {
		baselineRef.current = currentSnapshot;
	}, [currentSnapshot]);

	const setBaseline = React.useCallback(
		(fv: Record<string, unknown>, li: unknown[]) => {
			const comparableLi = getComparableLineData
				? (li as TLineItem[]).map(getComparableLineData)
				: li;
			baselineRef.current = serialize(fv, comparableLi);
		},
		[serialize, getComparableLineData],
	);

	return { hasUnsavedChanges, resetBaseline, setBaseline };
}
