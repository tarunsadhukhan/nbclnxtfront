import { useEffect, useState } from "react";
import axios from "axios";
import { apiRoutesconsole } from "@/utils/api";
import useCompanyLogo from "./useCompanyLogo";

export interface CompanyHeaderData {
	coName: string;
	address: string;
	gstNo: string;
	cinNo: string;
	logoBase64?: string;
	loading: boolean;
	error?: string;
}

const composeAddress = (
	addr1?: string | null,
	addr2?: string | null,
	stateName?: string | null,
	zipcode?: string | null
): string => {
	const lineParts = [addr1, addr2].filter((v): v is string => Boolean(v && v.trim()));
	let out = lineParts.join(", ");
	const tail: string[] = [];
	if (stateName && stateName.trim()) tail.push(stateName.trim());
	if (zipcode && String(zipcode).trim()) tail.push(String(zipcode).trim());
	const tailStr = tail.join(" - ");
	if (tailStr) out = out ? `${out}, ${tailStr}` : tailStr;
	return out;
};

export const useCompanyHeader = (
	coId: string | number | null | undefined,
	branchId?: string | number | null | undefined
): CompanyHeaderData => {
	const [coName, setCoName] = useState("");
	const [address, setAddress] = useState("");
	const [cinNo, setCinNo] = useState("");
	const [gstNo, setGstNo] = useState("");
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | undefined>(undefined);

	const logoBase64 = useCompanyLogo(coId);

	useEffect(() => {
		if (!coId) {
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(undefined);

		const coReq = axios.get(`${apiRoutesconsole.GET_CO_BY_ID}/${coId}`, { withCredentials: true });
		const branchReq = branchId
			? axios.get(`${apiRoutesconsole.GET_BRANCH_BY_ID}/${branchId}`, { withCredentials: true })
			: Promise.resolve(null as any);

		Promise.all([coReq, branchReq])
			.then(([coRes, branchRes]) => {
				if (cancelled) return;
				const co = coRes?.data?.data ?? {};
				setCoName(co.co_name ?? "");
				setAddress(
					composeAddress(co.co_address1, co.co_address2, co.state_name, co.co_zipcode)
				);
				setCinNo(co.co_cin_no ?? "");

				const branch = branchRes?.data?.data ?? null;
				setGstNo(branch?.gst_no ?? "");
			})
			.catch((e) => {
				if (cancelled) return;
				setError(e?.message ?? "Failed to load company header");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	return { coName, address, gstNo, cinNo, logoBase64, loading, error };
};

export default useCompanyHeader;
