import { create } from 'zustand';

export type RouteAuditFinding = {
  id: string;
  createdAt: number;
  fromPath: string;
  toPath: string;
  label?: string;
  kind: 'unknown_route';
};

type RouteAuditState = {
  enabled: boolean;
  findings: RouteAuditFinding[];
  setEnabled: (enabled: boolean) => void;
  reportUnknown: (finding: Omit<RouteAuditFinding, 'id' | 'createdAt' | 'kind'>) => void;
  clear: () => void;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useRouteAuditStore = create<RouteAuditState>((set, get) => ({
  enabled: false,
  findings: [],
  setEnabled: (enabled) => set({ enabled }),
  reportUnknown: (finding) => {
    const state = get();
    if (!state.enabled) return;
    const next: RouteAuditFinding = {
      id: makeId(),
      createdAt: Date.now(),
      kind: 'unknown_route',
      ...finding,
    };
    set({ findings: [next, ...state.findings].slice(0, 200) });
  },
  clear: () => set({ findings: [] }),
}));

