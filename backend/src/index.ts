import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config';
import { errorHandler, notFound } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import studentRoutes from './routes/studentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import feeRoutes from './routes/feeRoutes';
import todoRoutes from './routes/todoRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import commonRoutes from './routes/commonRoutes';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', commonRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🕌 Buhary Madrasa Management System - API Server       ║
║                                                           ║
║   🚀 Server is running on port ${PORT}                      ║
║   🌍 Environment: ${config.nodeEnv.toUpperCase().padEnd(39)}║
║   📡 API Base URL: http://localhost:${PORT}/api             ║
║   ❤️  Health Check: http://localhost:${PORT}/health         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
