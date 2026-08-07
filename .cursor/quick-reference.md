# Cursor AI Quick Reference

## 🚀 Quick Start

### When building a new feature:

1. **Start with instructions:**
   ```
   @copilot-instructions.md
   ```

2. **Reference similar working code:**
   ```
   @createIndent/page.tsx
   ```

3. **Reference related components:**
   ```
   @src/components/ui/TransactionWrapper.tsx
   ```

4. **Describe what you need:**
   ```
   Create a new purchase order page following the same pattern
   ```

## 📝 Common Commands

### Reference Files
```
@filename.tsx          # Single file
@folder/               # Entire folder
@file1.tsx @file2.tsx  # Multiple files
```

### Reference Instructions
```
@copilot-instructions.md
@.cursor/project-context.md
```

### Ask Questions
```
@TransactionWrapper.tsx
How does this component handle form submission?
```

## 🎯 Use Cases

### Building a Transaction Page
```
@copilot-instructions.md
@createIndent/page.tsx
@src/components/ui/transaction/

Create a purchase order page with:
- Header: supplier, po_date, delivery_date
- Line items: item, quantity, rate, amount
- Support create/edit/view modes
```

### Building a List/Index Page
```
@copilot-instructions.md
@src/app/dashboardportal/masters/itemMaster/page.tsx
@src/components/ui/IndexWrapper.tsx

Create a supplier list page with search and pagination
```

### Adding an API Endpoint
```
@copilot-instructions.md
@src/masters/items.py
@src/masters/query.py

Add endpoint to get supplier list with search
```

### Understanding a Pattern
```
@createIndent/page.tsx
Explain how line items are managed in this component
```

## 💡 Pro Tips

1. **Always reference copilot-instructions.md first** for new features
2. **Point to working examples** when asking for similar functionality
3. **Reference 3-5 related files** (not too many, not too few)
4. **Be specific** about requirements in your prompt
5. **Use folder references** when pattern spans multiple files

## 🔍 Finding Reference Files

### Frontend Patterns
- **Transaction pages:** `src/app/dashboardportal/procurement/indent/createIndent/page.tsx`
- **List pages:** `src/app/dashboardportal/masters/itemMaster/page.tsx`
- **UI components:** `src/components/ui/`
- **Hooks:** `src/hooks/`
- **Services:** `src/utils/*Service.ts`

### Backend Patterns
- **API endpoints:** `src/masters/items.py`
- **SQL queries:** `src/masters/query.py`
- **Database:** `src/config/db.py`
- **Auth:** `src/authorization/utils.py`

## 📚 Documentation Files

- `.github/copilot-instructions.md` - Main instructions (auto-read)
- `.cursor/project-context.md` - Additional context
- `.cursor/context-guide.md` - Detailed guide
- `.cursor/quick-reference.md` - This file

## ⚠️ Common Mistakes

❌ **Don't:**
- Assume Cursor remembers previous sessions
- Reference too many files (>10)
- Skip the instructions file
- Be vague about requirements

✅ **Do:**
- Reference key files every time
- Point to working examples
- Be specific about what you need
- Reference instructions + examples together

## 🎨 Example: Complete Context

```
@copilot-instructions.md
@.cursor/project-context.md
@createIndent/page.tsx
@src/components/ui/TransactionWrapper.tsx
@src/utils/indentService.ts

I need to create a "Purchase Order" page that:
1. Follows the transaction archetype pattern
2. Has header fields: supplier (dropdown), po_date, delivery_date, terms
3. Has line items: item (dropdown), quantity, rate, amount (calculated)
4. Supports create/edit/view modes
5. Uses the same hooks and patterns as the indent page
6. Integrates with the purchase order API endpoints

Please create:
- The page component
- The service file (purchaseOrderService.ts)
- Any missing types

Follow the exact same structure and patterns as the indent page.
```

This gives Cursor everything it needs! 🚀

