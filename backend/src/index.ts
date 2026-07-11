import express from 'express';
import cors from 'cors';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { pool } from './config/db';
import { connectRedis, redisClient } from './config/redis';

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

// AI Engineer Query Proxy Route
app.post('/engineer/query', async (req, res) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    console.log(`[Gateway] Proxying query to: ${aiServiceUrl}/engineer/query`);
    
    const response = await fetch(`${aiServiceUrl}/engineer/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gateway] AI service returned error: ${response.status} - ${errText}`);
      return res.status(response.status).send(errText);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Gateway] Proxy query crash:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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

async function startServer() {
  console.log('[Server] Initializing FrontWing Express Backend...');
  
  try {
    // 1. Validate Database connectivity
    console.log('[Server] Connecting to PostgreSQL database...');
    const dbClient = await pool.connect();
    console.log('[Server] PostgreSQL database connected successfully');
    dbClient.release();

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
