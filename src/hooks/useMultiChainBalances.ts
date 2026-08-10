import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import {
  BALANCE_CHAIN_ORDER,
  getNativeBalance,
  nativeCurrencySymbol,
} from '../chains/clients';
import type { KnownChainId } from '../theme';

export type ChainBalance =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; value: bigint; symbol: 'ETH' | 'DEGEN' }
  | { status: 'error' };

export type MultiChainBalances = Record<KnownChainId, ChainBalance>;

function idleBalances(): MultiChainBalances {
  return {
    1: { status: 'idle' },
    42161: { status: 'idle' },
    8453: { status: 'idle' },
    666666666: { status: 'idle' },
  };
}

function loadingBalances(): MultiChainBalances {
  return {
    1: { status: 'loading' },
    42161: { status: 'loading' },
    8453: { status: 'loading' },
    666666666: { status: 'loading' },
  };
}

export function useMultiChainBalances(
  address: string | null,
  enabled: boolean,
): MultiChainBalances {
  const [balances, setBalances] = useState<MultiChainBalances>(idleBalances);

  useEffect(() => {
    if (!enabled || !address) {
      setBalances(idleBalances());
      return;
    }

    let cancelled = false;
    setBalances(loadingBalances());

    const normalized = address as Address;

    void Promise.all(
      BALANCE_CHAIN_ORDER.map(async (chainId) => {
        try {
          const value = await getNativeBalance(chainId, normalized);
          return {
            chainId,
            result: {
              status: 'ready' as const,
              value,
              symbol: nativeCurrencySymbol(chainId),
            },
          };
        } catch {
          return {
            chainId,
            result: { status: 'error' as const },
          };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next = idleBalances();
      for (const { chainId, result } of results) {
        next[chainId] = result;
      }
      setBalances(next);
    });

    return () => {
      cancelled = true;
    };
  }, [address, enabled]);

  return balances;
}

export { BALANCE_CHAIN_ORDER };
