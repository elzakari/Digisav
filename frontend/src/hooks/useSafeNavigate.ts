import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isKnownRoutePath } from '@/routes/routeRegistry';
import { useRouteAuditStore } from '@/store/routeAudit.store';

export function useSafeNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const enabled = useRouteAuditStore((s) => s.enabled);
  const reportUnknown = useRouteAuditStore((s) => s.reportUnknown);

  return useCallback(
    (to: string, opts?: { replace?: boolean; state?: any; fallback?: string; label?: string }) => {
      const known = isKnownRoutePath(to);
      if (enabled && !known) {
        reportUnknown({ fromPath: location.pathname, toPath: to, label: opts?.label });
        toast.error('Missing route');
        if (opts?.fallback) {
          navigate(opts.fallback, { replace: true });
        }
        return;
      }
      navigate(to, { replace: opts?.replace, state: opts?.state });
    },
    [enabled, location.pathname, navigate, reportUnknown]
  );
}

