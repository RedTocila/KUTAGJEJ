import { getSiteURL } from '@/lib/get-site-url';

/**
 * Brand assets live in `public/`.
 * To swap the logo: put the new file in `public/` and set `logoFileName` to match (e.g. `KuTaGjejLogo.png`).
 */
export const brand = {
  logoFileName: '0C2047C5-3987-4BC7-9238-642687049E6C.png',
} as const;

/** Public URL for {@link brand.logoFileName} (Next serves `public/` at `/`). */
export const brandLogoSrc = `/${brand.logoFileName}` as const;

export interface Config {
  site: {
    name: string;
    wordmarkSegments?: readonly [string, string];
    description: string;
    themeColor: string;
    url: string;
  };
}

export const config: Config = {
  site: {
    name: 'KuTaGjej',
    wordmarkSegments: ['KuTa', 'Gjej'],
    description:
      'KuTaGjej është platforma shqiptare e njoftimeve falas: apartamente me qira dhe shitje, vetura të reja dhe të përdorura, oferta pune në Tiranë, Durrës, Vlorë e gjithë Shqipërinë, si dhe artikuj të rinj e të dorës së dytë në tregun online. Posto njoftimin tënd dhe gjej saktësisht atë që do — shpejt e thjesht.',
    themeColor: '#76ba1b',
    url: getSiteURL(),
  },
};
