import { useCreateWallet, usePrivy, useSendTransaction, useWallets } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';
import { encodeFunctionData } from 'viem';
import { createClaimAbi, poidhContractAddress } from '../contracts/poidh';

export type ClaimInput = {
  chainId: number;
  onChainBountyId: number;
  name: string;
  description: string;
  proofUri: string;
};

export function useSubmitClaim() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { sendTransaction } = useSendTransaction();
  const [submitting, setSubmitting] = useState(false);

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === 'privy',
  );
  const walletAddress =
    embeddedWallet?.address ??
    wallets[0]?.address ??
    null;

  const ensureWallet = useCallback(async () => {
    if (embeddedWallet) return embeddedWallet;
    const created = await createWallet();
    // Privy refreshes wallets asynchronously; prefer returned address when present.
    return created;
  }, [createWallet, embeddedWallet]);

  const submitClaim = useCallback(
    async (input: ClaimInput) => {
      if (!ready) throw new Error('Privy is still loading');
      if (!authenticated) throw new Error('Log in to submit a claim');

      const contract = poidhContractAddress(input.chainId);
      if (!contract) {
        throw new Error(`Unsupported chain ${input.chainId}`);
      }

      const name = input.name.trim();
      const description = input.description.trim();
      const uri = input.proofUri.trim();
      if (!name || !description || !uri) {
        throw new Error('Name, description, and proof URI are required');
      }

      setSubmitting(true);
      try {
        let address = walletAddress;
        if (!address) {
          const created = await ensureWallet();
          address =
            typeof created === 'object' && created && 'address' in created
              ? String((created as { address: string }).address)
              : wallets[0]?.address;
        }
        if (!address) {
          throw new Error('Could not create or find an embedded wallet');
        }

        const wallet =
          wallets.find((item) => item.address.toLowerCase() === address!.toLowerCase()) ??
          wallets.find((item) => item.walletClientType === 'privy') ??
          wallets[0];

        if (wallet?.switchChain) {
          await wallet.switchChain(input.chainId);
        }

        const data = encodeFunctionData({
          abi: createClaimAbi,
          functionName: 'createClaim',
          args: [BigInt(input.onChainBountyId), name, description, uri],
        });

        const result = await sendTransaction(
          {
            to: contract,
            data,
            chainId: input.chainId,
          },
          {
            address,
            uiOptions: {
              description: 'Submit your claim on the poidh bounty contract',
            },
          },
        );

        return result.hash;
      } finally {
        setSubmitting(false);
      }
    },
    [
      authenticated,
      ensureWallet,
      ready,
      sendTransaction,
      walletAddress,
      wallets,
    ],
  );

  return {
    ready,
    authenticated,
    user,
    walletAddress,
    submitting,
    submitClaim,
  };
}
