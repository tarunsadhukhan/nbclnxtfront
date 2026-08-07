export type FormMode = "create" | "edit" | "view";

export interface Option {
  label: string;
  value: string;
}

export const PAY_REGISTER_STATUS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CLOSED: 5,
  CANCELLED: 6,
} as const;

export type PayRegisterStatusId =
  (typeof PAY_REGISTER_STATUS)[keyof typeof PAY_REGISTER_STATUS];

export interface PayRegisterListRow {
  id: number;
  payscheme: string | null;
  fromDateDesc: string | null;
  toDateDesc: string | null;
  fromDate: string | null;
  toDate: string | null;
  wageType: string | null;
  netPay: number | null;
  status: string | null;
  status_id: number | null;
  createdBy: string | null;
  branchId: number | null;
  paySchemeId: number | null;
  companyId: number | null;
}

export interface PayRegisterDetail {
  id: number;
  fromDate: string | null;
  toDate: string | null;
  fromDateDesc: string | null;
  toDateDesc: string | null;
  paySchemeId: number | null;
  payscheme: string | null;
  paySchemeCode: string | null;
  branchId: number | null;
  branchName: string | null;
  companyId: number | null;
  status: string | null;
  status_id: number | null;
  approveButton: boolean;
}

export interface PaySalaryRow {
  [key: string]: unknown;
}

export interface PayRegisterSetupData {
  pay_schemes: Option[];
  branches: Option[];
}
