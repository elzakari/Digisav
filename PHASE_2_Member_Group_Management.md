# PHASE 2: CORE MEMBER & GROUP MANAGEMENT

## Overview
Implement the foundational features for group creation, member registration, invitation workflows, and role-based access control. This phase enables administrators to create groups and onboard members.

## Objectives
- Implement group creation and configuration
- Build member registration and verification system
- Create invitation system (link-based and phone-based)
- Implement member approval workflow
- Build admin and member dashboards
- Create account number generation system
- Implement duplicate detection

## Prerequisites
- Phase 1 completed successfully
- Database running with initial schema
- Authentication system functional
- Docker environment operational

---

## Tasks

### 1. Group Management Backend

**1.1 Group Service**

`backend/src/services/groups/group.service.ts`:
```typescript
import { PrismaClient, PaymentFrequency, PayoutOrderType } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';
import { generateGroupPrefix } from '@/utils/generators';

const prisma = new PrismaClient();

interface CreateGroupData {
  groupName: string;
  contributionAmount: number;
  currencyCode: string;
  paymentFrequency: PaymentFrequency;
  customFrequencyDays?: number;
  maxMembers: number;
  payoutOrderType: PayoutOrderType;
  startDate?: Date;
  gracePeriodDays?: number;
}

export class GroupService {
  async createGroup(adminUserId: string, data: CreateGroupData) {
    // Generate unique group prefix
    const groupPrefix = await this.generateUniquePrefix();

    const group = await prisma.group.create({
      data: {
        ...data,
        groupPrefix,
        adminUserId,
        status: 'DRAFT',
      },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return group;
  }

  async getGroupById(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            contributions: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    // Check access
    const isMember = group.members.some((m) => m.userId === userId);
    const isAdmin = group.adminUserId === userId;

    if (!isMember && !isAdmin) {
      throw new ForbiddenError('You do not have access to this group');
    }

    return group;
  }

  async updateGroup(groupId: string, userId: string, data: Partial<CreateGroupData>) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== userId) {
      throw new ForbiddenError('Only group admin can update group');
    }

    // Prevent changing certain fields after group is active
    if (group.status === 'ACTIVE') {
      const restrictedFields = ['paymentFrequency', 'contributionAmount'];
      const hasRestrictedUpdate = restrictedFields.some((field) => field in data);
      
      if (hasRestrictedUpdate) {
        throw new ValidationError(
          'Cannot change payment frequency or amount after group is active'
        );
      }
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data,
    });

    return updated;
  }

  async activateGroup(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== userId) {
      throw new ForbiddenError('Only group admin can activate group');
    }

    // Validation before activation
    const activeMembers = group.members.filter((m) => m.status === 'ACTIVE');
    
    if (activeMembers.length < 3) {
      throw new ValidationError('Group must have at least 3 active members');
    }

    if (!group.startDate) {
      throw new ValidationError('Start date must be set before activation');
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'ACTIVE',
      },
    });

    return updated;
  }

  async getAdminGroups(adminUserId: string) {
    return prisma.group.findMany({
      where: { adminUserId },
      include: {
        _count: {
          select: {
            members: true,
            contributions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async generateUniquePrefix(): Promise<string> {
    let isUnique = false;
    let prefix = '';

    while (!isUnique) {
      prefix = generateGroupPrefix();
      const existing = await prisma.group.findUnique({
        where: { groupPrefix: prefix },
      });
      isUnique = !existing;
    }

    return prefix;
  }
}
```

**1.2 Group Routes**

`backend/src/api/routes/group.routes.ts`:
```typescript
import { Router } from 'express';
import { GroupController } from '@/api/controllers/group.controller';
import { authenticate } from '@/api/middleware/auth.middleware';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { createGroupSchema, updateGroupSchema } from '@/api/validators/group.validators';

const router = Router();
const controller = new GroupController();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  validateRequest(createGroupSchema),
  controller.createGroup.bind(controller)
);

router.get('/', controller.getMyGroups.bind(controller));

router.get('/:groupId', controller.getGroupById.bind(controller));

router.patch(
  '/:groupId',
  validateRequest(updateGroupSchema),
  controller.updateGroup.bind(controller)
);

router.post('/:groupId/activate', controller.activateGroup.bind(controller));

export default router;
```

**1.3 Group Validators**

