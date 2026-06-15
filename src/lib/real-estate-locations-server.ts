import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { safeServerJson } from '@/lib/server-fetch';

export async function fetchPublicCities(): Promise<RealEstateCityDto[]> {
  const data = await safeServerJson<{ cities?: RealEstateCityDto[] }>('/real-estate/locations');
  return data?.cities ?? [];
}
