import { isNativeApp } from '@/lib/native-app';

/**
 * Repeats `tick` only while the tab is visible.
 * In the native app, backgrounding pauses it too. Coming back runs `tick` once.
 */
export function runWhileVisible(tick: () => void, intervalMs: number): () => void {
  let timer: number | null = null;
  let resumeTimer: number | null = null;
  let stopped = false;
  let appListener: { remove: () => Promise<void> } | null = null;

  const clearTimer = () => {
    if (timer == null) return;
    window.clearInterval(timer);
    timer = null;
  };

  const pause = () => {
    clearTimer();
    if (resumeTimer != null) {
      window.clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  };

  const arm = () => {
    if (stopped || timer != null) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    timer = window.setInterval(tick, intervalMs);
  };

  const resume = () => {
    if (stopped) return;
    arm();
    if (resumeTimer != null) return;
    // visibilitychange and the native app event can land together.
    resumeTimer = window.setTimeout(() => {
      resumeTimer = null;
      if (stopped) return;
      tick();
    }, 50);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') pause();
    else resume();
  };

  document.addEventListener('visibilitychange', onVisibility);

  if (isNativeApp()) {
    void import('@capacitor/app').then(({ App }) => {
      if (stopped) return;
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) resume();
        else pause();
      }).then((handle) => {
        if (stopped) {
          void handle.remove();
          return;
        }
        appListener = handle;
      });
    });
  }

  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') arm();

  return () => {
    stopped = true;
    pause();
    document.removeEventListener('visibilitychange', onVisibility);
    if (appListener) void appListener.remove();
  };
}