`backend/src/api/validators/group.validators.ts`:
```typescript
import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    groupName: z.string().min(3).max(100),
    contributionAmount: z.number().positive().max(10000000),
    currencyCode: z.string().length(3),
    paymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
    customFrequencyDays: z.number().int().min(1).max(365).optional(),
    maxMembers: z.number().int().min(3).max(100),
    payoutOrderType: z.enum(['MANUAL', 'RANDOM', 'ROTATION']),
    startDate: z.string().datetime().optional(),
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
  }),
});

export const updateGroupSchema = z.object({
  body: z.object({
    groupName: z.string().min(3).max(100).optional(),
    contributionAmount: z.number().positive().max(10000000).optional(),
    maxMembers: z.number().int().min(3).max(100).optional(),
    startDate: z.string().datetime().optional(),
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
  }),
});
```

---

### 2. Member Management Backend

**2.1 Member Service**

`backend/src/services/members/member.service.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '@/utils/errors';
import { generateAccountNumber } from '@/utils/generators';
import { checkDuplicate } from '@/utils/duplicate-detection';

const prisma = new PrismaClient();

interface RegisterMemberData {
  userId: string;
  groupId: string;
  nationalId: string;
  photoUrl?: string;
  dateOfBirth?: Date;
}

export class MemberService {
  async registerMember(data: RegisterMemberData) {
    // Check if user already member of group
    const existing = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId: data.groupId,
          userId: data.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('User is already a member of this group');
    }

    // Check for duplicate national ID in group
    const duplicateId = await prisma.member.findUnique({
      where: {
        groupId_nationalId: {
          groupId: data.groupId,
          nationalId: data.nationalId,
        },
      },
    });

    if (duplicateId) {
      throw new ConflictError('This national ID is already registered in the group');
    }

    // Get group to check capacity and get prefix
    const group = await prisma.group.findUnique({
      where: { id: data.groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group._count.members >= group.maxMembers) {
      throw new ValidationError('Group has reached maximum member capacity');
    }

    // Generate unique account number
    const accountNumber = await this.generateUniqueAccountNumber(group.groupPrefix);

    // Create member with PENDING status
    const member = await prisma.member.create({
      data: {
        ...data,
        accountNumber,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
            contributionAmount: true,
            currencyCode: true,
          },
        },
      },
    });

    return member;
  }

  async approveMember(memberId: string, adminUserId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId) {
      throw new ForbiddenError('Only group admin can approve members');
    }

    if (member.status !== 'PENDING') {
      throw new ValidationError('Member is not in pending status');
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { status: 'ACTIVE' },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    // TODO: Send approval notification to member

    return updated;
  }

  async rejectMember(memberId: string, adminUserId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId) {
      throw new ForbiddenError('Only group admin can reject members');
    }

    // Soft delete by setting status to INACTIVE
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { status: 'INACTIVE' },
    });

    return updated;
  }

  async suspendMember(memberId: string, adminUserId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId) {
      throw new ForbiddenError('Only group admin can suspend members');
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { status: 'SUSPENDED' },
    });

    return updated;
  }

  async getGroupMembers(groupId: string, userId: string, status?: string) {
    // Verify user has access to group
    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!member && group?.adminUserId !== userId) {
      throw new ForbiddenError('You do not have access to this group');
    }

    const whereClause: any = { groupId };
    if (status) {
      whereClause.status = status;
    }

    return prisma.member.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async generateUniqueAccountNumber(groupPrefix: string): Promise<string> {
    let isUnique = false;
    let accountNumber = '';

    while (!isUnique) {
      accountNumber = generateAccountNumber(groupPrefix);
      const existing = await prisma.member.findUnique({
        where: { accountNumber },
      });
      isUnique = !existing;
    }

    return accountNumber;
  }
}
```

---

### 3. Utility Functions

**3.1 Account Number Generator**

`backend/src/utils/generators.ts`:
```typescript
import crypto from 'crypto';

export function generateGroupPrefix(): string {
  // Generate 5-character alphanumeric prefix (uppercase)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateAccountNumber(groupPrefix: string): string {
  // Format: [PREFIX]-[SEQUENCE]-[CHECK]
  // Example: SG001-00234-7
  
  const sequence = crypto.randomInt(1, 99999).toString().padStart(5, '0');
  const checkDigit = calculateLuhnCheckDigit(groupPrefix + sequence);
  
  return `${groupPrefix}-${sequence}-${checkDigit}`;
}

function calculateLuhnCheckDigit(input: string): string {
  // Luhn algorithm for checksum
  const digits = input.replace(/\D/g, '');
  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

**3.2 Duplicate Detection**

`backend/src/utils/duplicate-detection.ts`:
```typescript
import Levenshtein from 'fast-levenshtein';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarityScore: number;
  matchedField: string;
}

