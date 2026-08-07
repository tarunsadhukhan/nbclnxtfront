# Yarn Quality Dropdown - Data Flow Diagram

## Data Flow BEFORE Fix ❌

```
Backend API Response:
┌─────────────────────────────────────┐
│ {                                   │
│   "data": {                         │
│     "yarn_types": [                 │
│       {                             │
│         "jute_yarn_type_id": 1,     │
│         "jute_yarn_type_name": ...  │
│       },                            │
│       ...                           │
│     ]                               │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
           ↓
fetchWithCookie (apiClient2.ts)
Returns response.data as-is
           ↓
┌─────────────────────────────────────┐
│ fetchYarnQualityCreateSetup()        │
│ (OLD - INCORRECT)                   │
│ return { data, error }              │
└─────────────────────────────────────┘
           ↓
Component receives:
┌─────────────────────────────────────┐
│ {                                   │
│   "data": {                         │
│     "data": {                       │ ← NESTED!
│       "yarn_types": [...]           │
│     }                               │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
           ↓
Component tries to access:
┌─────────────────────────────────────┐
│ data?.yarn_types                    │
│ ↓                                   │
│ undefined ❌                        │
└─────────────────────────────────────┘
           ↓
Dropdown shows: EMPTY ❌


```

## Data Flow AFTER Fix ✅

```
Backend API Response:
┌─────────────────────────────────────┐
│ {                                   │
│   "data": {                         │
│     "yarn_types": [                 │
│       {                             │
│         "jute_yarn_type_id": 1,     │
│         "jute_yarn_type_name": ...  │
│       },                            │
│       ...                           │
│     ]                               │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
           ↓
fetchWithCookie (apiClient2.ts)
Returns response.data as-is
           ↓
mapSetupResponse() - NEW MAPPER
Unwraps nested data:
┌─────────────────────────────────────┐
│ const unwrapped =                   │
│   apiResponse?.data || apiResponse  │
│ return { yarn_types: ... }          │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ fetchYarnQualityCreateSetup()        │
│ (NEW - CORRECT)                     │
│ return { data: mapSetupResponse(..) │
│         error }                     │
└─────────────────────────────────────┘
           ↓
Component receives:
┌─────────────────────────────────────┐
│ {                                   │
│   "data": {                         │ ← Properly unwrapped
│     "yarn_types": [                 │
│       { jute_yarn_type_id: 1, ... } │
│       { jute_yarn_type_id: 2, ... } │
│       ...                           │
│     ]                               │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
           ↓
Component accesses:
┌─────────────────────────────────────┐
│ data?.yarn_types                    │
│ ↓                                   │
│ [                                   │
│   { jute_yarn_type_id: 1, ... },    │
│   { jute_yarn_type_id: 2, ... },    │
│   ...                               │
│ ] ✅                                │
└─────────────────────────────────────┘
           ↓
Dropdown renders:
┌─────────────────────────────────────┐
│ ▼ Select Yarn Type                  │
│ • HSWP                              │
│ • HSWT                              │
│ • SKWP                              │
│ • SKWT                              │
│ • SLYN                              │
└─────────────────────────────────────┘ ✅

```

## Key Changes

### Mapper Function
```typescript
// Before: No unwrapping
export const fetchYarnQualityCreateSetup = async (coId: string) => {
  const { data, error } = await fetchWithCookie(...);
  return { data, error };  // ❌ Returns nested data
};

// After: Unwraps nested response
const mapSetupResponse = (apiResponse: any): YarnQualitySetupResponse => {
  const unwrapped = apiResponse?.data || apiResponse;  // ✅ Unwraps
  return {
    yarn_types: unwrapped?.yarn_types || [],
  };
};

export const fetchYarnQualityCreateSetup = async (coId: string) => {
  const { data: rawData, error } = await fetchWithCookie(...);
  if (error) return { data: null, error };
  
  const data = mapSetupResponse(rawData);  // ✅ Uses mapper
  return { data, error: null };
};
```

### Component - No Changes Needed ✅
The component continues to work as expected:
```typescript
setYarnTypes(data?.yarn_types || []);  // ✅ Now works correctly
```

## Service Layer Pattern
This fix follows the **Service Layer Pattern** where:
1. **Raw API responses** are received from the backend
2. **Mappers** transform raw responses into usable formats
3. **Components** consume clean, well-structured data

This provides:
- ✅ Single point of transformation
- ✅ Type safety
- ✅ Easier testing
- ✅ Better maintainability
