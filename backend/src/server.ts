import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { MessageService } from '@/services/messaging/message.service';
import { MessageScheduler } from '@/services/messaging/scheduler.service';
import { specs } from '@/config/swagger';

// Import routes
import authRoutes from '@/api/routes/auth.routes';
import groupRoutes from '@/api/routes/group.routes';
import memberRoutes from '@/api/routes/member.routes';
import invitationRoutes from '@/api/routes/invitation.routes';
import contributionRoutes from '@/api/routes/contribution.routes';
import reportRoutes from '@/api/routes/report.routes';
import userRoutes from '@/api/routes/user.routes';

import messageRoutes from '@/api/routes/message.routes';
import webhookRoutes from '@/api/routes/webhooks.routes';
import notificationRoutes from '@/api/routes/notification.routes';
import payoutRoutes from '@/api/routes/payout.routes';
import sysadminRoutes from '@/api/routes/sysadmin.routes';
import savingsRoutes from '@/api/routes/savings.routes';
import investmentRoutes from '@/api/routes/investment.routes';
import unifiedRoutes from '@/api/routes/unified.routes';


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

if (process.env.REDIS_URL) {
  const messageService = new MessageService();
  new MessageScheduler(messageService);
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});
app.use('/api/v1/auth/login', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/sysadmin', sysadminRoutes);
app.use('/api/v1/savings', savingsRoutes);
app.use('/api/v1/investments', investmentRoutes);
app.use('/api/v1/unified', unifiedRoutes);


// Public/Invitations first to avoid middleware overlap
app.use('/api/v1', invitationRoutes);
app.use('/api/v1', memberRoutes);
app.use('/api/v1', contributionRoutes);
app.use('/api/v1', reportRoutes);
app.use('/api/v1', messageRoutes);
app.use('/api/v1', payoutRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'An unexpected error occurred' : err.message,
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
