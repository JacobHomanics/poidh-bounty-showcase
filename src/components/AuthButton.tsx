import { Ionicons } from '@expo/vector-icons';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBountyFeedItems } from '../providers/BountyFeedContext';
import { colors, radii, spacing } from '../theme';
import { formatUsd } from '../utils/format';
import { AddressField } from './AddressField';

const HAS_PRIVY = Boolean(process.env.EXPO_PUBLIC_PRIVY_APP_ID);

function fullIdentity(user: ReturnType<typeof usePrivy>['user']): string {
  return user?.email?.address ?? user?.phone?.number ?? 'Signed in';
}

function walletAddresses(user: ReturnType<typeof usePrivy>['user']): string[] {
  if (!user?.linkedAccounts?.length) return [];
  const addresses: string[] = [];
  for (const account of user.linkedAccounts) {
    if (
      (account.type === 'wallet' || account.type === 'smart_wallet') &&
      'address' in account &&
      typeof account.address === 'string'
    ) {
      addresses.push(account.address.toLowerCase());
    }
  }
  return addresses;
}

function primaryEvmAddress(
  user: ReturnType<typeof usePrivy>['user'],
): string | null {
  if (!user?.linkedAccounts?.length) return null;

  const wallets = user.linkedAccounts.filter(
    (account) =>
      (account.type === 'wallet' || account.type === 'smart_wallet') &&
      'address' in account &&
      typeof account.address === 'string',
  );

  const ethereum = wallets.find(
    (account) => 'chainType' in account && account.chainType === 'ethereum',
  );
  const pick = ethereum ?? wallets[0];
  if (pick && 'address' in pick && typeof pick.address === 'string') {
    return pick.address;
  }
  return null;
}

function PrivyAuthButton() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const items = useBountyFeedItems();
  const [open, setOpen] = useState(false);

  const evmAddress = useMemo(() => primaryEvmAddress(user), [user]);

  const totalUsd = useMemo(() => {
    const addresses = new Set(walletAddresses(user));
    if (addresses.size === 0) return 0;
    return items
      .filter(
        (item) =>
          item.inProgress &&
          !item.isCanceled &&
          addresses.has(item.issuer.toLowerCase()),
      )
      .reduce((sum, item) => sum + (item.priceUsd ?? 0), 0);
  }, [items, user]);

  if (!ready) {
    return (
      <Pressable style={[styles.button, styles.ghost]} disabled>
        <ActivityIndicator color={colors.inkMuted} size="small" />
      </Pressable>
    );
  }

  if (authenticated) {
    return (
      <View style={styles.wrap}>
        <Pressable
          onPress={() => setOpen((value) => !value)}
          style={[styles.button, styles.ghost, styles.trigger]}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
        >
          <Text style={styles.ghostLabel} numberOfLines={1}>
            Account
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.inkMuted}
          />
        </Pressable>

        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <View style={styles.menuAnchor}>
              <Pressable style={styles.menu} onPress={(e) => e.stopPropagation?.()}>
                <Text style={styles.menuIdentity} numberOfLines={1}>
                  {fullIdentity(user)}
                </Text>
                {evmAddress ? (
                  <AddressField
                    label="wallet"
                    address={evmAddress}
                    copyKey="account-wallet"
                    style={styles.addressField}
                  />
                ) : (
                  <Text style={styles.noWallet}>No EVM wallet yet</Text>
                )}
                <Text style={styles.menuTotal}>{formatUsd(totalUsd)}</Text>
                <Text style={styles.menuHint}>your open bounties</Text>
                <View style={styles.menuRule} />
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    void logout();
                  }}
                  style={styles.logoutRow}
                  accessibilityRole="button"
                  accessibilityLabel="Log out"
                >
                  <Text style={styles.logoutLabel}>Log out</Text>
                </Pressable>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        void login({ loginMethods: ['email', 'sms'] });
      }}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Log in"
    >
      <Text style={styles.label}>Log in</Text>
    </Pressable>
  );
}

export function AuthButton() {
  if (!HAS_PRIVY) {
    return (
      <Pressable
        style={[styles.button, styles.ghost]}
        disabled
        accessibilityRole="button"
        accessibilityLabel="Log in unavailable"
      >
        <Text style={styles.ghostLabel}>Log in</Text>
      </Pressable>
    );
  }

  return <PrivyAuthButton />;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 30,
  },
  button: {
    minWidth: 72,
    maxWidth: 150,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trigger: {
    flexDirection: 'row',
    gap: 6,
  },
  ghost: {
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    color: colors.bg,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  ghostLabel: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 24, 0.45)',
  },
  menuAnchor: {
    position: 'absolute',
    top: 64,
    right: spacing.lg,
  },
  menu: {
    width: 240,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  menuIdentity: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  addressField: {
    marginBottom: spacing.md,
  },
  noWallet: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginBottom: spacing.md,
  },
  menuTotal: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  menuHint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  menuRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  logoutRow: {
    paddingVertical: spacing.sm,
  },
  logoutLabel: {
    color: colors.coral,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
});
