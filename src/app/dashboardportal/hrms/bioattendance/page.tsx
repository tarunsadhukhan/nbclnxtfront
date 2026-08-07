"use client";
import React, { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import BioEmpLinkTab from "./_components/BioEmpLinkTab";
import BioProcessTab from "./_components/BioProcessTab";
import BioDaywiseReportTab from "./_components/BioDaywiseReportTab";
import BioInOutReportTab from "./_components/BioInOutReportTab";

/**
 * Bio Attendance page — two tabs:
 *  1. Employee Bio Link: map an employee (eb_id) to a biometric device id
 *     (tbl_master_bio_link_mst, match_type='E').
 *  2. Bio Data Process: run the punch-processing chain that builds
 *     bio_attendance_basic + bio_attendance_process for a period.
 *  3. Day Wise Report: P / 1/2P / A / WO / WOP matrix per employee per day.
 */
export default function BioAttendancePage() {
	const [tab, setTab] = useState(0);

	return (
		<Box>
			<Tabs
				value={tab}
				onChange={(_e, v: number) => setTab(v)}
				sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
			>
				<Tab label="Employee Bio Link" />
				<Tab label="Bio Data Process" />
				<Tab label="Day Wise Report" />
				<Tab label="Monthly In-Out" />
			</Tabs>
			{tab === 0 && <BioEmpLinkTab />}
			{tab === 1 && <BioProcessTab />}
			{tab === 2 && <BioDaywiseReportTab />}
			{tab === 3 && <BioInOutReportTab />}
		</Box>
	);
}
