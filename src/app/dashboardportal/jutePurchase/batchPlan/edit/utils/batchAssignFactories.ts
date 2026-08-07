import type { EditableAssignLine } from "../types/batchAssignTypes";

let lineCounter = 0;

export const generateLineId = (): string => `assign-line-${Date.now()}-${++lineCounter}`;

export const createBlankAssignLine = (): EditableAssignLine => ({
  id: generateLineId(),
  batch_daily_assign_id: undefined,
  yarn_type_id: "",
  batch_plan_id: "",
  status_id: undefined,
  yarn_type_name: undefined,
  plan_name: undefined,
});

export const lineHasAnyData = (line: EditableAssignLine): boolean =>
  Boolean(line.yarn_type_id || line.batch_plan_id);

export const lineIsComplete = (line: EditableAssignLine): boolean =>
  Boolean(line.yarn_type_id && line.batch_plan_id);

export const isDraft = (line: EditableAssignLine): boolean =>
  !line.batch_daily_assign_id || line.status_id === 21;
