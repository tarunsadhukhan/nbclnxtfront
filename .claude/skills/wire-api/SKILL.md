---
name: wire-api
description: End-to-end FE+BE API wiring for VoWERP3 — backend query function, FastAPI endpoint, main.py registration, and pytest stub, plus the frontend constant in src/utils/api.ts and service function. Use whenever a frontend feature needs a new backend endpoint (the most repeated process in this codebase). Asks persona, module, and payload shape first.
---

# Skill: wire-api (pointer)

The canonical skill lives in the backend repo:
**`../vowerp3be/.claude/skills/wire-api/SKILL.md`** — read and follow it.

Summary: build the backend first (query fn → endpoint → `main.py` registration → pytest stub,
persona-correct DB dependency), then the frontend (constant in `src/utils/api.ts` → service fn in
`src/utils/{module}Service.ts` via `fetchWithCookie` — never call APIs directly in components).
Ask persona, module/prefix, payload shape, and route object before starting.
