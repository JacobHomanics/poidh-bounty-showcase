import { Ionicons } from '@expo/vector-icons';
import { useExportWallet, useLogin, usePrivy } from '@privy-io/react-auth';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { nativeAmountToUsd } from '../api/prices';
import {
  BALANCE_CHAIN_ORDER,
  useMultiChainBalances,
} from '../hooks/useMultiChainBalances';
import { useNativeUsdPrices } from '../hooks/useNativeUsdPrices';
import { chains, colors, radii, spacing } from '../theme';
import { formatUsd } from '../utils/format';
import { AddressField } from './AddressField';

const HAS_PRIVY = Boolean(process.env.EXPO_PUBLIC_PRIVY_APP_ID);

function fullIdentity(user: ReturnType<typeof usePrivy>['user']): string {
  return user?.email?.address ?? user?.phone?.number ?? 'Signed in';
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

function embeddedEthereumAddress(
  user: ReturnType<typeof usePrivy>['user'],
): string | null {
  const account = user?.linkedAccounts?.find(
    (item) =>
      item.type === 'wallet' &&
      'walletClientType' in item &&
      item.walletClientType === 'privy' &&
      'chainType' in item &&
      item.chainType === 'ethereum' &&
      'address' in item &&
      typeof item.address === 'string',
  );
  return account && 'address' in account ? account.address : null;
}

function PrivyAuthButton() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const { exportWallet } = useExportWallet();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const evmAddress = useMemo(() => primaryEvmAddress(user), [user]);
  const embeddedAddress = useMemo(() => embeddedEthereumAddress(user), [user]);
  const balancesEnabled = open && Boolean(evmAddress);
  const balances = useMultiChainBalances(evmAddress, balancesEnabled);
  const usdPrices = useNativeUsdPrices(balancesEnabled);

  const handleExportKey = async () => {
    if (!embeddedAddress || exporting) return;
    setExporting(true);
    try {
      // Close our menu so Privy's secure export modal isn't covered.
      setOpen(false);
      await exportWallet({ address: embeddedAddress });
    } catch {
      // User closed the modal or export failed — nothing to surface here.
    } finally {
      setExporting(false);
    }
  };

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
                {evmAddress ? (
                  <View style={styles.balances}>
                    <Text style={styles.balancesLabel}>balances</Text>
                    {BALANCE_CHAIN_ORDER.map((chainId) => {
                      const chain = chains[chainId];
                      const balance = balances[chainId];
                      let amountLabel = '—';
                      if (
                        balance.status === 'loading' ||
                        balance.status === 'idle' ||
                        usdPrices.status === 'loading' ||
                        usdPrices.status === 'idle'
                      ) {
                        amountLabel = '…';
                      } else if (
                        balance.status === 'ready' &&
                        usdPrices.status === 'ready'
                      ) {
                        amountLabel = formatUsd(
                          nativeAmountToUsd(
                            balance.value,
                            balance.symbol,
                            usdPrices.prices,
                          ),
                        );
                      }
                      return (
                        <View key={chainId} style={styles.balanceRow}>
                          <View style={styles.balanceChain}>
                            <View
                              style={[
                                styles.balanceDot,
                                { backgroundColor: chain.accent },
                              ]}
                            />
                            <Text style={styles.balanceChainLabel}>
                              {chain.label}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.balanceAmount,
                              (balance.status === 'error' ||
                                usdPrices.status === 'error') &&
                                styles.balanceError,
                            ]}
                            numberOfLines={1}
                          >
                            {amountLabel}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                <View style={styles.menuRule} />
                {embeddedAddress ? (
                  <Pressable
                    onPress={() => {
                      void handleExportKey();
                    }}
                    disabled={exporting}
                    style={[styles.menuRow, exporting && styles.menuRowDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Export private key"
                  >
                    {exporting ? (
                      <ActivityIndicator color={colors.ink} size="small" />
                    ) : (
                      <Text style={styles.menuRowLabel}>Export private key</Text>
                    )}
                  </Pressable>
                ) : null}
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
  balances: {
    marginBottom: spacing.md,
    gap: 6,
  },
  balancesLabel: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'lowercase',
    marginBottom: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  balanceChain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  balanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  balanceChainLabel: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  balanceAmount: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    flexShrink: 0,
  },
  balanceError: {
    color: colors.inkDim,
  },
  menuRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  menuRow: {
    paddingVertical: spacing.sm,
    marginBottom: 4,
  },
  menuRowDisabled: {
    opacity: 0.55,
  },
  menuRowLabel: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
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
