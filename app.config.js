module.exports = ({ config }) => {
  const isDeploy = Boolean(
    process.env.GITHUB_ACTIONS ||
      process.env.CI ||
      process.env.DEPLOY ||
      process.env.npm_lifecycle_event === 'predeploy' ||
      process.env.npm_lifecycle_event === 'deploy'
  );

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(isDeploy ? { baseUrl: '/ranemmu-lilrab' } : {}),
    },
  };
};
