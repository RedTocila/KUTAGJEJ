'use client';

import * as React from 'react';

type PostListingFrameActionsContextValue = {
  setActions: (node: React.ReactNode) => void;
};

const PostListingFrameActionsContext =
  React.createContext<PostListingFrameActionsContextValue | null>(null);

const PostListingFrameActionsSlotContext = React.createContext<React.ReactNode>(null);

export function PostListingFrameActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = React.useState<React.ReactNode>(null);
  const value = React.useMemo(() => ({ setActions }), []);

  return (
    <PostListingFrameActionsContext.Provider value={value}>
      <PostListingFrameActionsSlotContext.Provider value={actions}>
        {children}
      </PostListingFrameActionsSlotContext.Provider>
    </PostListingFrameActionsContext.Provider>
  );
}

export function PostListingFrameActionsSlot(): React.ReactNode {
  return React.useContext(PostListingFrameActionsSlotContext);
}

/** Registers controls shown left of the frame close (X) on biznese / profesioniste builds. */
export function usePostListingFrameActions(render: () => React.ReactNode, deps: React.DependencyList): void {
  const ctx = React.useContext(PostListingFrameActionsContext);

  React.useEffect(() => {
    if (!ctx) return;
    ctx.setActions(render());
    return () => ctx.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps for the render factory
  }, [ctx, ...deps]);
}
