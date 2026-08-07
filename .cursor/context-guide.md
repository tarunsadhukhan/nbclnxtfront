# How to Add Context to Cursor AI

This guide explains how to provide context to Cursor so it understands your project requirements and can build features correctly.

## 1. Copilot Instructions (Already Set Up ✅)

Your `.github/copilot-instructions.md` files are automatically read by Cursor. These are your **primary context files**.

**Location:**
- Frontend: `vowerp3ui/.github/copilot-instructions.md`
- Backend: `vowerp3be/.github/copilot-instructions.md`

**What to include:**
- Architecture patterns
- Code conventions
- File structure
- Common patterns to follow
- Gotchas and pitfalls

**How to reference in chat:**
```
@copilot-instructions.md
```

## 2. Reference Files with @ Mentions

When asking Cursor to build something, reference relevant files:

### Example 1: Building a new transaction page
```
@copilot-instructions.md
@createIndent/page.tsx
Create a new purchase order page following the same pattern
```

### Example 2: Adding a new API endpoint
```
@copilot-instructions.md
@src/masters/items.py
@src/masters/query.py
Add a new endpoint for item categories following the same pattern
```

### Example 3: Understanding a component
```
@src/components/ui/TransactionWrapper.tsx
How does this component work? I want to use it for a new feature.
```

## 3. Create Example/Reference Files

Create example files that demonstrate patterns:

**Example: `examples/transaction-page-example.md`**
```markdown
# Transaction Page Pattern

## Structure
1. Use TransactionWrapper
2. Use useLineItems hook
3. Use MuiForm with schema
4. Use useTransactionSetup for dropdowns

## Example Flow
[Link to working example]
```

## 4. Use Code Comments for Context

Add detailed comments in your code:

```typescript
// IMPORTANT: This follows the Transaction archetype pattern
// See: .github/copilot-instructions.md section "Transaction wrapper checklist"
// Reference: dashboardportal/procurement/indent/createIndent/page.tsx
```

## 5. Create a Project Context File

Create a comprehensive context file:

**File: `.cursor/project-context.md`**
```markdown
# Project Context

## Business Domain
- Multi-tenant ERP system
- Procurement module handles indents, purchase orders, etc.
- Master data: items, branches, departments, projects

## Key Requirements
- All pages must respect permissions (access_type_id)
- Multi-tenant: always use co_id
- Forms must support create/edit/view modes
- Line items must use useLineItems hook

## Common Patterns
[Link to examples]
```

## 6. Reference Multiple Files in One Query

You can reference multiple files at once:

```
@copilot-instructions.md
@createIndent/page.tsx
@src/components/ui/transaction/index.ts
@src/utils/indentService.ts

I need to create a new "Purchase Order" page that:
1. Follows the transaction pattern
2. Has similar line items structure
3. Uses the same hooks and utilities
```

## 7. Use Folders for Context

Reference entire folders when the pattern spans multiple files:

```
@src/components/ui/transaction/
Show me all the hooks and utilities available for transaction pages
```

## 8. Create Architecture Diagrams (as Markdown)

Create visual context in markdown:

**File: `.cursor/architecture.md`**
```markdown
# Architecture Overview

## Frontend Structure
```
src/
├── app/                    # Next.js App Router
│   └── dashboardportal/    # Portal dashboard pages
├── components/
│   ├── ui/                 # Reusable UI primitives
│   └── dashboard/          # Dashboard-specific components
├── utils/                  # Utilities and services
└── types/                  # TypeScript types
```

## Data Flow
1. Page component uses hooks
2. Hooks call services
3. Services use apiClient2.ts
4. API routes defined in api.ts
```

## 9. Document API Contracts

Create API documentation that Cursor can reference:

**File: `.cursor/api-contracts.md`**
```markdown
# API Contracts

## Indent APIs
- GET /api/indent/setup1?co_id=X&branch_id=Y
  Returns: { departments, projects, expenses, item_groups }
  
- POST /api/indent/create
  Body: { branch, indent_type, items: [...] }
  Returns: { indent_id, indent_no, message }
```

## 10. Use Chat History

Cursor remembers context within a conversation. Start with:

```
I'm working on the procurement module. Here's what I need:
1. [Requirement 1]
2. [Requirement 2]

Reference files:
@copilot-instructions.md
@createIndent/page.tsx
```

## Best Practices

### ✅ DO:
- Reference copilot-instructions.md at the start of complex tasks
- Point to working examples when asking for similar features
- Reference multiple related files together
- Use @ mentions for specific files/components
- Create example files for complex patterns

### ❌ DON'T:
- Assume Cursor remembers context from previous sessions (always reference key files)
- Reference too many files at once (focus on 3-5 most relevant)
- Skip the copilot-instructions.md reference for new features

## Quick Reference Commands

```bash
# Reference instructions
@copilot-instructions.md

# Reference a specific file
@path/to/file.tsx

# Reference a folder
@src/components/ui/

# Reference multiple files
@file1.tsx @file2.tsx @file3.tsx
```

## Example: Complete Context Setup

When starting a new feature:

```
@copilot-instructions.md
@createIndent/page.tsx
@src/components/ui/TransactionWrapper.tsx
@src/utils/indentService.ts

I need to create a "Purchase Order" page that:
- Follows the transaction archetype
- Has header fields: supplier, po_date, delivery_date
- Has line items: item, quantity, rate, amount
- Supports create/edit/view modes
- Uses the same hooks and patterns as the indent page

Please create the page following the exact same structure.
```

This gives Cursor all the context it needs to build correctly!

