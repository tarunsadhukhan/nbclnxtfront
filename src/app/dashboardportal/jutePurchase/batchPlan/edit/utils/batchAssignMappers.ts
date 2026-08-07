import type {
  BatchDailyAssignRow,
  EditableAssignLine,
  YarnTypeRecord,
  BatchPlanRecord,
  Option,
} from "../types/batchAssignTypes";
import { generateLineId } from "./batchAssignFactories";

export const mapApiToEditableLines = (
  rows: BatchDailyAssignRow[]
): EditableAssignLine[] =>
  rows.map((row) => ({
    id: generateLineId(),
    batch_daily_assign_id: row.batch_daily_assign_id,
    yarn_type_id: String(row.jute_yarn_id),
    batch_plan_id: String(row.batch_plan_id),
    status_id: row.status_id,
    yarn_type_name: row.yarn_type_name,
    plan_name: row.plan_name,
  }));

export const mapYarnTypesToOptions = (types: YarnTypeRecord[]): Option[] =>
  types.map((t) => ({
    label: t.jute_yarn_name,
    value: String(t.jute_yarn_id),
  }));

export const mapBatchPlansToOptions = (plans: BatchPlanRecord[]): Option[] =>
  plans.map((p) => ({
    label: p.plan_name,
    value: String(p.batch_plan_id),
  }));

export const mapEditableToCreatePayload = (
  line: EditableAssignLine,
  branchId: number,
  assignDate: string
) => ({
  branch_id: branchId,
  assign_date: assignDate,
  jute_yarn_id: Number(line.yarn_type_id),
  batch_plan_id: Number(line.batch_plan_id),
});

export const buildLabelMap = <T>(
  items: T[],
  getId: (item: T) => string,
  getLabel: (item: T) => string
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(getId(item), getLabel(item));
  }
  return map;
};
