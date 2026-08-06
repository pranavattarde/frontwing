import express from 'express';
import cors from 'cors';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { pool } from './config/db';
import { connectRedis, redisClient } from './config/redis';
import authRoutes from './routes/auth.routes';
import historyRoutes from './routes/history.routes';
import engineerRoutes from './routes/engineer.routes';
import sessionRoutes from './routes/session.routes';

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
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

import { authenticateToken } from './middleware/auth.middleware';
import { AuthController } from './controllers/auth.controller';
import { HistoryController } from './controllers/history.controller';

// Register Core Backend Foundation API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.get('/me', authenticateToken, AuthController.me);

app.use('/api/history', historyRoutes);
app.use('/history', historyRoutes);
app.get('/bookmarks', authenticateToken, HistoryController.getHistory);
app.post('/save/:id', authenticateToken, HistoryController.toggleSave);
app.delete('/delete/:id', authenticateToken, HistoryController.deleteHistory);

app.use('/api/engineer', engineerRoutes);
app.use('/engineer', engineerRoutes);

app.use('/api/sessions', sessionRoutes);
app.use('/sessions', sessionRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('[WebSocket] Client connected to FrontWing server');
  
  ws.on('message', (message: string) => {
    console.log(`[WebSocket] Message received: ${message}`);
    // Echo for basic verification
    ws.send(JSON.stringify({ event: 'echo', data: message.toString() }));
  });
  
  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

import { runDatabaseMigrations } from './services/migration.service';

async function startServer() {
  console.log('[Server] Initializing FrontWing Express Backend...');
  
  try {
    // 1. Validate Database connectivity & run migrations
    console.log('[Server] Connecting to PostgreSQL database...');
    const dbClient = await pool.connect();
    console.log('[Server] PostgreSQL database connected successfully');
    dbClient.release();

    await runDatabaseMigrations();

    // 2. Validate Redis connectivity
    console.log('[Server] Connecting to Redis...');
    await connectRedis();
    console.log('[Server] Redis connected successfully');

    // 3. Start listening
    server.listen(port, () => {
      console.log(`[Server] FrontWing Backend server listening on port ${port}`);
      console.log(`[Server] WebSockets enabled on ws://localhost:${port}`);
    });
  } catch (error) {
    console.error('[Server] Critical startup error:', error);
    process.exit(1);
  }
}

startServer();