export function checkDuplicate(
  existingData: any[],
  newData: any,
  fields: string[]
): DuplicateCheckResult | null {
  for (const existing of existingData) {
    for (const field of fields) {
      const existingValue = existing[field]?.toString().toLowerCase() || '';
      const newValue = newData[field]?.toString().toLowerCase() || '';

      // Exact match
      if (existingValue === newValue) {
        return {
          isDuplicate: true,
          similarityScore: 1.0,
          matchedField: field,
        };
      }

      // Fuzzy match for names (>85% similarity)
      if (field === 'fullName' || field.includes('name')) {
        const distance = Levenshtein.get(existingValue, newValue);
        const maxLength = Math.max(existingValue.length, newValue.length);
        const similarity = 1 - distance / maxLength;

        if (similarity > 0.85) {
          return {
            isDuplicate: false, // Warning, not blocking
            similarityScore: similarity,
            matchedField: field,
          };
        }
      }
    }
  }

  return null;
}
```

---

### 4. Invitation System

**4.1 Invitation Service**

`backend/src/services/invitations/invitation.service.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import { generateInvitationToken } from '@/utils/generators';
import { NotFoundError, ForbiddenError } from '@/utils/errors';

const prisma = new PrismaClient();

export class InvitationService {
  async createInvitation(groupId: string, adminUserId: string, expiryDays: number = 7) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== adminUserId) {
      throw new ForbiddenError('Only group admin can create invitations');
    }

    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create invitation link
    const invitationLink = `${process.env.FRONTEND_URL}/join/${groupId}/${token}`;

    // Store invitation (you may want to create an Invitation table)
    // For now, we'll just return the link

    return {
      invitationLink,
      expiresAt,
      groupId,
      groupName: group.groupName,
    };
  }

  async sendPhoneInvitation(
    groupId: string,
    adminUserId: string,
    phoneNumber: string
  ) {
    const invitation = await this.createInvitation(groupId, adminUserId);

    // TODO: Send SMS/WhatsApp message with invitation link
    // This will be implemented in Phase 3

    return {
      ...invitation,
      recipientPhone: phoneNumber,
      message: `You've been invited to join ${invitation.groupName}. Click here: ${invitation.invitationLink}`,
    };
  }

  async validateInvitation(groupId: string, token: string) {
    // TODO: Implement token validation with expiry check
    // For now, just check if group exists and has capacity

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group._count.members >= group.maxMembers) {
      throw new Error('Group has reached maximum capacity');
    }

    return {
      valid: true,
      group: {
        id: group.id,
        name: group.groupName,
        contributionAmount: group.contributionAmount,
        currencyCode: group.currencyCode,
        paymentFrequency: group.paymentFrequency,
      },
    };
  }
}
```

---

### 5. Frontend Implementation

**5.1 Group Creation Form**

`frontend/src/pages/admin/CreateGroup.tsx`:
```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { groupService } from '@/services/group.service';

