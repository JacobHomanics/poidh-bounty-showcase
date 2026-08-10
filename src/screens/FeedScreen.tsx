import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchBounties } from '../api/poidh';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { CategoryStrip } from '../components/CategoryStrip';
import { BountyFeedProvider } from '../providers/BountyFeedContext';
import type { EnrichedBounty } from '../types';
import { chains, colors, spacing } from '../theme';

type Props = {
  onSelect: (bounty: EnrichedBounty) => void;
};

const CHAIN_ORDER = [8453, 42161, 1, 666666666] as const;
const INITIAL_PAGES = 4;
const STRIP_SPEEDS = [0.4, -0.35, 0.5, -0.3, 0.45, -0.4, 0.55, -0.25];
const STRIP_CAP = 48;

function mergeByKey(
  prev: EnrichedBounty[],
  next: EnrichedBounty[],
  replace: boolean,
): EnrichedBounty[] {
  if (replace) return next;
  const seen = new Set(prev.map((item) => `${item.chainId}-${item.id}`));
  const appended = next.filter((item) => !seen.has(`${item.chainId}-${item.id}`));
  return [...prev, ...appended];
}

function sortByValue(a: EnrichedBounty, b: EnrichedBounty) {
  return (b.priceUsd ?? 0) - (a.priceUsd ?? 0);
}

function sortByNewest(a: EnrichedBounty, b: EnrichedBounty) {
  return Number(b.createdAt) - Number(a.createdAt);
}

function cap(list: EnrichedBounty[]) {
  return list.slice(0, STRIP_CAP);
}

type Strip = {
  id: string;
  title: string;
  accent: string;
  bounties: EnrichedBounty[];
};

export function FeedScreen({ onSelect }: Props) {
  const [items, setItems] = useState<EnrichedBounty[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextCursor?: number | null, replace = false) => {
      const page = await fetchBounties(nextCursor ?? null);
      const summaries: EnrichedBounty[] = page.items.map((item) => ({ ...item }));
      setItems((prev) => mergeByKey(prev, summaries, replace));
      setCursor(page.nextCursor);
      return page.nextCursor;
    },
    [],
  );

  const bootstrap = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      let next: number | null | undefined = null;
      for (let i = 0; i < INITIAL_PAGES; i++) {
        next = await loadPage(i === 0 ? null : next, i === 0);
        if (next == null) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bounties');
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      let next: number | null | undefined = null;
      for (let i = 0; i < INITIAL_PAGES; i++) {
        next = await loadPage(i === 0 ? null : next, i === 0);
        if (next == null) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || cursor == null) return;
    setLoadingMore(true);
    try {
      await loadPage(cursor);
    } catch {
      // keep existing strips if pagination fails
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadPage, loading, loadingMore]);

  const strips = useMemo(() => {
    const open = items.filter((item) => item.inProgress && !item.isCanceled);
    const thematic: Strip[] = [
      {
        id: 'fresh',
        title: 'Fresh drops',
        accent: colors.coral,
        bounties: cap([...open].sort(sortByNewest)),
      },
      {
        id: 'high-rollers',
        title: 'High rollers',
        accent: colors.voting,
        bounties: cap([...open].sort(sortByValue)),
      },
      {
        id: 'open-lanes',
        title: 'Open lanes',
        accent: colors.success,
        bounties: cap(
          open.filter((item) => !item.hasClaims).sort(sortByValue),
        ),
      },
      {
        id: 'with-proof',
        title: 'With proof',
        accent: '#7EB6FF',
        bounties: cap(
          open.filter((item) => item.hasClaims).sort(sortByNewest),
        ),
      },
      {
        id: 'open-bounties',
        title: 'Open bounties',
        accent: '#FF9B6A',
        bounties: cap(
          open.filter((item) => item.isMultiplayer).sort(sortByValue),
        ),
      },
      {
        id: 'solo',
        title: 'Solo shots',
        accent: '#C9A0FF',
        bounties: cap(
          open.filter((item) => !item.isMultiplayer).sort(sortByValue),
        ),
      },
      {
        id: 'crowdfunded',
        title: 'Crowdfunded',
        accent: '#5AD0C5',
        bounties: cap(
          open.filter((item) => item.hasParticipants).sort(sortByValue),
        ),
      },
    ];

    const byChain: Strip[] = CHAIN_ORDER.map((chainId) => {
      const meta = chains[chainId];
      return {
        id: `chain-${chainId}`,
        title: meta.label,
        accent: meta.accent,
        bounties: open
          .filter((item) => item.chainId === chainId)
          .sort(sortByValue),
      };
    });

    return [...thematic, ...byChain].filter((strip) => strip.bounties.length > 0);
  }, [items]);

  return (
    <BountyFeedProvider items={items}>
      <View style={styles.screen}>
      <AppHeader
        subtitle="proof-first discovery for live poidh bounties"
        showAuth
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.coral} size="large" />
          <Text style={styles.loadingText}>loading the roll…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>couldn’t load bounties</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.coral}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 240;
            if (nearBottom) void loadMore();
          }}
          scrollEventThrottle={200}
        >
          {strips.map((strip, index) => (
            <CategoryStrip
              key={strip.id}
              title={strip.title}
              accent={strip.accent}
              bounties={strip.bounties}
              onSelect={onSelect}
              speed={STRIP_SPEEDS[index % STRIP_SPEEDS.length]}
            />
          ))}

          {strips.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>no open bounties yet</Text>
              <Text style={styles.errorBody}>pull to refresh and try again</Text>
            </View>
          ) : null}

          {loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : cursor == null ? (
            <Text style={styles.endText}>end of loaded roll</Text>
          ) : null}
        </ScrollView>
      )}
      <AppFooter
        onPress={() => {
          void Linking.openURL('https://poidh.xyz');
        }}
      />
      </View>
    </BountyFeedProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    minHeight: 180,
  },
  loadingText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
  },
  errorTitle: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
  },
  errorBody: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  endText: {
    textAlign: 'center',
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    paddingVertical: spacing.lg,
  },
});
