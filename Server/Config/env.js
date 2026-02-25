const requireEnv = (key) => {
  const value = process.env[key];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const validateEnv = () => {
  requireEnv('MONGODB_URI');
  requireEnv('JWT_SECRET_KEY');
  requireEnv('CLIENT_URL');

  if (String(process.env.JWT_SECRET_KEY).length < 32) {
    throw new Error('JWT_SECRET_KEY must be at least 32 characters for production-grade security');
  }
};

module.exports = { validateEnv };
