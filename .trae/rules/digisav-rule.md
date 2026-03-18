# RULES.md - Digital Savings Group Management Platform

## Project Overview
A production-ready web application for managing digital savings groups (tontines/ROSCAs/chamas). This platform enables transparent, efficient management of member contributions, automated communications, and immutable transaction tracking.

---

## Core Principles

### 1. Security First
- All user data must be encrypted at rest (AES-256) and in transit (TLS 1.3)
- Implement row-level security for multi-tenant data isolation
- Use bcrypt (work factor 12+) for password hashing
- JWT tokens with 24-hour expiration, refresh tokens 30 days
- Input validation and sanitization on all user inputs
- SQL injection prevention through parameterized queries
- XSS protection with proper output encoding
- CSRF protection with tokens
- Rate limiting on all API endpoints (100 req/min per IP)

### 2. Data Integrity & Auditability
- Implement append-only transaction ledger with hash chain
- Each transaction must include: timestamp, user_id, hash of previous transaction
- SHA-256 hashing for transaction integrity verification
- All financial operations must be atomic (ACID compliance)
- Soft deletes only - never hard delete financial records
- Comprehensive audit logging for all admin actions

### 3. Multi-Tenancy Architecture
- Use `group_id` as partition key on all tenant-specific tables
- Implement middleware to inject group_id into all queries
- Strict isolation: users can only access their group's data
- Shared schema with row-level security policies

### 4. Performance Targets
- Page load: <2s (P95 <3s)
- API responses: <500ms (P95 <1s)
- Database queries: <200ms
- PDF generation: <5s
- Support 5,000 concurrent users
- Handle 50,000 transactions/day

---

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: React Query (server state) + Zustand (client state)
- **Styling**: Tailwind CSS 3.x with custom design system
- **Forms**: React Hook Form with Zod validation
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Testing**: Vitest + React Testing Library

### Backend
- **Framework**: Node.js 20+ with Express.js OR Python 3.11+ with FastAPI
- **ORM**: Prisma (Node.js) OR SQLAlchemy (Python)
- **Validation**: Zod (Node.js) OR Pydantic (Python)
- **Authentication**: JWT with refresh tokens
- **API Documentation**: OpenAPI 3.0 / Swagger

### Database
- **Primary**: PostgreSQL 15+
- **Caching**: Redis 7+
- **Search**: PostgreSQL Full-Text Search (MVP), Elasticsearch (Phase 2+)

### Infrastructure
- **Cloud**: AWS, Google Cloud, or Azure
- **Containers**: Docker + Docker Compose (dev), Kubernetes (prod)
- **CI/CD**: GitHub Actions or GitLab CI
- **Monitoring**: Datadog, New Relic, or Prometheus + Grafana
- **Logging**: ELK Stack or CloudWatch

### External Services
- **SMS**: Twilio or Africa's Talking
- **WhatsApp**: WhatsApp Business API
- **Email**: SendGrid or AWS SES
- **File Storage**: AWS S3 or equivalent
- **Authentication**: Auth0 (optional managed service)

---

## Project Structure

```
project-root/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Reusable UI components
│   │   │   ├── admin/          # Admin-specific components
│   │   │   ├── member/         # Member-specific components
│   │   │   └── layout/         # Layout components
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   └── member/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API service layer
│   │   ├── utils/              # Helper functions
│   │   ├── types/              # TypeScript type definitions
│   │   ├── store/              # State management
│   │   ├── constants/          # App constants
│   │   └── styles/             # Global styles
│   ├── public/
│   └── tests/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── controllers/    # Business logic
│   │   │   ├── middleware/     # Express/FastAPI middleware
│   │   │   └── validators/     # Request validation schemas
│   │   ├── services/           # Business services
│   │   │   ├── auth/
│   │   │   ├── contributions/
│   │   │   ├── members/
│   │   │   ├── groups/
│   │   │   ├── messaging/
│   │   │   └── reporting/
│   │   ├── database/
│   │   │   ├── models/         # Database models/entities
│   │   │   ├── migrations/     # Database migrations
│   │   │   └── seeders/        # Test data seeders
│   │   ├── utils/              # Utility functions
│   │   ├── config/             # Configuration management
│   │   └── types/              # Type definitions
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── shared/                      # Shared types/constants
├── docker/
├── scripts/                     # Build and deployment scripts
├── docs/
│   ├── api/                    # API documentation
│   ├── architecture/           # Architecture diagrams
│   └── guides/                 # Developer guides
└── .github/
    └── workflows/              # CI/CD pipelines
```

