import { getHomepagePublicPayload } from '@/lib/homepage-data';
import { HomeBannerCarousel } from '@/components/public/home-banner-carousel';

/** Streams independently of listing carousels so the hero can paint first. */
export async function HomepageBanners() {
  const payload = await getHomepagePublicPayload(8);
  return <HomeBannerCarousel banners={payload.banners} />;
}
