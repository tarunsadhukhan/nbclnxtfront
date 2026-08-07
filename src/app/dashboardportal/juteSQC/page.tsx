"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { FlaskConical, Disc3, Columns3, Layers, Cog, Grid2x2 } from "lucide-react";

type Tile = {
	href: string;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
};

const TILES: Tile[] = [
	{
		href: "/dashboardportal/juteSQC/r-08-01",
		title: "Morrah Weight (R-08-01)",
		subtitle: "Daily morrah weight sampling & standard check",
		icon: <FlaskConical size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/spinning",
		title: "Spinning SQC",
		subtitle: "Yarn parameter, actual speed/TPI, RHMR, QR & CV %",
		icon: <Disc3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/spreader",
		title: "Spreader SQC",
		subtitle: "Spreader roll/sliver weight quality checks",
		icon: <Cog size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/breakerCard",
		title: "Breaker Card SQC",
		subtitle: "Breaker-card coarse-side sliver weight (R-08-05/06/07) & grand averages",
		icon: <Grid2x2 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/beaming",
		title: "Beaming SQC",
		subtitle: "Beaming quality checks & parameter sampling",
		icon: <Columns3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/finishing",
		title: "Finishing SQC",
		subtitle: "Actual finishing operating parameters by process & machine/quality",
		icon: <Layers size={32} className="text-blue-600" />,
	},
];

export default function JuteSQCLandingPage() {
	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
				Jute SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Statistical quality control — sampling, parameter checks & reports.
			</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, minmax(0, 1fr))",
						md: "repeat(3, minmax(0, 1fr))",
					},
				}}
			>
				{TILES.map((tile) => (
					<Card key={tile.href} variant="outlined">
						<CardActionArea component={Link} href={tile.href} sx={{ p: 2, minHeight: 120 }}>
							<CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
								{tile.icon}
								<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
									{tile.title}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{tile.subtitle}
								</Typography>
							</CardContent>
						</CardActionArea>
					</Card>
				))}
			</Box>
		</Box>
	);
}