---

## Database Schema Guidelines

### Naming Conventions
- Tables: `plural_snake_case` (e.g., `users`, `group_members`)
- Columns: `snake_case` (e.g., `full_name`, `created_at`)
- Foreign keys: `{referenced_table_singular}_id` (e.g., `user_id`, `group_id`)
- Indexes: `idx_{table}_{columns}` (e.g., `idx_contributions_group_id_date`)
- Constraints: `{type}_{table}_{column}` (e.g., `chk_users_email_format`)

### Required Columns (All Tables)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ NULL  -- For soft deletes
```

### Multi-Tenant Columns (Tenant-Specific Tables)
```sql
group_id UUID NOT NULL REFERENCES groups(id),
-- Add index: CREATE INDEX idx_tablename_group_id ON table_name(group_id);
```

### Core Tables (Simplified Schema)

**users**
```sql
id, email, phone_number, password_hash, full_name, 
status (active/inactive/suspended), role (admin/member),
last_login, email_verified, phone_verified,
created_at, updated_at
```

**groups**
```sql
id, group_name, group_prefix, admin_user_id (FK),
contribution_amount, currency_code, payment_frequency,
max_members, payout_order_type, start_date, status,
grace_period_days, created_at, updated_at
```

**members**
```sql
id, user_id (FK), group_id (FK), account_number,
national_id, photo_url, date_of_birth, join_date,
status, payout_position, created_at, updated_at
```

**contributions**
```sql
id, member_id (FK), group_id (FK), amount, currency_code,
payment_date, due_date, cycle_number, payment_method,
reference_number, recorded_by (FK users), notes, status,
hash (SHA-256), created_at
```

**transactions** (Append-only ledger)
```sql
id, group_id (FK), member_id (FK), transaction_type,
amount, currency_code, reference_id, recorded_by (FK users),
timestamp, hash (current), previous_hash (chain),
metadata (JSONB), created_at
```

**messages**
```sql
id, group_id (FK), member_id (FK), message_type,
channel (sms/whatsapp), recipient_phone, message_body,
template_id, delivery_status, sent_at, delivered_at,
read_at, error_message, created_at
```

---

## API Design Standards

### RESTful Principles
- Use HTTP methods correctly: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- Use plural nouns: `/api/v1/groups`, `/api/v1/members`
- Use nested resources when appropriate: `/api/v1/groups/{groupId}/members`
- Return appropriate HTTP status codes

### Status Codes
- 200 OK: Successful GET, PUT, PATCH, or DELETE
- 201 Created: Successful POST
- 204 No Content: Successful DELETE with no response body
- 400 Bad Request: Invalid input
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Authenticated but not authorized
- 404 Not Found: Resource doesn't exist
- 409 Conflict: Duplicate resource
- 422 Unprocessable Entity: Validation error
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error

### Request/Response Format
```typescript
// Request with validation
POST /api/v1/groups/{groupId}/contributions
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "memberId": "uuid",
  "amount": 1000.00,
  "paymentDate": "2026-02-15",
  "paymentMethod": "cash",
  "referenceNumber": "REF123",
  "notes": "February payment"
}

// Success Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "memberId": "uuid",
    "amount": 1000.00,
    "status": "completed",
    "createdAt": "2026-02-15T10:30:00Z"
  },
  "message": "Contribution recorded successfully"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than 0"
      }
    ]
  }
}
```

### API Versioning
- Version in URL: `/api/v1/`, `/api/v2/`
- Maintain backward compatibility within major versions
- 6-month deprecation notice for breaking changes

### Pagination
```typescript
GET /api/v1/groups/{groupId}/contributions?page=1&limit=20&sortBy=paymentDate&order=desc

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering & Searching
```typescript
GET /api/v1/groups/{groupId}/contributions?status=pending&fromDate=2026-01-01&toDate=2026-02-15

GET /api/v1/groups/{groupId}/members?search=john&status=active
```

---

## Authentication & Authorization

