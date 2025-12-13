// Express API with basic security headers and rate limiting
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://localhost:8080' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use(limiter);

app.get('/', (req, res) => {
  res.json({ status: 'InfoHub API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ healthy: true });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ InfoHub API (HTTP) listening on port ${PORT}`);
});
