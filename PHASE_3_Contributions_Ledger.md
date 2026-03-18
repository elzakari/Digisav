# PHASE 3: CONTRIBUTION TRACKING & IMMUTABLE LEDGER

## Overview
Implement the core financial tracking system with contribution recording, payment status management, immutable transaction ledger with blockchain-like hash chain, and real-time dashboards.

## Objectives
- Build contribution recording system
- Implement immutable transaction ledger with hash chain
- Create payment status tracking (pending, paid, overdue, defaulted)
- Build admin and member dashboards
- Implement contribution compliance calculations
- Create export functionality (PDF/CSV)
- Add transaction verification system

## Key Features

### 1. Contribution Service with Ledger

```typescript
// backend/src/services/contributions/contribution.service.ts
export class ContributionService {
  async recordContribution(data: {
    memberId: string;
    groupId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    recordedBy: string;
  }) {
    // 1. Validate member and group
    // 2. Check for duplicate (same member + cycle)
    // 3. Calculate cycle number based on payment date
    // 4. Generate contribution hash (SHA-256)
    // 5. Create contribution record
    // 6. Create transaction in ledger with previous hash
    // 7. Return contribution with verification hash
  }

  async getContributionHistory(memberId: string, groupId: string) {
    // Return all contributions for a member in a group
  }

  async getGroupContributions(groupId: string, cycleNumber?: number) {
    // Return all contributions for a group/cycle
  }

  async verifyLedgerIntegrity(groupId: string) {
    // Verify hash chain is intact
  }
}
```

### 2. Transaction Ledger with Hash Chain

```typescript
// backend/src/services/ledger/ledger.service.ts
export class LedgerService {
  async createTransaction(data: {
    groupId: string;
    memberId?: string;
    transactionType: TransactionType;
    amount: number;
    referenceId?: string;
    recordedBy: string;
    metadata?: any;
  }) {
    // 1. Get previous transaction hash
    const previousTransaction = await this.getLastTransaction(data.groupId);
    
    // 2. Generate current hash
    const hash = this.generateHash({
      ...data,
      previousHash: previousTransaction?.hash,
      timestamp: new Date(),
    });

    // 3. Create transaction
    return prisma.transaction.create({
      data: {
        ...data,
        hash,
        previousHash: previousTransaction?.hash || null,
        timestamp: new Date(),
      },
    });
  }

  private generateHash(data: any): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async verifyChain(groupId: string): Promise<boolean> {
    // Verify entire hash chain for a group
  }
}
```

### 3. Payment Status Tracking

```typescript
// backend/src/services/contributions/payment-status.service.ts
export class PaymentStatusService {
  async updatePaymentStatuses(groupId: string) {
    // Run daily to update payment statuses
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    const members = await prisma.member.findMany({ 
      where: { groupId, status: 'ACTIVE' } 
    });

    const currentCycle = this.calculateCurrentCycle(group);
    const dueDate = this.calculateDueDate(group, currentCycle);
    
    for (const member of members) {
      const contribution = await prisma.contribution.findUnique({
        where: { 
          groupId_memberId_cycleNumber: {
            groupId,
            memberId: member.id,
            cycleNumber: currentCycle,
          }
        },
      });

      if (!contribution && new Date() > dueDate) {
        const daysPastDue = Math.floor(
          (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        let status: ContributionStatus = 'PENDING';
        if (daysPastDue > group.gracePeriodDays) {
          status = 'DEFAULTED';
        } else if (daysPastDue > 0) {
          status = 'OVERDUE';
        }

        // Create pending/overdue/defaulted record
        // Send notification
      }
    }
  }
}
```

### 4. Dashboard with Real-Time Stats

```typescript
// frontend/src/pages/admin/GroupDashboard.tsx
export function GroupDashboard() {
  const { groupId } = useParams();
  
  const { data: stats } = useQuery({
    queryKey: ['group-stats', groupId],
    queryFn: () => contributionService.getGroupStats(groupId),
  });

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Expected"
          value={formatCurrency(stats.totalExpected)}
          icon={<DollarIcon />}
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(stats.totalCollected)}
          color="green"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding)}
          color="orange"
        />
        <StatCard
          title="Compliance Rate"
          value={`${stats.complianceRate}%`}
          color={stats.complianceRate >= 90 ? 'green' : 'red'}
        />
      </div>

      {/* Contribution Status Table */}
      <ContributionTable
        members={stats.members}
        currentCycle={stats.currentCycle}
      />
    </div>
  );
}
```

### 5. PDF Report Generation

```typescript
// backend/src/services/reporting/report.service.ts
import PDFDocument from 'pdfkit';

export class ReportService {
  async generateContributionReport(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Header
    doc.fontSize(20).text('Contribution Report', { align: 'center' });
    doc.moveDown();

    // Group Info
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    doc.fontSize(12);
    doc.text(`Group: ${group.groupName}`);
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`);
    doc.moveDown();

    // Summary Statistics
    const stats = await this.calculateStats(groupId, startDate, endDate);
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(10);
    doc.text(`Total Expected: ${formatCurrency(stats.totalExpected)}`);
    doc.text(`Total Collected: ${formatCurrency(stats.totalCollected)}`);
    doc.text(`Outstanding: ${formatCurrency(stats.outstanding)}`);
    doc.text(`Compliance Rate: ${stats.complianceRate}%`);
    doc.moveDown();

    // Detailed Table
    const contributions = await this.getContributions(groupId, startDate, endDate);
    this.drawTable(doc, contributions);

    // Footer with verification
    doc.moveDown(2);
    doc.fontSize(8);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Verification Hash: ${this.generateReportHash(contributions)}`);

    doc.end();

    return Buffer.concat(buffers);
  }
}
```

## API Endpoints

```
POST   /api/v1/groups/:groupId/contributions
GET    /api/v1/groups/:groupId/contributions
GET    /api/v1/groups/:groupId/contributions/:cycleNumber
GET    /api/v1/members/:memberId/contributions
GET    /api/v1/groups/:groupId/stats
GET    /api/v1/groups/:groupId/ledger/verify
POST   /api/v1/groups/:groupId/reports/contributions
GET    /api/v1/groups/:groupId/reports/:reportId/download
```

## Testing Checklist

- [ ] Record contribution for member
- [ ] Verify hash generation
- [ ] Verify previous hash linkage
- [ ] Test duplicate contribution prevention
- [ ] Calculate payment statuses correctly
- [ ] Mark overdue contributions after due date
- [ ] Mark defaulted after grace period
- [ ] Generate PDF report
- [ ] Export CSV with all contributions
- [ ] Verify ledger integrity
- [ ] Test contribution compliance calculation
- [ ] Dashboard shows real-time stats

## Deliverables

✅ Contribution recording with validation
✅ Immutable transaction ledger with hash chain
✅ Payment status tracking system
✅ Admin dashboard with real-time metrics
✅ Member dashboard showing personal contributions
✅ PDF report generation
✅ CSV export functionality
✅ Ledger verification endpoint

**Phase 3 Complete! Ready for Phase 4: Communication & Messaging System.**
