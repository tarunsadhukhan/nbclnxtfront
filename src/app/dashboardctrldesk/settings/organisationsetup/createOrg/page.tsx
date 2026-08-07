'use client';

import dynamic from "next/dynamic";

const HandleCreateEditOrg = dynamic(() => import("./handleCreateEdit"), { ssr: false });

export default function Page() {
  return <HandleCreateEditOrg />;
}



