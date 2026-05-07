export const paths = {
  home: '/',
  /** Public-facing browse pages — wired from the homepage and footer. */
  public: {
    realEstate: '/prona',
    cars: '/makina',
    jobs: '/pune',
    marketplace: '/tregu',
    /** Business listings (lokal, zyrë, shërbime biznesi). */
    businesses: '/biznese',
    /** Professionals & freelance services. */
    professionals: '/profesioniste',
    about: '/rreth-nesh',
    terms: '/kushtet',
    privacy: '/privatesia',
    contact: '/kontakt',
  },
  auth: { signIn: '/auth/sign-in' },
  user: {
    auth: '/user/auth',
    dashboard: '/user/dashboard',
    profile: '/user/dashboard/profili',
    /** Immovable property — add listing (individual / business portal). */
    realEstateListing: '/user/dashboard/prona',
    businessesListing: '/user/dashboard/biznese',
    professionalsListing: '/user/dashboard/profesioniste',
    /** Saved real-estate listings for the signed-in user. */
    myRealEstateListings: '/user/dashboard/shpalljet-e-mia',
  },
  dashboard: {
    overview: '/dashboard',
    profile: '/dashboard/profili',
    /** Staff / managed users (platform admin only). */
    staffUsers: '/dashboard/perdoruesit',
    /** Role catalog (platform admin only). */
    roles: '/dashboard/rolet',
    /** Category slugs + listing types per vertical (platform admin only). */
    kategorite: '/dashboard/kategorite',
    /** Cities & zones for real-estate listings (platform admin only). */
    realEstateLocations: '/dashboard/vendndodhjet-pasurie',
    /** Contracts linked to catalog roles (platform admin only). */
    kontratat: '/dashboard/kontratat',
    /** Referral rewards program (all users); numbers editable by platform admin. */
    referral: '/dashboard/referral',
  },
  app: {},
  errors: {},
} as const;
