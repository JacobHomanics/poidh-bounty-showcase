import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

type FooterAction = {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

type Props = {
  onPress: () => void;
  label?: string;
  hint?: string;
  /** Optional second CTA shown beside the primary button (e.g. Claim). */
  secondary?: FooterAction;
};

export function AppFooter({
  onPress,
  label = 'open on poidh.xyz',
  hint = 'fund · claim · vote',
  secondary,
}: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['transparent', 'rgba(233,116,116,0.12)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            disabled={secondary.disabled || secondary.loading}
            style={({ pressed }) => [
              styles.cta,
              styles.secondary,
              (secondary.disabled || secondary.loading) && styles.disabled,
              pressed && !secondary.disabled && styles.pressed,
            ]}
          >
            {secondary.loading ? (
              <ActivityIndicator color={colors.coral} />
            ) : (
              <>
                <Text style={styles.secondaryText}>{secondary.label}</Text>
                {secondary.hint ? (
                  <Text style={styles.secondaryHint}>{secondary.hint}</Text>
                ) : null}
              </>
            )}
          </Pressable>
        ) : null}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.cta,
            styles.primary,
            secondary ? styles.primarySplit : null,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.ctaText}>{label}</Text>
          {hint ? <Text style={styles.ctaHint}>{hint}</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cta: {
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.coral,
  },
  primarySplit: {
    flex: 1.15,
  },
  secondary: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.coral,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  ctaText: {
    color: '#1A1010',
    fontFamily: 'Syne_700Bold',
    fontSize: 13,
  },
  ctaHint: {
    color: 'rgba(26,16,16,0.65)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
  secondaryText: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 13,
  },
  secondaryHint: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
});
