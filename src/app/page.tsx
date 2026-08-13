"use client"; // Ensure this component runs only on the client

import { useEffect, useState } from "react";
//import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import InfoSkyMark from "@/components/ui/InfoSkyMark";
import { brand } from "@/styles/brand";

export default function Home() {
//  const router = useRouter();
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const subdomainPart = hostname.split(".")[0];
      setSubdomain(subdomainPart);

    //   const userCookie = document.cookie
    //     .split("; ")
    //     .find((row) => row.startsWith("user="))
    //     ?.split("=")[1];

    //   if (userCookie) {
    //     const user = JSON.parse(decodeURIComponent(userCookie));
    //     if (subdomain === "admin") {
    //       console.log("Redirecting to: /dashboardctrldesk"); // Log redirection URL
    //       router.push("/dashboardctrldesk");
    //     } else {
    //       console.log("Redirecting to: /dashboardportal"); // Log redirection URL
    //       router.push("/dashboardportal");
    //     }
    //   }
    }
  }, []);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(160deg, ${brand.navy900}, ${brand.navy800} 60%, #0b1830)` }}
    >
      {/* max-w-sm + small logo keeps the whole form inside one viewport */}
      <div className="w-full max-w-sm space-y-4">
        {/* Brand lockup — mark over wordmark, as on the dark logo variant */}
        <div className="flex flex-col items-center gap-2">
          <InfoSkyMark size={64} navy="#ffffff" green={brand.greenLight} />
          <div className="text-center">
            <div
              className="text-lg font-bold tracking-[0.14em]"
              style={{ color: brand.onNavy }}
            >
              INFOSKY GLOBAL
            </div>
            <div
              className="text-[10px] font-semibold tracking-[0.42em] mt-0.5"
              style={{ color: brand.greenLight }}
            >
              IT SOLUTIONS
            </div>
          </div>
        </div>
        <LoginForm subdomain={subdomain} />
      </div>
    </main>
  );
}