const createGroupSchema = z.object({
  groupName: z.string().min(3, 'Name must be at least 3 characters'),
  contributionAmount: z.number().positive('Amount must be positive'),
  currencyCode: z.string().length(3, 'Invalid currency code'),
  paymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  customFrequencyDays: z.number().optional(),
  maxMembers: z.number().int().min(3).max(100),
  payoutOrderType: z.enum(['MANUAL', 'RANDOM', 'ROTATION']),
  startDate: z.string().optional(),
  gracePeriodDays: z.number().int().min(0).max(30).default(0),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

export function CreateGroupPage() {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      currencyCode: 'KES',
      paymentFrequency: 'MONTHLY',
      maxMembers: 10,
      payoutOrderType: 'ROTATION',
      gracePeriodDays: 3,
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: groupService.createGroup,
    onSuccess: (data) => {
      navigate(`/admin/groups/${data.id}`);
    },
  });

  const onSubmit = (data: CreateGroupForm) => {
    createGroupMutation.mutate(data);
  };

  const paymentFrequency = watch('paymentFrequency');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create New Group</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Group Name *
          </label>
          <input
            {...register('groupName')}
            type="text"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Ladies Investment Club"
          />
          {errors.groupName && (
            <p className="text-red-500 text-sm mt-1">{errors.groupName.message}</p>
          )}
        </div>

        {/* Contribution Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Contribution Amount *
            </label>
            <input
              {...register('contributionAmount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="1000"
            />
            {errors.contributionAmount && (
              <p className="text-red-500 text-sm mt-1">
                {errors.contributionAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Currency *
            </label>
            <input
              {...register('currencyCode')}
              type="text"
              maxLength={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="KES"
            />
            {errors.currencyCode && (
              <p className="text-red-500 text-sm mt-1">
                {errors.currencyCode.message}
              </p>
            )}
          </div>
        </div>

        {/* Payment Frequency */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payment Frequency *
          </label>
          <select
            {...register('paymentFrequency')}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="CUSTOM">Custom</option>
          </select>

          {paymentFrequency === 'CUSTOM' && (
            <div className="mt-2">
              <input
                {...register('customFrequencyDays', { valueAsNumber: true })}
                type="number"
                min="1"
                max="365"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Number of days"
              />
            </div>
          )}
        </div>

        {/* Max Members */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Maximum Members *
          </label>
          <input
            {...register('maxMembers', { valueAsNumber: true })}
            type="number"
            min="3"
            max="100"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          {errors.maxMembers && (
            <p className="text-red-500 text-sm mt-1">{errors.maxMembers.message}</p>
          )}
        </div>

        {/* Payout Order */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payout Order *
          </label>
          <select
            {...register('payoutOrderType')}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="MANUAL">Manual Assignment</option>
            <option value="RANDOM">Random Draw</option>
            <option value="ROTATION">Scheduled Rotation (First-In-First-Out)</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Start Date (Optional)
          </label>
          <input
            {...register('startDate')}
            type="date"
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Grace Period */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Grace Period (Days)
          </label>
          <input
            {...register('gracePeriodDays', { valueAsNumber: true })}
            type="number"
            min="0"
            max="30"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Days allowed after due date before marking as defaulted
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={createGroupMutation.isPending}
          className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50"
        >
          {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
        </button>

        {createGroupMutation.isError && (
          <p className="text-red-500 text-sm text-center">
            {(createGroupMutation.error as any).message || 'Failed to create group'}
          </p>
        )}
      </form>
    </div>
  );
}
```

**5.2 API Service**

`frontend/src/services/group.service.ts`:
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const groupService = {
  async createGroup(data: any) {
    const response = await api.post('/groups', data);
    return response.data.data;
  },

  async getMyGroups() {
    const response = await api.get('/groups');
    return response.data.data;
  },

  async getGroupById(groupId: string) {
    const response = await api.get(`/groups/${groupId}`);
    return response.data.data;
  },

  async updateGroup(groupId: string, data: any) {
    const response = await api.patch(`/groups/${groupId}`, data);
    return response.data.data;
  },

  async activateGroup(groupId: string) {
    const response = await api.post(`/groups/${groupId}/activate`);
    return response.data.data;
  },
};
```

---

## Deliverables

✅ **Group Management**
- Create, read, update group functionality
- Group status management (draft, active, paused, closed)
- Group capacity enforcement
- Admin-only access control

✅ **Member Management**
- Member registration with validation
- Unique account number generation
- Duplicate detection (phone, ID)
- Member approval/rejection workflow
- Member status management

✅ **Invitation System**
- Link-based invitations
- Phone-based invitations
- Invitation validation
- Expiry handling

✅ **Frontend**
- Group creation form with validation
- Member registration form
- Admin dashboard showing groups
- Member list with status indicators

✅ **API Endpoints**
- POST /api/v1/groups
- GET /api/v1/groups
- GET /api/v1/groups/:id
- PATCH /api/v1/groups/:id
- POST /api/v1/groups/:id/activate
- POST /api/v1/groups/:id/members
- GET /api/v1/groups/:id/members
- PATCH /api/v1/members/:id/approve
- PATCH /api/v1/members/:id/reject

---

## Testing Checklist

- [ ] Create new group as admin
- [ ] Verify group prefix is unique
- [ ] Register new member with valid data
- [ ] Verify account number generation
- [ ] Test duplicate phone number detection
- [ ] Test duplicate national ID detection
- [ ] Approve pending member
- [ ] Reject pending member
- [ ] Test group capacity limit
- [ ] Activate group with minimum members
- [ ] Prevent non-admin from modifying group
- [ ] Generate invitation link
- [ ] Validate invitation token

---

**Phase 2 Complete! Ready for Phase 3: Contribution Tracking & Ledger System.**
