import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchBountyDetail, poidhUrl } from '../api/poidh';
import { AddressField } from '../components/AddressField';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { ClaimCarousel } from '../components/ClaimCarousel';
import { ClaimFlow } from '../components/ClaimFlow';
import type { BountyDetail, EnrichedBounty } from '../types';
import { colors, radii, spacing } from '../theme';
import {
  bountyStatus,
  chainFromId,
  formatUsd,
  relativeTime,
} from '../utils/format';
import { extractDeadline, formatDeadlineLabel } from '../utils/deadline';
import { poidhContractAddress } from '../contracts/poidh';

type Props = {
  bounty: EnrichedBounty;
  onBack: () => void;
};

type TabKey = 'about' | 'claims';

export function BountyScreen({ bounty, onBack }: Props) {
  const [detail, setDetail] = useState<BountyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('about');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBountyDetail(bounty.chainId, bounty.id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bounty');
    } finally {
      setLoading(false);
    }
  }, [bounty.chainId, bounty.id]);

  useEffect(() => {
    setTab('about');
    setDescriptionExpanded(false);
    setClaimOpen(false);
    void loadDetail();
  }, [loadDetail]);

  const handleClaimComplete = useCallback(() => {
    setClaimOpen(false);
    setTab('claims');
    void loadDetail();
    // Indexer lag — refresh again so the new claim can appear.
    setTimeout(() => {
      void loadDetail();
    }, 3000);
    setTimeout(() => {
      void loadDetail();
    }, 8000);
  }, [loadDetail]);

  const chain = chainFromId(bounty.chainId);
  const status = bountyStatus(detail ?? bounty);
  const description = detail?.description ?? bounty.description;
  const deadline = extractDeadline(description, detail?.deadline ?? null);
  const descriptionLikelyLong =
    description.split('\n').length > 8 || description.length > 360;
  const showDescriptionToggle = descriptionExpanded || descriptionLikelyLong;
  const openOnPoidh = () => {
    Linking.openURL(detail?.url ?? poidhUrl(bounty.chainId, bounty.id));
  };

  const onChainBountyId = detail?.onChainId ?? bounty.onChainId;
  const claimGate = useMemo(() => {
    const live = detail ?? bounty;
    if (!poidhContractAddress(bounty.chainId)) {
      return { canClaim: false, reason: 'Claiming is not supported on this chain yet' };
    }
    if (live.isCanceled) {
      return { canClaim: false, reason: 'This bounty was canceled' };
    }
    if (!live.inProgress) {
      return { canClaim: false, reason: 'This bounty is already closed' };
    }
    if (live.isVoting) {
      return { canClaim: false, reason: 'Voting is ongoing — new claims are blocked' };
    }
    if (onChainBountyId == null || !Number.isFinite(Number(onChainBountyId))) {
      return { canClaim: false, reason: 'Missing on-chain bounty id' };
    }
    return { canClaim: true, reason: null as string | null };
  }, [bounty, detail, onChainBountyId]);

  return (
    <View style={styles.screen}>
      {claimOpen ? (
        <ClaimFlow
          chainId={bounty.chainId}
          onChainBountyId={onChainBountyId}
          bountyTitle={detail?.title ?? bounty.title}
          issuerAddress={detail?.issuer ?? bounty.issuer}
          canClaim={claimGate.canClaim}
          disabledReason={claimGate.reason}
          onCancel={() => setClaimOpen(false)}
          onComplete={() => handleClaimComplete()}
        />
      ) : (
        <>
      <AppHeader title="bounty" onBack={onBack} showAuth />
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>{detail?.title ?? bounty.title}</Text>
          <View style={styles.badgeRow}>
            {deadline ? (
              <View style={styles.deadlineBadge}>
                <Text style={styles.deadlineBadgeText}>
                  {formatDeadlineLabel(deadline)}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.statusBadge,
                status.tone === 'voting' && styles.statusBadgeVoting,
                status.tone === 'closed' && styles.statusBadgeClosed,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  status.tone === 'voting' && styles.statusBadgeTextVoting,
                  status.tone === 'closed' && styles.statusBadgeTextClosed,
                ]}
              >
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('about')}
            style={[styles.tab, tab === 'about' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'about' && styles.tabTextActive]}>
              About
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('claims')}
            style={[styles.tab, tab === 'claims' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'claims' && styles.tabTextActive]}>
              Claims
            </Text>
          </Pressable>
        </View>

        {tab === 'about' ? (
          <View style={styles.about}>
            <View style={styles.priceRow}>
              <Text style={styles.reward}>
                {formatUsd(detail?.priceUsd ?? bounty.priceUsd)}
              </Text>
              <AddressField
                label="issuer"
                address={detail?.issuer ?? bounty.issuer}
                copyKey={`issuer-${bounty.chainId}-${bounty.id}`}
                style={styles.issuerField}
              />
              <View style={styles.postedField}>
                <Text style={styles.postedValue}>
                  {relativeTime(detail?.createdAt ?? bounty.createdAt)}
                </Text>
              </View>
            </View>
            <View>
              <Text
                style={styles.description}
                numberOfLines={descriptionExpanded ? undefined : 8}
              >
                {description}
              </Text>
              {showDescriptionToggle && (
                <Pressable
                  onPress={() => setDescriptionExpanded((open) => !open)}
                  hitSlop={8}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>
                    {descriptionExpanded ? 'Show less' : 'Show more...'}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.metaFooter}>
              <Text style={styles.footerItem}>{chain.label}</Text>
              {(detail?.isMultiplayer || bounty.isMultiplayer) && (
                <>
                  <Text style={styles.footerDot}>·</Text>
                  <Text style={styles.footerItem}>open bounty</Text>
                </>
              )}
            </View>
          </View>
        ) : loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.coral} />
            <Text style={styles.loadingText}>developing proofs…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : detail?.claims?.length ? (
          <ClaimCarousel claims={detail.claims} />
        ) : (
          <View style={styles.emptyClaims}>
            <Text style={styles.emptyTitle}>no claims yet</Text>
            <Text style={styles.emptyBody}>
              this is an open lane — be the first proof on the roll
            </Text>
          </View>
        )}
      </ScrollView>
      <AppFooter
        onPress={openOnPoidh}
        label="open on poidh.xyz"
        hint=""
        secondary={{
          label: 'Claim',
          onPress: () => setClaimOpen(true),
          disabled: loading,
        }}
      />
        </>
      )}
    </View>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  hero: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  deadlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(245, 196, 120, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 120, 0.45)',
  },
  deadlineBadgeText: {
    color: '#E8B86D',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(111,207,151,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(111,207,151,0.45)',
  },
  statusBadgeVoting: {
    backgroundColor: 'rgba(242,201,76,0.16)',
    borderColor: 'rgba(242,201,76,0.5)',
  },
  statusBadgeClosed: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.line,
  },
  statusBadgeText: {
    color: colors.success,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  statusBadgeTextVoting: {
    color: colors.voting,
  },
  statusBadgeTextClosed: {
    color: colors.inkDim,
  },
  about: {
    gap: spacing.sm,
  },
  metaFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  footerItem: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  footerDot: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reward: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    flexShrink: 0,
  },
  issuerField: {
    flex: 1,
    minWidth: 0,
  },
  postedField: {
    flexShrink: 0,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    minHeight: 40,
  },
  postedValue: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: colors.coral,
  },
  tabText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#1A1010',
    fontFamily: 'Syne_700Bold',
  },
  description: {
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  showMoreButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  showMoreText: {
    color: colors.coral,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  loadingBlock: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
  },
  errorText: {
    color: colors.coral,
    fontFamily: 'DMSans_400Regular',
  },
  emptyClaims: {
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 6,
  },
  emptyTitle: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
  },
  emptyBody: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
});
