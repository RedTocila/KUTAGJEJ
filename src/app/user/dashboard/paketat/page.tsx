import { redirect } from 'next/navigation';

import { paths } from '@/paths';

/** Categories hub removed — send leftover /paketat traffic to the dashboard. */
export default function UserPackagesPage() {
  redirect(paths.user.dashboard);
}
