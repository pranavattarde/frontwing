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

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

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
      error: error.message
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

// Start scheduled recurring background jobs
HeroService.startScheduledJob();
EditorialService.startScheduledJob();

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

  // 3. Start listening
  server.listen(port, () => {
    console.log(`[Server] FrontWing Backend server listening on port ${port}`);
    console.log(`[Server] WebSockets enabled on ws://localhost:${port}`);
  });
}

startServer();
