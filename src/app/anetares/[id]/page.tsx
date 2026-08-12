import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MemberProfileView } from '@/components/public/member-profile-view';
import { PublicLoadErrorView } from '@/components/public/public-load-error-view';
import { PublicShell } from '@/components/public/public-shell';
import { config } from '@/config';
import {
  buildMemberMixedListings,
  loadPublicMemberProfile,
} from '@/lib/public-member-client';
import { pathsPublicMemberProfile } from '@/paths';

export const revalidate = 15;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: profile, unavailable } = await loadPublicMemberProfile(id);
  if (unavailable) {
    return { title: 'Duke ngarkuar profilin', robots: { index: false, follow: true } };
  }
  if (!profile) {
    return { title: 'Profil i padisponueshëm', robots: { index: false, follow: true } };
  }
  const name = profile.member.displayName?.trim() || 'Anëtar KuTaGjej';
  const kindLabel = profile.member.kind === 'business' ? 'biznesit' : 'anëtarit';
  const listingHint =
    profile.listings.totals.all > 0
      ? ` — ${profile.listings.totals.all} njoftime aktive`
      : '';
  return {
    title: `${name} | ${config.site.name}`,
    description: `Profili publik i ${kindLabel} ${name} në ${config.site.name}${listingHint}.`,
    alternates: { canonical: `${config.site.url.replace(/\/$/, '')}${pathsPublicMemberProfile(id)}` },
  };
}

export default async function MemberProfilePage({ params }: PageProps): Promise<React.ReactNode> {
  const { id } = await params;
  const loaded = await loadPublicMemberProfile(id);
  if (loaded.unavailable) {
    return (
      <PublicShell hideHeader>
        <PublicLoadErrorView title="Profili nuk u ngarkua" />
      </PublicShell>
    );
  }
  const profile = loaded.data;
  if (!profile) notFound();

  const mixed = buildMemberMixedListings(profile.listings);

  return (
    <PublicShell hideHeader>
      <MemberProfileView
        member={profile.member}
        listings={profile.listings}
        mixed={mixed}
        badges={profile.badges}
      />
    </PublicShell>
  );
}
