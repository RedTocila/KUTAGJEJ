'use client';

import * as React from 'react';

/**
 * One shared 1Hz clock for all live countdowns on the page.
 * Avoids N× setInterval when many OKAZION cards are visible at once.
 */
let subscribers = 0;
let intervalId: number | null = null;
let nowMs = 0;
const listeners = new Set<() => void>();

function ensureTicking() {
  if (intervalId != null) return;
  nowMs = Date.now();
  intervalId = window.setInterval(() => {
    nowMs = Date.now();
    listeners.forEach((listener) => listener());
  }, 1000);
}

function stopIfIdle() {
  if (subscribers > 0 || intervalId == null) return;
  window.clearInterval(intervalId);
  intervalId = null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscribers += 1;
  ensureTicking();
  return () => {
    listeners.delete(listener);
    subscribers -= 1;
    stopIfIdle();
  };
}

function getSnapshot() {
  if (nowMs === 0) nowMs = Date.now();
  return nowMs;
}

function getServerSnapshot() {
  return 0;
}

export function useSharedSecondTick(): number {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
