'use client';

import dynamic from "next/dynamic";

const HandleCreateEditDept = dynamic(() => import("./handleCreateEdit"), { ssr: false });

export default function Page() {
  return <HandleCreateEditDept />;
}



