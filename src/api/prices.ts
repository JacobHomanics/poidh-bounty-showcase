type NativeUsdPrices = {
  eth: number;
  degen: number;
};

let cached: { prices: NativeUsdPrices; fetchedAt: number } | null = null;
const CACHE_MS = 60_000;

export async function fetchNativeUsdPrices(): Promise<NativeUsdPrices> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.prices;
  }

  const url =
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,degen-base&vs_currencies=usd';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Price API ${res.status}`);
  }

  const json = (await res.json()) as {
    ethereum?: { usd?: number };
    'degen-base'?: { usd?: number };
  };

  const eth = json.ethereum?.usd;
  const degen = json['degen-base']?.usd;
  if (typeof eth !== 'number' || typeof degen !== 'number') {
    throw new Error('Price API returned incomplete data');
  }

  const prices = { eth, degen };
  cached = { prices, fetchedAt: Date.now() };
  return prices;
}

export function nativeAmountToUsd(
  amountWei: bigint,
  symbol: 'ETH' | 'DEGEN',
  prices: NativeUsdPrices,
): number {
  const amount = Number(amountWei) / 1e18;
  if (!Number.isFinite(amount)) return 0;
  return amount * (symbol === 'DEGEN' ? prices.degen : prices.eth);
}

export type { NativeUsdPrices };
