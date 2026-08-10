import { PrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EnsureEmbeddedWallet } from '../components/EnsureEmbeddedWallet';
import { colors, spacing } from '../theme';

const APP_ID = (process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? '').trim();

type Props = {
  children: ReactNode;
};

export function PrivyAppProvider({ children }: Props) {
  if (!APP_ID) {
    return (
      <View style={styles.missing}>
        <Text style={styles.title}>Privy app ID missing</Text>
        <Text style={styles.body}>
          Set EXPO_PUBLIC_PRIVY_APP_ID in a .env file (see .env.example), then restart Expo.
        </Text>
        {children}
      </View>
    );
  }

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ['email', 'sms'],
        appearance: {
          theme: '#0A1018',
          accentColor: '#E97474',
          logo: '',
          landingHeader: 'Log in to poidh roll',
          loginMessage: 'Use your email or phone number',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
      }}
    >
      <EnsureEmbeddedWallet />
      {children}
    </PrivyProvider>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  body: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
