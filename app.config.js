module.exports = ({ config }) => {
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
