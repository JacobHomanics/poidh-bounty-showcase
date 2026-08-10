import { useEffect, useState } from 'react';
import {
  fetchNativeUsdPrices,
  type NativeUsdPrices,
} from '../api/prices';

type PricesState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; prices: NativeUsdPrices }
  | { status: 'error' };

export function useNativeUsdPrices(enabled: boolean): PricesState {
  const [state, setState] = useState<PricesState>({ status: 'idle' });

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    void fetchNativeUsdPrices()
      .then((prices) => {
        if (!cancelled) setState({ status: 'ready', prices });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
