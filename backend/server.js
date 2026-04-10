require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const { getMongoUri } = require('./lib/get-mongo-uri');

const app = express();

app.use(require('./middleware/cors'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Load models once so Mongoose registers schemas before routes run. */
function registerModels() {
  require('./models/Admin');
  require('./models/BusinessUser');
}

const connectDB = async () => {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error(
      'Set MONGODB_URI, or set MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST (see backend/.env.example).',
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15_000,
    });
    console.log('Connected to MongoDB');
    registerModels();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    const msg = String(error.message || '');
    if (msg.includes('bad auth') || msg.includes('authentication failed')) {
      console.error(
        'Hint: bad auth means wrong username/password for this cluster. In Atlas: Database Access → user → Edit password, then use “Connect” → copy URI, or use MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST so the password is plain text in .env (encoded automatically).',
      );
    } else {
      console.error(
        'Hint: if using MONGODB_URI only, special characters in the password must be percent-encoded in the URI (! → %21, @ → %40, # → %23).',
      );
    }
    throw error;
  }
};

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'KuTaGjej API', version: '1' });
});

app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    ok: ready,
    mongo: ready ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));

const startServer = async () => {
  try {
    await connectDB();
    const PORT = Number(process.env.PORT) || 5000;
    app.listen(PORT, () => {
      console.log(`KuTaGjej API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
