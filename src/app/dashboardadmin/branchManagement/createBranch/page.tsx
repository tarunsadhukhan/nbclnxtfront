'use client';

import dynamic from "next/dynamic";

const HandleCreateEditBranch = dynamic(() => import("./handleCreateEdit"), { ssr: false });

export default function Page() {
  return <HandleCreateEditBranch />;
}



