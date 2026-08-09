"use client"; // Ensure this component runs only on the client

import { useEffect, useState } from "react";
//import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";

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
    <main className="min-h-screen flex items-center justify-center p-8 bg-[hsl(var(--brand-primary)/0.08)]">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center items-center w-full">
          <Image
            src="/ts-global-erp-glowing-128.gif"
            alt="TS Global ERP Logo"
            width={180}
            height={180}
            priority
            className="logo-glow mx-auto w-auto h-auto rounded-full"
            unoptimized
          />
        </div>
        <LoginForm subdomain={subdomain} />
      </div>
    </main>
  );
}
