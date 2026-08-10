export const colors = {
  bg: '#0A1018',
  bgElevated: '#121A24',
  bgSoft: '#182231',
  ink: '#F4EEE6',
  inkMuted: '#9AA6B5',
  inkDim: '#6B7787',
  coral: '#E97474',
  coralHot: '#FF8A7A',
  film: '#1C2734',
  frame: '#F7F1E8',
  frameShadow: 'rgba(0,0,0,0.45)',
  line: 'rgba(244,238,230,0.12)',
  success: '#6FCF97',
  voting: '#F2C94C',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  full: 999,
};

export const chains = {
  1: {
    id: 1 as const,
    slug: 'mainnet' as const,
    label: 'Ethereum',
    short: 'ETH',
    accent: '#8B9BB4',
  },
  42161: {
    id: 42161 as const,
    slug: 'arbitrum' as const,
    label: 'Arbitrum',
    short: 'ARB',
    accent: '#28A0F0',
  },
  8453: {
    id: 8453 as const,
    slug: 'base' as const,
    label: 'Base',
    short: 'BASE',
    accent: '#0052FF',
  },
  666666666: {
    id: 666666666 as const,
    slug: 'degen' as const,
    label: 'Degen',
    short: 'DEGEN',
    accent: '#A36EFD',
  },
} as const;

export type KnownChainId = keyof typeof chains;
