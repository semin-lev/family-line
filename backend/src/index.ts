import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { mediaSoupService } from './services/mediasoup.js';
import { SocketHandlers } from './socket/socketHandlers.js';
import roomsRouter from './routes/rooms.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/rooms', roomsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log(`[HEALTH] Health check request from: ${req.ip} (${req.get('x-forwarded-for') || req.connection.remoteAddress})`);
  console.log(`[HEALTH] Origin: ${req.get('origin')}`);
  console.log(`[HEALTH] User-Agent: ${req.get('user-agent')}`);
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'mediasoup-video-call',
    version: '1.0.0'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  new SocketHandlers(socket);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    // Initialize MediaSoup
    await mediaSoupService.initialize();
    console.log('✅ MediaSoup initialized successfully');
    
    // Start server
    server.listen(Number(config.port), config.serverHost, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(`🌐 Health check: http://localhost:${config.port}/health`);
      console.log(`🌍 Server accessible from local network at: http://[your-ip]:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mediaSoupService.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mediaSoupService.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
