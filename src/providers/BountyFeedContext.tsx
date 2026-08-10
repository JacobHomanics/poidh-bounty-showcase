import { createContext, useContext, type ReactNode } from 'react';
import type { EnrichedBounty } from '../types';

const BountyFeedContext = createContext<EnrichedBounty[]>([]);

export function BountyFeedProvider({
  items,
  children,
}: {
  items: EnrichedBounty[];
  children: ReactNode;
}) {
  return (
    <BountyFeedContext.Provider value={items}>{children}</BountyFeedContext.Provider>
  );
}

export function useBountyFeedItems() {
  return useContext(BountyFeedContext);
}
