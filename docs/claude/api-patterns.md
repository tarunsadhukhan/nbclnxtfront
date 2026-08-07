# API & Data Fetching Patterns

Referenced from `CLAUDE.md`. Contains API client usage, service layer patterns, and authentication flows.

---

## API Client (Primary)

**Location:** `src/utils/apiClient2.ts`

```typescript
import { fetchWithCookie } from "@/utils/apiClient2";

// GET request
const { data, error } = await fetchWithCookie<IndentResponse>(
  "/api/procurementIndent/get_indent?indent_id=123",
  "GET"
);

if (error) {
  console.error("Failed to fetch:", error);
  return;
}

// POST request
const { data, error } = await fetchWithCookie<{ success: boolean }>(
  "/api/procurementIndent/create",
  "POST",
  { date: "2026-02-13", department_id: 5 }
);
```

**Features:**
- `withCredentials: true` for cookie-based auth
- Returns typed `FetchResult<T>` with data, error, status
- Automatic JSON parsing

---

## API Routes Definition

**Location:** `src/utils/api.ts`

```typescript
export const apiRoutes = {
  INDENT_LIST: "/api/procurementIndent/list",
  INDENT_CREATE_SETUP: "/api/procurementIndent/create_setup",
  INDENT_CREATE: "/api/procurementIndent/create",
  INDENT_GET: "/api/procurementIndent/get_indent",
};

// Usage
const { data } = await fetchWithCookie(apiRoutes.INDENT_CREATE_SETUP, "GET");
```

### Three Route Objects by Dashboard

- `apiRoutesconsole` -- Control Desk endpoints (prefix: `/ctrldskAdmin/`)
- `apiRoutes` -- Tenant Admin endpoints (prefix: `/companyAdmin/`)
- `apiRoutesPortalMasters` + business routes -- Portal endpoints

---

## Service Layer Pattern

**Location:** `src/utils/{feature}Service.ts`

```typescript
// src/utils/indentService.ts
import { fetchWithCookie } from "./apiClient2";
import { apiRoutes } from "./api";
import type { IndentSetupData, IndentFormData } from "@/types/indentTypes";

export const fetchIndentSetup = async (coId: string): Promise<IndentSetupData | null> => {
  const { data, error } = await fetchWithCookie<{ data: IndentSetupData }>(
    `${apiRoutes.INDENT_CREATE_SETUP}?co_id=${coId}`,
    "GET"
  );

  if (error) {
    console.error("Failed to fetch setup:", error);
    return null;
  }

  return mapSetupDataToUI(data.data);
};

export const saveIndent = async (formData: IndentFormData): Promise<boolean> => {
  const payload = mapUIDataToBackend(formData);
  const { data, error } = await fetchWithCookie<{ success: boolean }>(
    apiRoutes.INDENT_CREATE,
    "POST",
    payload
  );
  return !error && data?.success;
};
```

---

## Backend Response Format

```typescript
// Backend always returns
{
  "data": [...],
  "master": [...] // optional
}
```

---

## Authentication Flows (Persona-Specific)

### Control Desk (subdomain = "admin")

1. `loginConsole()` -> `POST /authRoutes/loginconsole`
2. Backend validates against `vowconsole3.con_user_master` where `con_user_type = 0`
3. JWT set in `access_token` cookie
4. Redirect to `/dashboardctrldesk`

### Tenant Admin (subdomain != "admin", loginType = "admin")

1. `loginConsole()` -> `POST /authRoutes/loginconsole` with `X-Subdomain` header
2. Backend validates against `vowconsole3.con_user_master` where `con_user_type = 1` and `con_org_id` matches
3. JWT set in `access_token` cookie
4. Redirect to `/dashboardadmin`

### Portal (subdomain != "admin", loginType = "portal")

1. `login()` -> `POST /authRoutes/login` with `X-Subdomain` header
2. Backend validates against `{tenant_db}.user_mst` by `email_id`
3. JWT set in `access_token` cookie (token includes `type: "portal"`)
4. Redirect to `/dashboardportal`
5. Middleware also fetches `portal_permission_token` for action-level permissions

### Login Form Routing (`src/components/auth/login-form.tsx`)

```typescript
if (subdomain === "admin") {
  loginFunction = loginConsole;  // POST /authRoutes/loginconsole -> /dashboardctrldesk
} else if (loginType === "portal") {
  loginFunction = login;         // POST /authRoutes/login -> /dashboardportal
} else {
  loginFunction = loginConsole;  // POST /authRoutes/loginconsole -> /dashboardadmin
}
```

Both login functions send `X-Subdomain` header extracted from hostname.

### Cookies

- `access_token` -- JWT auth token (all dashboards)
- `portal_permission_token` -- permission data (Portal only)
- `subdomain` -- tenant identifier
