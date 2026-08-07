# Testing Guide

Referenced from `CLAUDE.md`. Contains testing framework setup, examples, and commands.

---

## Framework

**Vitest** with **Testing Library** | Test files: `*.test.ts` or `*.test.tsx` in `src/**`

---

## Commands

```bash
pnpm test              # Run tests once
pnpm test:watch        # Watch mode
pnpm test:ui           # UI mode
pnpm test:coverage     # Coverage report
pnpm test:storybook    # Storybook visual tests
pnpm storybook         # Dev server (port 6006)
pnpm build-storybook   # Production build
```

---

## Example Test

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { IndentForm } from "./IndentForm";

describe("IndentForm", () => {
  it("should render form fields", () => {
    render(<IndentForm data={mockSetupData} onSave={jest.fn()} />);

    expect(screen.getByLabelText("Department")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
  });

  it("should call onSave with form data", async () => {
    const mockSave = jest.fn();
    render(<IndentForm data={mockSetupData} onSave={mockSave} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ department_id: 5 })
      );
    });
  });
});
```

---

## Component Documentation (JSDoc required for reusable components)

```typescript
/**
 * @component ApprovalActionsBar
 * @description Renders action buttons for transaction approval workflows.
 * Handles visibility based on current status and user permissions.
 * @example
 * <ApprovalActionsBar statusId={1} permissions={{ canApprove: true }} onApprove={fn} />
 */
```

Inline comments for non-trivial logic:
```typescript
// Status ID 21 = Draft, 1 = Open, 3 = Approved
// Map these IDs to color tokens for consistent theming
const statusColor = getStatusColor(statusId);
```
