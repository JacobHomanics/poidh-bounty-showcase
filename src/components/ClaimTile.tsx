import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Claim } from '../types';
import { colors, radii, spacing } from '../theme';
import { shortAddress } from '../utils/format';

type Props = {
  claim: Claim;
  /** Stretch to fill a carousel card instead of a fixed tile width. */
  fill?: boolean;
};

export function ClaimTile({ claim, fill = false }: Props) {
  const handle = claim.farcasterHandle || claim.twitterHandle;
  const openSocial = () => {
    if (claim.farcasterHandle) {
      Linking.openURL(`https://farcaster.xyz/${claim.farcasterHandle}`);
      return;
    }
    if (claim.twitterHandle) {
      Linking.openURL(`https://x.com/${claim.twitterHandle}`);
    }
  };

  return (
    <View style={[styles.tile, fill && styles.tileFill]}>
      <View style={[styles.imageWrap, fill && styles.imageWrapFill]}>
        {claim.imageUrl ? (
          <Image
            source={{ uri: claim.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>no image</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {claim.title || `claim #${claim.claimId}`}
        </Text>
        {claim.description ? (
          <Text style={styles.description} numberOfLines={fill ? 3 : 3}>
            {claim.description}
          </Text>
        ) : null}
        <Pressable onPress={openSocial} disabled={!handle} style={styles.issuer}>
          <Text style={styles.issuerText}>
            {handle ? `@${handle}` : shortAddress(claim.issuerAddress)}
          </Text>
          <Text style={styles.claimId}>#{claim.claimId}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 240,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  tileFill: {
    width: '100%',
    height: '100%',
    marginRight: 0,
  },
  imageWrap: {
    height: 130,
    backgroundColor: colors.film,
  },
  imageWrapFill: {
    height: 150,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 150,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  description: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  issuer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  issuerText: {
    color: colors.coral,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  claimId: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
});
