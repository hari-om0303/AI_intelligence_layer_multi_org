const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

/**
 * Hydrates process.env with secrets retrieved from GCP Secret Manager when in production mode.
 * Decouples the application from configuration managers by using environment variable injection.
 */
const loadSecrets = async () => {
  // Only hydrate environment variables in production and when a GCP project is configured
  if (process.env.NODE_ENV !== 'production' || !process.env.GCP_PROJECT_ID) {
    console.log('Skipping GCP Secret Manager hydration (Dev mode or missing GCP_PROJECT_ID).');
    return;
  }

  console.log(`Production Mode: Retrieving secrets from GCP Project ID "${process.env.GCP_PROJECT_ID}"...`);
  try {
    const client = new SecretManagerServiceClient();
    const projectId = process.env.GCP_PROJECT_ID;

    // Mapping of GCP secret names to target process.env variable names
    const secretMap = {
      'MONGO_URI': 'MONGO_URI',
      'JWT_SECRET': 'JWT_SECRET',
      'REDIS_URI': 'REDIS_URI',
      'GEMINI_API_KEY': 'GEMINI_API_KEY'
    };

    for (const [gcpSecretName, envName] of Object.entries(secretMap)) {
      try {
        const [version] = await client.accessSecretVersion({
          name: `projects/${projectId}/secrets/${gcpSecretName}/versions/latest`,
        });

        const secretValue = version.payload.data.toString('utf8');
        if (secretValue && secretValue.trim() !== '') {
          process.env[envName] = secretValue;
          console.log(`[SecretManager] Dynamically injected env: ${envName}`);
        }
      } catch (err) {
        console.warn(`[SecretManager] Warning: Could not resolve secret "${gcpSecretName}". Fallback default will be used:`, err.message);
      }
    }
  } catch (error) {
    console.error('[SecretManager] Fatal error during initialization:', error.message);
  }
};

module.exports = loadSecrets;
