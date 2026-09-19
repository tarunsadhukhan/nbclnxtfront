"use client";

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { apiRoutes } from '@/utils/api';

type GuardStatus = 'checking' | 'valid' | 'invalid';

/**
 * Client-side guard that validates the current subdomain against the backend
 * (con_org_master) via GET /authRoutes/validate-subdomain.
 *
 * The subdomain IS the tenant, and the tenant is the database name, so an
 * unrecognised subdomain means there is no company to work in.
 *
 * On failure this renders a "No Company Selected" panel. It used to redirect to
 * vowerp.com instead, which was actively misleading: a typo'd or not-yet-
 * registered tenant silently bounced the user to an unrelated marketing site,
 * with nothing to indicate what went wrong or which hostname was rejected.
 *
 * localhost is never gated - there is no con_org_master row for it, so local
 * development would otherwise always fail the check.
 */
export default function SubdomainGuard() {
  const [status, setStatus] = React.useState<GuardStatus>('checking');
  const [rejectedHost, setRejectedHost] = React.useState('');

  React.useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('.localhost');

    // One exit for every failure path, so the localhost escape hatch cannot be
    // forgotten in a branch (the old code repeated it four times).
    const fail = () => {
      setRejectedHost(hostname);
      setStatus(isLocalhost ? 'valid' : 'invalid');
    };

    const validateSubdomain = async () => {
      try {
        let subdomain: string;

        if (hostname.includes('.localhost')) {
          subdomain = hostname.split('.localhost')[0];
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          setStatus('valid');
          return;
        } else {
          // A bare IP lands here and yields its first octet, which is never a
          // valid tenant - intentional, the tenant must come from the hostname.
          subdomain = hostname.split('.')[0];
        }

        if (!subdomain) {
          fail();
          return;
        }

        const res = await fetch(
          `${apiRoutes.VALIDATE_SUBDOMAIN}?subdomain=${encodeURIComponent(subdomain)}`
        );

        if (!res.ok) {
          fail();
          return;
        }

        const data = await res.json();
        if (!data?.valid) {
          fail();
          return;
        }

        setStatus('valid');
      } catch {
        // Network/parse failure: fail closed rather than letting an
        // unvalidated tenant through to the app.
        fail();
      }
    };

    validateSubdomain();
  }, []);

  // 'checking' renders nothing so the app is not blocked by the round trip;
  // only a confirmed rejection paints over it.
  if (status !== 'invalid') return null;

  return (
    <Box
      role="alert"
      sx={{
        position: 'fixed',
        inset: 0,
        // Above app chrome and any open dialog, so nothing shows through.
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        textAlign: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          No Company Selected
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          This address is not linked to an active company.
        </Typography>
        {rejectedHost ? (
          <Typography
            variant="caption"
            component="p"
            sx={{ mt: 2, color: 'text.disabled' }}
          >
            {rejectedHost}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
