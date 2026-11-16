module.exports = ({ config }) => {
  // Load route modules on demand. Without this, Expo Router bundles every
  // screen (including the admin screens and their Firebase SDK imports) into
  // the entry chunk that each reader downloads. Setting it here reaches the
  // Metro router plugin in the same CLI process for both start and export.
  process.env.EXPO_ROUTER_IMPORT_MODE = 'lazy';

  // Only an explicit DEPLOY=1 opts into the GitHub Pages sub-path. Do not infer
  // it from CI/GITHUB_ACTIONS: Netlify and Firebase builds also run in CI but
  // are served from the domain root, and a stray base path breaks every asset.
  const deployBase = process.env.DEPLOY === '1' ? '/ranemmu-lilrab' : '';

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(deployBase ? { baseUrl: deployBase } : {}),
    },
  };
};
