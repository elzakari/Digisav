# PHASE 1: PROJECT FOUNDATION & INFRASTRUCTURE SETUP

## Overview
Set up the complete development environment, project structure, database schema, and CI/CD pipelines. This phase establishes the technical foundation for the entire platform.

## Objectives
- Initialize monorepo with frontend and backend
- Set up PostgreSQL database with initial schema
- Implement Redis caching layer
- Configure Docker development environment
- Set up CI/CD pipelines
- Implement core authentication system
- Create base API structure with middleware

## Prerequisites
- RULES.md file reviewed and understood
- Development tools installed: Node.js 20+, Docker, Git
- Cloud provider account (AWS/GCP/Azure) configured
- External service accounts created (Twilio, WhatsApp Business API)

---

## Tasks

### 1. Project Initialization

**1.1 Create Monorepo Structure**
```bash
# Initialize project
mkdir savings-group-platform && cd savings-group-platform
git init

# Create directory structure
mkdir -p frontend/src/{components,pages,hooks,services,utils,types,store,constants,styles}
mkdir -p frontend/src/components/{common,admin,member,layout}
mkdir -p frontend/src/pages/{auth,admin,member}
mkdir -p frontend/public
mkdir -p frontend/tests

mkdir -p backend/src/{api,services,database,utils,config,types}
mkdir -p backend/src/api/{routes,controllers,middleware,validators}
mkdir -p backend/src/services/{auth,contributions,members,groups,messaging,reporting}
mkdir -p backend/src/database/{models,migrations,seeders}
mkdir -p backend/tests/{unit,integration,e2e}

mkdir -p shared/types
mkdir -p docker
mkdir -p scripts
mkdir -p docs/{api,architecture,guides}
mkdir -p .github/workflows
```

**1.2 Initialize Frontend (React + TypeScript + Vite)**
```bash
cd frontend
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install react-router-dom@6 axios react-query zustand
npm install react-hook-form zod @hookform/resolvers
npm install tailwindcss postcss autoprefixer
npm install date-fns recharts
npm install -D @types/node

# Initialize Tailwind CSS
npx tailwindcss init -p
```

**Frontend Configuration Files:**

`frontend/tailwind.config.js`:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          500: '#2E75B6',
          600: '#1E5A8E',
          700: '#0D3C61',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
}
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

**1.3 Initialize Backend (Node.js + Express + TypeScript)**
```bash
cd backend
npm init -y

# Install dependencies
npm install express cors helmet dotenv
npm install jsonwebtoken bcrypt uuid
npm install pg prisma @prisma/client
npm install redis ioredis
npm install zod express-validator
npm install winston morgan
npm install axios

# Install dev dependencies
npm install -D typescript @types/node @types/express
npm install -D @types/cors @types/bcrypt @types/jsonwebtoken
npm install -D ts-node-dev nodemon
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
npm install -D jest @types/jest ts-jest supertest @types/supertest

# Initialize TypeScript
npx tsc --init
```

