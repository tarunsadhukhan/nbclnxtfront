"use client";

import React from "react";
import { Stack, Typography } from "@mui/material";
import useCompanyHeader from "@/hooks/useCompanyHeader";

export type CompanyHeaderBlockProps = {
	coId?: string | number | null;
	branchId?: string | number | null;
	branchLabel?: string;
	maxWidth?: number | string;
	minWidth?: number | string;
};

/**
 * Shared procurement print-preview letterhead block.
 * Renders logo + company name + registered address + GSTIN (per-branch) + CIN.
 * GSTIN and CIN rows hide when their values are empty.
 */
export const CompanyHeaderBlock: React.FC<CompanyHeaderBlockProps> = ({
	coId,
	branchId,
	branchLabel,
	maxWidth = "35%",
	minWidth = 200,
}) => {
	const { coName, address, gstNo, cinNo, logoBase64 } = useCompanyHeader(coId, branchId);

	return (
		<Stack
			id="preview-left-pane"
			spacing={0.4}
			sx={{
				minWidth,
				maxWidth: { xs: "100%", md: maxWidth },
				flexBasis: { md: maxWidth },
			}}
			className="print-header"
		>
			{logoBase64 && (
				<img
					src={logoBase64}
					alt=""
					style={{
						maxHeight: 60,
						maxWidth: 200,
						width: "auto",
						height: "auto",
						objectFit: "contain",
						alignSelf: "flex-start",
						marginBottom: 4,
					}}
				/>
			)}
			<Typography
				variant="body1"
				sx={{
					fontWeight: 600,
					fontSize: "1rem",
					wordBreak: "break-word",
					whiteSpace: "normal",
				}}
			>
				{coName || "-"}
			</Typography>
			{address && (
				<Typography
					variant="body2"
					sx={{
						fontSize: "0.78rem",
						color: "text.secondary",
						wordBreak: "break-word",
						whiteSpace: "normal",
						lineHeight: 1.3,
					}}
				>
					{address}
				</Typography>
			)}
			{gstNo && (
				<Typography variant="body2" sx={{ fontSize: "0.78rem" }}>
					<strong>GSTIN:</strong> {gstNo}
				</Typography>
			)}
			{cinNo && (
				<Typography variant="body2" sx={{ fontSize: "0.78rem" }}>
					<strong>CIN:</strong> {cinNo}
				</Typography>
			)}
			{branchLabel && (
				<Typography
					variant="body2"
					sx={{
						fontSize: "0.78rem",
						color: "text.secondary",
						wordBreak: "break-word",
						whiteSpace: "normal",
					}}
				>
					<strong>Branch:</strong> {branchLabel}
				</Typography>
			)}
		</Stack>
	);
};

export default CompanyHeaderBlock;
