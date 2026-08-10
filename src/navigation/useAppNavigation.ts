import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { EnrichedBounty } from '../types';
import {
  type AppRoute,
  bountyKey,
  bountyPath,
  feedPath,
  parseAppUrl,
  pathForRoute,
} from './paths';

function readInitialRoute(): AppRoute {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return parseAppUrl(window.location.pathname + window.location.search);
  }
  return { name: 'feed' };
}

function writePath(path: string, mode: 'push' | 'replace') {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (mode === 'replace') {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
}

export function useAppNavigation() {
  const [route, setRoute] = useState<AppRoute>(readInitialRoute);
  const cacheRef = useRef(new Map<string, EnrichedBounty>());
  const [selected, setSelected] = useState<EnrichedBounty | null>(null);

  const syncFromUrl = useCallback((url: string | null) => {
    const next = parseAppUrl(url);
    setRoute(next);
    if (next.name === 'feed') {
      setSelected(null);
      return;
    }
    const cached = cacheRef.current.get(bountyKey(next.chainId, next.bountyId));
    setSelected(
      cached ?? {
        id: next.bountyId,
        onChainId: next.bountyId,
        chainId: next.chainId,
        title: 'Loading bounty…',
        description: '',
        amount: '0',
        issuer: '',
        createdAt: 0,
        inProgress: true,
        isJoinedBounty: false,
        isCanceled: false,
        isMultiplayer: false,
        isVoting: false,
        deadline: null,
        hasClaims: false,
        hasParticipants: false,
        priceUsd: 0,
        url: bountyPath(next.chainId, next.bountyId),
      },
    );
  }, []);

  useEffect(() => {
    let alive = true;

    void Linking.getInitialURL().then((url) => {
      if (!alive || !url) return;
      // Web already used window.location; native uses the linking URL.
      if (Platform.OS !== 'web') syncFromUrl(url);
    });

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      syncFromUrl(url);
    });

    const onPopState = () => {
      syncFromUrl(window.location.pathname + window.location.search);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('popstate', onPopState);
    }

    return () => {
      alive = false;
      linkingSub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('popstate', onPopState);
      }
    };
  }, [syncFromUrl]);

  // Keep URL in sync if we landed on a deep link without rewriting.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const expected = pathForRoute(route);
    if (window.location.pathname !== expected) {
      writePath(expected, 'replace');
    }
  }, [route]);

  const openBounty = useCallback((bounty: EnrichedBounty) => {
    cacheRef.current.set(bountyKey(bounty.chainId, bounty.id), bounty);
    setSelected(bounty);
    setRoute({ name: 'bounty', chainId: bounty.chainId, bountyId: bounty.id });
    writePath(bountyPath(bounty.chainId, bounty.id), 'push');
  }, []);

  const goToFeed = useCallback(() => {
    setSelected(null);
    setRoute({ name: 'feed' });
    writePath(feedPath(), 'replace');
  }, []);

  return {
    route,
    selected,
    openBounty,
    goToFeed,
  };
}
