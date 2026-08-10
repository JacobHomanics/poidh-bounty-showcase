import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, radii, spacing } from '../theme';

type Props = {
  children: string;
  style?: StyleProp<ViewStyle>;
};

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    lineHeight: 28,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading2: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading3: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading4: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  heading5: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  heading6: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  strong: {
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  em: {
    fontStyle: 'italic',
  },
  s: {
    textDecorationLine: 'line-through',
    color: colors.inkMuted,
  },
  link: {
    color: colors.coral,
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.line,
    borderLeftWidth: 3,
    marginLeft: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  code_inline: {
    backgroundColor: colors.bgSoft,
    color: colors.coralHot,
    fontFamily: 'DMSans_400Regular',
    borderRadius: radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  fence: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.line,
    borderRadius: radii.sm,
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  code_block: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.line,
    borderRadius: radii.sm,
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    padding: spacing.md,
  },
  bullet_list: {
    marginBottom: spacing.sm,
  },
  ordered_list: {
    marginBottom: spacing.sm,
  },
  list_item: {
    marginVertical: 2,
  },
  bullet_list_icon: {
    color: colors.inkMuted,
  },
  ordered_list_icon: {
    color: colors.inkMuted,
  },
  hr: {
    backgroundColor: colors.line,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  table: {
    borderColor: colors.line,
    borderRadius: radii.sm,
    marginVertical: spacing.sm,
  },
  tr: {
    borderBottomColor: colors.line,
  },
  th: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    padding: spacing.sm,
  },
  td: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    padding: spacing.sm,
  },
  image: {
    borderRadius: radii.sm,
  },
});

function onLinkPress(url: string) {
  void Linking.openURL(url);
  return false;
}

export function MarkdownBody({ children, style }: Props) {
  return (
    <View style={style}>
      <Markdown style={markdownStyles} onLinkPress={onLinkPress}>
        {children}
      </Markdown>
    </View>
  );
}
