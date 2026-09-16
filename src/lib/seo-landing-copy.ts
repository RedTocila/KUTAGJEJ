import type { SeoLandingConfig, SeoVertical } from '@/lib/public-seo';

const VERTICAL_NOUN: Record<SeoVertical, string> = {
  'real-estate': 'prona',
  cars: 'automjete',
  jobs: 'vende pune',
  marketplace: 'artikuj',
  businesses: 'biznese',
  professionals: 'profesionistë',
};

/**
 * Inventory-aware, unique-ish landing copy for browsers + metadata.
 * Keeps heading from config; expands description with count + local intent.
 */
export function enrichSeoLandingCopy(
  config: SeoLandingConfig,
  total: number,
): { heading: string; description: string; midHeading: string; midText: string } {
  const city = config.city?.name?.trim() || '';
  const where = city ? `në ${city}` : 'në Shqipëri';
  const noun = VERTICAL_NOUN[config.vertical];
  const subject = config.categoryLabel
    ? config.transactionLabel
      ? `${config.categoryLabel.toLowerCase()} ${config.transactionLabel}`
      : config.categoryLabel.toLowerCase()
    : noun;
  const countBit =
    total >= 3
      ? `Aktualisht ka ${total} njoftime aktive`
      : total > 0
        ? `Ka ${total} njoftime`
        : 'Shfletoni njoftimet';

  const description = [
    `${countBit} për ${subject} ${where} në KuTaGjej.`,
    config.description,
    city
      ? `Filtro sipas zonës, çmimit dhe detajeve, pastaj kontakto publikuesin drejtpërdrejt — pa ndërmjetës të detyrueshëm.`
      : `Krahaso oferta në gjithë Shqipërinë dhe kontakto publikuesin drejtpërdrejt.`,
  ]
    .filter(Boolean)
    .join(' ');

  const midHeading = city ? `${config.heading}` : `Si të kërkoni ${subject}`;
  const midText = city
    ? `Në ${city} gjeni ${subject} të publikuara nga individë dhe profesionistë. Përdorni filtrat për të ngushtuar rezultatet, hapni njoftimin për foto dhe specifika, pastaj telefononi ose shkruani. ${countBit} në këtë faqe.`
    : `Kjo faqe mbledh ${subject} nga e gjithë Shqipëria. Përdorni filtrat e kategorisë, hapni njoftimin që ju intereson dhe kontaktoni publikuesin. ${countBit}.`;

  return {
    heading: config.heading,
    description: description.slice(0, 320),
    midHeading,
    midText,
  };
}
