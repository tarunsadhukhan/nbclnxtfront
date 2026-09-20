"use client";

import * as React from "react";
import InfoSkyMark from "@/components/ui/InfoSkyMark";
import useCompanyLogo from "@/hooks/useCompanyLogo";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

interface CompanyMarkProps {
  /** Rendered width/height in px */
  size?: number;
  /** Fallback mark's hexagon/stem colour — override on dark surfaces */
  navy?: string;
  /** Fallback mark's "S"/dot colour — override on dark surfaces */
  green?: string;
  className?: string;
}

/**
 * The selected company's logo, falling back to the InfoSky mark.
 *
 * Logos are per company in `co_mst.co_logo` (a base64 data URI, uploaded from
 * Tenant Admin → Company Management), alongside `co_mst.co_name` — there is no
 * separate branding table. A company that has not uploaded one shows the ERP
 * developer's mark rather than a blank box.
 *
 * Both the navigation rail and the portal landing page render through here so
 * that fallback rule has exactly one home.
 */
export default function CompanyMark({ size = 30, navy, green, className }: CompanyMarkProps) {
  const { selectedCompany } = useSidebarContext();
  const logo = useCompanyLogo(selectedCompany?.co_id);

  if (!logo) {
    return <InfoSkyMark size={size} navy={navy} green={green} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flex: `0 0 ${size}px`,
        borderRadius: 3,
        background: "#fff",
      }}
    />
  );
}
