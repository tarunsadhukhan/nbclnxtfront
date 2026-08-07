---
name: add-approval-workflow
description: Add the standard VoWERP3 approval workflow to a transaction — backend endpoints (/open, /cancel, /send-for-approval, /approve, /reject, /reopen) plus frontend ApprovalActionsBar wiring and approval hook. Use when a transaction page needs the 21→1→20→3/4/6 status lifecycle. Asks transaction, approval levels, and reopen target first.
---

# Skill: add-approval-workflow (pointer)

The canonical skill lives in the backend repo:
**`../vowerp3be/.claude/skills/add-approval-workflow/SKILL.md`** — read and follow it.

Frontend side in this repo: constants in `src/utils/api.ts`, service functions
(`update{X}Status` style — see `src/utils/indentService.ts`), a `use{X}Approval` hook, and
`src/components/ui/transaction/ApprovalActionsBar.tsx` (button-visibility contract documented in
`instructions.md`). Ask which transaction, approval levels, approve-with-value variant, and reopen
target before starting.
