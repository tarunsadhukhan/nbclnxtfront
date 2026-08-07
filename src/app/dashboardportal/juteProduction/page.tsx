"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { Factory, BarChart3, Boxes, Clock, Scale, Gauge, Ruler, Disc3, Container, RotateCw, Timer, Columns3 } from "lucide-react";

type Tile = {
	href: string;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
};

const TILES: Tile[] = [
	{
		href: "/dashboardportal/juteProduction/spreader",
		title: "Spreader Production",
		subtitle: "Enter production, issue rolls, view bin stock",
		icon: <Factory size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/rollStockReports",
		title: "Roll Stock Reports",
		subtitle: "Maturity time + spreader production summary",
		icon: <BarChart3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/masters/bins",
		title: "Spreader Bin Master",
		subtitle: "Manage spreader bins",
		icon: <Boxes size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/masters/itemMaturity",
		title: "Item Maturity Master",
		subtitle: "Target maturity hours per jute item",
		icon: <Clock size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/masters/spreaderMachineWt",
		title: "Spreader Machine Wt",
		subtitle: "Roll weight per spreader machine",
		icon: <Scale size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/drawing",
		title: "Drawing Production",
		subtitle: "Daily spellwise drawing meter entry",
		icon: <Gauge size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/masters/drawingMachineAttr",
		title: "Drawing Machine Master",
		subtitle: "Const meter & wrap limit per drawing machine",
		icon: <Ruler size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/spinning",
		title: "Spinning Production",
		subtitle: "Doff weights, frame mapping, act count & daily efficiency",
		icon: <Disc3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/winding",
		title: "Winding Production",
		subtitle: "Doff entry, spindle jugar (open/close) & daily quality",
		icon: <RotateCw size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/beaming",
		title: "Beaming Production",
		subtitle: "Daily beaming production entry",
		icon: <Columns3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/stoppageHours",
		title: "Stoppage Hours",
		subtitle: "Log machine downtime by reason, per date & spell",
		icon: <Timer size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteProduction/masters/trollyMaster",
		title: "Trolly Master",
		subtitle: "Trolly & basket tare weights",
		icon: <Container size={32} className="text-blue-600" />,
	},
];

export default function JuteProductionLandingPage() {
	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
				Jute Production
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Spreader workflow — production entry, roll issue, stock & reports.
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
