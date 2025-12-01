export type NotifyType = 'success' | 'error' | 'info';

export function notify(type: NotifyType, message: string) {
  if (typeof window === 'undefined') return;
  try {
    const ev = new CustomEvent('gurukrupa:notify', { detail: { type, message } });
    window.dispatchEvent(ev);
  } catch (e) {
    // ignore
    // fallback: console
    console[type === 'error' ? 'error' : 'log'](message);
  }
}

export default notify;
