import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

export type ChainFilterValue = 'all' | 1 | 42161 | 8453 | 666666666;
export type SortValue = 'value' | 'newest' | 'claims';

const CHAIN_OPTIONS: { value: ChainFilterValue; label: string }[] = [
  { value: 'all', label: 'all chains' },
  { value: 8453, label: 'base' },
  { value: 42161, label: 'arbitrum' },
  { value: 1, label: 'ethereum' },
  { value: 666666666, label: 'degen' },
];

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'value', label: 'highest $' },
  { value: 'newest', label: 'newest' },
  { value: 'claims', label: 'most claims' },
];

type Props = {
  chain: ChainFilterValue;
  sort: SortValue;
  onlyOpen: boolean;
  onChainChange: (value: ChainFilterValue) => void;
  onSortChange: (value: SortValue) => void;
  onOnlyOpenChange: (value: boolean) => void;
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function FilterBar({
  chain,
  sort,
  onlyOpen,
  onChainChange,
  onSortChange,
  onOnlyOpenChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CHAIN_OPTIONS.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            active={chain === option.value}
            onPress={() => onChainChange(option.value)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={sort === option.value}
            onPress={() => onSortChange(option.value)}
          />
        ))}
        <Chip
          label="open only"
          active={onlyOpen}
          onPress={() => onOnlyOpenChange(!onlyOpen)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  chipText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    textTransform: 'lowercase',
  },
  chipTextActive: {
    color: '#1A1010',
  },
});
