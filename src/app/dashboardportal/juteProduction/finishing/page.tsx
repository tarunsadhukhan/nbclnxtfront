"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { Disc3, Scissors, Shirt, Combine, Stamp, Package } from "lucide-react";

type Tile = {
	href: string;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
};

const TILES: Tile[] = [
	{
		href: "/dashboardportal/juteProduction/finishing/lapping",
		title: "Lapping",
		subtitle: "Wind finished hessian cloth into rolls",
		icon: <Disc3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/finishing/cutting",
		title: "Cutting",
		subtitle: "Cut sacking cloth into bag pieces",
		icon: <Scissors size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/finishing/hemming",
		title: "Hemming",
		subtitle: "Stitch sacking pieces into finished bags",
		icon: <Shirt size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/finishing/herackle",
		title: "Herackle",
		subtitle: "Herackle finishing of sacking bags",
		icon: <Combine size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/finishing/sacksewing",
		title: "Sack Sewing",
		subtitle: "Sew sacking bags into bundles",
		icon: <Stamp size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/finishing/balePress",
		title: "Bale Press",
		subtitle: "Press finished bags into bales",
		icon: <Package size={32} className="text-blue-600" />,
	},
];

export default function FinishingProductionLandingPage() {
	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
				Finishing Production
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Per-process daily production entry — hessian cloth (lapping) and sacking bags
				(cutting/hemming/herackle/sack sewing/bale press).
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
