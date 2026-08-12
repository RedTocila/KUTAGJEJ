'use client';

import * as React from 'react';

import {
  BusinessReservationPanel,
  type BusinessReservationPanelProps,
} from '@/components/public/business-reservation-panel';
import {
  StickyListingContact,
  StickyListingCtaSlot,
} from '@/components/public/sticky-listing-contact';
import {
  businessMobileCtaModeFromListing,
  type BusinessMobileCtaMode,
} from '@/lib/business-mobile-cta';
import { emitHotLeadContactAction } from '@/lib/listing-hot-lead';

type ReservePanelProps = Omit<BusinessReservationPanelProps, 'panelRef'>;

export function BusinessStickyMobileCta({
  listingId,
  listingTitle,
  contactPhone,
  listingUrl,
  mobileCtaMode,
  reservationsEnabled,
  reservationPanel,
}: {
  listingId: string;
  listingTitle: string;
  contactPhone?: string | null;
  listingUrl?: string;
  mobileCtaMode?: BusinessMobileCtaMode | null;
  reservationsEnabled?: boolean;
  reservationPanel?: ReservePanelProps;
}) {
  const mode = businessMobileCtaModeFromListing({ mobileCtaMode, reservationsEnabled });

  if (mode === 'none') return null;

  if (mode === 'contact') {
    return (
      <StickyListingContact
        listingKind="businesses"
        listingId={listingId}
        contactPhone={contactPhone}
        listingTitle={listingTitle}
        listingUrl={listingUrl}
      />
    );
  }

  if (!reservationPanel) return null;

  const reserveAccordion = (
    <BusinessReservationPanel
      {...reservationPanel}
      primaryCta
      onOpenChange={(next) => {
        if (next) emitHotLeadContactAction({ listingKind: 'businesses', listingId });
        reservationPanel.onOpenChange(next);
      }}
    />
  );

  return (
    <StickyListingCtaSlot slotMinHeight="auto">
      {reserveAccordion}
    </StickyListingCtaSlot>
  );
}
