import { permanentRedirect } from 'next/navigation';

import { paths } from '@/paths';

/** Legacy path — permanent redirect to `/prona`. */
export default function LegacyRealEstateBrowseRedirect(): never {
  permanentRedirect(paths.public.realEstate);
}
