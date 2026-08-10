import { useCreateWallet, usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useRef } from 'react';

/**
 * Ensures authenticated users get an Ethereum embedded wallet if they don't
 * already have one (covers existing sessions + createOnLogin edge cases).
 */
export function EnsureEmbeddedWallet() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const attempted = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || attempted.current) return;
    const hasEmbedded = wallets.some((wallet) => wallet.walletClientType === 'privy');
    if (hasEmbedded) {
      attempted.current = true;
      return;
    }

    attempted.current = true;
    void createWallet().catch(() => {
      // Allow a retry on next auth cycle if creation fails transiently.
      attempted.current = false;
    });
  }, [authenticated, createWallet, ready, wallets]);

  return null;
}
