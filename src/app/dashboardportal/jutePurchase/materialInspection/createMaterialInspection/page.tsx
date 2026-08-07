"use client";

/**
 * @page JuteGateEntryCreatePage
 * @description Create/Edit/View page for Jute Gate Entry.
 * Features:
 * - Header form with branch, date, time, challan details, vehicle, supplier, party, weights
 * - Line items table with challan and actual columns
 * - IN button for create mode, OUT button for edit mode
 * - Auto-fill from PO selection
 * - Weight calculations based on proportions
 */

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, CircularProgress } from "@mui/material";
import { ArrowLeft, Save, LogIn, CheckCircle } from "lucide-react";
import TransactionWrapper from "@/components/ui/TransactionWrapper";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// Types
import type {
	MuiFormMode,
	GateEntryFormValues,
	GateEntryLineItem,
	GateEntrySetupData,
	GateEntryDetails,
	Option,
	JuteQualityRecord,
	PODetailsForGateEntry,
} from "./types/MaterialInspectionTypes";
import { GATE_ENTRY_STATUS } from "./types/MaterialInspectionTypes";

// Constants and Utils
import {
	GATE_ENTRY_STATUS_LABELS,
	UOM_OPTIONS,
} from "./utils/MaterialInspectionConstants";
import { calculateNetWeight, calculateLineItemTotals, recalculateLineItemWeights } from "./utils/MaterialInspectionCalculations";
import {
	mapGateEntrySetupResponse,
	buildBranchOptions,
	buildSupplierOptions,
	buildMukamOptions,
	buildPOOptions,
	extractFormValuesFromDetails,
	mapLineItemsFromAPI,
	mapFormToCreatePayload,
	mapFormToUpdatePayload,
} from "./utils/MaterialInspectionMappers";

// Hooks
import { useGateEntryFormState } from "./hooks/useMaterialInspectionFormState";
import { useGateEntryLineItems } from "./hooks/useMaterialInspectionLineItems";
import { useGateEntryFormSchemas } from "./hooks/useMaterialInspectionFormSchemas";
import { useGateEntryLineItemColumns } from "./hooks/useMaterialInspectionLineItemColumns";

// Components
import { GateEntryHeaderForm, MoistureReadingDialog } from "./components";

function JuteGateEntryCreatePageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { coId } = useSelectedCompanyCoId();

	// Derive mode and ID from URL
	const modeParam = searchParams?.get("mode") ?? "create";
	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";
	const gateEntryId = searchParams?.get("id") ?? null;
	const isEditMode = mode === "edit" || (mode === "view" && gateEntryId);

	// Page-level state
	const [loading, setLoading] = React.useState(true);
	const [saving, setSaving] = React.useState(false);
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [isMounted, setIsMounted] = React.useState(false);

	// Prevent hydration mismatch
	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	// Setup data state
	const [setupData, setSetupData] = React.useState<GateEntrySetupData | null>(null);
	const [details, setDetails] = React.useState<GateEntryDetails | null>(null);

	// Cascading dropdown state
	const [parties, setParties] = React.useState<Option[]>([]);
	const [qualitiesByItem, setQualitiesByItem] = React.useState<Record<string, JuteQualityRecord[]>>({});

	// Derived options
	const branchOptions = React.useMemo(
		() => (setupData ? buildBranchOptions(setupData.branches) : []),
		[setupData]
	);
	const isSingleBranch = branchOptions.length === 1;

	const supplierOptions = React.useMemo(
		() => (setupData ? buildSupplierOptions(setupData.suppliers) : []),
		[setupData]
	);

	const mukamOptions = React.useMemo(
		() => (setupData ? buildMukamOptions(setupData.mukams) : []),
		[setupData]
	);



	// Form state hook
	const {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		bumpFormKey,
		formRef,
	} = useGateEntryFormState({ mode });

	// MuiForm echoes back only schema-defined fields; merge into prev so non-schema keys
	// (entryTime, vehicleType, outDate, outTime) are not wiped from formValues.
	// Must be a stable callback: MuiForm's onValuesChange effect re-fires on identity change.
	const handleHeaderValuesChange = React.useCallback(
		(values: GateEntryFormValues) => {
			setFormValues((prev) => ({ ...prev, ...values }));
		},
		[setFormValues]
	);

	// PO options - filtered by selected branch only (must be after formValues is available)
	const poOptions = React.useMemo(() => {
		if (!setupData) return [];
		const selectedBranchId = formValues.branch;
		
		// Filter POs by selected branch only
		let filteredPOs = setupData.open_pos;
		
		if (selectedBranchId) {
			filteredPOs = filteredPOs.filter(
				(po) => String(po.branch_id) === selectedBranchId
			);
		}
		
		return buildPOOptions(filteredPOs);
	}, [setupData, formValues.branch]);

	// Calculate header weights:
	// net_weight = gross_weight - tare_weight
	// actual_weight = net_weight - variable_shortage (used for line item distribution)
	const headerChallanWeight = parseFloat(formValues.challanWeight) || 0;
	const grossWeight = parseFloat(formValues.grossWeight) || 0;
	const tareWeight = parseFloat(formValues.tareWeight) || 0;
	const variableShortage = parseFloat(formValues.variableShortage) || 0;
	const headerNetWeight = grossWeight > 0 && tareWeight > 0 && grossWeight > tareWeight 
		? calculateNetWeight(grossWeight, tareWeight) 
		: 0;
	const headerActualWeight = headerNetWeight > 0 
		? Math.max(0, headerNetWeight - variableShortage)
		: 0;

	// Line items hook
	const {
		lineItems,
		setLineItems,
		replaceItems: replaceLineItems,
		removeLineItems,
		handleLineFieldChange,
	} = useGateEntryLineItems({
		mode,
		headerChallanWeight,
		headerActualWeight,
		getQualityOptions: (itemId) =>
			(qualitiesByItem[itemId] ?? []).map((q) => ({
				label: q.quality_name,
				value: String(q.item_id),
			})),
	});

	// Label resolvers for display
	const getItemLabel = React.useCallback(
		(itemId: string) =>
			setupData?.jute_items.find((i) => String(i.item_grp_id) === itemId)?.item_grp_desc ?? itemId,
		[setupData]
	);

	const getQualityLabel = React.useCallback(
		(qualityId: string) => {
			for (const qualities of Object.values(qualitiesByItem)) {
				const found = qualities.find((q) => String(q.item_id) === qualityId);
				if (found) return found.quality_name;
			}
			return qualityId;
		},
		[qualitiesByItem]
	);

	// Moisture dialog state
	const [moistureDialogOpen, setMoistureDialogOpen] = React.useState<string | null>(null);

	// Handler to open moisture dialog for a line item
	const handleOpenMoistureDialog = React.useCallback((lineItemId: string) => {
		setMoistureDialogOpen(lineItemId);
	}, []);

	// Handler to close moisture dialog
	const handleCloseMoistureDialog = React.useCallback(() => {
		setMoistureDialogOpen(null);
	}, []);

	// Handler to update moisture readings for a line item
	const handleMoistureChange = React.useCallback(
		(readings: number[], average: number | null) => {
			if (!moistureDialogOpen) return;
			setLineItems((prev) =>
				prev.map((li) =>
					li.id === moistureDialogOpen
						? { ...li, moistureReadings: readings, averageMoisture: average }
						: li
				)
			);
		},
		[moistureDialogOpen, setLineItems]
	);

	// Get current line item for moisture dialog
	const currentMoistureLineItem = React.useMemo(
		() => lineItems.find((li) => li.id === moistureDialogOpen),
		[lineItems, moistureDialogOpen]
	);

	// Form schema hook
	const formSchema = useGateEntryFormSchemas({
		mode,
		branchOptions,
		mukamOptions,
		supplierOptions,
		partyOptions: parties,
		poOptions,
		uomOptions: UOM_OPTIONS,
		hasSupplierSelected: Boolean(formValues.supplier),
		isSingleBranch,
		isEditMode: Boolean(isEditMode),
	});

	// Line item columns
	const lineItemColumns = useGateEntryLineItemColumns({
		canEdit: mode !== "view",
		juteItems: setupData?.jute_items ?? [],
		qualitiesByItem,
		handleLineFieldChange,
		getItemLabel,
		getQualityLabel,
		onOpenMoistureDialog: handleOpenMoistureDialog,
	});

	// Status info
	// Note: status_id remains in draft/IN state. out_time presence determines OUT state.
	const statusId = details?.status_id ?? (mode === "create" ? null : GATE_ENTRY_STATUS.IN);
	const isVehicleIn = statusId === GATE_ENTRY_STATUS.IN;
	// OUT is determined by out_time presence, NOT status_id
	const isVehicleOut = Boolean(details?.out_time);

	// Calculate net weight when gross/tare changes
	// Only calculate when both values are provided and valid
	React.useEffect(() => {
		const gross = parseFloat(formValues.grossWeight) || 0;
		const tare = parseFloat(formValues.tareWeight) || 0;
		
		// Only calculate if both values are provided and valid
		if (gross > 0 && tare > 0 && gross > tare) {
			const net = calculateNetWeight(gross, tare);
			setFormValues((prev) => {
				// Only update if the value actually changed
				if (prev.netWeight !== String(net)) {
					return { ...prev, netWeight: String(net) };
				}
				return prev;
			});
		} else if (!formValues.grossWeight && !formValues.tareWeight) {
			// Clear net weight if both inputs are empty
			setFormValues((prev) => {
				if (prev.netWeight !== "") {
					return { ...prev, netWeight: "" };
				}
				return prev;
			});
		}
	}, [formValues.grossWeight, formValues.tareWeight, setFormValues]);

	// Auto-select single branch
	React.useEffect(() => {
		if (mode === "create" && isSingleBranch && !formValues.branch && branchOptions[0]) {
			setFormValues((prev) => ({ ...prev, branch: branchOptions[0].value }));
		}
	}, [mode, isSingleBranch, formValues.branch, branchOptions, setFormValues]);

	// Flag to track when we're filling from PO selection (prevents supplier change from clearing party)
	const isFillingFromPORef = React.useRef(false);
	// Store pending party from PO selection to set after parties are loaded
	const pendingPartyFromPORef = React.useRef<string | null>(null);

	// Fetch parties when supplier changes
	const prevSupplierRef = React.useRef<string>("");
	React.useEffect(() => {
		const supplierId = formValues.supplier;
		if (supplierId === prevSupplierRef.current) return;
		prevSupplierRef.current = supplierId;

		// Only clear party if NOT coming from a PO selection
		// When PO is selected, party is set together with supplier
		if (!isFillingFromPORef.current) {
			setFormValues((prev) => ({ ...prev, party: "" }));
		}

		if (!supplierId || !coId) {
			setParties([]);
			return;
		}

		const fetchParties = async () => {
			try {
				const url = `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_PARTIES_BY_SUPPLIER}/${supplierId}?co_id=${coId}`;
				const { data, error } = await fetchWithCookie(url, "GET");
				if (error) {
					console.error("Error fetching parties:", error);
					pendingPartyFromPORef.current = null;
					isFillingFromPORef.current = false;
					return;
				}
				const result = data as Record<string, unknown>;
				const partyList = (result.parties as Array<Record<string, unknown>>) ?? [];
				setParties(
					partyList.map((p) => ({
						label: String(p.party_name ?? ""),
						value: String(p.party_id ?? ""),
					}))
				);

				// If there's a pending party from PO selection or edit load, set it now that parties are loaded
				if (pendingPartyFromPORef.current) {
					const pendingParty = pendingPartyFromPORef.current;
					// Check if the party exists in the fetched list
					const partyExists = partyList.some((p) => String(p.party_id) === pendingParty);
					if (partyExists) {
						setFormValues((prev) => ({ ...prev, party: pendingParty }));
						setInitialValues((prev) => ({ ...prev, party: pendingParty }));
						bumpFormKey();
					}
					pendingPartyFromPORef.current = null;
				}
				// Always release the flag — leaving it set would suppress the party
				// clear on the NEXT genuine supplier change
				isFillingFromPORef.current = false;
			} catch (err) {
				console.error("Error fetching parties:", err);
				pendingPartyFromPORef.current = null;
				isFillingFromPORef.current = false;
			}
		};

		void fetchParties();
	}, [formValues.supplier, coId, setFormValues, setInitialValues, bumpFormKey]);

	// Fetch qualities when item is selected in line items
	const fetchQualitiesForItem = React.useCallback(
		async (itemId: string) => {
			if (!itemId || !coId || qualitiesByItem[itemId]) return;

			try {
				const url = `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_QUALITIES_BY_ITEM}/${itemId}?co_id=${coId}`;
				const { data, error } = await fetchWithCookie(url, "GET");
				if (error) {
					console.error("Error fetching qualities:", error);
					// Cache the failure: corrupted rows can carry item ids missing from
					// masters, and an unfilled cache entry refires this fetch on every
					// lineItems change (unbounded request churn on such records).
					setQualitiesByItem((prev) => ({ ...prev, [itemId]: [] }));
					return;
				}
				const result = data as Record<string, unknown>;
				const qualityList = (result.qualities as Array<Record<string, unknown>>) ?? [];
				setQualitiesByItem((prev) => ({
					...prev,
					[itemId]: qualityList.map((q) => ({
						item_id: Number(q.item_id),
						quality_name: String(q.quality_name ?? ""),
						item_grp_id: Number(q.item_grp_id),
					})),
				}));
			} catch (err) {
				console.error("Error fetching qualities:", err);
				setQualitiesByItem((prev) => ({ ...prev, [itemId]: [] }));
			}
		},
		[coId, qualitiesByItem]
	);

	// Watch line items for item changes to fetch qualities
	React.useEffect(() => {
		for (const li of lineItems) {
			if (li.challanItem && !qualitiesByItem[li.challanItem]) {
				void fetchQualitiesForItem(li.challanItem);
			}
			if (li.actualItem && !qualitiesByItem[li.actualItem]) {
				void fetchQualitiesForItem(li.actualItem);
			}
		}
	}, [lineItems, qualitiesByItem, fetchQualitiesForItem]);

	// Handle PO selection - auto-fill data
	const prevPoIdRef = React.useRef<string>("");
	React.useEffect(() => {
		const poId = formValues.poId;
		if (poId === prevPoIdRef.current) return;
		const priorPoId = prevPoIdRef.current;
		const hadPo = priorPoId !== "";
		prevPoIdRef.current = poId;

		if (mode === "view" || !coId) return;

		// Lines derive from the PO: a USER PO change (edit load pre-syncs the ref,
		// so it never lands here) replaces the grid; clearing the PO blanks it.
		// Safe in edit since complete_inspection reconciles rows to the payload —
		// replaced lines go up without ids and the old rows are deactivated.
		if (!poId) {
			if (hadPo) replaceLineItems([]);
			return;
		}

		const fetchPODetails = async () => {
			try {
				const url = `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_PO_DETAILS}/${poId}?co_id=${coId}`;
				const { data, error } = await fetchWithCookie(url, "GET");
				if (error) {
					console.error("Error fetching PO details:", error);
					// Failed fetch: revert the PO selection so the header doesn't point
					// at a PO whose lines never loaded (grid still shows the old lines)
					if (prevPoIdRef.current === poId) {
						prevPoIdRef.current = priorPoId;
						setFormValues((prev) => ({ ...prev, poId: priorPoId }));
					}
					return;
				}
				const poData = data as PODetailsForGateEntry;

				// Stale response: the user changed the PO again while this fetch was in flight
				if (prevPoIdRef.current !== poId) return;

				// Set flag before updating to prevent supplier useEffect from clearing party
				isFillingFromPORef.current = true;
				
				// Store the party from PO to set after parties are loaded
				if (poData.party_id) {
					pendingPartyFromPORef.current = String(poData.party_id);
				}

				// Auto-fill supplier, mukam, and uom from PO
				// Party will be set after parties dropdown is loaded (handled in fetchParties)
				const newValues = {
					supplier: String(poData.supplier_id ?? ""),
					mukam: poData.mukam_id ? String(poData.mukam_id) : "",
					juteUom: poData.jute_uom ?? "",
				};
				
				setFormValues((prev) => ({ ...prev, ...newValues }));
				setInitialValues((prev) => ({ ...prev, ...newValues }));
				bumpFormKey();

				// Same-supplier PO switch: the supplier effect won't re-run (value
				// unchanged), so nothing would consume the pending party or release
				// the fill flag — do both here
				if (newValues.supplier === formValues.supplier) {
					const pendingParty = pendingPartyFromPORef.current;
					pendingPartyFromPORef.current = null;
					isFillingFromPORef.current = false;
					if (pendingParty && parties.some((p) => p.value === pendingParty)) {
						setFormValues((prev) => ({ ...prev, party: pendingParty }));
						setInitialValues((prev) => ({ ...prev, party: pendingParty }));
						bumpFormKey();
					}
				}

				// Auto-fill line items from PO — unconditional: an empty PO yields an
				// empty grid (lines derive from the PO)
				{
					const newLineItems: GateEntryLineItem[] = (poData.line_items ?? []).map((poli) => ({
						id: `ge-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						jute_mr_li_id: null,  // New lines from PO don't have a database ID yet
						jutePoLiId: String(poli.jute_po_li_id),  // Link to PO line item
					challanItem: poli.item_grp_id ? String(poli.item_grp_id) : "",
					challanQuality: poli.item_id ? String(poli.item_id) : "",
					challanQty: poli.quantity ? String(poli.quantity) : "",
					challanWeight: "",
					juteUom: poli.jute_uom ?? poData.jute_uom ?? "",
					actualItem: poli.item_grp_id ? String(poli.item_grp_id) : "",
						actualQuality: poli.item_id ? String(poli.item_id) : "",
						actualQty: poli.quantity ? String(poli.quantity) : "",
						actualWeight: "",
						allowableMoisture: poli.allowable_moisture != null ? String(poli.allowable_moisture) : "",  // Copy from PO
						remarks: "",
						moistureReadings: [],  // Initialize empty moisture readings
						averageMoisture: null,
					}));
					
					// Recalculate weights based on header values before replacing
					const currentChallanWeight = parseFloat(formValues.challanWeight) || 0;
					const currentGross = parseFloat(formValues.grossWeight) || 0;
					const currentTare = parseFloat(formValues.tareWeight) || 0;
					const currentVariableShortage = parseFloat(formValues.variableShortage) || 0;
					const currentNetWeight = currentGross > 0 && currentTare > 0 ? currentGross - currentTare : 0;
					const currentActualWeight = currentNetWeight > 0 ? Math.max(0, currentNetWeight - currentVariableShortage) : 0;
					
					const lineItemsWithWeights = recalculateLineItemWeights(newLineItems, currentChallanWeight, currentActualWeight);
					replaceLineItems(lineItemsWithWeights);
				}
			} catch (err) {
				console.error("Error fetching PO details:", err);
			}
		};

		void fetchPODetails();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formValues.poId, coId, mode, setFormValues, setInitialValues, bumpFormKey, replaceLineItems]);

	// Fetch setup data
	React.useEffect(() => {
		if (!coId) return;

		const fetchSetup = async () => {
			setLoading(true);
			setPageError(null);

			try {
				const url = `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_CREATE_SETUP}?co_id=${coId}`;
				const { data, error } = await fetchWithCookie(url, "GET");

				if (error) {
					setPageError(error);
					setLoading(false);
					return;
				}

				const setup = mapGateEntrySetupResponse(data);
				setSetupData(setup);

				// If edit/view mode and we have an ID, fetch details
				if (gateEntryId && (mode === "edit" || mode === "view")) {
					const detailsUrl = `${apiRoutesPortalMasters.JUTE_GATE_ENTRY_BY_ID}/${gateEntryId}?co_id=${coId}`;
					const { data: detailsData, error: detailsError } = await fetchWithCookie(
						detailsUrl,
						"GET"
					);

					if (detailsError) {
						setPageError(detailsError);
						setLoading(false);
						return;
					}

					const entryDetails = detailsData as GateEntryDetails;
					setDetails(entryDetails);

					// Map details to form values
					const mappedFormValues = extractFormValuesFromDetails(entryDetails);
					// The supplier effect treats this programmatic supplier change like a
					// user edit and clears party; route the saved party through the
					// pending-party restore instead so it survives the parties fetch
					if (mappedFormValues.supplier) {
						isFillingFromPORef.current = true;
						pendingPartyFromPORef.current = mappedFormValues.party || null;
					}
					setInitialValues(mappedFormValues);
					setFormValues(mappedFormValues);

					// Sync PO ref so the PO auto-fill effect doesn't re-trigger
					// and overwrite saved line items with PO-sourced ones (jute_mr_li_id=null)
					if (mappedFormValues.poId) {
						prevPoIdRef.current = mappedFormValues.poId;
					}

					// Map line items
					if (entryDetails.line_items && entryDetails.line_items.length > 0) {
						const mappedLineItems = mapLineItemsFromAPI(entryDetails.line_items);
						replaceLineItems(mappedLineItems);
					}

					bumpFormKey();
				}

				setLoading(false);
			} catch (err) {
				setPageError(err instanceof Error ? err.message : "Failed to load setup data");
				setLoading(false);
			}
		};

		void fetchSetup();
	}, [coId, gateEntryId, mode, setInitialValues, setFormValues, replaceLineItems, bumpFormKey]);

	// Form submission
	const handleFormSubmit = React.useCallback(async () => {
		if (!coId) return;

		// Validate required fields for save action
		// For material inspection, entryTime is not required as it comes from gate entry
		const requiredFields = [
			"branch",
			"entryDate",
			"vehicleNo",
			"driverName",
			"grossWeight",
		] as const;

		for (const field of requiredFields) {
			if (!formValues[field]) {
				setPageError(`Please fill in the required field: ${field}`);
				return;
			}
		}

		// Validate weights are positive
		const grossWeight = parseFloat(formValues.grossWeight) || 0;
		const tareWeight = parseFloat(formValues.tareWeight) || 0;

		if (grossWeight <= 0) {
			setPageError("Gross weight must be greater than 0");
			return;
		}
		// Only validate gross > tare if tare weight is provided
		if (tareWeight > 0 && grossWeight <= tareWeight) {
			setPageError("Gross weight must be greater than tare weight");
			return;
		}

		// Line items are optional for IN action

		setSaving(true);
		setPageError(null);

		try {
			if (mode === "create") {
				const payload = mapFormToCreatePayload(formValues, lineItems, parseInt(coId, 10));
				const { data, error } = await fetchWithCookie(
					apiRoutesPortalMasters.JUTE_GATE_ENTRY_CREATE,
					"POST",
					payload
				);

				if (error) {
					setPageError(error);
					setSaving(false);
					return;
				}

				const result = data as { jute_gate_entry_id: number };
				// Redirect to edit mode
				router.push(
					`/dashboardportal/jutePurchase/gateEntry/createGateEntry?mode=edit&id=${result.jute_gate_entry_id}`
				);
			} else if (mode === "edit" && gateEntryId) {
				// Build line items payload for save
				const filledLines = lineItems.filter((li) => li.actualItem || li.challanItem || li.jute_mr_li_id);
				const lineItemsPayload = filledLines.map((li) => ({
					jute_mr_li_id: li.jute_mr_li_id ? Number(li.jute_mr_li_id) : 0,
					jute_po_li_id: li.jutePoLiId ? Number(li.jutePoLiId) : null,
					challan_item_id: li.challanQuality ? Number(li.challanQuality) : null,
					challan_quantity: li.challanQty ? parseFloat(li.challanQty) : null,
					challan_weight: li.challanWeight ? parseFloat(li.challanWeight) : null,
					actual_item_id: li.actualQuality ? Number(li.actualQuality) : null,
					actual_qty: li.actualQty ? parseFloat(li.actualQty) : null,
					actual_weight: li.actualWeight ? parseFloat(li.actualWeight) : null,
					unit_conversion: li.juteUom || null,
					allowable_moisture: li.allowableMoisture ? parseFloat(li.allowableMoisture) : null,
					moisture_readings: (li.moistureReadings ?? []).map((r) => ({
						moisture_percentage: r,
					})),
					remarks: li.remarks || null,
				}));

				// Parse weight values
				const grossWeightNum = formValues.grossWeight ? parseFloat(String(formValues.grossWeight)) : null;
				const tareWeightNum = formValues.tareWeight ? parseFloat(String(formValues.tareWeight)) : null;
				const challanWeightNum = formValues.challanWeight ? parseFloat(String(formValues.challanWeight)) : null;
				const variableShortageNum = formValues.variableShortage ? parseFloat(String(formValues.variableShortage)) : null;

				const payload: Record<string, unknown> = {
					jute_mr_id: Number(gateEntryId),
					save_only: true,
					branch_id: formValues.branch ? parseInt(String(formValues.branch), 10) : null,
					jute_gate_entry_date: formValues.entryDate || null,
					in_time: formValues.entryTime || null,
					out_date: formValues.outDate || null,
					out_time: formValues.outTime || null,
					challan_no: formValues.challanNo || null,
					challan_date: formValues.challanDate || null,
					challan_weight: challanWeightNum,
					vehicle_no: formValues.vehicleNo || null,
					driver_name: formValues.driverName || null,
					transporter: formValues.transporter || null,
					// 0 = explicit PO detach (null means "not provided" server-side)
					po_id: formValues.poId ? parseInt(String(formValues.poId), 10) : 0,
					jute_uom: formValues.juteUom || null,
					mukam_id: formValues.mukam ? parseInt(String(formValues.mukam), 10) : null,
					jute_supplier_id: formValues.supplier ? parseInt(String(formValues.supplier), 10) : null,
					party_id: formValues.party ? parseInt(String(formValues.party), 10) : null,
					gross_weight: grossWeightNum,
					tare_weight: tareWeightNum,
					variable_shortage: variableShortageNum,
					marketing_slip: formValues.marketingSlip ? 1 : 0,
					remarks: formValues.remarks || null,
					line_items: lineItemsPayload,
					// The user removed every line: tells the reconcile an empty set is
					// intentional (all rows deactivate) rather than a legacy omission
					lines_cleared: lineItemsPayload.length === 0,
				};

				// Only include net_weight if tare_weight is entered
				if (tareWeightNum !== null && tareWeightNum > 0) {
					payload.net_weight = formValues.netWeight ? parseFloat(String(formValues.netWeight)) : null;
				}

				const { error } = await fetchWithCookie(
					`${apiRoutesPortalMasters.JUTE_MATERIAL_INSPECTION_COMPLETE}?co_id=${coId}`,
					"POST",
					payload
				);

				if (error) {
					setPageError(error);
					setSaving(false);
					return;
				}

				// Refresh page
				window.location.reload();
			}
		} catch (err) {
			setPageError(err instanceof Error ? err.message : "Failed to save gate entry");
		} finally {
			setSaving(false);
		}
	}, [coId, formValues, lineItems, mode, gateEntryId, router]);

	// Handle IN action (create mode submit)
	const handleInAction = React.useCallback(async () => {
		await handleFormSubmit();
	}, [handleFormSubmit]);

	// Handle QC Complete action (edit mode)
	const handleQCComplete = React.useCallback(async () => {
		if (!coId || !gateEntryId) return;

		// Send the record's FULL line set (same filter as Save): the backend
		// reconciles rows to the payload, so omitting challan-only lines here
		// would silently deactivate them
		const filledLines = lineItems.filter((li) => li.actualItem || li.challanItem || li.jute_mr_li_id);
		const actualLines = filledLines.filter((li) => li.actualItem);

		// Validate that actual lines have quality and qty (weights are optional)
		const incompleteLines = actualLines.filter(
			(li) => !li.actualQuality || !li.actualQty
		);
		if (incompleteLines.length > 0) {
			setPageError("Please fill in Actual Quality and Actual Qty for all line items");
			return;
		}

		if (actualLines.length === 0) {
			setPageError("Please fill in at least one line item with actual data before completing QC");
			return;
		}

		setSaving(true);
		setPageError(null);

		try {
			// Build complete line items payload with all challan and actual fields
			const lineItemsPayload = filledLines.map((li) => ({
				jute_mr_li_id: li.jute_mr_li_id ? Number(li.jute_mr_li_id) : 0,
				jute_po_li_id: li.jutePoLiId ? Number(li.jutePoLiId) : null,
				// Challan data
				challan_item_id: li.challanQuality ? Number(li.challanQuality) : null,
				challan_quantity: li.challanQty ? parseFloat(li.challanQty) : null,
				challan_weight: li.challanWeight ? parseFloat(li.challanWeight) : null,
				// Actual data
				actual_item_id: li.actualQuality ? Number(li.actualQuality) : null,
				actual_qty: li.actualQty ? parseFloat(li.actualQty) : null,
				actual_weight: li.actualWeight ? parseFloat(li.actualWeight) : null,
				// UOM
				unit_conversion: li.juteUom || null,
				// Moisture
				allowable_moisture: li.allowableMoisture ? parseFloat(li.allowableMoisture) : null,
				moisture_readings: (li.moistureReadings ?? []).map((r) => ({
					moisture_percentage: r,
				})),
				remarks: li.remarks || null,
			}));

			// Parse weight values
			const grossWeightNum = formValues.grossWeight ? parseFloat(String(formValues.grossWeight)) : null;
			const tareWeightNum = formValues.tareWeight ? parseFloat(String(formValues.tareWeight)) : null;
			const challanWeightNum = formValues.challanWeight ? parseFloat(String(formValues.challanWeight)) : null;
			const variableShortageNum = formValues.variableShortage ? parseFloat(String(formValues.variableShortage)) : null;

			// Build complete header payload with all form values
			const payload: Record<string, unknown> = {
				jute_mr_id: Number(gateEntryId),
				// Header fields
				branch_id: formValues.branch ? parseInt(String(formValues.branch), 10) : null,
				jute_gate_entry_date: formValues.entryDate || null,
				in_time: formValues.entryTime || null,
				out_date: formValues.outDate || null,
				out_time: formValues.outTime || null,
				challan_no: formValues.challanNo || null,
				challan_date: formValues.challanDate || null,
				challan_weight: challanWeightNum,
				vehicle_no: formValues.vehicleNo || null,
				vehicle_type_id: formValues.vehicleType ? parseInt(String(formValues.vehicleType), 10) : null,
				driver_name: formValues.driverName || null,
				transporter: formValues.transporter || null,
				// 0 = explicit PO detach (null means "not provided" server-side)
				po_id: formValues.poId ? parseInt(String(formValues.poId), 10) : 0,
				jute_uom: formValues.juteUom || null,
				mukam_id: formValues.mukam ? parseInt(String(formValues.mukam), 10) : null,
				jute_supplier_id: formValues.supplier ? parseInt(String(formValues.supplier), 10) : null,
				party_id: formValues.party ? parseInt(String(formValues.party), 10) : null,
				gross_weight: grossWeightNum,
				tare_weight: tareWeightNum,
				variable_shortage: variableShortageNum,
				marketing_slip: formValues.marketingSlip ? 1 : 0,
				remarks: formValues.remarks || null,
				// Line items
				line_items: lineItemsPayload,
			};

			// Only include net_weight if tare_weight is entered
			if (tareWeightNum !== null && tareWeightNum > 0) {
				payload.net_weight = formValues.netWeight ? parseFloat(String(formValues.netWeight)) : null;
			}

			const { error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.JUTE_MATERIAL_INSPECTION_COMPLETE}?co_id=${coId}`,
				"POST",
				payload
			);

			if (error) {
				setPageError(error);
				setSaving(false);
				return;
			}

			// Redirect to material inspection index page
			router.push("/dashboardportal/jutePurchase/materialInspection");
		} catch (err) {
			setPageError(err instanceof Error ? err.message : "Failed to mark QC as complete");
		} finally {
			setSaving(false);
		}
	}, [coId, gateEntryId, lineItems, formValues, router]);

	// Handle back button
	const handleBack = React.useCallback(() => {
		router.push("/dashboardportal/jutePurchase/materialInspection");
	}, [router]);

	// Line item totals
	const lineItemTotals = React.useMemo(() => calculateLineItemTotals(lineItems), [lineItems]);

	// Actions - using TransactionAction type expected by TransactionWrapper
	type TransactionAction = {
		label: string;
		onClick: () => void;
		disabled?: boolean;
		loading?: boolean;
		hidden?: boolean;
		variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
		startIcon?: React.ReactNode;
	};

	const actions = React.useMemo((): TransactionAction[] => {
		const actionButtons: TransactionAction[] = [];

		// Back button
		actionButtons.push({
			label: "Back",
			onClick: handleBack,
			variant: "outline",
			startIcon: <ArrowLeft className="h-4 w-4" />,
		});

		if (mode === "view") {
			// View mode - no action buttons except back
			return actionButtons;
		}

		if (mode === "create") {
			// Create mode - IN button
			actionButtons.push({
				label: "IN",
				onClick: handleInAction,
				disabled: saving,
				loading: saving,
				variant: "default",
				startIcon: <LogIn className="h-4 w-4" />,
			});
		} else if (mode === "edit") {
			// Edit mode - Save and QC Complete buttons
			actionButtons.push({
				label: "Save",
				onClick: handleFormSubmit,
				disabled: saving,
				loading: saving,
				variant: "outline",
				startIcon: <Save className="h-4 w-4" />,
			});

			// QC Complete button
			actionButtons.push({
				label: "QC Complete",
				onClick: handleQCComplete,
				disabled: saving,
				loading: saving,
				variant: "default",
				startIcon: <CheckCircle className="h-4 w-4" />,
			});
		}

		return actionButtons;
	}, [mode, saving, handleBack, handleInAction, handleFormSubmit, handleQCComplete]);

	// Status chip - using object format expected by TransactionWrapper
	type StatusChipType = { label: string; color?: "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" };

	const statusChip = React.useMemo((): StatusChipType => {
		if (mode === "create") {
			return { label: "New Entry", color: "default" };
		}
		if (isVehicleOut) {
			return { label: "OUT", color: "success" };
		}
		if (isVehicleIn) {
			return { label: "IN", color: "info" };
		}
		return { label: GATE_ENTRY_STATUS_LABELS[statusId ?? 1] ?? "Unknown", color: "default" };
	}, [mode, statusId, isVehicleIn, isVehicleOut]);

	// Title
	const pageTitle = React.useMemo(() => {
		if (mode === "create") return "Quality Check";
		if (mode === "edit") return `Edit Quality Check #${details?.entry_branch_seq ?? gateEntryId}`;
		return `Quality Check #${details?.entry_branch_seq ?? gateEntryId}`;
	}, [mode, details, gateEntryId]);

	// Loading state
	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<CircularProgress />
			</div>
		);
	}

	// Error state
	if (pageError && !setupData) {
		return (
			<div className="p-4">
				<Alert severity="error">{pageError}</Alert>
			</div>
		);
	}

	return (
		<TransactionWrapper
			title={pageTitle}
			loading={loading}
			statusChip={statusChip}
			primaryActions={actions}
			lineItems={{
				items: lineItems,
				columns: lineItemColumns,
				getItemId: (item: GateEntryLineItem) => item.id,
				canEdit: mode !== "view",
				onRemoveSelected: removeLineItems,
				title: "Line Items",
				subtitle: `${lineItemTotals.validLineCount} items | Challan Qty: ${lineItemTotals.totalChallanQty.toFixed(2)} | Actual Qty: ${lineItemTotals.totalActualQty.toFixed(2)}`,
			}}
			alerts={
				pageError ? (
					<Alert severity="error" onClose={() => setPageError(null)}>
						{pageError}
					</Alert>
				) : null
			}
		>

			{isMounted && (
				<GateEntryHeaderForm
					schema={formSchema}
					formKey={formKey}
					initialValues={formValues}
					mode={mode}
					formRef={formRef}
					onSubmit={handleFormSubmit}
					onValuesChange={handleHeaderValuesChange}
				/>
			)}

			{/* Moisture Reading Dialog */}
			{currentMoistureLineItem && (
				<MoistureReadingDialog
					open={Boolean(moistureDialogOpen)}
					onClose={handleCloseMoistureDialog}
					readings={currentMoistureLineItem.moistureReadings ?? []}
					onChange={handleMoistureChange}
					lineItemLabel={`${getItemLabel(currentMoistureLineItem.actualItem || currentMoistureLineItem.challanItem)} - ${getQualityLabel(currentMoistureLineItem.actualQuality || currentMoistureLineItem.challanQuality)}`}
				/>
			)}
		</TransactionWrapper>
	);
}

export default function JuteGateEntryCreatePage() {
	return (
		<Suspense
			fallback={
				<div className="flex justify-center items-center min-h-100">
					<CircularProgress />
				</div>
			}
		>
			<JuteGateEntryCreatePageContent />
		</Suspense>
	);
}
