'use client';

import * as React from 'react';

import type { ListingMetricKind } from '@/lib/listing-metrics';
import {
  emptyHotLeadSignals,
  emitHotLeadContactAction,
  hasFiredHotLeadRecently,
  hasHotLeadContactAction,
  HOT_LEAD_ACTIVE_IDLE_MS,
  HOT_LEAD_CONTACT_ACTION_EVENT,
  HOT_LEAD_DETAILS_EVENT,
  HOT_LEAD_DWELL_MS,
  HOT_LEAD_MIN_PHOTOS,
  HOT_LEAD_PHOTO_EVENT,
  HOT_LEAD_SAVE_EVENT,
  HOT_LEAD_SCROLL_RATIO,
  HOT_LEAD_SHARE_EVENT,
  isContactActionHref,
  markHotLeadContactAction,
  markHotLeadFired,
  qualifiesAsHotLead,
  recordHotLeadEvent,
  recordListingVisitForHotLead,
  recordOwnerListingViewForHotLead,
  type HotLeadSignals,
} from '@/lib/listing-hot-lead';

type ListingEventDetail = {
  listingKind?: string;
  listingId?: string;
  index?: number;
};

/**
 * Tracks engagement on a listing detail page and fires a Grow/Elite High Interest
 * lead when the visitor shows strong interest without contacting the business.
 */
