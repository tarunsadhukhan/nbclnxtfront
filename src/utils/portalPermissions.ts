export const determinePortalAction = (pathname: string, search?: string) => {
  const lowered = pathname.toLowerCase();
  // Transaction pages reuse their create/edit route for read-only display via
  // a `mode` query param (e.g. createEnquiry?mode=view is the enquiry hub).
  // When present, `mode` reflects the actual action better than the path.
  if (search) {
    const mode = new URLSearchParams(search).get('mode')?.toLowerCase();
    if (mode === 'view') return 'view';
    if (mode === 'edit') return 'edit';
    if (mode === 'create') return 'create';
  }
  if (lowered.includes('/edit')) return 'edit';
  if (lowered.includes('/create')) return 'create';
  if (lowered.includes('/print')) return 'print';
  return 'view';
};

export const normalisePortalPath = (path: string | undefined | null) => {
  if (!path) return '';
  let cleaned = path.trim().replace(/^\/+/g, '');
  const prefix = 'dashboardportal/';
  if (cleaned.toLowerCase().startsWith(prefix)) {
    cleaned = cleaned.substring(prefix.length);
  }
  cleaned = cleaned.replace(/\/+/g, '/');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned.toLowerCase();
};
