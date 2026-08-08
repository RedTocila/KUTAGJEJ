'use client';

import * as React from 'react';

import type { ListingMetricKind } from '@/lib/listing-metrics';
import {
  countHotLeadSignals,
  hasFiredHotLeadRecently,
  HOT_LEAD_CONTACT_ATTR,
  HOT_LEAD_DWELL_MS,
  HOT_LEAD_MIN_PHOTOS,
  HOT_LEAD_PHOTO_EVENT,
  markHotLeadFired,
  recordHotLeadEvent,
  recordListingVisitForHotLead,
  type HotLeadSignals,
} from '@/lib/listing-hot-lead';

type PhotoEventDetail = {
  listingKind?: string;
  listingId?: string;
  index?: number;
};

/**
 * Tracks engagement combo signals on a listing detail page and fires a Grow/Elite
 * hot-lead notification when 2+ signals are met (deduped client + server).
 */
export function ListingHotLeadTracker({
  listingKind,
  listingId,
}: {
  listingKind: ListingMetricKind;
  listingId: string;
}) {
  const signalsRef = React.useRef<HotLeadSignals>({
    dwell: false,
    photos: false,
    contact: false,
    returned: false,
  });
  const photoIndexesRef = React.useRef<Set<number>>(new Set());
  const dwellMsRef = React.useRef(0);
  const dwellTickRef = React.useRef<number | null>(null);
  const lastVisibleAtRef = React.useRef<number | null>(null);
  const firedRef = React.useRef(false);

  const tryFire = React.useCallback(() => {
    if (firedRef.current) return;
    if (hasFiredHotLeadRecently(listingKind, listingId)) {
      firedRef.current = true;
      return;
    }
    const signals = { ...signalsRef.current };
    if (countHotLeadSignals(signals) < 2) return;
    firedRef.current = true;
    void recordHotLeadEvent(listingKind, listingId, signals).then((ok) => {
      if (ok) markHotLeadFired(listingKind, listingId);
      else firedRef.current = false;
    });
  }, [listingId, listingKind]);

  const setSignal = React.useCallback(
    (key: keyof HotLeadSignals, value: boolean) => {
      if (!value || signalsRef.current[key]) return;
      signalsRef.current = { ...signalsRef.current, [key]: true };
      tryFire();
    },
    [tryFire],
  );

  React.useEffect(() => {
    firedRef.current = hasFiredHotLeadRecently(listingKind, listingId);
    signalsRef.current = {
      dwell: false,
      photos: false,
      contact: false,
      returned: false,
    };
    photoIndexesRef.current = new Set();
    dwellMsRef.current = 0;

    if (recordListingVisitForHotLead(listingKind, listingId)) {
      setSignal('returned', true);
    }

    const pauseDwell = () => {
      if (lastVisibleAtRef.current != null) {
        dwellMsRef.current += Date.now() - lastVisibleAtRef.current;
        lastVisibleAtRef.current = null;
      }
      if (dwellTickRef.current != null) {
        window.clearInterval(dwellTickRef.current);
        dwellTickRef.current = null;
      }
    };

    const resumeDwell = () => {
      if (document.visibilityState !== 'visible') return;
      if (lastVisibleAtRef.current != null) return;
      lastVisibleAtRef.current = Date.now();
      if (dwellTickRef.current != null) return;
      dwellTickRef.current = window.setInterval(() => {
        if (lastVisibleAtRef.current == null) return;
        const total = dwellMsRef.current + (Date.now() - lastVisibleAtRef.current);
        if (total >= HOT_LEAD_DWELL_MS) {
          setSignal('dwell', true);
          pauseDwell();
        }
      }, 1000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') resumeDwell();
      else pauseDwell();
    };

    resumeDwell();
    document.addEventListener('visibilitychange', onVisibility);

    const onPhoto = (event: Event) => {
      const detail = (event as CustomEvent<PhotoEventDetail>).detail;
      if (!detail || detail.listingKind !== listingKind || detail.listingId !== listingId) return;
      const index = Number(detail.index);
      if (!Number.isFinite(index) || index < 0) return;
      photoIndexesRef.current.add(index);
      if (photoIndexesRef.current.size >= HOT_LEAD_MIN_PHOTOS) {
        setSignal('photos', true);
      }
    };
    window.addEventListener(HOT_LEAD_PHOTO_EVENT, onPhoto);

    const contactNodes = document.querySelectorAll(`[${HOT_LEAD_CONTACT_ATTR}]`);
    let contactObserver: IntersectionObserver | null = null;
    if (contactNodes.length > 0 && typeof IntersectionObserver !== 'undefined') {
      contactObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35)) {
            setSignal('contact', true);
            contactObserver?.disconnect();
          }
        },
        { threshold: [0.35] },
      );
      contactNodes.forEach((node) => contactObserver?.observe(node));
    }

    // Contact blocks may mount slightly after this effect (desktop/mobile variants).
    const contactPoll = window.setTimeout(() => {
      if (signalsRef.current.contact) return;
      const late = document.querySelectorAll(`[${HOT_LEAD_CONTACT_ATTR}]`);
      if (late.length === 0 || typeof IntersectionObserver === 'undefined') return;
      contactObserver?.disconnect();
      contactObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35)) {
            setSignal('contact', true);
            contactObserver?.disconnect();
          }
        },
        { threshold: [0.35] },
      );
      late.forEach((node) => contactObserver?.observe(node));
    }, 800);

    return () => {
      pauseDwell();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(HOT_LEAD_PHOTO_EVENT, onPhoto);
      contactObserver?.disconnect();
      window.clearTimeout(contactPoll);
    };
  }, [listingId, listingKind, setSignal]);

  return null;
}
