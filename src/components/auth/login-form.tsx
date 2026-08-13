"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
// import { cn } from "../../utils/protected"
import { Loader2, Eye, EyeOff } from "lucide-react"
// import { setUser } from "@/utils/auth"
// import { urlcheck } from "@/utils/auth";
//import axios from "axios"
import Swal from "sweetalert2";
import { login,loginConsole } from "@/components/auth/login_auth"
import { Autocomplete, TextField } from "@mui/material"
import { fetchWithCookie } from "@/utils/apiClient2"
import { apiRoutes } from "@/utils/api"
import type { Company } from "@/components/dashboard/sidebarContext"

interface LoginFormsProps {
  subdomain: string | null;
}
// Moved inside the LoginForm function to avoid undefined error
const formSchema = z.object({
  username: z.string().min(1,"user name must be 1 charecter"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
  loginType: z.string().optional(),
})

export function LoginForm({ subdomain }: LoginFormsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [autoLoginType, setAutoLoginType] = useState<string | null>(null);
  const router = useRouter()

  // ─── Step 2: company / branch, chosen AFTER signing in ───────────
  // The list is the authenticated menu tree, so it already contains only what
  // this user is mapped to — nothing to re-verify, and it carries the menus the
  // portal renders.
  const [step, setStep] = useState<"credentials" | "scope">("credentials")
  const [companies, setCompanies] = useState<Company[]>([])
  const [coId, setCoId] = useState<number | "">("")
  const [branchIds, setBranchIds] = useState<number[]>([])

  const selectedCo = companies.find((c) => c.co_id === coId) ?? null

  const goTo = (path: string) => {
    const { host, protocol } = window.location
    window.location.replace(`${protocol}//${host}${path}`)
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
      loginType: "portal",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Choose the login function based on subdomain or selected loginType
      const loginFunction = (subdomain === "admin" || values.loginType === "admin") ? loginConsole : login;

      // Call the appropriate login function
      const data = await loginFunction(
        values.username,
        values.password,
        values.loginType || "portal",
        values.rememberMe
      );

      // Check if login was successful (status should be 200)
      if (data.status === 200) {
        // Store user data in localStorage
        if (data.user_id) {
          localStorage.setItem("user_id", data.user_id.toString());
        }


        if (subdomain) {
          localStorage.setItem("subdomain", subdomain);
        }

        // Admin destinations carry no company/branch scope — go straight there.
        if (subdomain === "admin") {
          goTo('/dashboardctrldesk');
          return;
        }
        if (values.loginType !== "portal") {
          goTo('/dashboardadmin');
          return;
        }

        // Portal: load the companies this user is actually mapped to, then let
        // them pick one in step 2.
        const result = await fetchWithCookie(apiRoutes.PORTAL_MENU_ITEMS, "GET");
        const entitled = Array.isArray(result.data) ? (result.data as Company[]) : [];

        if (entitled.length === 0) {
          Swal.fire({
            title: "No company access",
            text: "Your account is not mapped to any company or branch. Contact your administrator.",
            icon: "error",
            confirmButtonText: "OK",
          });
          setIsLoading(false);
          return;
        }

        setCompanies(entitled);
        setStep("scope");
        setIsLoading(false);
      } else {
        // Handle login failure
        Swal.fire({
          title: "Login Failed",
          text: data.message || "Invalid username or password",
          icon: "error",
          confirmButtonText: "OK",
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);

      // Extract error message from various error formats
      const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong during login.";

      Swal.fire({
        title: "Login Failed",
        text: errMsg,
        icon: "error",
        confirmButtonText: "OK",
      });
      setIsLoading(false);
    }
  }

  // Step 2 — the picked scope came from the authenticated list, so it just gets
  // persisted for the sidebar to read.
  function handleSelectScope() {
    if (!selectedCo || branchIds.length === 0) return;
    localStorage.setItem("sidebar_companies", JSON.stringify(companies));
    localStorage.setItem("sidebar_selectedCompany", JSON.stringify(selectedCo));
    localStorage.setItem("sidebar_selectedBranches", JSON.stringify(branchIds));
    goTo('/dashboardportal');
  }

  useEffect(() => {
    if (subdomain === "admin") {
      setAutoLoginType("admin"); // Set AutoLoginType explicitly to admin
    } else {
      setAutoLoginType(null); // Default Portal Login
    }
  }, [subdomain]);

  return (
    <div className="login-glow rounded-2xl border-2 border-[hsl(var(--brand-primary))] bg-white px-6 py-5">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-[hsl(var(--brand-secondary))]">
          {step === "scope" ? "Select company" : "Sign in"}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {step === "scope"
            ? "Choose the company and branch to work in"
            : autoLoginType === "admin"
              ? "Administrator sign in"
              : "Enter your credentials to continue"}
        </p>
      </div>

      {step === "credentials" ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 text-sm">
            {/* 1. User name */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">User Name</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9 text-sm"
                      placeholder="User Name"
                      autoComplete="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        className="h-9 pr-10 text-sm"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 3. Admin / Portal — only when the subdomain hasn't already decided */}
            {autoLoginType === null && (
              <div className="flex items-center justify-between mt-0">
                <FormField
                  control={form.control}
                  name="loginType"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="radio"
                          id="adminLogin"
                          value="admin"
                          checked={field.value === "admin"}
                          onChange={() => field.onChange("admin")}
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel htmlFor="adminLogin" className="text-sm">
                        Admin Login
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loginType"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="radio"
                          id="portalLogin"
                          value="portal"
                          checked={field.value === "portal"}
                          onChange={() => field.onChange("portal")}
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel htmlFor="portalLogin" className="text-sm">
                        Portal Login
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-0">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">Keep me signed in</FormLabel>
                  </FormItem>
                )}
              />
              <Button className="text-sm text-blue-600">
                Forgot Password?
              </Button>
            </div>

            <Button
              type="submit"
              className={`w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </Form>
      ) : (
        <div className="space-y-3 text-sm">
          {/* 4. Company — the signed-in user's own list */}
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="login-company">Company</label>
            <Autocomplete
              id="login-company"
              options={companies}
              value={selectedCo}
              onChange={(_, picked) => {
                setCoId(picked ? picked.co_id : "");
                // Default to the company's first branch.
                setBranchIds(picked?.branches.length ? [picked.branches[0].branch_id] : []);
              }}
              getOptionLabel={(c) => c.co_name}
              isOptionEqualToValue={(o, v) => o.co_id === v.co_id}
              size="small"
              autoHighlight
              openOnFocus
              noOptionsText="No matching company"
              slotProps={{ listbox: { sx: { fontSize: 13 } } }}
              sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Type to search company..." />
              )}
            />
          </div>

          {/* 5. Branch — driven by the company above */}
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="login-branch">Branch</label>
            {selectedCo?.branches.length === 1 ? (
              // Nothing to choose — show the branch plainly. (Autocomplete's
              // own readOnly leaves the clear/dropdown/delete controls live.)
              <TextField
                id="login-branch"
                size="small"
                fullWidth
                value={selectedCo.branches[0].branch_name}
                slotProps={{ input: { readOnly: true } }}
                sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
              />
            ) : (
              <Autocomplete
                id="login-branch"
                multiple
                disabled={!selectedCo}
                options={selectedCo?.branches ?? []}
                value={(selectedCo?.branches ?? []).filter((b) => branchIds.includes(b.branch_id))}
                onChange={(_, picked) => setBranchIds(picked.map((b) => b.branch_id))}
                getOptionLabel={(b) => b.branch_name}
                isOptionEqualToValue={(o, v) => o.branch_id === v.branch_id}
                size="small"
                autoHighlight
                openOnFocus
                noOptionsText="No matching branch"
                slotProps={{ listbox: { sx: { fontSize: 13 } } }}
                sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
                renderInput={(params) => (
                  <TextField {...params} placeholder={selectedCo ? "Select branch(es)..." : "Select a company first"} />
                )}
              />
            )}
          </div>

          {/* 6. Select — enters the portal with the chosen scope */}
          <Button
            type="button"
            onClick={handleSelectScope}
            className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white"
            disabled={!selectedCo || branchIds.length === 0}
          >
            Select
          </Button>
        </div>
      )}
    </div>
  )
}
