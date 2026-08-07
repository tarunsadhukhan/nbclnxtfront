/**
 * HRMS Employee types — single source of truth for the employee module.
 */

// ─── Common ────────────────────────────────────────────────────────

export type Option = { label: string; value: string };

export const EMPLOYEE_STATUS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CLOSED: 5,
  CANCELLED: 6,
} as const;

/** HRMS-specific employee lifecycle status IDs */
export const EMPLOYEE_LIFECYCLE_STATUS = {
  JOINED: 35,
  REJECTED: 4,
  BLACKLISTED: 46,
  RESIGNED: 39,
  IN_NOTICE: 40,
  TERMINATED: 41,
  RETIRED: 42,
} as const;

export type EmployeeStatusId = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS];

// ─── Employee List ─────────────────────────────────────────────────

export interface EmployeeListRow {
  id: number;
  eb_id: number;
  full_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  email_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  pan_no: string | null;
  aadhar_no: string | null;
  status_id: number;
  status_name: string | null;
  active: number;
  emp_code: string | null;
  date_of_join: string | null;
  sub_dept_id: number | null;
  designation_id: number | null;
  branch_id: number | null;
  sub_dept_name: string | null;
  designation_name: string | null;
  branch_name: string | null;
  mobile_no: string | null;
}

// ─── Employee Detail (all sections) ────────────────────────────────

export interface PersonalDetails {
  eb_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  mobile_no: string | null;
  email_id: string | null;
  marital_status: number | null;
  country_id: number | null;
  relegion_name: string | null;
  fixed_eb_id: number | null;
  father_spouse_name: string | null;
  passport_no: string | null;
  driving_licence_no: string | null;
  pan_no: string | null;
  aadhar_no: string | null;
  co_id: number;
  status_id: number;
  active: number;
}

export interface ContactDetails {
  contact_detail_id: number;
  eb_id: number;
  mobile_no: string;
  emergency_no: string | null;
}

export interface AddressDetails {
  tbl_hrms_ed_contact_details_id: number;
  eb_id: number;
  address_type: number;
  country_id: number | null;
  state_id: number | null;
  city_name: string | null;
  address_line_1: string;
  address_line_2: string | null;
  pin_code: number;
  is_correspondent_address: number;
}

export interface OfficialDetails {
  tbl_hrms_ed_official_detail_id: number;
  eb_id: number;
  sub_dept_id: number;
  catagory_id: number; // matches DB typo
  designation_id: number;
  branch_id: number;
  date_of_join: string | null;
  probation_period: number | null;
  minimum_working_commitment: number;
  reporting_eb_id: number;
  emp_code: string;
  legacy_code: string | null;
  contractor_id: number | null;
  office_mobile_no: string | null;
  office_email_id: string | null;
  sub_dept_name?: string;
  designation_name?: string;
  branch_name?: string;
  reporting_to_name?: string;
}

export interface BankDetails {
  tbl_hrms_ed_bank_detail_id: number;
  eb_id: number;
  ifsc_code: string;
  bank_acc_no: string;
  bank_name: string;
  bank_branch_name: string;
  is_verified: number;
}

export interface PfDetails {
  tbl_hrms_ed_pf_id: number;
  eb_id: number;
  pf_no: string;
  pf_uan_no: string;
  pf_previous_no: string;
  pf_transfer_no: string | null;
  nominee_name: string | null;
  relationship_name: string | null;
  pf_date_of_join: string | null;
}

export interface EsiDetails {
  tbl_hrms_ed_esi_id: number;
  eb_id: number;
  esi_no: string | null;
  medical_policy_no: string | null;
}

export interface ExperienceDetails {
  auto_id: number;
  eb_id: number;
  company_name: string | null;
  from_date: string | null;
  to_date: string | null;
  designation: string | null;
  project: string | null;
  contact: string | null;
}

export interface EmployeeFullData {
  personal: PersonalDetails | null;
  contact: ContactDetails | null;
  address: AddressDetails[];
  official: OfficialDetails | null;
  bank: BankDetails | null;
  pf: PfDetails | null;
  esi: EsiDetails | null;
  experience: ExperienceDetails[];
  has_photo?: boolean;
}

// ─── Setup Data ────────────────────────────────────────────────────

export interface EmployeeSetupData {
  blood_groups: Option[];
  sub_departments: Option[];
  branches: Option[];
  categories: Option[];
  contractors: Option[];
  reporting_employees: Option[];
}

// ─── Section Progress ──────────────────────────────────────────────

export type SectionName =
  | "personal"
  | "contact"
  | "address"
  | "official"
  | "bank"
  | "pf"
  | "esi"
  | "experience";

export type SectionProgress = Record<SectionName, boolean>;

// ─── Wizard Steps ──────────────────────────────────────────────────

export interface WizardStep {
  step_id: number;
  step_name: string;
  description: string;
  sections: SectionName[];
  /** Sub-tab labels within this step (parallel to sections) */
  subTabs?: string[];
  /** Optional right-side button label (e.g. "Issue Offer Letter") */
  rightButton?: string;
}

export const WIZARD_STEPS: readonly WizardStep[] = Object.freeze([
  {
    step_id: 1,
    step_name: "Personal Information",
    description: "Add General, Contact, Educational and Previous Experiences",
    sections: ["personal", "contact", "address", "experience"],
    subTabs: ["Personal Details", "Contact Details", "Address Details", "Previous Experience"],
  },
  {
    step_id: 2,
    step_name: "Official Information",
    description: "Add work related info, Bank details and salary structure",
    sections: ["official", "bank"],
    subTabs: ["Work Details", "Bank Details"],
  },
  {
    step_id: 3,
    step_name: "Upload Documents",
    description: "Upload all relevant documents based on checklist",
    sections: [],
  },
  {
    step_id: 4,
    step_name: "Generate Letters",
    description: "Download Offer / Appointment Letter",
    sections: [],
    rightButton: "Issue Offer Letter",
  },
  {
    step_id: 5,
    step_name: "Onboarding",
    description: "Generate Welcome letter, email id, assets handover form, etc.",
    sections: [],
  },
  {
    step_id: 6,
    step_name: "Shift and Leave Policy",
    description: "Select Employee Leave Policy and Shift Timings",
    sections: [],
  },
  {
    step_id: 7,
    step_name: "Medical Enrollments, ESI, PF",
    description: "Fill in details for provident funds, insurances and ESI",
    sections: ["pf", "esi"],
    subTabs: ["PF Details", "ESI Details"],
  },
]);

// ─── Form mode ─────────────────────────────────────────────────────

export type FormMode = "create" | "edit" | "view";
