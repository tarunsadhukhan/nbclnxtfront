"use client";

import * as React from "react";
import { saveAs } from "file-saver";

export type ExcelDownloadParamsBase = {
	fromDate?: string | null;
	toDate?: string | null;
};

/**
 * Generic hook that wraps a (params -> Promise<Blob>) fetcher with:
 *  - downloading state
 *  - error state
 *  - filename construction (caller supplies the prefix; suffix is built from
 *    fromDate/toDate, falling back to "all")
 *  - empty-blob detection
 *
 * Generalizes the inline handleDownload in jutePurchase/mr/page.tsx.
 */
export function useExcelDownload<P extends ExcelDownloadParamsBase>(
	fetcher: (params: P) => Promise<Blob>,
	filenamePrefix: string,
) {
	const [downloading, setDownloading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const clearError = React.useCallback(() => setError(null), []);

	const download = React.useCallback(
		async (params: P) => {
			setDownloading(true);
			setError(null);
			try {
				const blob = await fetcher(params);
				if (!blob || blob.size === 0) {
					setError("No data for the selected filters.");
					return;
				}
				const suffixParts: string[] = [];
				if (params.fromDate) suffixParts.push(params.fromDate);
				if (params.toDate) suffixParts.push(params.toDate);
				const suffix = suffixParts.length > 0 ? suffixParts.join("_") : "all";
				saveAs(blob, `${filenamePrefix}_${suffix}.xlsx`);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Failed to download Excel";
				setError(message);
			} finally {
				setDownloading(false);
			}
		},
		[fetcher, filenamePrefix],
	);

	return { download, downloading, error, clearError };
}
