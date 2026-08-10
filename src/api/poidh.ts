import { chainFromId } from '../utils/format';
import type {
  BountyDetail,
  BountyListResponse,
  BountySummary,
  EnrichedBounty,
} from '../types';

const BASE = 'https://poidh.xyz';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`POIDH API ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBounties(cursor?: number | null): Promise<BountyListResponse> {
  const url =
    cursor != null
      ? `${BASE}/bounties/data?cursor=${cursor}`
      : `${BASE}/bounties/data`;
  return getJson<BountyListResponse>(url);
}

export async function fetchBountyDetail(
  chainId: number,
  bountyId: number,
): Promise<BountyDetail> {
  const slug = chainFromId(chainId).slug;
  return getJson<BountyDetail>(`${BASE}/${slug}/bounty/${bountyId}/data`);
}

export async function enrichBounty(bounty: BountySummary): Promise<EnrichedBounty> {
  if (!bounty.hasClaims) {
    return { ...bounty, previewImage: null, claimsCount: 0 };
  }
  try {
    const detail = await fetchBountyDetail(bounty.chainId, bounty.id);
    const firstImage =
      detail.claims?.find((c) => Boolean(c.imageUrl))?.imageUrl ?? null;
    return {
      ...bounty,
      previewImage: firstImage,
      claimsCount: detail.claims?.length ?? 0,
      currency: detail.currency,
    };
  } catch {
    return { ...bounty, previewImage: null };
  }
}

export async function enrichBounties(
  items: BountySummary[],
  concurrency = 6,
): Promise<EnrichedBounty[]> {
  const results: EnrichedBounty[] = items.map((item) => ({ ...item }));
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await enrichBounty(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

/** Shared queue so strips don't stampede the detail API. */
const enrichWaiters = new Map<string, Array<(bounty: EnrichedBounty) => void>>();
const enrichInflight = new Set<string>();
const enrichCache = new Map<string, EnrichedBounty>();
let enrichActive = 0;
const ENRICH_CONCURRENCY = 3;
const enrichQueue: Array<() => void> = [];

function pumpEnrichQueue() {
  while (enrichActive < ENRICH_CONCURRENCY && enrichQueue.length > 0) {
    const next = enrichQueue.shift();
    next?.();
  }
}

export function requestBountyEnrich(
  bounty: BountySummary,
): Promise<EnrichedBounty> {
  const key = `${bounty.chainId}-${bounty.id}`;
  const cached = enrichCache.get(key);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const waiters = enrichWaiters.get(key) ?? [];
    waiters.push(resolve);
    enrichWaiters.set(key, waiters);

    if (enrichInflight.has(key)) return;
    enrichInflight.add(key);

    enrichQueue.push(() => {
      enrichActive += 1;
      void enrichBounty(bounty)
        .then((result) => {
          enrichCache.set(key, result);
          const pending = enrichWaiters.get(key) ?? [];
          enrichWaiters.delete(key);
          pending.forEach((waiter) => waiter(result));
        })
        .finally(() => {
          enrichInflight.delete(key);
          enrichActive -= 1;
          pumpEnrichQueue();
        });
    });
    pumpEnrichQueue();
  });
}

export function poidhUrl(chainId: number, bountyId: number): string {
  return `${BASE}/${chainFromId(chainId).slug}/bounty/${bountyId}`;
}
