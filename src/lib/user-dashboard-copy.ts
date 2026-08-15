import type { AppLanguage } from '@/lib/language';

const copy = {
  sq: {
    panelTitle: 'Paneli',
    boostCoins: 'Boost coins',
    addListing: 'Shto njoftim',
    statistics: 'Statistikat',
    myListings: 'Njoftimet e mia',
    buyCredits: 'Bli coins',
    subscriptionPackage: 'Paketa e abonimit',
    quotasHint: (plan: string, category: string) => `${plan} · ${category}`,
    apartments: 'Apartamente',
    cars: 'Makina',
    jobs: 'Vende pune',
    products: 'Produkte',
    premium: 'Premium',
    okazion: 'OKAZION',
    unavailable: 'Jo e disponueshme',
    remaining: (n: number) => `${n} të mbetura`,
    convertTooltip: 'Konverto në Boost Coins',
    convert: 'Konverto',
    packagesTitle: 'Paketat',
    paymentsTitle: 'Pagesat e mia',
    profileTitle: 'Profili im',
    notificationsTitle: 'Njoftimet',
    termsTitle: 'Kushtet e përdorimit',
    privacyTitle: 'Politika e privatësisë',
    signOut: 'Dil nga llogaria',
  },
  en: {
    panelTitle: 'Dashboard',
    boostCoins: 'Boost coins',
    addListing: 'Add listing',
    statistics: 'Statistics',
    myListings: 'My listings',
    buyCredits: 'Buy coins',
    subscriptionPackage: 'Subscription package',
    quotasHint: (plan: string, category: string) => `${plan} · ${category}`,
    apartments: 'Apartments',
    cars: 'Cars',
    jobs: 'Jobs',
    products: 'Products',
    premium: 'Premium',
    okazion: 'OKAZION',
    unavailable: 'Unavailable',
    remaining: (n: number) => `${n} left`,
    convertTooltip: 'Convert to Boost Coins',
    convert: 'Convert',
    packagesTitle: 'Packages',
    paymentsTitle: 'My payments',
    profileTitle: 'My profile',
    notificationsTitle: 'Notifications',
    termsTitle: 'Terms of use',
    privacyTitle: 'Privacy policy',
    signOut: 'Sign out',
  },
} as const;

export type UserDashboardCopy = (typeof copy)[AppLanguage];

export function getUserDashboardCopy(language: AppLanguage): UserDashboardCopy {
  return copy[language];
}
