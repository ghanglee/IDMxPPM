const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const specsRoutes = require('./routes/specs');
const healthRoutes = require('./routes/health');

const app = express();

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
  credentials: true
}));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing (50MB limit for base64-encoded images in project data)
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/specs', specsRoutes);
app.use('/api/health', healthRoutes);

// Error handling
app.use(errorHandler);

// Start
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`IDMxPPM API server running on port ${config.port} (${config.nodeEnv})`);
  });
}

start();

module.exports = app;
