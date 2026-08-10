import { chainFromId } from '../utils/format';

export type FeedRoute = { name: 'feed' };
export type BountyRoute = {
  name: 'bounty';
  chainId: number;
  bountyId: number;
};
export type AppRoute = FeedRoute | BountyRoute;

const SLUG_TO_CHAIN: Record<string, number> = {
  mainnet: 1,
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
  degen: 666666666,
};

export function feedPath() {
  return '/';
}

export function bountyPath(chainId: number, bountyId: number) {
  return `/bounty/${chainFromId(chainId).slug}/${bountyId}`;
}

export function bountyKey(chainId: number, bountyId: number) {
  return `${chainId}-${bountyId}`;
}

/** Parse a URL or path into an app route. */
export function parseAppUrl(urlOrPath: string | null | undefined): AppRoute {
  if (!urlOrPath) return { name: 'feed' };

  let path = urlOrPath;
  try {
    if (/^[a-z]+:\/\//i.test(urlOrPath)) {
      path = new URL(urlOrPath).pathname;
    }
  } catch {
    // keep as-is
  }

  const clean = path.split('?')[0]?.split('#')[0] ?? '/';
  const parts = clean.replace(/\/+$/, '').split('/').filter(Boolean);

  if (parts[0] === 'bounty' && parts[1] && parts[2]) {
    const chainId = SLUG_TO_CHAIN[parts[1].toLowerCase()];
    const bountyId = Number(parts[2]);
    if (chainId != null && Number.isFinite(bountyId)) {
      return { name: 'bounty', chainId, bountyId };
    }
  }

  return { name: 'feed' };
}

export function pathForRoute(route: AppRoute) {
  if (route.name === 'bounty') {
    return bountyPath(route.chainId, route.bountyId);
  }
  return feedPath();
}
