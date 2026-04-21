export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in' },
  user: {
    auth: '/user/auth',
    dashboard: '/user/dashboard',
    profile: '/user/dashboard/profili',
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
    /** Contracts linked to catalog roles (platform admin only). */
    kontratat: '/dashboard/kontratat',
    /** Referral rewards program (all users); numbers editable by platform admin. */
    referral: '/dashboard/referral',
  },
  app: {},
  errors: {},
} as const;
