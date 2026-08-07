import { z } from "zod";

export const leaveRequestFormSchema = z
  .object({
    branch_id: z.number().int().positive("Branch is required"),
    eb_no: z.string().min(1, "Employee Code is required"),
    eb_id: z.number().int().positive("Lookup an employee before submitting"),
    leave_type_id: z.number().int().positive("Leave Type is required"),
    leave_from_date: z.string().min(1, "From Date is required"),
    leave_to_date: z.string().min(1, "To Date is required"),
    non_working_days: z
      .number()
      .int()
      .min(0, "No Working Days cannot be negative"),
    leave_purpose: z.string().min(1, "Reason is required"),
  })
  .refine(
    (val) => {
      const from = new Date(val.leave_from_date);
      const to = new Date(val.leave_to_date);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
      return from.getTime() <= to.getTime();
    },
    { message: "From Date cannot be after To Date", path: ["leave_to_date"] },
  )
  .refine(
    (val) => {
      const from = new Date(val.leave_from_date);
      const to = new Date(val.leave_to_date);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
      // Inclusive day span minus non-working days = actual leave days.
      const spanDays =
        Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
      return spanDays - val.non_working_days > 0;
    },
    {
      message: "No of Days Leave must be greater than 0",
      path: ["non_working_days"],
    },
  );

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;
