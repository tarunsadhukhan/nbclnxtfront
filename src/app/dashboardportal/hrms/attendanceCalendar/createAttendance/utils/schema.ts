import { z } from "zod";

export const attendanceFormSchema = z
  .object({
    branch_id: z.number().int().positive("Branch is required"),
    eb_no: z.string().min(1, "Employee Code is required"),
    eb_id: z.number().int().positive("Lookup an employee before submitting"),
    attendance_date: z.string().min(1, "Attendance Date is required"),
    attendance_mark: z.string().min(1, "Attendance Mark is required"),
    attendance_source: z.string().min(1, "Attendance Source is required"),
    attendance_type: z.string().min(1, "Attendance Type is required"),
    // spell keeps the display name (legacy readers); spell_id is what's stored.
    spell: z.string().min(1, "Spell is required"),
    spell_id: z.number().int().positive("Spell is required"),
    spell_hours: z.number().min(0),
    worked_department_id: z.number().int().positive("Department is required"),
    worked_designation_id: z.number().int().positive("Designation is required"),
    working_hours: z.number().positive("Working Hours must be greater than 0"),
    idle_hours: z.number().min(0, "Idle Hours cannot be negative"),
    remarks: z.string(),
    entry_time: z.string().min(1, "Entry Time is required"),
    exit_time: z.string().min(1, "Exit Time is required"),
    machine_ids: z.array(z.number().int()),
  })
  .refine((val) => val.idle_hours <= val.working_hours, {
    message: "Idle Hours cannot exceed Working Hours",
    path: ["idle_hours"],
  });

export type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;
