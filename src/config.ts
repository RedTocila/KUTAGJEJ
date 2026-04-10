import { getSiteURL } from '@/lib/get-site-url';

/**
 * Brand assets live in `public/`.
 * To swap the logo: put the new file in `public/` and set `logoFileName` to match (e.g. `KuTaGjejLogo.png`).
 */
export const brand = {
  logoFileName: 'KuTaGjejLogo.png',
} as const;

/** Public URL for {@link brand.logoFileName} (Next serves `public/` at `/`). */
export const brandLogoSrc = `/${brand.logoFileName}` as const;

export interface Config {
  site: {
    name: string;
    /** English tagline shown next to the product name where needed (e.g. admin sign-in). */
    taglineEn: string;
    description: string;
    themeColor: string;
    url: string;
  };
}

export const config: Config = {
  site: {
    name: 'KuTaGjej',
    taglineEn: 'WhereToFind',
    description: 'KuTaGjej (WhereToFind) — platformë njoftimesh me panel administrimi.',
    themeColor: '#76ba1b',
    url: getSiteURL(),
  },
};
