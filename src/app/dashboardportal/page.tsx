"use client"

import { useEffect, useState } from "react"
import CompanyMark from "@/components/ui/CompanyMark"
import InfoSkyMark from "@/components/ui/InfoSkyMark"
import { useSidebarContext } from "@/components/dashboard/sidebarContext"
import { brand } from "@/styles/brand"

// ponytail: static splash — the old cards showed hardcoded fake figures.
// Wire real KPI widgets here when the dashboard endpoints exist.
export default function DashboardPage() {
  const { selectedCompany } = useSidebarContext()

  // Company/branch reach the context from localStorage via its lazy initialiser,
  // so they are absent on the server and present on the client's first render.
  // Gate them once here or the splash hydrates mismatched.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const coName = mounted ? selectedCompany?.co_name ?? "" : ""

  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center overflow-hidden p-6">
      {/* Soft brand wash behind the lockup */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at 50% 42%, ${brand.green}14, transparent 70%),
                       radial-gradient(70% 60% at 50% 100%, ${brand.navyInk}0f, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-col items-center text-center">
        {/* Mark with a rotating orbit ring — the company's own logo when it has
            uploaded one, otherwise the ERP developer's mark. */}
        <div className="is-rise relative mb-7 flex h-40 w-40 items-center justify-center">
          <div
            aria-hidden
            className="is-orbit absolute inset-0 rounded-full border-2 border-dashed"
            style={{ borderColor: brand.green }}
          />
          <div
            aria-hidden
            className="is-breathe absolute inset-5 rounded-full"
            style={{ background: `${brand.green}12` }}
          />
          <CompanyMark size={96} className="logo-glow relative" />
        </div>

        <h1
          className="is-rise max-w-3xl text-3xl font-bold tracking-[0.14em] sm:text-4xl"
          style={{ color: brand.navyInk, animationDelay: "120ms" }}
        >
          {coName || "IS ERP SOFTWARE"}
        </h1>

        <div
          className="is-rise mt-5 h-px w-64 sm:w-80"
          style={{
            animationDelay: "220ms",
            background: `linear-gradient(90deg, transparent, ${brand.navyInk}40 20%, ${brand.green} 50%, ${brand.navyInk}40 80%, transparent)`,
          }}
        />

        <p
          className="is-rise mt-5 text-base font-semibold tracking-[0.3em]"
          style={{ color: brand.navyInk, animationDelay: "300ms" }}
        >
          ERP SOFTWARE
        </p>

        {/* Developer credit — the InfoSky mark stays put even when the company
            has its own logo above. */}
        <div
          className="is-rise mt-12 flex flex-col items-center gap-2"
          style={{ animationDelay: "520ms" }}
        >
          <div className="flex items-center gap-2">
            <InfoSkyMark size={20} />
            <span
              className="text-[11px] font-semibold tracking-[0.18em]"
              style={{ color: brand.navyInk }}
            >
              DEVELOPED BY INFOSKY GLOBAL IT SOLUTIONS LLP
            </span>
          </div>
          <p className="text-[11px] tracking-wide" style={{ color: `${brand.navyInk}99` }}>
            © {new Date().getFullYear()} InfoSky Global IT Solutions LLP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
