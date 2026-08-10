const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Package-exports tweaks for Privy / viem deps under Metro.
 * @see https://docs.privy.io/basics/react-native/installation
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Metro turns `@noble/hashes/crypto` into `./crypto.js`, which is not exported.
  if (moduleName === '@noble/hashes/crypto.js') {
    return context.resolveRequest(context, '@noble/hashes/crypto', platform);
  }

  if (moduleName === 'multiformats/cjs/src/basics.js') {
    return context.resolveRequest(context, 'multiformats/basics', platform);
  }

  // Package exports in `isows` (a viem dependency) are incompatible
  if (moduleName === 'isows') {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // Package exports in `zustand@4` are incompatible
  if (moduleName.startsWith('zustand')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // Prefer browser build of `jose`
  if (moduleName === 'jose') {
    const ctx = {
      ...context,
      unstable_conditionNames: ['browser', 'require', 'react-native'],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
