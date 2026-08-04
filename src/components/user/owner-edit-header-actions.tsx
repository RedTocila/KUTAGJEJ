'use client';

import * as React from 'react';

type OwnerEditHeaderActionsContextValue = {
  setActions: (node: React.ReactNode) => void;
};

const OwnerEditHeaderActionsContext =
  React.createContext<OwnerEditHeaderActionsContextValue | null>(null);

const OwnerEditHeaderActionsSlotContext = React.createContext<React.ReactNode>(null);

export function OwnerEditHeaderActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = React.useState<React.ReactNode>(null);
  const value = React.useMemo(() => ({ setActions }), []);

  return (
    <OwnerEditHeaderActionsContext.Provider value={value}>
      <OwnerEditHeaderActionsSlotContext.Provider value={actions}>
        {children}
      </OwnerEditHeaderActionsSlotContext.Provider>
    </OwnerEditHeaderActionsContext.Provider>
  );
}

export function useOwnerEditHeaderActionsSlot(): React.ReactNode {
  return React.useContext(OwnerEditHeaderActionsSlotContext);
}

/** Registers a trailing header control (e.g. Save) next to the back button. */
export function useOwnerEditHeaderActions(render: () => React.ReactNode, deps: React.DependencyList): void {
  const ctx = React.useContext(OwnerEditHeaderActionsContext);

  React.useEffect(() => {
    if (!ctx) return;
    ctx.setActions(render());
    return () => ctx.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps for the render factory
  }, [ctx, ...deps]);
}
