import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { colors, radii } from '../theme';
import { shortAddress } from '../utils/format';

type Props = {
  label?: string;
  address: string;
  copyKey?: string;
  style?: StyleProp<ViewStyle>;
};

export function AddressField({
  label = 'issuer',
  address,
  copyKey = 'issuer',
  style,
}: Props) {
  const { copy, isCopied } = useCopyToClipboard();
  const copied = isCopied(copyKey);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} selectable>
          {shortAddress(address)}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={copied ? `${label} copied` : `Copy ${label}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          void copy(address, copyKey);
        }}
        style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
      >
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={14}
          color={copied ? colors.success : colors.coral}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  label: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  copyButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: {
    opacity: 0.75,
  },
});
