'use client';

import dynamic from "next/dynamic";

const HandleCreateEditCo = dynamic(() => import("./handleCreateEdit"), { ssr: false });

export default function Page() {
  return <HandleCreateEditCo />;
}



