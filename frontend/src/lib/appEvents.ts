export type AppEvent =
  | { type: 'groups_changed'; groupId?: string }
  | { type: 'group_recordings_changed'; groupId: string };

const CHANNEL = 'digisav-events';
const STORAGE_KEY = '__digisav_event__';

export function publishAppEvent(event: AppEvent) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CHANNEL);
      bc.postMessage(event);
      bc.close();
    }
  } catch {
    void 0;
  }

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ event, ts: Date.now(), nonce: Math.random() })
      );
    }
  } catch {
    void 0;
  }
}

export function subscribeAppEvents(handler: (event: AppEvent) => void) {
  let bc: BroadcastChannel | null = null;

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (msg) => {
        handler(msg.data as AppEvent);
      };
    }
  } catch {
    void 0;
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      if (parsed?.event) handler(parsed.event as AppEvent);
    } catch {
      void 0;
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    try {
      if (bc) bc.close();
    } catch {
      void 0;
    }
    window.removeEventListener('storage', onStorage);
  };
}
