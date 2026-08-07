---
name: new-master
description: Scaffold a brand-new VoWERP3 master end-to-end — DDL migration, SQLAlchemy ORM model, backend CRUD endpoints, frontend master page, and sidebar menu entry. Use when the user asks for a new master (table) that doesn't exist yet. Asks entity fields, target tenant DB, and menu placement first.
---

# Skill: new-master (pointer)

The canonical skill lives in the backend repo:
**`../vowerp3be/.claude/skills/new-master/SKILL.md`** — read and follow it.

Summary: DDL migration → ORM model → apply via `run-migration` (confirms target DB; dev3 is the
default) → backend CRUD endpoints → frontend master page (use the `master-page` agent in this repo)
→ menu entry via `add-menu`. Ask entity fields, target tenant DB(s), co/branch scope, and menu
placement + roles before starting.
