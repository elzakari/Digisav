import { Request, Response, NextFunction } from 'express';
import { ReportService } from '@/services/reporting/report.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';
import jwt from 'jsonwebtoken';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  private parseDateInput(value: any, kind: 'start' | 'end') {
    const s = String(value || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T${kind === 'end' ? '23:59:59.999' : '00:00:00.000'}Z`);
    }
    return new Date(s);
  }

  async generateReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const { startDate, endDate, type = 'contributions', format = 'pdf', memberId } = req.body;

      const from = this.parseDateInput(startDate, 'start');
      const to = this.parseDateInput(endDate, 'end');

      if (format === 'csv') {
        const csv = await this.reportService.generateCSVReport(
          groupId,
          type as any,
          from,
          to,
          memberId
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${groupId}.csv`);
        return res.send(csv);
      }

      let buffer: Buffer;
      if (type === 'payouts') {
        buffer = await this.reportService.generatePayoutReport(groupId, from, to, memberId);
      } else if (type === 'audit') {
        buffer = await this.reportService.generateAuditSummaryReport(groupId, from, to);
      } else {
        buffer = await this.reportService.generateContributionReport(groupId, from, to, memberId);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${groupId}.pdf`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async generateShareLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const { startDate, endDate, type = 'contributions', format = 'pdf', memberId } = req.body;

      const token = jwt.sign(
        { groupId, startDate, endDate, type, format, memberId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const publicUrl = `${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/api/v1/reports/public/${token}`;

      res.json({ success: true, shareLink: publicUrl });
    } catch (error) {
      next(error);
    }
  }

  async getPublicReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'your-secret-key') as any;

      const { groupId, startDate, endDate, type, format, memberId } = decoded;

      const from = this.parseDateInput(startDate, 'start');
      const to = this.parseDateInput(endDate, 'end');

      if (format === 'csv') {
        const csv = await this.reportService.generateCSVReport(
          groupId,
          type as any,
          from,
          to,
          memberId
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${groupId}.csv`);
        return res.send(csv);
      }

      let buffer: Buffer;
      if (type === 'payouts') {
        buffer = await this.reportService.generatePayoutReport(groupId, from, to, memberId);
      } else if (type === 'audit') {
        buffer = await this.reportService.generateAuditSummaryReport(groupId, from, to);
      } else {
        buffer = await this.reportService.generateContributionReport(groupId, from, to, memberId);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${groupId}.pdf`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
