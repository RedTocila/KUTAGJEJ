import { permanentRedirect } from 'next/navigation';

import { paths } from '@/paths';

/** Legacy path — permanent redirect to `/makina`. */
export default function LegacyCarsBrowseRedirect(): never {
  permanentRedirect(paths.public.cars);
}
