import PDFDocument from 'pdfkit';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export class ReportService {
  async generateContributionReport(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Fetch Data
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) throw new Error('Group not found');

        const contributions = await prisma.contribution.findMany({
          where: {
            groupId,
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            member: {
              include: { user: { select: { fullName: true } } },
            },
          },
        });

        // Header
        doc.fontSize(20).text('Contribution Report', { align: 'center' });
        doc.moveDown();

        // Group Info
        doc.fontSize(12);
        doc.text(`Group: ${group.groupName}`);
        doc.text(`Period: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
        doc.moveDown();

        // Summary Statistics
        const totalAmount = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        
        doc.fontSize(14).text('Summary', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Collected: ${group.currencyCode} ${totalAmount.toFixed(2)}`);
        doc.text(`Total Transactions: ${contributions.length}`);
        doc.moveDown();

        // Detailed Table
        doc.fontSize(14).text('Transactions', { underline: true });
        doc.fontSize(10);
        
        // Simple table header
        const startY = doc.y;
        doc.text('Date', 50, startY);
        doc.text('Member', 150, startY);
        doc.text('Amount', 300, startY);
        doc.text('Method', 400, startY);
        
        doc.moveDown();
        
        // Table rows
        contributions.forEach((c) => {
          const y = doc.y;
          doc.text(c.paymentDate.toISOString().split('T')[0], 50, y);
          doc.text(c.member.user.fullName, 150, y);
          doc.text(c.amount.toString(), 300, y);
          doc.text(c.paymentMethod, 400, y);
          doc.moveDown();
        });

        // Footer with verification
        doc.moveDown(2);
        doc.fontSize(8);
        doc.text(`Generated: ${new Date().toISOString()}`);
        doc.text(`Verification Hash: ${this.generateReportHash(contributions)}`);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generatePayoutReport(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) throw new Error('Group not found');

        const payouts = await prisma.transaction.findMany({
          where: {
            groupId,
            transactionType: 'PAYOUT',
            timestamp: { gte: startDate, lte: endDate },
          },
          include: {
            member: { include: { user: { select: { fullName: true } } } },
          },
        });

        doc.fontSize(20).text('Payout Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Group: ${group.groupName}`);
        doc.text(`Period: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
        doc.moveDown();

        const totalPayout = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
        doc.fontSize(14).text('Summary', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Paid Out: ${group.currencyCode} ${totalPayout.toFixed(2)}`);
        doc.text(`Total Payouts: ${payouts.length}`);
        doc.moveDown();

        doc.fontSize(14).text('Payout Details', { underline: true });
        doc.fontSize(10);
        const startY = doc.y;
        doc.text('Date', 50, startY);
        doc.text('Member', 150, startY);
        doc.text('Amount', 350, startY);
        doc.moveDown();

        payouts.forEach((p) => {
          const y = doc.y;
          doc.text(p.timestamp.toISOString().split('T')[0], 50, y);
          doc.text(p.member?.user.fullName || 'System', 150, y);
          doc.text(p.amount.toString(), 350, y);
          doc.moveDown();
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateAuditSummaryReport(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) throw new Error('Group not found');

        const contributions = await prisma.contribution.findMany({
          where: { groupId, paymentDate: { gte: startDate, lte: endDate } }
        });

        const payouts = await prisma.transaction.findMany({
          where: { groupId, transactionType: 'PAYOUT', timestamp: { gte: startDate, lte: endDate } }
        });

        const totalIn = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        const totalOut = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = totalIn - totalOut;

        doc.fontSize(22).text('Group Audit Summary', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Group: ${group.groupName}`);
        doc.text(`Period: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
        doc.moveDown();

        doc.fontSize(16).text('Financial Snapshot', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Total Contributions In: ${group.currencyCode} ${totalIn.toFixed(2)}`);
        doc.text(`Total Payouts Out: ${group.currencyCode} ${totalOut.toFixed(2)}`);
        doc.moveDown();
        doc.fontSize(14).text(`Net Cash Position: ${group.currencyCode} ${balance.toFixed(2)}`);
        
        doc.moveDown(2);
        doc.fontSize(10).text('Note: This is an automated audit summary generated by DigiSav platform.');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateCSVReport(
    groupId: string,
    type: 'contributions' | 'payouts' | 'audit',
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    if (type === 'contributions') {
      const contributions = await prisma.contribution.findMany({
        where: { groupId, paymentDate: { gte: startDate, lte: endDate } },
        include: { member: { include: { user: { select: { fullName: true } } } } }
      });
      const header = 'Date,Member,Amount,Method,Reference,Status\n';
      const rows = contributions.map(c => 
        `${c.paymentDate.toISOString().split('T')[0]},"${c.member.user.fullName}",${c.amount},${c.paymentMethod},"${c.referenceNumber || ''}",${c.status}`
      ).join('\n');
      return header + rows;
    } else if (type === 'payouts') {
      const payouts = await prisma.transaction.findMany({
        where: { groupId, transactionType: 'PAYOUT', timestamp: { gte: startDate, lte: endDate } },
        include: { member: { include: { user: { select: { fullName: true } } } } }
      });
      const header = 'Date,Member,Amount,Reference\n';
      const rows = payouts.map(p => 
        `${p.timestamp.toISOString().split('T')[0]},"${p.member?.user.fullName || 'System'}",${p.amount},"${p.referenceId || ''}"`
      ).join('\n');
      return header + rows;
    } else {
      const contributions = await prisma.contribution.findMany({
        where: { groupId, paymentDate: { gte: startDate, lte: endDate } }
      });
      const payouts = await prisma.transaction.findMany({
        where: { groupId, transactionType: 'PAYOUT', timestamp: { gte: startDate, lte: endDate } }
      });
      const totalIn = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalOut = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
      
      return `DigiSav Audit Summary\nPeriod,${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\nTotal Contributions,${totalIn}\nTotal Payouts,${totalOut}\nBalance,${totalIn - totalOut}\n`;
    }
  }

  private generateReportHash(data: any): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