### JWT Token Structure
```typescript
// Access Token (24-hour expiry)
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "role": "admin",
  "groupIds": ["group_uuid_1", "group_uuid_2"],
  "iat": 1708005600,
  "exp": 1708092000
}

// Refresh Token (30-day expiry)
{
  "sub": "user_uuid",
  "tokenId": "refresh_token_uuid",
  "iat": 1708005600,
  "exp": 1710597600
}
```

### Authentication Flow
1. User login → Validate credentials
2. Generate access token (24h) + refresh token (30d)
3. Return both tokens to client
4. Client stores refresh token in httpOnly cookie
5. Client includes access token in Authorization header
6. On access token expiry → Use refresh token to get new access token
7. On refresh token expiry → Full re-authentication required

### Authorization Middleware
```typescript
// Protect routes with role-based access
router.get('/admin/dashboard', 
  authenticate,  // Verify JWT
  authorize(['admin']),  // Check role
  controller.getDashboard
);

// Protect routes with group membership check
router.post('/groups/:groupId/contributions',
  authenticate,
  authorizeGroupMember,  // Verify user belongs to group
  controller.recordContribution
);
```

### Row-Level Security (Database Level)
```sql
-- PostgreSQL RLS Policy Example
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contributions_isolation ON contributions
  USING (group_id = current_setting('app.current_group_id')::UUID);
```

---

## Validation Standards

### Input Validation
- **Always validate on backend** - never trust client input
- Use schema validation libraries (Zod, Pydantic)
- Validate data types, formats, ranges, and business rules
- Sanitize all string inputs to prevent XSS

### Common Validation Rules
```typescript
// User Registration
{
  email: z.string().email().max(255),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/), // E.164 format
  password: z.string().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  fullName: z.string().min(2).max(100),
  dateOfBirth: z.date().max(new Date()).refine(
    (date) => calculateAge(date) >= 18,
    "Must be 18 or older"
  )
}

// Contribution
{
  amount: z.number().positive().max(10000000),
  paymentDate: z.date().max(new Date()),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer']),
  referenceNumber: z.string().max(50).optional()
}

// Group Configuration
{
  contributionAmount: z.number().min(100).max(10000000),
  paymentFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']),
  maxMembers: z.number().int().min(3).max(100)
}
```

---

## Error Handling

### Error Classes
```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}
```

### Global Error Handler
```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Send response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Unexpected errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});
```

---

## Testing Requirements

### Unit Tests
- Test all business logic functions
- Test utility functions
- Mock external dependencies
- Aim for 80%+ code coverage

### Integration Tests
- Test API endpoints
- Test database operations
- Test authentication/authorization flows
- Use test database

### E2E Tests
- Test critical user flows:
  - User registration and login
  - Group creation
  - Member invitation and approval
  - Recording contributions
  - Generating reports
  - Sending messages

### Test Organization
```typescript
describe('ContributionService', () => {
  describe('recordContribution', () => {
    it('should record contribution successfully', async () => {
      // Arrange
      const contributionData = {...};
      
      // Act
      const result = await service.recordContribution(contributionData);
      
      // Assert
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(contributionData.amount);
    });

    it('should throw error for duplicate contribution', async () => {
      // Arrange
      const contributionData = {...};
      await service.recordContribution(contributionData);
      
      // Act & Assert
      await expect(
        service.recordContribution(contributionData)
      ).rejects.toThrow('Contribution already exists');
    });
  });
});
```

---

## Messaging System

### SMS/WhatsApp Integration
- Use queue-based architecture (RabbitMQ, AWS SQS)
- Implement retry logic (max 3 attempts with exponential backoff)
- Track delivery status in database
- Respect rate limits (WhatsApp: 80 msg/sec, SMS: varies by provider)
- Implement opt-out mechanism

### Message Templates
```typescript
const messageTemplates = {
  PAYMENT_REMINDER: {
    whatsapp: "Hi {{member_name}},\n\nReminder: Your contribution of {{amount}} is due on {{due_date}}.\n\nGroup: {{group_name}}\nAccount: {{account_number}}\n\nThank you!",
    sms: "Hi {{member_name}}, your {{amount}} contribution is due {{due_date}}. Group: {{group_name}}"
  },
  PAYMENT_CONFIRMED: {
    whatsapp: "Payment Confirmed! ✅\n\nHi {{member_name}},\n\nWe've received your {{amount}} contribution.\n\nDate: {{payment_date}}\nAccount: {{account_number}}\n\nThank you!",
    sms: "Payment confirmed: {{amount}} received on {{payment_date}}. Thank you!"
  },
  PAYOUT_NOTIFICATION: {
    whatsapp: "Payout Notice 💰\n\nHi {{member_name}},\n\nYou're scheduled to receive {{payout_amount}} on {{payout_date}}.\n\nGroup: {{group_name}}\n\nStay tuned!",
    sms: "You'll receive {{payout_amount}} on {{payout_date}}. Group: {{group_name}}"
  }
};
```