export function ListingHotLeadTracker({
  listingKind,
  listingId,
  ownerId,
}: {
  listingKind: ListingMetricKind;
  listingId: string;
  /** Seller / business id — used for multi-listing engagement. */
  ownerId?: string | null;
}) {
  const signalsRef = React.useRef<HotLeadSignals>(emptyHotLeadSignals());
  const photoIndexesRef = React.useRef<Set<number>>(new Set());
  const dwellMsRef = React.useRef(0);
  const dwellTickRef = React.useRef<number | null>(null);
  const lastVisibleAtRef = React.useRef<number | null>(null);
  const lastInteractionAtRef = React.useRef(0);
  const firedRef = React.useRef(false);
  const abortedRef = React.useRef(false);

  const abortForContact = React.useCallback(() => {
    abortedRef.current = true;
    markHotLeadContactAction(listingKind, listingId);
    if (dwellTickRef.current != null) {
      window.clearInterval(dwellTickRef.current);
      dwellTickRef.current = null;
    }
    lastVisibleAtRef.current = null;
  }, [listingId, listingKind]);

  const tryFire = React.useCallback(() => {
    if (firedRef.current || abortedRef.current) return;
    if (hasHotLeadContactAction(listingKind, listingId)) {
      abortedRef.current = true;
      return;
    }
    if (hasFiredHotLeadRecently(listingKind, listingId)) {
      firedRef.current = true;
      return;
    }
    const signals = { ...signalsRef.current };
    if (!qualifiesAsHotLead(signals)) return;
    firedRef.current = true;
    void recordHotLeadEvent(listingKind, listingId, signals).then((ok) => {
      if (ok) markHotLeadFired(listingKind, listingId);
      else firedRef.current = false;
    });
  }, [listingId, listingKind]);

  const setSignal = React.useCallback(
    (key: keyof HotLeadSignals, value: boolean) => {
      if (!value || abortedRef.current || signalsRef.current[key]) return;
      signalsRef.current = { ...signalsRef.current, [key]: true };
      tryFire();
    },
    [tryFire],
  );

  React.useEffect(() => {
    firedRef.current = hasFiredHotLeadRecently(listingKind, listingId);
    abortedRef.current = hasHotLeadContactAction(listingKind, listingId);
    signalsRef.current = emptyHotLeadSignals();
    photoIndexesRef.current = new Set();
    dwellMsRef.current = 0;
    lastInteractionAtRef.current = Date.now();

    if (abortedRef.current) return undefined;

    const visit = recordListingVisitForHotLead(listingKind, listingId);
    if (visit.returned) setSignal('returned', true);
    if (visit.repeatView) setSignal('repeatView', true);
    if (recordOwnerListingViewForHotLead(ownerId, listingId)) {
      setSignal('multiListing', true);
    }

    const markInteraction = () => {
      lastInteractionAtRef.current = Date.now();
      if (document.visibilityState === 'visible' && lastVisibleAtRef.current == null) {
        lastVisibleAtRef.current = Date.now();
      }
    };

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
      if (abortedRef.current) return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInteractionAtRef.current > HOT_LEAD_ACTIVE_IDLE_MS) return;
      if (lastVisibleAtRef.current != null) return;
      lastVisibleAtRef.current = Date.now();
      if (dwellTickRef.current != null) return;
      dwellTickRef.current = window.setInterval(() => {
        if (abortedRef.current) {
          pauseDwell();
          return;
        }
        const now = Date.now();
        if (now - lastInteractionAtRef.current > HOT_LEAD_ACTIVE_IDLE_MS) {
          pauseDwell();
          return;
        }
        if (lastVisibleAtRef.current == null) return;
        const total = dwellMsRef.current + (now - lastVisibleAtRef.current);
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

    const onInteract = () => {
      markInteraction();
      resumeDwell();
    };

    const onScroll = () => {
      markInteraction();
      resumeDwell();
      const doc = document.documentElement;
      const scrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
      if (window.scrollY / scrollable >= HOT_LEAD_SCROLL_RATIO) {
        setSignal('scroll', true);
      }
    };

    resumeDwell();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const matchesListing = (detail: ListingEventDetail | undefined) => {
      if (!detail) return false;
      return detail.listingKind === listingKind && detail.listingId === listingId;
    };

    const onPhoto = (event: Event) => {
      const detail = (event as CustomEvent<ListingEventDetail>).detail;
      if (!matchesListing(detail)) return;
      const index = Number(detail.index);
      if (!Number.isFinite(index) || index < 0) return;
      photoIndexesRef.current.add(index);
      if (photoIndexesRef.current.size >= HOT_LEAD_MIN_PHOTOS) {
        setSignal('photos', true);
      }
    };

    const onSave = (event: Event) => {
      const detail = (event as CustomEvent<ListingEventDetail>).detail;
      if (!matchesListing(detail)) return;
      setSignal('saved', true);
    };

    const onShare = (event: Event) => {
      const detail = (event as CustomEvent<ListingEventDetail>).detail;
      if (!matchesListing(detail)) return;
      setSignal('shared', true);
    };

    const onDetails = () => {
      setSignal('details', true);
    };

    const onContactAction = (event: Event) => {
      const detail = (event as CustomEvent<ListingEventDetail>).detail;
      // Contact CTAs may use conversation kinds (e.g. "jobs") — match by listing id only.
      if (detail?.listingId && detail.listingId !== listingId) return;
      abortForContact();
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!isContactActionHref(anchor.getAttribute('href'))) return;
      emitHotLeadContactAction({ listingKind, listingId });
      abortForContact();
    };

    window.addEventListener(HOT_LEAD_PHOTO_EVENT, onPhoto);
    window.addEventListener(HOT_LEAD_SAVE_EVENT, onSave);
    window.addEventListener(HOT_LEAD_SHARE_EVENT, onShare);
    window.addEventListener(HOT_LEAD_DETAILS_EVENT, onDetails);
    window.addEventListener(HOT_LEAD_CONTACT_ACTION_EVENT, onContactAction);
    document.addEventListener('click', onDocumentClick, true);

    return () => {
      pauseDwell();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener(HOT_LEAD_PHOTO_EVENT, onPhoto);
      window.removeEventListener(HOT_LEAD_SAVE_EVENT, onSave);
      window.removeEventListener(HOT_LEAD_SHARE_EVENT, onShare);
      window.removeEventListener(HOT_LEAD_DETAILS_EVENT, onDetails);
      window.removeEventListener(HOT_LEAD_CONTACT_ACTION_EVENT, onContactAction);
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, [abortForContact, listingId, listingKind, ownerId, setSignal]);

  return null;
}
