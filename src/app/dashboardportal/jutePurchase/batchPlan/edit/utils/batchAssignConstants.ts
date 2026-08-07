export const BATCH_ASSIGN_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  APPROVED: 3,
  REJECTED: 4,
} as const;

export const BATCH_ASSIGN_STATUS_LABELS: Record<number, string> = {
  21: "Draft",
  1: "Open",
  3: "Approved",
  4: "Rejected",
};
