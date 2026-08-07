"use client";

import * as React from "react";
import { Box, Card, CardActionArea, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, FileDown, FileText, Package, Receipt, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";

type SalesSection = {
	title: string;
	description: string;
	path: string;
	createPath?: string;
	createLabel?: string;
	icon: React.ReactNode;
	/** Position in the quotation → invoice document chain, if part of it. */
	chainStep?: number;
};

const SECTIONS: ReadonlyArray<SalesSection> = [
	{
		title: "Quotations",
		description: "Prepare and send price quotations to customers.",
		path: "/dashboardportal/sales/quotation",
		createPath: "/dashboardportal/sales/quotation/createQuotation",
		createLabel: "New Quotation",
		icon: <FileText size={22} />,
		chainStep: 1,
	},
	{
		title: "Sales Orders",
		description: "Confirm customer orders from approved quotations or directly.",
		path: "/dashboardportal/sales/salesOrder",
		createPath: "/dashboardportal/sales/salesOrder/createSalesOrder",
		createLabel: "New Sales Order",
		icon: <ShoppingCart size={22} />,
		chainStep: 2,
	},
	{
		title: "Delivery Orders",
		description: "Schedule deliveries against approved sales orders.",
		path: "/dashboardportal/sales/deliveryOrder",
		createPath: "/dashboardportal/sales/deliveryOrder/createDeliveryOrder",
		createLabel: "New Delivery Order",
		icon: <Package size={22} />,
		chainStep: 3,
	},
	{
		title: "Sales Invoices",
		description: "Invoice approved delivery orders or sales orders directly.",
		path: "/dashboardportal/sales/salesInvoice",
		createPath: "/dashboardportal/sales/salesInvoice/createSalesInvoice",
		createLabel: "New Invoice",
		icon: <Receipt size={22} />,
		chainStep: 4,
	},
	{
		title: "Sales Reports",
		description: "Sales order and invoice registers with filters and export.",
		path: "/dashboardportal/sales/reports",
		icon: <BarChart3 size={22} />,
	},
	{
		title: "Jute Tally Download",
		description: "Download jute tally data for reconciliation.",
		path: "/dashboardportal/sales/juteTallyDownload",
		icon: <FileDown size={22} />,
	},
];

const CHAIN = SECTIONS.filter((section) => typeof section.chainStep === "number").sort(
	(a, b) => (a.chainStep ?? 0) - (b.chainStep ?? 0),
);

export default function SalesPage() {
	const router = useRouter();
	const sidebarContext = useSidebarContextSafe();
	const hasMenuAccess = sidebarContext?.hasMenuAccess ?? (() => true);

	const visibleSections = React.useMemo(
		() => SECTIONS.filter((section) => hasMenuAccess(section.path, "view")),
		[hasMenuAccess],
	);

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-7xl">
				<div className="mb-6 flex flex-col gap-2">
					<Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
						Sales
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Manage the full sales cycle — quotation, sales order, delivery and invoicing.
					</Typography>
				</div>

				{CHAIN.length > 0 ? (
					<Card variant="outlined" sx={{ mb: 4 }}>
						<CardContent>
							<Typography variant="overline" color="text.secondary">
								Document flow
							</Typography>
							<Stack
								direction={{ xs: "column", md: "row" }}
								spacing={1}
								alignItems={{ xs: "flex-start", md: "center" }}
								sx={{ mt: 1 }}
							>
								{CHAIN.map((section, index) => (
									<React.Fragment key={section.path}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Box sx={{ color: "primary.main", display: "flex" }}>{section.icon}</Box>
											<Typography variant="body2" sx={{ fontWeight: 600 }}>
												{section.title}
											</Typography>
										</Stack>
										{index < CHAIN.length - 1 ? (
											<Box sx={{ color: "text.secondary", display: { xs: "none", md: "flex" } }}>
												<ArrowRight size={16} />
											</Box>
										) : null}
									</React.Fragment>
								))}
							</Stack>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
								Each step sources approved documents from the previous one. Invoices can also be raised directly
								against approved sales orders.
							</Typography>
						</CardContent>
					</Card>
				) : null}

				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
					}}
				>
					{visibleSections.map((section) => {
						const canCreate = Boolean(section.createPath) && hasMenuAccess(section.path, "create");
						return (
							<Card key={section.path} variant="outlined" sx={{ display: "flex", flexDirection: "column" }}>
								<CardActionArea onClick={() => router.push(section.path)} sx={{ flexGrow: 1 }}>
									<CardContent>
										<Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
											<Box sx={{ color: "primary.main", display: "flex" }}>{section.icon}</Box>
											<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
												{section.title}
											</Typography>
										</Stack>
										<Typography variant="body2" color="text.secondary">
											{section.description}
										</Typography>
									</CardContent>
								</CardActionArea>
								{canCreate && section.createPath ? (
									<>
										<Divider />
										<Box sx={{ p: 1.5, display: "flex", justifyContent: "flex-end" }}>
											<Button onClick={() => router.push(section.createPath as string)}>
												{section.createLabel ?? "Create"}
											</Button>
										</Box>
									</>
								) : null}
							</Card>
						);
					})}
				</Box>

				{visibleSections.length === 0 ? (
					<Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
						You do not have access to any sales pages. Contact your administrator if you believe this is a mistake.
					</Typography>
				) : null}
			</div>
		</div>
	);
}
