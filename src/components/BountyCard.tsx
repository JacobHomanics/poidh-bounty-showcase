import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { EnrichedBounty } from '../types';
import { colors, radii, spacing } from '../theme';
import { bountyStatus, formatUsd, relativeTime } from '../utils/format';

type Props = {
  bounty: EnrichedBounty;
  onPress: () => void;
  /** Compact card for horizontal category strips. */
  compact?: boolean;
};

export function BountyCard({ bounty, onPress, compact = false }: Props) {
  const status = bountyStatus(bounty);
  const hasPhoto = Boolean(bounty.previewImage);
  const claimsLabel =
    bounty.claimsCount != null
      ? `${bounty.claimsCount} claim${bounty.claimsCount === 1 ? '' : 's'}`
      : bounty.hasClaims
        ? 'has claims'
        : '0 claims';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.cardCompact : styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.frame, compact && styles.frameCompact]}>
        <View style={[styles.photoWell, compact && styles.photoWellCompact]}>
          {hasPhoto ? (
            <Image
              source={{ uri: bounty.previewImage! }}
              style={styles.photo}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <LinearGradient
              colors={['#243041', '#15202B', '#101820']}
              style={styles.placeholder}
            >
              <Text
                style={[
                  styles.placeholderMark,
                  compact && styles.placeholderMarkCompact,
                ]}
              >
                {bounty.hasClaims ? 'developing…' : 'no proof yet'}
              </Text>
              {!compact ? (
                <Text style={styles.placeholderHint}>
                  {bounty.hasClaims
                    ? 'pulling claim photos'
                    : 'open lane — claim it first'}
                </Text>
              ) : null}
            </LinearGradient>
          )}

          <View style={[styles.rewardBadge, compact && styles.rewardBadgeCompact]}>
            <Text style={[styles.rewardUsd, compact && styles.rewardUsdCompact]}>
              {formatUsd(bounty.priceUsd)}
            </Text>
          </View>

          <View style={styles.overlay}>
            <View style={styles.overlayScrim} />
            <View style={[styles.overlayContent, compact && styles.overlayContentCompact]}>
              <Text
                style={[styles.title, compact && styles.titleCompact]}
                numberOfLines={compact ? 3 : 4}
              >
                {bounty.title}
              </Text>
            </View>
            <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
              <Text
                style={[
                  styles.status,
                  status.tone === 'voting' && styles.statusVoting,
                  status.tone === 'closed' && styles.statusClosed,
                ]}
              >
                {status.label}
              </Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{claimsLabel}</Text>
              {!compact ? (
                <>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.metaText}>{relativeTime(bounty.createdAt)}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardCompact: {
    width: 160,
    marginRight: spacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  frame: {
    backgroundColor: colors.frame,
    borderRadius: radii.lg,
    padding: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      },
    }),
  },
  frameCompact: {
    borderRadius: radii.md,
    padding: 6,
  },
  photoWell: {
    height: 240,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.film,
  },
  photoWellCompact: {
    height: 150,
    borderRadius: radii.sm,
  },
  photo: {
    ...StyleSheet.absoluteFill,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  placeholderMark: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  placeholderMarkCompact: {
    fontSize: 13,
    textAlign: 'center',
  },
  placeholderHint: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  rewardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: colors.coral,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rewardBadgeCompact: {
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rewardUsd: {
    color: '#1A1010',
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
  },
  rewardUsdCompact: {
    fontSize: 11,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  overlayScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 16, 24, 0.38)',
  },
  overlayContent: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  overlayContentCompact: {
    paddingHorizontal: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  metaRow: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    zIndex: 1,
  },
  metaRowCompact: {
    left: 8,
    bottom: 8,
    right: 8,
  },
  status: {
    color: colors.success,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  statusVoting: {
    color: colors.voting,
  },
  statusClosed: {
    color: colors.inkDim,
  },
  metaText: {
    color: 'rgba(244,238,230,0.78)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  dot: {
    color: 'rgba(244,238,230,0.45)',
  },
});
