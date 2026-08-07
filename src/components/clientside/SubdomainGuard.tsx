"use client";

import React from 'react';
import { apiRoutes } from '@/utils/api';

/**
 * Client-side guard that validates the current subdomain against the
 * backend DB (con_org_master). If the subdomain is not an active org,
 * redirects to vowerp.com.
 *
 * Runs once on mount — extracts subdomain from window.location.hostname,
 * calls GET /authRoutes/validate-subdomain, and redirects if invalid.
 */
export default function SubdomainGuard() {
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    const validateSubdomain = async () => {
      try {
        const hostname = window.location.hostname;
        let subdomain: string;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.localhost');

        if (hostname.includes('.localhost')) {
          subdomain = hostname.split('.localhost')[0];
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          setChecked(true);
          return;
        } else {
          subdomain = hostname.split('.')[0];
        }

        if (!subdomain) {
          if (isLocalhost) { setChecked(true); return; }
          window.location.href = 'https://vowerp.com';
          return;
        }

        const res = await fetch(
          `${apiRoutes.VALIDATE_SUBDOMAIN}?subdomain=${encodeURIComponent(subdomain)}`
        );

        if (res.ok) {
          const data = await res.json();
          if (!data?.valid) {
            if (isLocalhost) { setChecked(true); return; }
            window.location.href = 'https://vowerp.com';
            return;
          }
        } else {
          if (isLocalhost) { setChecked(true); return; }
          window.location.href = 'https://vowerp.com';
          return;
        }
      } catch {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.localhost');
        if (isLocalhost) { setChecked(true); return; }
        window.location.href = 'https://vowerp.com';
        return;
      }

      setChecked(true);
    };

    validateSubdomain();
  }, []);

  if (!checked) return null;
  return null;
}
