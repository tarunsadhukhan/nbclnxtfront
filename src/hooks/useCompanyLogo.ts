import React from "react";
import axios from "axios";
import { apiRoutesconsole } from "@/utils/api";

/**
 * Hook to fetch the company logo from the backend API.
 * Returns the base64 data URI, or undefined if not available.
 */
export const useCompanyLogo = (coId: string | number | null | undefined): string | undefined => {
	const [logo, setLogo] = React.useState<string | undefined>(undefined);

	React.useEffect(() => {
		if (!coId) return;
		let cancelled = false;

		axios
			.get(`${apiRoutesconsole.GET_CO_LOGO}/${coId}`, { withCredentials: true })
			.then((res) => {
				if (cancelled) return;
				const value = res.data?.data?.co_logo;
				if (value) setLogo(value);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [coId]);

	return logo;
};

export default useCompanyLogo;
