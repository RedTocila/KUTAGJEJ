function getMongoUri() {
  const fromEnv = process.env.MONGODB_URI?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST?.trim();
  const db = (process.env.MONGODB_DB || 'kutagjej').trim();

  if (user && typeof password === 'string' && password.length > 0 && host) {
    const encoded = encodeURIComponent(password);
    return `mongodb+srv://${user}:${encoded}@${host}/${db}?retryWrites=true&w=majority`;
  }

  return null;
}

module.exports = { getMongoUri };
