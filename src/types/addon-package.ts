export type AddonKind = 'premium' | 'okazion' | 'auto-refresh';

export interface AddonPackage {
  id: string;
  kind: AddonKind;
  days: number | null;
  slots: number | null;
  priceEur: number;
  priceBc: number;
  labelSq: string;
  labelEn: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddonPackageInput {
  id?: string;
  kind: AddonKind;
  days?: number | null;
  slots?: number | null;
  priceEur: number;
  priceBc: number;
  labelSq: string;
  labelEn?: string;
  active?: boolean;
  sortOrder?: number;
}
