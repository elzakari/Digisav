import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isKnownRoutePath } from '@/routes/routeRegistry';
import { useRouteAuditStore } from '@/store/routeAudit.store';

type SafeLinkProps = React.ComponentProps<typeof Link> & {
  auditLabel?: string;
};

export function SafeLink({ to, auditLabel, onClick, ...rest }: SafeLinkProps) {
  const location = useLocation();
  const enabled = useRouteAuditStore((s) => s.enabled);
  const reportUnknown = useRouteAuditStore((s) => s.reportUnknown);

  const toStr = typeof to === 'string' ? to : to.pathname || '';
  const known = typeof to === 'string' ? isKnownRoutePath(to) : true;

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (enabled && !known) {
      e.preventDefault();
      reportUnknown({
        fromPath: location.pathname,
        toPath: toStr,
        label: auditLabel,
      });
      return;
    }
    onClick?.(e);
  };

  return <Link to={to} onClick={handleClick} {...rest} />;
}

