# Finishing Department — Spec Sheet (pointer)

> **Full spec lives in the backend repo:**
> [`../../../../../vowerp3be/docs/finishing-department-spec-sheet.md`](../../../../../vowerp3be/docs/finishing-department-spec-sheet.md)
> (path: `vowerp3be/docs/finishing-department-spec-sheet.md`).

**Status:** DESIGN / SPEC ONLY — no code yet. Review/red-line before build.

## What it covers
A new **Finishing** feature for jute **Hessian cloth** + **Jute bags**, modelled
**per sub-process**: Damping → Calendering → Lapping → Cutting → Hemming → Bale Press.
It reuses the `spngTargetMap` / `beamingTargetMap` applicable-parameters pattern (EAV,
effective-dated, generic `TargetGrid`) for the **Finishing Spec Sheet**, adds per-process
**production entry** pages, and a new **Finishing SQC** page for **actual operating
parameters** only. (Quality lab testing — GSM/strength/moisture/etc. — is **deferred** and
will be added/wired in later if required.)

## Frontend surface (planned — see full spec §7)
- `juteProduction/masters/finishingQualityMaster/` — cloth & bag qualities
- `juteProduction/masters/finishingSpecSheet/` — spec sheet (Process + Type + Role + Date)
- `juteProduction/finishing/{damping,calendering,lapping,cutting,hemming,balePress}/` — entry
- `juteSQC/finishing/` — new SQC tile, **Actual Params only** (quality lab tests deferred)
- Route constants in `src/utils/api.ts`: `FINISHING_TARGET_MAP_*`, `FINISHING_QUALITY_*`,
  `FINISHING_PROD_*`, `FINISHING_SQC_*` (style of `BEAMING_TARGET_MAP_*`).

## Key references already in this repo
- `juteProduction/masters/beamingTargetMap/` — pattern to clone (page + TargetMapEditor + TargetGrid)
- `juteSQC/page.tsx`, `juteSQC/spinning`, `juteSQC/beaming` — SQC tiles + actuals via TargetMapEditor

See the backend spec for the full data model, formulas (F1–F9), parameter matrix, endpoints,
menu seeds, build sequencing, and the open decisions to confirm.
