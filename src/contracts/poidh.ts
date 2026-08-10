import type { Abi } from 'viem';

/** PoidhV3 contracts — see https://github.com/picsoritdidnthappen/poidh-app/blob/prod/SKILL.md */
export const POIDH_CONTRACT_BY_CHAIN: Record<number, `0x${string}`> = {
  1: '0xE731dFadBFf20542E10D09D26Fc71445C70d4232',
  42161: '0x5555Fa783936C260f77385b4E153B9725feF1719',
  8453: '0x5555Fa783936C260f77385b4E153B9725feF1719',
  666666666: '0x18E5585ca7cE31b90Bc8BB7aAf84152857cE243f',
};

export const createClaimAbi = [
  {
    type: 'function',
    name: 'createClaim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'bountyId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
] as const satisfies Abi;

export function poidhContractAddress(chainId: number): `0x${string}` | null {
  return POIDH_CONTRACT_BY_CHAIN[chainId] ?? null;
}
