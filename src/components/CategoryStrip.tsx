import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { requestBountyEnrich } from '../api/poidh';
import type { EnrichedBounty } from '../types';
import { colors, spacing } from '../theme';
import { BountyCard } from './BountyCard';

type Props = {
  title: string;
  accent?: string;
  bounties: EnrichedBounty[];
  onSelect: (bounty: EnrichedBounty) => void;
  /** Pixels per tick (~16ms). Positive scrolls right. */
  speed?: number;
};

const CARD_STRIDE = 160 + spacing.md;
const COPIES = 3;

export function CategoryStrip({
  title,
  accent,
  bounties,
  onSelect,
  speed = 0.45,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const wrappingRef = useRef(false);
  const readyRef = useRef(false);
  const requestedRef = useRef(new Set<string>());
  const [paused, setPaused] = useState(false);
  const [enriched, setEnriched] = useState<Record<string, EnrichedBounty>>({});

  const looped =
    bounties.length > 0
      ? Array.from({ length: COPIES }, () => bounties).flat()
      : [];
  const loopWidth = Math.max(bounties.length * CARD_STRIDE, 1);

  const wrapOffset = (x: number) => {
    if (loopWidth <= 1) return x;
    let next = x;
    // Keep the viewport inside the middle copy so both directions stay endless.
    while (next >= loopWidth * 2) next -= loopWidth;
    while (next < loopWidth) next += loopWidth;
    return next;
  };

  const jumpTo = (x: number) => {
    wrappingRef.current = true;
    offsetRef.current = x;
    scrollRef.current?.scrollTo({ x, animated: false });
    requestAnimationFrame(() => {
      wrappingRef.current = false;
    });
  };

  useEffect(() => {
    requestedRef.current = new Set();
    setEnriched({});
    readyRef.current = false;
  }, [bounties]);

  useEffect(() => {
    if (bounties.length === 0) return;
    // Land in the middle copy once the strip mounts / data changes.
    const start = loopWidth;
    jumpTo(start);
    readyRef.current = true;
  }, [bounties, loopWidth]);

  useEffect(() => {
    let cancelled = false;

    const enrichAround = (offset: number) => {
      const normalized = ((offset % loopWidth) + loopWidth) % loopWidth;
      const start = Math.max(0, Math.floor(normalized / CARD_STRIDE) - 1);
      const end = Math.min(bounties.length - 1, start + 5);

      for (let i = start; i <= end; i++) {
        const bounty = bounties[i];
        if (!bounty) continue;
        const key = `${bounty.chainId}-${bounty.id}`;
        if (requestedRef.current.has(key)) continue;
        requestedRef.current.add(key);

        if (!bounty.hasClaims) {
          setEnriched((prev) => ({
            ...prev,
            [key]: { ...bounty, previewImage: null, claimsCount: 0 },
          }));
          continue;
        }

        void requestBountyEnrich(bounty).then((result) => {
          if (cancelled) return;
          setEnriched((prev) => ({ ...prev, [key]: result }));
        });
      }
    };

    enrichAround(offsetRef.current);
    const id = setInterval(() => enrichAround(offsetRef.current), 500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bounties, loopWidth]);

  useEffect(() => {
    if (paused || draggingRef.current || bounties.length === 0) return;

    const id = setInterval(() => {
      if (!readyRef.current || wrappingRef.current) return;
      const next = wrapOffset(offsetRef.current + speed);
      if (next !== offsetRef.current + speed) {
        jumpTo(next);
        return;
      }
      offsetRef.current = next;
      scrollRef.current?.scrollTo({
        x: next,
        animated: false,
      });
    }, 16);

    return () => clearInterval(id);
  }, [paused, speed, bounties.length, loopWidth]);

  const pauseForUser = () => {
    draggingRef.current = true;
    setPaused(true);
  };

  const resumeAutoScroll = () => {
    draggingRef.current = false;
    const wrapped = wrapOffset(offsetRef.current);
    if (wrapped !== offsetRef.current) {
      jumpTo(wrapped);
    }
    setPaused(false);
  };

  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    draggingRef.current = false;
    offsetRef.current = event.nativeEvent.contentOffset.x;
    const wrapped = wrapOffset(offsetRef.current);
    if (wrapped !== offsetRef.current) {
      jumpTo(wrapped);
    }
    const velocity = event.nativeEvent.velocity?.x ?? 0;
    if (Math.abs(velocity) < 0.05) {
      setPaused(false);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (wrappingRef.current) return;
    const x = event.nativeEvent.contentOffset.x;
    offsetRef.current = x;
    // Teleport while dragging/flinging near the edges of the middle copy.
    if (x < loopWidth * 0.5 || x >= loopWidth * 2.5) {
      const wrapped = wrapOffset(x);
      if (wrapped !== x) jumpTo(wrapped);
    }
  };

  if (bounties.length === 0) return null;

  return (
    <View style={styles.strip}>
      <View style={styles.header}>
        <View style={[styles.accent, accent ? { backgroundColor: accent } : null]} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{bounties.length}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={pauseForUser}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={resumeAutoScroll}
        decelerationRate="fast"
      >
        {looped.map((item, index) => {
          const key = `${item.chainId}-${item.id}`;
          const bounty = enriched[key] ?? item;
          return (
            <BountyCard
              key={`${key}-${index}`}
              compact
              bounty={bounty}
              onPress={() => onSelect(bounty)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  accent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.coral,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    flex: 1,
  },
  count: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  row: {
    paddingBottom: 4,
  },
});
