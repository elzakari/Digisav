import { matchPath } from 'react-router-dom';

export type RouteDef = {
  id: string;
  path: string;
  label: string;
};

export const ROUTES: RouteDef[] = [
  { id: 'login', path: '/login', label: 'Login' },
  { id: 'register', path: '/register', label: 'Register' },
  { id: 'forgotPassword', path: '/forgot-password', label: 'Forgot password' },
  { id: 'resetPassword', path: '/reset-password', label: 'Reset password' },

  { id: 'join', path: '/join', label: 'Join group' },

  { id: 'overview', path: '/overview', label: 'Overview' },
  { id: 'settings', path: '/settings', label: 'Settings' },
  { id: 'savings', path: '/savings', label: 'Savings' },
  { id: 'savingsCreate', path: '/savings/create', label: 'Create goal' },
  { id: 'investments', path: '/investments', label: 'Investments' },

  { id: 'adminDashboard', path: '/admin/dashboard', label: 'Admin dashboard' },
  { id: 'adminCalendar', path: '/admin/calendar', label: 'Admin calendar' },
  { id: 'adminGroupsCreate', path: '/admin/groups/create', label: 'Create group' },
  { id: 'adminGroup', path: '/admin/groups/:groupId', label: 'Admin group dashboard' },
  { id: 'adminGroupsAudit', path: '/admin/groups/audit', label: 'Route & button audit' },
  { id: 'adminGroupDelete', path: '/admin/groups/:groupId/delete', label: 'Permanent group deletion' },

  { id: 'memberDashboard', path: '/member/dashboard', label: 'Member dashboard' },
  { id: 'memberCalendar', path: '/member/calendar', label: 'Member calendar' },
  { id: 'memberGroup', path: '/member/groups/:groupId', label: 'Member group dashboard' },

  { id: 'sysAdminDashboard', path: '/sysadmin/dashboard', label: 'System admin dashboard' },
  { id: 'sysAdminUsers', path: '/sysadmin/users', label: 'System admin users' },
  { id: 'sysAdminGroups', path: '/sysadmin/groups', label: 'System admin groups' },

  { id: 'groupSavingsHome', path: '/group-savings', label: 'Group savings home' },
  { id: 'microSavingsHome', path: '/micro-savings', label: 'Micro savings home' },
];

export function isKnownRoutePath(to: string): boolean {
  const pathOnly = to.split('?')[0].split('#')[0];
  return ROUTES.some((r) => !!matchPath({ path: r.path, end: true }, pathOnly));
}

