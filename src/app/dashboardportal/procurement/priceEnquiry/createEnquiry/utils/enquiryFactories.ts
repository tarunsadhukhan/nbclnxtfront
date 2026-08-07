/**
 * Default form values used when creating a new price enquiry.
 * Keys match the header schema field names in `createEnquiry/page.tsx`
 * (branch / date / expense_type / project / remarks) so the defaults are
 * actually picked up by the form.
 */
export const buildDefaultEnquiryFormValues = () => ({
	branch: "",
	date: new Date().toISOString().slice(0, 10),
	expense_type: "",
	project: "",
	remarks: "",
});
