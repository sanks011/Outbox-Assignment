import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { initElasticsearch } from './config/elasticsearch.js';
import { WorkerService } from './services/worker.service.js';
import { setupBullBoard } from './routes/bullboard.routes.js';

import authRoutes from './routes/auth.routes.js';
import schedulerRoutes from './routes/scheduler.routes.js';
import emailRoutes from './routes/email.routes.js';
import slackRoutes from './routes/slack.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-email-scheduler',
    environment: config.nodeEnv,
  });
});

// BullMQ Live Monitoring Dashboard
try {
  const bullBoardRouter = setupBullBoard();
  app.use('/admin/queues', bullBoardRouter);
  console.log(`📊 Bull-Board queue monitor mounted at http://localhost:${config.port}/admin/queues`);
} catch (err: any) {
  console.warn(`[BullBoard] Could not initialize dashboard: ${err.message}`);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedule', schedulerRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Server Initialization
async function bootstrap() {
  console.log('🚀 Initializing ReachInbox Email Scheduler Backend...');

  // Connect Database
  await connectDB();

  // Connect Elasticsearch
  await initElasticsearch();

  // Start BullMQ Worker
  try {
    WorkerService.startWorker();
    await WorkerService.resyncPendingJobs();
  } catch (err: any) {
    console.warn('⚠️ BullMQ Worker startup notice:', err.message);
  }

  app.listen(config.port, () => {
    console.log(`\n============================================================`);
    console.log(`🎯 ReachInbox Scheduler API: http://localhost:${config.port}`);
    console.log(`📊 BullMQ Dashboard:          http://localhost:${config.port}/admin/queues`);
    console.log(`💻 Frontend Application:      ${config.frontendUrl}`);
    console.log(`============================================================\n`);
  });
}

// Graceful Shutdown
const shutdown = async () => {
  console.log('\n🛑 Gracefully shutting down ReachInbox Scheduler...');
  await WorkerService.stopWorker();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap();
