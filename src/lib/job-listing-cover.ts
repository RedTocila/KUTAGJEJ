type JobCoverListing = {
  coverMode?: 'image' | 'mockup';
  imageUrl?: string | null;
  imageUrls?: string[];
};

export function jobListingCoverImageUrl(listing: JobCoverListing): string | null {
  if (jobListingUsesMockupCover(listing)) return null;
  return listing.imageUrl ?? listing.imageUrls?.[0] ?? null;
}

/** True when the generated icon + map cover should show instead of a photo. */
export function jobListingUsesMockupCover(listing: JobCoverListing): boolean {
  const imageUrl = listing.imageUrl ?? listing.imageUrls?.[0] ?? null;
  return listing.coverMode === 'mockup' || (!listing.coverMode && !imageUrl);
}