### Message Queue Worker
```typescript
async function processMessageQueue() {
  const message = await queue.dequeue();
  
  try {
    // Select channel based on preference and availability
    const channel = selectChannel(message.recipient);
    
    // Send message
    const result = await sendMessage(channel, message);
    
    // Update delivery status
    await updateMessageStatus(message.id, result);
    
  } catch (error) {
    // Retry logic
    if (message.attempts < 3) {
      await queue.enqueue(message, { delay: calculateBackoff(message.attempts) });
    } else {
      await markMessageFailed(message.id, error);
    }
  }
}
```

---

## PDF Report Generation

### Library: PDFKit (Node.js) or ReportLab (Python)

### Report Structure
```typescript
async function generateContributionReport(groupId: string, dateRange: DateRange) {
  const doc = new PDFDocument();
  
  // Header
  doc.fontSize(20).text('Contribution Report', { align: 'center' });
  doc.fontSize(12).text(`Group: ${group.name}`);
  doc.text(`Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`);
  
  // Summary Statistics
  doc.moveDown();
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(10);
  doc.text(`Total Expected: ${formatCurrency(stats.totalExpected)}`);
  doc.text(`Total Collected: ${formatCurrency(stats.totalCollected)}`);
  doc.text(`Outstanding: ${formatCurrency(stats.outstanding)}`);
  doc.text(`Compliance Rate: ${stats.complianceRate}%`);
  
  // Detailed Table
  doc.moveDown();
  doc.fontSize(14).text('Member Contributions', { underline: true });
  
  const table = {
    headers: ['Member', 'Account', 'Amount', 'Status', 'Date'],
    rows: contributions.map(c => [
      c.memberName,
      c.accountNumber,
      formatCurrency(c.amount),
      c.status,
      formatDate(c.paymentDate)
    ])
  };
  
  drawTable(doc, table);
  
  // Footer with verification
  doc.moveDown(2);
  doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`);
  doc.text(`Verification Hash: ${generateReportHash(contributions)}`);
  
  // Generate QR code for online verification
  const qrCode = await generateQRCode(`https://platform.com/verify/${reportId}`);
  doc.image(qrCode, { width: 100 });
  
  return doc;
}
```

---

## Deployment & DevOps

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=30d

# External Services
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
WHATSAPP_API_KEY=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=xxx

# Monitoring
SENTRY_DSN=xxx
DATADOG_API_KEY=xxx
```

### Docker Compose (Development)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: savings_group
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/savings_group
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### CI/CD Pipeline (GitHub Actions)
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: registry.com/savings-group:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy commands here
```

---

## Code Quality Standards

### Linting & Formatting
- **ESLint** for JavaScript/TypeScript
- **Prettier** for code formatting
- **Pre-commit hooks** with Husky

### Code Review Checklist
- [ ] Code follows project structure and naming conventions
- [ ] All functions have proper error handling
- [ ] Input validation implemented
- [ ] Authentication/authorization checks in place
- [ ] Tests written and passing
- [ ] No sensitive data in code or logs
- [ ] Database queries optimized (explain analyze)
- [ ] API documentation updated
- [ ] No console.log statements in production code
- [ ] Proper logging with appropriate levels

### Git Commit Messages
```
Format: <type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting)
- refactor: Code refactoring
- test: Adding or updating tests
- chore: Maintenance tasks

Examples:
feat(auth): implement JWT refresh token rotation
fix(contributions): resolve duplicate payment recording
docs(api): update contribution endpoint documentation
refactor(database): optimize member query performance
```

---

## Monitoring & Logging

### Logging Levels
- **ERROR**: System errors, exceptions
- **WARN**: Deprecations, potential issues
- **INFO**: Important business events
- **DEBUG**: Detailed diagnostic info (dev only)

### Structured Logging
```typescript
logger.info({
  event: 'contribution_recorded',
  userId: user.id,
  groupId: group.id,
  memberId: member.id,
  amount: contribution.amount,
  timestamp: new Date().toISOString()
});