**Backend Configuration Files:**

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "jest"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/api/*": ["./src/api/*"],
      "@/services/*": ["./src/services/*"],
      "@/database/*": ["./src/database/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/config/*": ["./src/config/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

`backend/package.json` (scripts section):
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

---

### 2. Database Setup with Prisma

**2.1 Initialize Prisma**
```bash
cd backend
npx prisma init
```

**2.2 Configure Database Connection**

`backend/.env`:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/savings_group_dev?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRY="24h"
REFRESH_TOKEN_EXPIRY="30d"
NODE_ENV="development"
PORT=3000
```

**2.3 Define Prisma Schema**

`backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum UserRole {
  ADMIN
  MEMBER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum MemberStatus {
  PENDING
  ACTIVE
  SUSPENDED
  INACTIVE
}

enum GroupStatus {
  DRAFT
  ACTIVE
  PAUSED
  CLOSED
}

enum PaymentFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  CUSTOM
}

enum PayoutOrderType {
  MANUAL
  RANDOM
  ROTATION
}

enum PaymentMethod {
  CASH
  MOBILE_MONEY
  BANK_TRANSFER
}

enum ContributionStatus {
  PENDING
  COMPLETED
  OVERDUE
  DEFAULTED
}

enum TransactionType {
  CONTRIBUTION
  PAYOUT
  FEE
  ADJUSTMENT
}

enum MessageChannel {
  SMS
  WHATSAPP
  EMAIL
}

enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  READ
}

// Models
model User {
  id              String      @id @default(uuid()) @db.Uuid
  email           String      @unique @db.VarChar(255)
  phoneNumber     String      @unique @db.VarChar(20)
  passwordHash    String      @db.VarChar(255)
  fullName        String      @db.VarChar(100)
  status          UserStatus  @default(ACTIVE)
  role            UserRole    @default(MEMBER)
  emailVerified   Boolean     @default(false)
  phoneVerified   Boolean     @default(false)
  lastLogin       DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  // Relations
  adminGroups           Group[]         @relation("GroupAdmin")
  memberships           Member[]
  recordedContributions Contribution[]  @relation("ContributionRecorder")
  recordedTransactions  Transaction[]   @relation("TransactionRecorder")
  refreshTokens         RefreshToken[]
  
  @@index([email])
  @@index([phoneNumber])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique @db.VarChar(500)
  userId    String   @db.Uuid
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}

model Group {
  id                  String             @id @default(uuid()) @db.Uuid
  groupName           String             @db.VarChar(100)
  groupPrefix         String             @unique @db.VarChar(10)
  adminUserId         String             @db.Uuid
  contributionAmount  Decimal            @db.Decimal(12, 2)
  currencyCode        String             @db.VarChar(3)
  paymentFrequency    PaymentFrequency
  customFrequencyDays Int?
  maxMembers          Int
  payoutOrderType     PayoutOrderType
  startDate           DateTime?
  status              GroupStatus        @default(DRAFT)
  gracePeriodDays     Int                @default(0)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  
  // Relations
  admin         User            @relation("GroupAdmin", fields: [adminUserId], references: [id])
  members       Member[]
  contributions Contribution[]
  transactions  Transaction[]
  messages      Message[]
  
  @@index([adminUserId])
  @@index([status])
  @@map("groups")
}

model Member {
  id             String        @id @default(uuid()) @db.Uuid
  userId         String        @db.Uuid
  groupId        String        @db.Uuid
  accountNumber  String        @unique @db.VarChar(20)
  nationalId     String        @db.VarChar(50)
  photoUrl       String?       @db.VarChar(500)
  dateOfBirth    DateTime?
  joinDate       DateTime      @default(now())
  status         MemberStatus  @default(PENDING)
  payoutPosition Int?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  // Relations
  user          User            @relation(fields: [userId], references: [id])
  group         Group           @relation(fields: [groupId], references: [id])
  contributions Contribution[]
  transactions  Transaction[]
  messages      Message[]
  
  @@unique([groupId, userId])
  @@unique([groupId, nationalId])
  @@index([groupId])
  @@index([userId])
  @@index([status])
  @@map("members")
}

model Contribution {
  id              String              @id @default(uuid()) @db.Uuid
  memberId        String              @db.Uuid
  groupId         String              @db.Uuid
  amount          Decimal             @db.Decimal(12, 2)
  currencyCode    String              @db.VarChar(3)
  paymentDate     DateTime
  dueDate         DateTime
  cycleNumber     Int
  paymentMethod   PaymentMethod
  referenceNumber String?             @db.VarChar(100)
  recordedBy      String              @db.Uuid
  notes           String?             @db.Text
  status          ContributionStatus  @default(COMPLETED)
  hash            String              @db.VarChar(64)
  createdAt       DateTime            @default(now())
  
  // Relations
  member   Member @relation(fields: [memberId], references: [id])
  group    Group  @relation(fields: [groupId], references: [id])
  recorder User   @relation("ContributionRecorder", fields: [recordedBy], references: [id])
  
  @@unique([groupId, memberId, cycleNumber])
  @@index([groupId, cycleNumber])
  @@index([memberId])
  @@index([paymentDate])
  @@index([status])
  @@map("contributions")
}

model Transaction {
  id              String          @id @default(uuid()) @db.Uuid
  groupId         String          @db.Uuid
  memberId        String?         @db.Uuid
  transactionType TransactionType
  amount          Decimal         @db.Decimal(12, 2)
  currencyCode    String          @db.VarChar(3)
  referenceId     String?         @db.Uuid
  recordedBy      String          @db.Uuid
  timestamp       DateTime        @default(now())
  hash            String          @db.VarChar(64)
  previousHash    String?         @db.VarChar(64)
  metadata        Json?
  createdAt       DateTime        @default(now())
  
  // Relations
  group    Group   @relation(fields: [groupId], references: [id])
  member   Member? @relation(fields: [memberId], references: [id])
  recorder User    @relation("TransactionRecorder", fields: [recordedBy], references: [id])
  
  @@index([groupId, timestamp])
  @@index([memberId])
  @@index([transactionType])
  @@map("transactions")
}

model Message {
  id             String         @id @default(uuid()) @db.Uuid
  groupId        String         @db.Uuid
  memberId       String?        @db.Uuid
  messageType    String         @db.VarChar(50)
  channel        MessageChannel
  recipientPhone String         @db.VarChar(20)
  messageBody    String         @db.Text
  templateId     String?        @db.VarChar(50)
  deliveryStatus DeliveryStatus @default(PENDING)
  sentAt         DateTime?
  deliveredAt    DateTime?
  readAt         DateTime?
  errorMessage   String?        @db.Text
  createdAt      DateTime       @default(now())
  
  // Relations
  group  Group   @relation(fields: [groupId], references: [id])
  member Member? @relation(fields: [memberId], references: [id])
  
  @@index([groupId, sentAt])
  @@index([memberId])
  @@index([deliveryStatus])
  @@map("messages")
}
```

**2.4 Run Initial Migration**
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

---

### 3. Docker Development Environment

**3.1 Create Docker Compose File**

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: savings_group_postgres
    environment:
      POSTGRES_DB: savings_group_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: savings_group_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: savings_group_backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/savings_group_dev?schema=public
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      JWT_SECRET: dev-secret-change-in-production
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: savings_group_frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3000/api
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

**3.2 Create Dockerfiles**

`backend/Dockerfile.dev`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

`frontend/Dockerfile.dev`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

---

### 4. Core Authentication System

**4.1 Create Authentication Service**

`backend/src/services/auth/auth.service.ts`:
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UnauthorizedError, ValidationError } from '@/utils/errors';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export class AuthService {
  async register(data: {
    email: string;
    phoneNumber: string;
    password: string;
    fullName: string;
  }) {
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
      },
    });

    if (existing) {
      throw new ValidationError('User already exists with this email or phone');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(user: any): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRY || '24h',
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d',
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async refreshAccessToken(refreshToken: string) {
    // Verify refresh token
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(storedToken.user);

    return { accessToken };
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }
}
```

**4.2 Create Authentication Middleware**

`backend/src/api/middleware/auth.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};
```

---

### 5. Base API Structure

**5.1 Create Error Classes**

`backend/src/utils/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}
```

**5.2 Create Express Server**

`backend/src/server.ts`:
```typescript
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

// Import routes
import authRoutes from '@/api/routes/auth.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);

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

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
```

---

### 6. CI/CD Pipeline Setup

**6.1 Create GitHub Actions Workflow**

`.github/workflows/ci-cd.yml`:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run Prisma migrations
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db?schema=public
        run: npx prisma migrate deploy
      
      - name: Run tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db?schema=public
          JWT_SECRET: test-secret
        run: npm test
      
      - name: Lint
        working-directory: ./backend
        run: npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run tests
        working-directory: ./frontend
        run: npm test
      
      - name: Lint
        working-directory: ./frontend
        run: npm run lint
      
      - name: Build
        working-directory: ./frontend
        run: npm run build

  build-and-push:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Container Registry
        run: echo "Add your container registry login here"
      
      - name: Build and push Docker images
        run: echo "Add your Docker build and push commands here"
```

---

## Deliverables

✅ **Project Structure**
- Monorepo with frontend and backend initialized
- All directories and configuration files in place

✅ **Database**
- PostgreSQL database running in Docker
- Prisma schema defined with all core models
- Initial migration executed
- Prisma Client generated

✅ **Development Environment**
- Docker Compose setup with PostgreSQL, Redis, Backend, Frontend
- All services running and communicating
- Hot-reload enabled for development

✅ **Authentication System**
- User registration endpoint
- Login with JWT tokens
- Refresh token mechanism
- Authentication middleware
- Authorization middleware

✅ **API Foundation**
- Express server with middleware (helmet, cors, morgan)
- Error handling system
- Logging system
- Health check endpoint
- API versioning structure

✅ **CI/CD**
- GitHub Actions workflow
- Automated testing on PR
- Linting and formatting checks

---

## Testing Phase 1

### Manual Testing Checklist
- [ ] Start all services with `docker-compose up`
- [ ] Access PostgreSQL on localhost:5432
- [ ] Access Redis on localhost:6379
- [ ] Backend API responds at http://localhost:3000/health
- [ ] Frontend loads at http://localhost:5173
- [ ] Register new user via API
- [ ] Login and receive JWT tokens
- [ ] Access protected endpoint with JWT
- [ ] Refresh access token using refresh token
- [ ] Run Prisma Studio: `npx prisma studio`

### Automated Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run both
npm run test:all  # Add this script to root package.json
```

---

## Next Steps
After completing Phase 1, proceed to Phase 2: Core Member & Group Management, which will build upon this foundation to implement member registration, group creation, and the invitation workflow.

---

## Troubleshooting

**Issue: Docker containers won't start**
- Solution: Ensure ports 5432, 6379, 3000, 5173 are not in use
- Run: `docker-compose down -v` and `docker-compose up --build`

**Issue: Database migration fails**
- Solution: Check DATABASE_URL in .env
- Run: `npx prisma migrate reset` to reset database

**Issue: JWT authentication not working**
- Solution: Verify JWT_SECRET is set in .env
- Check token expiry times

**Issue: Frontend can't connect to backend**
- Solution: Check proxy configuration in vite.config.ts
- Verify backend is running on port 3000

---

**Phase 1 Complete! Ready for Phase 2.**
