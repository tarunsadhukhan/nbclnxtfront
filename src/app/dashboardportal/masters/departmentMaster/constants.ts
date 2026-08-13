/** dept_mst.Worker_staff — which workforce a department belongs to. */
export const DEPT_FOR = [
	{ value: "1", label: "Worker" },
	{ value: "2", label: "Staff" },
] as const;

export const deptForLabel = (v: unknown): string =>
	DEPT_FOR.find((o) => o.value === String(v ?? ""))?.label ?? "-";
