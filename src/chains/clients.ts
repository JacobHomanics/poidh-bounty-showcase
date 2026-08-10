import { createPublicClient, http, type Address } from 'viem';
import { arbitrum, base, degen, mainnet } from 'viem/chains';
import type { KnownChainId } from '../theme';

export const BALANCE_CHAIN_ORDER = [8453, 42161, 1, 666666666] as const satisfies readonly KnownChainId[];

const VIEM_CHAINS = {
  1: mainnet,
  42161: arbitrum,
  8453: base,
  666666666: degen,
} as const;

/** Stable public RPCs — viem mainnet default (ethereum.reth.rs) is often unreachable. */
const DEFAULT_RPC: Record<KnownChainId, string> = {
  1: 'https://ethereum.publicnode.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  8453: 'https://mainnet.base.org',
  666666666: 'https://rpc.degen.tips',
};

function rpcUrlFor(chainId: KnownChainId): string {
  const fromEnv = process.env[`EXPO_PUBLIC_RPC_${chainId}`];
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_RPC[chainId];
}

const clients = {
  1: createPublicClient({
    chain: VIEM_CHAINS[1],
    transport: http(rpcUrlFor(1)),
  }),
  42161: createPublicClient({
    chain: VIEM_CHAINS[42161],
    transport: http(rpcUrlFor(42161)),
  }),
  8453: createPublicClient({
    chain: VIEM_CHAINS[8453],
    transport: http(rpcUrlFor(8453)),
  }),
  666666666: createPublicClient({
    chain: VIEM_CHAINS[666666666],
    transport: http(rpcUrlFor(666666666)),
  }),
};

export function getNativeBalance(
  chainId: KnownChainId,
  address: Address,
): Promise<bigint> {
  return clients[chainId].getBalance({ address });
}

export function nativeCurrencySymbol(chainId: KnownChainId): 'ETH' | 'DEGEN' {
  return chainId === 666666666 ? 'DEGEN' : 'ETH';
}
