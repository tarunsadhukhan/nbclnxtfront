'use client';

import dynamic from "next/dynamic";

// ssr:false — matches the other dashboardadmin create/edit pages; SSR of this
// useSearchParams+useId form produces hydration id mismatches.
const HandleCreateEditRole = dynamic(() => import("./handleCreateEdit"), { ssr: false });

export default function Page() {
  return <HandleCreateEditRole />;
}
