import { safeServerJson } from '@/lib/server-fetch';

export interface HomeBannerDto {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  order: number;
}

export async function fetchHomeBanners(): Promise<HomeBannerDto[]> {
  const data = await safeServerJson<{ banners: HomeBannerDto[] }>('/public/home-banners');
  return data?.banners ?? [];
}
