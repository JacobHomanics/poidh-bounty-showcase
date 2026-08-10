export type ChainSlug = 'mainnet' | 'arbitrum' | 'base' | 'degen';

export type ChainId = 1 | 42161 | 8453 | 666666666;

export type BountySummary = {
  id: number;
  onChainId: number;
  chainId: number;
  title: string;
  description: string;
  amount: string;
  issuer: string;
  createdAt: number | string;
  inProgress: boolean;
  isJoinedBounty: boolean;
  isCanceled: boolean;
  isMultiplayer: boolean;
  isVoting: boolean;
  deadline: number | null;
  hasClaims: boolean;
  hasParticipants: boolean;
  priceUsd: number;
  url: string;
};

export type Claim = {
  claimId: number;
  imageUrl: string | null;
  issuerAddress: string;
  issuerName: string | null;
  farcasterHandle: string | null;
  twitterHandle: string | null;
  title: string;
  description: string;
};

export type BountyDetail = BountySummary & {
  currency: string;
  claims: Claim[];
  ban?: unknown[];
  extra?: Record<string, unknown>;
};

export type BountyListResponse = {
  items: BountySummary[];
  nextCursor: number | null;
};

export type EnrichedBounty = BountySummary & {
  previewImage?: string | null;
  claimsCount?: number;
  currency?: string;
};
