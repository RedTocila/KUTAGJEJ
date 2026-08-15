import { fetchHomeBanners } from '@/lib/home-banners-client';
import { HomeBannerCarousel } from '@/components/public/home-banner-carousel';

/** Streams independently of listing carousels so the hero can paint first. */
export async function HomepageBanners() {
  const banners = await fetchHomeBanners();
  return <HomeBannerCarousel banners={banners} />;
}
