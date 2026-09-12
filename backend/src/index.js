const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const dotenv = require('dotenv');
const { pool } = require('./config/db');
const { connectRedis, redisClient } = require('./config/redis');
const authRoutes = require('./routes/auth.routes');
const historyRoutes = require('./routes/history.routes');
const engineerRoutes = require('./routes/engineer.routes');
const strategyRoutes = require('./routes/strategy.routes');
const sessionRoutes = require('./routes/session.routes');
const ghostBattleRoutes = require('./routes/ghost_battle.routes');

const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const { generalLimiter } = require('./middleware/rate_limit.middleware');

// Production & Development CORS Configuration
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (e.g. curl, server-to-server, health probes)
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }

    // In development mode, allow localhost / 127.0.0.1 on any port or any whitelisted origin
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

// Enable CORS with restricted origin verification
app.use(cors(corsOptions));

// JSON parsing with strict 1MB body limit to prevent memory exhaustion attacks
app.use(express.json({ limit: '1mb' }));

// Middleware to catch malformed JSON payloads and return a clean 400 Bad Request
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload in request body' });
  }
  next(err);
});

// General API rate limiter safety net
app.use('/api', generalLimiter);

// Basic health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Ping PostgreSQL
    await pool.query('SELECT 1');
    const dbStatus = 'connected';
    
    // Ping Redis
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    
    res.json({
      status: 'healthy',
      database: dbStatus,
      redis: redisStatus,
      service: 'frontwing-backend'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: process.env.NODE_ENV === 'production' ? 'Database connection check failed' : error.message
    });
  }
});

const { authenticateJWT } = require('./middleware/auth.middleware');
const { AuthController } = require('./controllers/auth.controller');
const { HistoryController } = require('./controllers/history.controller');
const { HeroController } = require('./controllers/hero.controller');
const { HeroService } = require('./services/hero.service');
const { EditorialController } = require('./controllers/editorial.controller');
const { EditorialService } = require('./services/editorial.service');

// Register Core Backend Foundation API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.get('/me', authenticateJWT, AuthController.me);
app.get('/auth/me', authenticateJWT, AuthController.me);

app.use('/api/history', historyRoutes);
app.use('/history', historyRoutes);
app.get('/bookmarks', authenticateJWT, HistoryController.getHistory);
app.post('/save/:id', authenticateJWT, HistoryController.toggleSave);
app.delete('/delete/:id', authenticateJWT, HistoryController.deleteHistory);

app.use('/api/engineer', engineerRoutes);
app.use('/engineer', engineerRoutes);

app.use('/api/strategy', strategyRoutes);
app.use('/strategy', strategyRoutes);

// Dedicated 3D Ghost Battle routes guarded by authenticateJWT
app.use('/api/ghost-battle', ghostBattleRoutes);
app.use('/ghost-battle', ghostBattleRoutes);

app.use('/api/sessions', sessionRoutes);
app.use('/sessions', sessionRoutes);

// Live Hero Schedule & Editorial Pipelines (Fixes T & V)
app.get(['/api/hero/current', '/hero/current'], HeroController.getCurrent);
app.post(['/api/hero/refresh', '/hero/refresh'], HeroController.refresh);

app.get(['/api/editorial/current', '/editorial/current'], EditorialController.getCurrent);
app.post(['/api/editorial/refresh', '/editorial/refresh'], EditorialController.refresh);

// Global safe error handling middleware (prevents leaking internal stack traces / SQL errors)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler] Unhandled exception:', err.stack || err);

  if (err.message && err.message.includes('not allowed by CORS policy')) {
    return res.status(403).json({ error: 'CORS policy violation: origin not allowed' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // In production, mask 500 server errors with generic safe message
  const safeMessage = statusCode >= 500 && isProd
    ? 'An internal server error occurred. Please try again later.'
    : (err.message || 'Internal server error');

  return res.status(statusCode).json({
    error: safeMessage,
    status: statusCode
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected to FrontWing server');
  
  ws.on('message', (message) => {
    console.log(`[WebSocket] Message received: ${message}`);
    // Echo for basic verification
    ws.send(JSON.stringify({ event: 'echo', data: message.toString() }));
  });
  
  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

const { runDatabaseMigrations } = require('./services/migration.service');

async function startServer() {
  console.log('[Server] Initializing FrontWing Express Backend...');
  
  // 1. Validate Database connectivity & run migrations
  console.log('[Server] Connecting to PostgreSQL database...');
  try {
    const dbClient = await pool.connect();
    console.log('[Server] PostgreSQL database connected successfully');
    dbClient.release();
    await runDatabaseMigrations();
  } catch (dbErr) {
    console.warn('[Server] PostgreSQL connection unavailable (offline mode):', dbErr.message);
  }

  // 2. Validate Redis connectivity
  console.log('[Server] Connecting to Redis...');
  try {
    await connectRedis();
    console.log('[Server] Redis connected successfully');
  } catch (redisErr) {
    console.warn('[Server] Redis connection unavailable (offline mode):', redisErr.message);
  }

  // 3. Start scheduled background jobs
  HeroService.startScheduledJob();
  EditorialService.startScheduledJob();

  // 4. Start listening
  server.listen(port, () => {
    console.log(`[Server] FrontWing Backend server listening on port ${port}`);
    console.log(`[Server] WebSockets enabled on ws://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