logger.error({
  event: 'payment_processing_failed',
  error: error.message,
  stack: error.stack,
  userId: user.id,
  contributionId: contribution.id,
  timestamp: new Date().toISOString()
});
```

### Metrics to Track
- Request rate (requests/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Database connection pool usage
- Cache hit rate
- Message delivery success rate
- Active user count
- Contribution processing time

---

## Security Checklist

- [ ] All environment variables stored securely
- [ ] Passwords hashed with bcrypt (work factor 12+)
- [ ] JWT tokens with appropriate expiry
- [ ] HTTPS enforced in production
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (output encoding)
- [ ] CSRF protection
- [ ] Helmet.js middleware enabled
- [ ] Sensitive data encrypted in database
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerability scanning
- [ ] Audit logs for all admin actions
- [ ] Two-factor authentication for admins
- [ ] Session management properly implemented
- [ ] File upload validation and scanning
- [ ] API rate limiting per user/IP

---

## Performance Optimization

### Database Optimization
- Create indexes on frequently queried columns
- Use EXPLAIN ANALYZE to optimize slow queries
- Implement connection pooling
- Use database caching (Redis) for hot data
- Implement pagination for large datasets
- Denormalize when appropriate for read-heavy operations

### Caching Strategy
```typescript
// Cache user sessions
cache.set(`session:${userId}`, userData, 3600); // 1 hour

// Cache group configuration
cache.set(`group:${groupId}:config`, groupConfig, 86400); // 24 hours

// Cache contribution statistics
cache.set(`group:${groupId}:stats:${date}`, stats, 7200); // 2 hours

// Invalidate cache on updates
cache.delete(`group:${groupId}:config`);
```

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization and lazy loading
- Debounce user input (search, filters)
- React.memo for expensive components
- Virtual scrolling for long lists
- Service worker for offline support (Phase 2)

---

## Accessibility (WCAG 2.1 Level AA)

- Semantic HTML elements
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for all images
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators visible
- Color contrast ratio ≥ 4.5:1
- Form labels and error messages
- Skip navigation links

---

## Internationalization (Phase 2+)

### i18n Setup
- Use i18next (React) or similar
- Separate language files (en.json, fr.json, sw.json)
- Format dates/numbers per locale
- RTL support for Arabic/Hebrew
- Currency formatting per country

---

## Critical Don'ts

❌ **NEVER** store sensitive data in localStorage
❌ **NEVER** commit secrets to version control
❌ **NEVER** trust client-side validation alone
❌ **NEVER** concatenate SQL queries (use parameterized queries)
❌ **NEVER** log sensitive data (passwords, tokens, PII)
❌ **NEVER** use weak random number generators for security
❌ **NEVER** hard delete financial records
❌ **NEVER** bypass authentication checks
❌ **NEVER** expose internal error details to clients
❌ **NEVER** use deprecated dependencies

---

## Development Workflow

1. **Feature Branch**: Create from `develop`
2. **Implement**: Write code + tests
3. **Test Locally**: Run all tests, ensure passing
4. **Code Review**: Submit PR, address feedback
5. **CI Pipeline**: Automated tests + linting
6. **Merge**: Merge to `develop` after approval
7. **Staging Deploy**: Test in staging environment
8. **Production Deploy**: Deploy to production (main branch)

---

## Support & Maintenance

### Backup Schedule
- Database: Hourly incremental, daily full
- Files: Daily backup to S3
- Retention: 30 days daily, 12 months monthly

### Monitoring Alerts
- API error rate > 1%
- Response time P95 > 3s
- Database CPU > 80%
- Disk space < 20%
- Message delivery failure > 5%
- Security events (failed login attempts)

### On-Call Procedures
1. Receive alert
2. Check monitoring dashboard
3. Review logs for errors
4. Implement fix or rollback
5. Document incident
6. Post-mortem for major incidents

---

This RULES.md serves as the single source of truth for technical implementation. All developers must read and follow these guidelines to ensure code quality, security, and maintainability.
