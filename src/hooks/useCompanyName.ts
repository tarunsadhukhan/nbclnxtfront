import React from "react";

/**
 * Hook to retrieve the company name from localStorage.
 * Returns undefined during SSR and initial hydration to prevent mismatches.
 */
export const useCompanyName = (): string | undefined => {
	const [companyName, setCompanyName] = React.useState<string | undefined>(undefined);

	React.useEffect(() => {
		try {
			const storedCompany = localStorage.getItem("sidebar_selectedCompany");
			if (storedCompany) {
				const parsed = JSON.parse(storedCompany) as {
					co_name?: string;
					name?: string;
					company_name?: string;
				} | null;
				setCompanyName(parsed?.co_name || parsed?.name || parsed?.company_name || undefined);
			}
		} catch {
			// Ignore errors
		}
	}, []);

	return companyName;
};

export default useCompanyName;
