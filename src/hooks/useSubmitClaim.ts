import {
  getEmbeddedConnectedWallet,
  useCreateWallet,
  usePrivy,
  useSendTransaction,
  useWallets,
} from '@privy-io/react-auth';
import { useCallback, useState } from 'react';
import { encodeFunctionData, type Address, type Hex } from 'viem';
import { getPublicClient, isKnownChainId } from '../chains/clients';
import { createClaimAbi, poidhContractAddress } from '../contracts/poidh';

export type ClaimInput = {
  chainId: number;
  onChainBountyId: number;
  name: string;
  description: string;
  proofUri: string;
};

const GAS_BUFFER_BPS = 130n; // 1.3× estimated gas
/** Cap L2 maxFeePerGas so Privy doesn't over-reserve for balance checks. */
const L2_MAX_FEE_PER_GAS_WEI = 2_000_000_000n; // 2 gwei
const L2_CHAIN_IDS = new Set([8453, 42161, 666666666]);

async function prepareClaimTx(params: {
  chainId: number;
  from: Address;
  to: Address;
  data: Hex;
}) {
  if (!isKnownChainId(params.chainId)) {
    throw new Error(`Unsupported chain ${params.chainId}`);
  }

  const client = getPublicClient(params.chainId);
  const estimated = await client.estimateGas({
    account: params.from,
    to: params.to,
    data: params.data,
  });
  const gas = (estimated * GAS_BUFFER_BPS) / 100n;

  const fees = await client.estimateFeesPerGas();
  let maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice ?? 1_000_000_000n;
  let maxPriorityFeePerGas =
    fees.maxPriorityFeePerGas ?? fees.gasPrice ?? 100_000_000n;

  if (L2_CHAIN_IDS.has(params.chainId) && maxFeePerGas > L2_MAX_FEE_PER_GAS_WEI) {
    maxFeePerGas = L2_MAX_FEE_PER_GAS_WEI;
    if (maxPriorityFeePerGas > maxFeePerGas) {
      maxPriorityFeePerGas = maxFeePerGas;
    }
  }

  return {
    to: params.to,
    data: params.data,
    chainId: params.chainId,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

export function useSubmitClaim() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { sendTransaction } = useSendTransaction();
  const [submitting, setSubmitting] = useState(false);

  const embeddedWallet = getEmbeddedConnectedWallet(wallets) ??
    wallets.find((wallet) => wallet.walletClientType === 'privy') ??
    null;
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
        let address = walletAddress as Address | null;
        if (!address) {
          const created = await ensureWallet();
          address =
            typeof created === 'object' && created && 'address' in created
              ? (String((created as { address: string }).address) as Address)
              : ((wallets[0]?.address as Address | undefined) ?? null);
        }
        if (!address) {
          throw new Error('Could not create or find an embedded wallet');
        }

        const wallet =
          wallets.find((item) => item.address.toLowerCase() === address!.toLowerCase()) ??
          getEmbeddedConnectedWallet(wallets) ??
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

        // Build fees/gas locally, then broadcast headlessly (no Privy confirm modal).
        const request = await prepareClaimTx({
          chainId: input.chainId,
          from: address,
          to: contract,
          data,
        });

        const result = await sendTransaction(request, {
          address,
          uiOptions: { showWalletUIs: false },
        });

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
