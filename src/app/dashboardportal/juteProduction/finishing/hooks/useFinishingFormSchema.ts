"use client";

import { z } from "zod";

// Zod schema for the simplified Finishing entry form. The user enters only the
// header keys (spell/machine/quality) plus a single production figure. All
// numeric inputs are kept as strings (MUI TextField) and parsed at submit time.

const numericString = z
	.string()
	.refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "Must be a number" });

const nonNegativeNumericString = numericString.refine(
	(v) => v !== "" && Number(v) >= 0,
	{ message: "Required and must be 0 or more" }
);

// machineId / empCode are mutually exclusive by process (machine processes vs labour
// processes like sacksewing), so both are optional here; the form enforces the right one
// per process at submit time. ebId is the resolved worker id for labour processes.
export const finishingFormSchema = z.object({
	machineId: z.string(),
	empCode: z.string(),
	ebId: z.string(),
	qualityId: z.string().min(1, "Quality is required"),
	spellId: z.string().min(1, "Spell is required"),
	prodQty: nonNegativeNumericString,
});

export type FinishingFormValues = z.infer<typeof finishingFormSchema>;
