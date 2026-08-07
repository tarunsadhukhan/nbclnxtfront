export const formatDate = (dateStr?: string | null): string => {
	if (!dateStr) return "-";
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return dateStr;
		return date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
	} catch {
		return dateStr;
	}
};

export const formatDateTime = (dateStr?: string | null): string => {
	if (!dateStr) return "-";
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return dateStr;
		return date.toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
	} catch {
		return dateStr;
	}
};

export const qrImageSrc = (raw?: string | null): string | null => {
	if (!raw) return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith("data:image")) return trimmed;
	if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 40) {
		return `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`;
	}
	return null;
};

export const formatAmount = (value?: number | string | null): string => {
	if (value === null || value === undefined || value === "") return "-";
	const num = Number(value);
	if (Number.isNaN(num)) return String(value);
	return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ONES = [
	"", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
	"TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
	"SEVENTEEN", "EIGHTEEN", "NINETEEN",
];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

const twoDigitsToWords = (n: number): string => {
	if (n < 20) return ONES[n];
	return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
};

const threeDigitsToWords = (n: number): string => {
	if (n === 0) return "";
	let s = "";
	if (n >= 100) {
		s += ONES[Math.floor(n / 100)] + " HUNDRED";
		n %= 100;
		if (n > 0) s += " ";
	}
	if (n > 0) s += twoDigitsToWords(n);
	return s;
};

export const numberToWordsIndian = (amount: number): string => {
	if (!amount || amount === 0) return "ZERO";
	const rupees = Math.floor(amount);
	const paiseRaw = Math.round((amount - rupees) * 100);
	const parts: string[] = [];
	let rem = rupees;
	const crore = Math.floor(rem / 10000000); rem %= 10000000;
	const lakh = Math.floor(rem / 100000); rem %= 100000;
	const thousand = Math.floor(rem / 1000); rem %= 1000;
	if (crore > 0) parts.push(threeDigitsToWords(crore) + " CRORE");
	if (lakh > 0) parts.push(threeDigitsToWords(lakh) + " LAC");
	if (thousand > 0) parts.push(threeDigitsToWords(thousand) + " THOUSAND");
	if (rem > 0) parts.push(threeDigitsToWords(rem));
	let result = "RUPEES " + parts.join(" ");
	if (paiseRaw > 0) result += " AND " + twoDigitsToWords(paiseRaw) + " PAISE";
	result += " ONLY";
	return result;
};

type CellOpts = {
	bold?: boolean;
	right?: boolean;
	borderBottom?: boolean;
	borderLeft?: boolean;
	colSpan?: number;
	width?: string;
};

export const cell = (content: string, opts?: CellOpts): string => {
	const s: string[] = ["padding:3px 8px", "font-size:11px", "vertical-align:top"];
	if (opts?.bold) s.push("font-weight:700");
	if (opts?.right) s.push("text-align:right");
	if (opts?.borderBottom) s.push("border-bottom:1px solid #000");
	if (opts?.borderLeft) s.push("border-left:1px solid #000");
	if (opts?.width) s.push(`width:${opts.width}`);
	const attrs = [`style="${s.join(";")}"`, opts?.colSpan ? `colspan="${opts.colSpan}"` : ""].filter(Boolean).join(" ");
	return `<td ${attrs}>${content}</td>`;
};
