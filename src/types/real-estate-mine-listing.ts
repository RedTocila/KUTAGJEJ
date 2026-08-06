import type { ListingMetrics } from '@/lib/listing-metrics';

/** One row from `GET /api/listings/real-estate/mine`. */
export interface RealEstateMineListing extends ListingMetrics {
  id: string;
  title: string;
  description: string;
  propertyCategory: string;
  transactionType: 'rent' | 'sale';
  price: number;
  originalPrice?: number | null;
  currency: 'EUR' | 'LEK';
  surfaceM2: number;
  cityName: string | null;
  zoneName: string | null;
  cityId?: string | null;
  zoneId?: string | null;
  contactPhone: string | null;
  condition: string | null;
  apartmentTypeSlug: string | null;
  floor: number | null;
  totalFloors: number | null;
  parkingFloor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnishing: string | null;
  yearBuilt: number | null;
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  isOkazion?: boolean;
  okazionUntil?: string | null;
}
