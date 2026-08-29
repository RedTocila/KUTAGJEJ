import { Breadcrumbs, Container, Link as MuiLink, Typography } from '@mui/material';

import type {
  AnyPublicListingDetail,
  PublicRealEstateListingDetail,
} from '@/lib/public-listings-client';
import { seoSlug } from '@/lib/public-seo';

const ROOTS = {
  'real-estate': '/prona',
  car: '/makina',
  job: '/pune',
  marketplace: '/tregu',
  businesses: '/biznese',
  professionals: '/profesioniste',
} as const;

const REAL_ESTATE_CATEGORY_PATHS: Record<string, string> = {
  apartment: 'apartamente',
  villa: 'vila',
  'penthouse-duplex': 'penthouse',
  'part-of-villa': 'pjese-vile',
  'room-studio-attic': 'dhoma-studio',
  parking: 'parking',
  shop: 'dyqane',
  office: 'zyra',
  'industrial-shed': 'kapanone-industriale',
  'commercial-local': 'lokale-tregtare',
  warehouse: 'magazina',
  'business-space': 'ambiente-biznesi',
  'building-plot': 'truall',
  'agricultural-land': 'toke-bujqesore',
};

type ContextListing = AnyPublicListingDetail | PublicRealEstateListingDetail;

function citySegment(listing: ContextListing): string | null {
  return 'cityName' in listing && listing.cityName ? seoSlug(listing.cityName) : null;
}

function categorySegment(listing: ContextListing): string | null {
  if ('propertyCategory' in listing) return REAL_ESTATE_CATEGORY_PATHS[listing.propertyCategory] || null;
  if ('make' in listing) return seoSlug(listing.make);
  if ('industry' in listing) return seoSlug(listing.industry);
  if ('category' in listing) return seoSlug(listing.category);
  return null;
}

export function PublicListingContextLinks({
  listing,
  title,
}: {
  listing: AnyPublicListingDetail | PublicRealEstateListingDetail;
  title?: string;
}) {
  const root = ROOTS[listing.kind];
  const city = citySegment(listing);
  const category = categorySegment(listing);
  const locationHref = city ? `${root}/${encodeURIComponent(city)}` : root;
  const categoryHref = city && category ? `${locationHref}/${encodeURIComponent(category)}` : locationHref;
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, md: 1.5 } }}>
      <Breadcrumbs aria-label="Lidhje të njoftimit">
        <MuiLink href="/" underline="hover" color="inherit">
          Kryefaqja
        </MuiLink>
        <MuiLink href={root} underline="hover" color="inherit">
          {title || listing.kind}
        </MuiLink>
        {city ? (
          <MuiLink href={locationHref} underline="hover" color="inherit">
            {listing.cityName}
          </MuiLink>
        ) : null}
        {category ? (
          <MuiLink href={categoryHref} underline="hover" color="inherit">
            {'propertyCategory' in listing
              ? listing.propertyCategory
              : 'make' in listing
                ? listing.make
                : 'industry' in listing
                  ? listing.industry
                  : listing.category}
          </MuiLink>
        ) : null}
        <Typography color="text.primary">{listing.title}</Typography>
      </Breadcrumbs>
    </Container>
  );
}
