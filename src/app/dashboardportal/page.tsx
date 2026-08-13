"use client"

import InfoSkyMark from "@/components/ui/InfoSkyMark"
import { brand } from "@/styles/brand"

// ponytail: static splash — the old cards showed hardcoded fake figures.
// Wire real KPI widgets here when the dashboard endpoints exist.
export default function DashboardPage() {
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
        {/* Mark with a rotating orbit ring */}
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
          <InfoSkyMark size={96} className="logo-glow relative" />
        </div>

        <h1
          className="is-rise text-4xl font-bold tracking-[0.18em] sm:text-5xl"
          style={{ color: brand.navyInk, animationDelay: "120ms" }}
        >
          IS ERP SOFTWARE
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
          INFOSKY GLOBAL
        </p>
        <p
          className="is-rise mt-2 text-[11px] font-semibold tracking-[0.45em]"
          style={{ color: brand.green, animationDelay: "380ms" }}
        >
          IT SOLUTIONS
        </p>

        <p
          className="is-rise mt-12 text-[11px] tracking-wide"
          style={{ color: `${brand.navyInk}99`, animationDelay: "520ms" }}
        >
          © {new Date().getFullYear()} InfoSky Global IT Solutions. All rights reserved.
        </p>
      </div>
    </div>
  )
}
