import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AuthButton } from './AuthButton';

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showAuth?: boolean;
};

export function AppHeader({
  title = 'poidh roll',
  subtitle,
  onBack,
  showAuth = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(233,116,116,0.18)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {onBack ? (
        <View style={styles.row}>
          <View style={[styles.side, showAuth && styles.sideWide]}>
            <Pressable
              onPress={onBack}
              style={styles.back}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.center}>
            <Text style={styles.titleCentered} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitleCentered} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.side, styles.sideEnd, showAuth && styles.sideWide]}>
            {showAuth ? <AuthButton /> : null}
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.brandMark}>
            <View style={styles.lens} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {showAuth ? <AuthButton /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  side: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideWide: {
    width: 'auto',
    minWidth: 96,
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: colors.coral,
    backgroundColor: 'rgba(233,116,116,0.25)',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  titleCentered: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  subtitleCentered: {
    marginTop: 2,
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
