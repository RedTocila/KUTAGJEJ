import * as React from 'react';

import type { UserContextValue } from '@/contexts/user-context';
import { UserContext, defaultUserContextValue } from '@/contexts/user-context';

export function useUser(): UserContextValue {
  const context = React.useContext(UserContext);

  if (!context) {
    return defaultUserContextValue;
  }

  return context;
}
