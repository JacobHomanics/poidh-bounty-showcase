import { chains, KnownChainId } from '../theme';
import type { ChainSlug } from '../types';

export function chainFromId(chainId: number) {
  return chains[chainId as KnownChainId] ?? {
    id: chainId,
    slug: 'base' as ChainSlug,
    label: `Chain ${chainId}`,
    short: String(chainId),
    accent: '#9AA6B5',
  };
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 100) return `$${value.toFixed(0)}`;
  if (value >= 10) return `$${value.toFixed(1)}`;
  return `$${value.toFixed(2)}`;
}

export function formatNativeAmount(amountWei: string, currency = 'eth'): string {
  try {
    const wei = BigInt(amountWei);
    const unit = currency.toLowerCase() === 'degen' ? 'DEGEN' : 'ETH';
    if (wei === 0n) return `0 ${unit}`;
    const whole = Number(wei) / 1e18;
    if (!Number.isFinite(whole)) return amountWei;
    if (whole >= 1) return `${whole.toFixed(3)} ${unit}`;
    if (whole >= 0.01) return `${whole.toFixed(4)} ${unit}`;
    return `${whole.toFixed(6)} ${unit}`;
  } catch {
    return amountWei;
  }
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function relativeTime(createdAt: number | string): string {
  const seconds = typeof createdAt === 'string' ? Number(createdAt) : createdAt;
  if (!Number.isFinite(seconds)) return '';
  const diffMs = Date.now() - seconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function bountyStatus(bounty: {
  isCanceled: boolean;
  inProgress: boolean;
  isVoting: boolean;
}): { label: string; tone: 'open' | 'voting' | 'closed' } {
  if (bounty.isCanceled) return { label: 'canceled', tone: 'closed' };
  if (bounty.isVoting) return { label: 'voting', tone: 'voting' };
  if (bounty.inProgress) return { label: 'open', tone: 'open' };
  return { label: 'closed', tone: 'closed' };
}
