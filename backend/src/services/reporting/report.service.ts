import PDFDocument from 'pdfkit';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export class ReportService {
  async generateContributionReport(
    groupId: string,
    startDate: Date,
    endDate: Date,
    memberId?: string
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Fetch Data
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) throw new Error('Group not found');

        const groupMembers = await prisma.member.findMany({
          where: {
            groupId,
            status: 'ACTIVE',
            ...(memberId ? { id: memberId } : {}),
          },
          include: { user: { select: { fullName: true } } },
          orderBy: { user: { fullName: 'asc' } },
        });

        const baseEntries = (await prisma.transaction.findMany({
          where: {
            groupId,
            transactionType: { in: ['CONTRIBUTION', 'FEE'] },
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
            ...(memberId ? { memberId } : {}),
          },
          include: {
            member: { include: { user: { select: { fullName: true } } } },
            recorder: { select: { fullName: true } },
          },
          orderBy: [{ memberId: 'asc' }, { timestamp: 'asc' }],
        })) as any[] || [];

        const adjustments = (await prisma.transaction.findMany({
          where: {
            groupId,
            transactionType: 'ADJUSTMENT',
            timestamp: {
              lte: endDate,
            },
            ...(memberId ? { memberId } : {}),
          },
          select: { amount: true, referenceId: true, metadata: true },
        })) as any[] || [];

        const margin = 40;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const accent = '#4f46e5';
        const text = '#0f172a';
        const muted = '#475569';
        const line = '#e2e8f0';
        const tableHeaderBg = '#eef2ff';

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const formatMoney = (currency: string, amount: any) => `${currency} ${Number(amount).toFixed(2)}`;

        const getBaseKey = (e: any) => {
          return e?.metadata?.contributionId || e?.metadata?.depositId || e?.referenceId || e?.id;
        };

        const getAdjustmentKey = (a: any) => {
          return a?.metadata?.contributionId || a?.metadata?.depositId || a?.referenceId;
        };

        const getEntrySignedAmount = (e: any) => Math.abs(Number(e.amount || 0));
        const getEntryLabel = (e: any) => (e.transactionType === 'FEE' ? 'Fee' : 'Contribution');

        const itemsByKey = new Map<string, { entry: any; effectiveAmount: number }>();
        for (const e of baseEntries) {
          const key = String(getBaseKey(e));
          itemsByKey.set(key, { entry: e, effectiveAmount: getEntrySignedAmount(e) });
        }

        for (const a of adjustments) {
          const key = getAdjustmentKey(a);
          if (!key) continue;
          const item = itemsByKey.get(String(key));
          if (!item) continue;
          item.effectiveAmount += Number(a.amount || 0);
        }

        const entries = Array.from(itemsByKey.values())
          .map((x) => ({ ...x.entry, effectiveAmount: x.effectiveAmount }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const footerReserve = 26;
        const bottomLimitY = () => pageHeight - margin - footerReserve;

        const ensureSpace = (needed: number, headerTitle: string) => {
          if (doc.y + needed <= bottomLimitY()) return;
          doc.addPage();
          drawPageHeader(headerTitle, true);
        };

        const drawSectionTitle = (title: string) => {
          ensureSpace(26, 'Contribution Report');
          doc.x = margin;
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fillColor(text).fontSize(11).text(title, margin, doc.y, { width: contentWidth });
          doc.moveDown(0.2);
          doc.strokeColor(line).lineWidth(1).moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
          doc.moveDown(0.4);
          doc.fillColor(text);
        };

        const drawKeyValueGrid = (items: Array<{ label: string; value: string }>) => {
          const boxH = 42;
          const gap = 12;
          const cols = 2;
          const boxW = (contentWidth - gap) / cols;
          const rows = Math.ceil(items.length / cols);
          const needed = rows * boxH + (rows - 1) * gap + 6;
          ensureSpace(needed, 'Contribution Report');

          const startY = doc.y;
          items.forEach((item, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const x = margin + col * (boxW + gap);
            const y = startY + row * (boxH + gap);
            doc.roundedRect(x, y, boxW, boxH, 10).fillAndStroke('#ffffff', line);
            doc.font('Helvetica').fillColor(muted).fontSize(9).text(item.label, x + 12, y + 10, { width: boxW - 24 });
            doc.font('Helvetica-Bold').fillColor(text).fontSize(14).text(item.value, x + 12, y + 22, { width: boxW - 24 });
          });

          doc.y = startY + rows * boxH + (rows - 1) * gap + 14;
          doc.x = margin;
          doc.fillColor(text);
        };

        const drawTable = (opts: {
          columns: Array<{ key: string; label: string; width: number; align?: 'left' | 'right' | 'center' }>;
          rows: Array<Record<string, string>>;
          headerTitle: string;
          fontSize?: number;
          rowHeight?: number;
        }) => {
          const colDefs = opts.columns;
          const headerHeight = 20;
          const rowHeight = opts.rowHeight ?? 18;
          const fontSize = opts.fontSize ?? 9;

          const drawHeaderRow = () => {
            ensureSpace(headerHeight + 8, opts.headerTitle);
            const y = doc.y;
            doc.rect(margin, y, contentWidth, headerHeight).fill(tableHeaderBg);
            doc.strokeColor(line).lineWidth(1).rect(margin, y, contentWidth, headerHeight).stroke();
            let x = margin;
            doc.font('Helvetica-Bold').fillColor(text).fontSize(9);
            for (const col of colDefs) {
              doc.text(col.label, x + 8, y + 5, {
                width: col.width - 16,
                align: col.align || 'left',
                ellipsis: true,
              } as any);
              x += col.width;
            }
            doc.y = y + headerHeight;
            doc.x = margin;
          };

          drawHeaderRow();
          doc.font('Helvetica').fillColor(text).fontSize(fontSize);

          for (let i = 0; i < opts.rows.length; i++) {
            const row = opts.rows[i];
            if (doc.y + rowHeight > bottomLimitY()) {
              doc.addPage();
              drawPageHeader(opts.headerTitle, true);
              drawHeaderRow();
            }

            const y = doc.y;
            if (i % 2 === 1) {
              doc.rect(margin, y, contentWidth, rowHeight).fill('#f8fafc');
            }
            doc.strokeColor(line).lineWidth(1).moveTo(margin, y + rowHeight).lineTo(margin + contentWidth, y + rowHeight).stroke();

            let x = margin;
            for (const col of colDefs) {
              doc.text(row[col.key] ?? '', x + 8, y + 3, {
                width: col.width - 16,
                align: col.align || 'left',
                ellipsis: true,
              } as any);
              x += col.width;
            }

            doc.y = y + rowHeight;
            doc.x = margin;
          }

          doc.moveDown(0.8);
          doc.x = margin;
        };

        const drawFooter = (page: number, pageCount: number) => {
          const footerY = pageHeight - margin - 10;
          doc.font('Helvetica').fillColor(muted).fontSize(8);
          doc.text(`Generated: ${new Date().toISOString()}`, margin, footerY, { width: contentWidth, align: 'left' });
          doc.text(`Page ${page} of ${pageCount}`, margin, footerY, { width: contentWidth, align: 'center' });
          doc.text('DigiSav', margin, footerY, { width: contentWidth, align: 'right' });
          doc.fillColor(text);
        };

        const drawPageHeader = (title: string, compact?: boolean) => {
          const barY = compact ? 20 : 24;
          doc.fillColor(accent).rect(margin, barY, contentWidth, 3).fill();
          doc.fillColor(text);
          doc.font('Helvetica-Bold').fontSize(compact ? 13 : 16);
          doc.text(title, margin, barY + 8, { width: contentWidth, align: 'center' });

          doc.font('Helvetica').fillColor(muted).fontSize(9);
          const infoY = barY + 26;
          const left = `Group: ${group.groupName}`;
          const right = `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`;
          doc.text(left, margin, infoY, { width: contentWidth * 0.55 });
          doc.text(right, margin, infoY, { width: contentWidth, align: 'right' });
          doc.y = infoY + 18;
          doc.x = margin;
          doc.fillColor(text);
        };

        drawPageHeader('Contribution Report', true);

        const totalCollected = entries.reduce((sum, e: any) => sum + Number(e.effectiveAmount || 0), 0);

        drawSectionTitle('Summary');
        drawKeyValueGrid([
          { label: 'Total Collected', value: formatMoney(group.currencyCode, totalCollected) },
          { label: 'Entries', value: String(entries.length) },
        ]);

        const memberMap = new Map<
          string,
          {
            memberName: string;
            entries: typeof entries;
            totalPaid: number;
            lastPaymentDate: Date | null;
          }
        >();

        for (const m of groupMembers) {
          memberMap.set(m.id, {
            memberName: m.user.fullName,
            entries: [],
            totalPaid: 0,
            lastPaymentDate: null,
          });
        }

        for (const e of entries) {
          if (!e.memberId) continue;
          const existing = memberMap.get(e.memberId);
          const paymentDate = new Date(e.timestamp);
          const signed = Number((e as any).effectiveAmount || getEntrySignedAmount(e));
          if (!existing) {
            memberMap.set(e.memberId, {
              memberName: e.member?.user?.fullName || 'Unknown',
              entries: [e],
              totalPaid: signed,
              lastPaymentDate: paymentDate,
            });
          } else {
            existing.entries.push(e);
            existing.totalPaid += signed;
            if (!existing.lastPaymentDate || paymentDate > existing.lastPaymentDate) {
              existing.lastPaymentDate = paymentDate;
            }
          }
        }

        const memberSummaries = Array.from(memberMap.values()).sort((a, b) =>
          a.memberName.localeCompare(b.memberName)
        );

        drawSectionTitle('Member Payment Summary');
        drawTable({
          headerTitle: 'Contribution Report',
          columns: [
            { key: 'member', label: 'Member', width: Math.floor(contentWidth * 0.46), align: 'left' },
            { key: 'entries', label: '#', width: Math.floor(contentWidth * 0.10), align: 'center' },
            { key: 'total', label: 'Total', width: Math.floor(contentWidth * 0.22), align: 'right' },
            { key: 'last', label: 'Last', width: contentWidth - Math.floor(contentWidth * 0.46) - Math.floor(contentWidth * 0.10) - Math.floor(contentWidth * 0.22), align: 'left' },
          ],
          rows: memberSummaries.map((m) => ({
            member: m.memberName,
            entries: String(m.entries.length),
            total: formatMoney(group.currencyCode, m.totalPaid),
            last: m.lastPaymentDate ? formatDate(m.lastPaymentDate) : '-',
          })),
        });

        drawSectionTitle('Member Payment Details');

        for (const m of memberSummaries) {
          ensureSpace(40, 'Contribution Report');
          doc.roundedRect(margin, doc.y, contentWidth, 24, 10).fillAndStroke('#ffffff', line);
          doc.font('Helvetica-Bold').fillColor(text).fontSize(10).text(m.memberName, margin + 12, doc.y + 7, { width: contentWidth - 24 });
          doc.y = doc.y + 34;
          doc.x = margin;

          if (m.entries.length === 0) {
            doc.font('Helvetica').fillColor(muted).fontSize(10).text('No payments in selected period', margin, doc.y, { width: contentWidth });
            doc.fillColor(text);
            doc.moveDown(1);
            continue;
          }

          drawTable({
            headerTitle: 'Contribution Report',
            columns: [
              { key: 'when', label: 'Date/Time', width: Math.floor(contentWidth * 0.22) },
              { key: 'type', label: 'Type', width: Math.floor(contentWidth * 0.14) },
              { key: 'amount', label: 'Amount', width: Math.floor(contentWidth * 0.18), align: 'right' },
              { key: 'method', label: 'Method', width: Math.floor(contentWidth * 0.16) },
              { key: 'by', label: 'By', width: contentWidth - Math.floor(contentWidth * 0.22) - Math.floor(contentWidth * 0.14) - Math.floor(contentWidth * 0.18) - Math.floor(contentWidth * 0.16) },
            ],
            rows: (m.entries as any[]).map((e: any) => {
              const effective = Number(e.effectiveAmount || getEntrySignedAmount(e));
              const method = e.transactionType === 'FEE' ? 'FEE' : (e.metadata?.paymentMethod ? String(e.metadata.paymentMethod) : '-');
              return {
                when: `${formatDate(new Date(e.timestamp))} ${new Date(e.timestamp).toISOString().slice(11, 16)}`,
                type: getEntryLabel(e),
                amount: formatMoney(e.currencyCode, effective),
                method,
                by: e.recorder?.fullName || 'System',
              };
            }),
            fontSize: 9,
            rowHeight: 18,
          });
        }

        drawSectionTitle('All Entries');
        drawTable({
          headerTitle: 'Contribution Report',
          columns: [
            { key: 'when', label: 'Date/Time', width: Math.floor(contentWidth * 0.18) },
            { key: 'member', label: 'Member', width: Math.floor(contentWidth * 0.24) },
            { key: 'type', label: 'Type', width: Math.floor(contentWidth * 0.12) },
            { key: 'amount', label: 'Amount', width: Math.floor(contentWidth * 0.14), align: 'right' },
            { key: 'method', label: 'Method', width: Math.floor(contentWidth * 0.12) },
            { key: 'ref', label: 'Ref', width: Math.floor(contentWidth * 0.10) },
            { key: 'by', label: 'By', width: contentWidth - Math.floor(contentWidth * 0.18) - Math.floor(contentWidth * 0.24) - Math.floor(contentWidth * 0.12) - Math.floor(contentWidth * 0.14) - Math.floor(contentWidth * 0.12) - Math.floor(contentWidth * 0.10) },
          ],
          rows: entries.map((e: any) => {
            const effective = Number(e.effectiveAmount || getEntrySignedAmount(e));
            const method = e.transactionType === 'FEE' ? 'FEE' : (e.metadata?.paymentMethod ? String(e.metadata.paymentMethod) : '-');
            return {
              when: `${formatDate(new Date(e.timestamp))} ${new Date(e.timestamp).toISOString().slice(11, 16)}`,
              member: e.member?.user?.fullName || 'System',
              type: getEntryLabel(e),
              amount: formatMoney(e.currencyCode, effective),
              method,
              ref: e.referenceId ? String(e.referenceId).slice(0, 8) : '-',
              by: e.recorder?.fullName || 'System',
            };
          }),
          fontSize: 9,
          rowHeight: 18,
        });

        ensureSpace(30, 'Contribution Report');
        doc.font('Helvetica').fillColor(muted).fontSize(8);
        doc.text(`Verification Hash: ${this.generateReportHash(entries)}`, margin, doc.y, { width: contentWidth });
        doc.fillColor(text);

        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          drawFooter(i - range.start + 1, range.count);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generatePayoutReport(
    groupId: string,
    startDate: Date,
    endDate: Date,
    memberId?: string
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
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
            ...(memberId ? { memberId } : {}),
          },
          include: {
            member: { include: { user: { select: { fullName: true } } } },
          },
        });

        const margin = 40;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const accent = '#4f46e5';
        const text = '#0f172a';
        const muted = '#475569';
        const line = '#e2e8f0';
        const tableHeaderBg = '#f1f5f9';

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const formatMoney = (currency: string, amount: any) => `${currency} ${Number(amount).toFixed(2)}`;

        const drawFooter = () => {
          const footerY = pageHeight - margin + 10;
          doc.font('Helvetica').fillColor(muted).fontSize(8);
          doc.text(`Generated: ${new Date().toISOString()}`, margin, footerY, { width: contentWidth, align: 'left' });
          doc.text('DigiSav', margin, footerY, { width: contentWidth, align: 'right' });
          doc.fillColor(text);
        };

        const drawPageHeader = (title: string) => {
          const barY = 20;
          doc.fillColor(accent).rect(margin, barY, contentWidth, 3).fill();
          doc.fillColor(text);
          doc.font('Helvetica-Bold').fontSize(13);
          doc.text(title, margin, barY + 8, { width: contentWidth, align: 'center' });
          doc.font('Helvetica').fillColor(muted).fontSize(9);
          const infoY = barY + 26;
          doc.text(`Group: ${group.groupName}`, margin, infoY, { width: contentWidth * 0.55 });
          doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, margin, infoY, { width: contentWidth, align: 'right' });
          doc.y = infoY + 14;
          doc.x = margin;
          doc.fillColor(text);
        };

        const ensureSpace = (needed: number, title: string) => {
          if (doc.y + needed <= pageHeight - margin) return;
          doc.addPage();
          drawPageHeader(title);
        };

        const drawSectionTitle = (title: string) => {
          ensureSpace(26, 'Payout Report');
          doc.x = margin;
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fillColor(text).fontSize(11).text(title, margin, doc.y, { width: contentWidth });
          doc.moveDown(0.2);
          doc.strokeColor(line).lineWidth(1).moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
          doc.moveDown(0.4);
          doc.fillColor(text);
        };

        const drawKeyValueRow = (items: Array<{ label: string; value: string }>) => {
          const rowHeight = 36;
          ensureSpace(rowHeight + 12, 'Payout Report');

          const gap = 12;
          const boxW = (contentWidth - gap * (items.length - 1)) / items.length;
          const y = doc.y;

          items.forEach((item, i) => {
            const x = margin + i * (boxW + gap);
            doc.roundedRect(x, y, boxW, rowHeight, 10).fillAndStroke('#ffffff', line);
            doc.font('Helvetica').fillColor(muted).fontSize(9).text(item.label, x + 12, y + 10, { width: boxW - 24 });
            doc.font('Helvetica-Bold').fillColor(text).fontSize(11).text(item.value, x + 12, y + 21, { width: boxW - 24 });
          });

          doc.moveDown(0.2);
          doc.y = y + rowHeight + 16;
          doc.x = margin;
        };

        const drawTable = (opts: {
          columns: Array<{ key: string; label: string; width: number; align?: 'left' | 'right' | 'center' }>;
          rows: Array<Record<string, string>>;
          headerTitle: string;
        }) => {
          const colDefs = opts.columns;
          const headerHeight = 18;
          const rowHeight = 16;

          const drawHeaderRow = () => {
            ensureSpace(headerHeight + 8, opts.headerTitle);
            const y = doc.y;
            doc.rect(margin, y, contentWidth, headerHeight).fill(tableHeaderBg);
            doc.strokeColor(line).lineWidth(1).rect(margin, y, contentWidth, headerHeight).stroke();
            let x = margin;
            doc.font('Helvetica-Bold').fillColor(text).fontSize(9);
            for (const col of colDefs) {
              doc.text(col.label, x + 8, y + 5, {
                width: col.width - 16,
                align: col.align || 'left',
                ellipsis: true,
              } as any);
              x += col.width;
            }
            doc.y = y + headerHeight;
            doc.x = margin;
          };

          drawHeaderRow();
          doc.font('Helvetica').fillColor(text).fontSize(9);

          for (let i = 0; i < opts.rows.length; i++) {
            const row = opts.rows[i];
            ensureSpace(rowHeight + headerHeight + 10, opts.headerTitle);
            if (doc.y + rowHeight > pageHeight - margin) {
              doc.addPage();
              drawPageHeader(opts.headerTitle);
              drawHeaderRow();
            }

            const y = doc.y;
            if (i % 2 === 1) {
              doc.rect(margin, y, contentWidth, rowHeight).fill('#f8fafc');
            }
            doc.strokeColor(line).lineWidth(1).moveTo(margin, y + rowHeight).lineTo(margin + contentWidth, y + rowHeight).stroke();

            let x = margin;
            for (const col of colDefs) {
              doc.text(row[col.key] ?? '', x + 8, y + 3, {
                width: col.width - 16,
                align: col.align || 'left',
                ellipsis: true,
              } as any);
              x += col.width;
            }

            doc.y = y + rowHeight;
            doc.x = margin;
          }

          doc.moveDown(0.8);
          doc.x = margin;
        };

        drawPageHeader('Payout Report');

        const totalPayout = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

        drawSectionTitle('Summary');
        drawKeyValueRow([
          { label: 'Total Paid Out', value: formatMoney(group.currencyCode, totalPayout) },
          { label: 'Payouts', value: String(payouts.length) },
        ]);

        drawSectionTitle('Payout Details');
        drawTable({
          headerTitle: 'Payout Report',
          columns: [
            { key: 'date', label: 'Date', width: Math.floor(contentWidth * 0.22) },
            { key: 'member', label: 'Member', width: Math.floor(contentWidth * 0.46) },
            { key: 'amount', label: 'Amount', width: contentWidth - Math.floor(contentWidth * 0.22) - Math.floor(contentWidth * 0.46), align: 'right' },
          ],
          rows: payouts.map((p) => ({
            date: formatDate(new Date(p.timestamp)),
            member: p.member?.user.fullName || 'System',
            amount: formatMoney(p.currencyCode, p.amount),
          })),
        });

        drawFooter();

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
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) throw new Error('Group not found');

        const inflows = ((await prisma.transaction.findMany({
          where: {
            groupId,
            transactionType: { in: ['CONTRIBUTION', 'FEE', 'ADJUSTMENT'] },
            timestamp: { gte: startDate, lte: endDate },
          },
          select: { transactionType: true, amount: true },
        })) as any[]) || [];

        const payouts = await prisma.transaction.findMany({
          where: { groupId, transactionType: 'PAYOUT', timestamp: { gte: startDate, lte: endDate } }
        });

        const totalIn = inflows.reduce((sum, e: any) => {
          const raw = Number(e.amount || 0);
          return sum + (e.transactionType === 'ADJUSTMENT' ? raw : Math.abs(raw));
        }, 0);
        const totalOut = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = totalIn - totalOut;


        const margin = 40;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const accent = '#4f46e5';
        const text = '#0f172a';
        const muted = '#475569';
        const line = '#e2e8f0';

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const formatMoney = (currency: string, amount: any) => `${currency} ${Number(amount).toFixed(2)}`;

        const drawFooter = () => {
          const footerY = pageHeight - margin + 10;
          doc.font('Helvetica').fillColor(muted).fontSize(8);
          doc.text(`Generated: ${new Date().toISOString()}`, margin, footerY, { width: contentWidth, align: 'left' });
          doc.text('DigiSav', margin, footerY, { width: contentWidth, align: 'right' });
          doc.fillColor(text);
        };

        const drawPageHeader = (title: string) => {
          const barY = 20;
          doc.fillColor(accent).rect(margin, barY, contentWidth, 3).fill();
          doc.fillColor(text);
          doc.font('Helvetica-Bold').fontSize(13);
          doc.text(title, margin, barY + 8, { width: contentWidth, align: 'center' });
          doc.font('Helvetica').fillColor(muted).fontSize(9);
          const infoY = barY + 26;
          doc.text(`Group: ${group.groupName}`, margin, infoY, { width: contentWidth * 0.55 });
          doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, margin, infoY, { width: contentWidth, align: 'right' });
          doc.y = infoY + 18;
          doc.x = margin;
          doc.fillColor(text);
        };

        const drawSectionTitle = (title: string) => {
          doc.x = margin;
          doc.font('Helvetica-Bold').fillColor(text).fontSize(11).text(title, margin, doc.y, { width: contentWidth });
          doc.moveDown(0.2);
          doc.strokeColor(line).lineWidth(1).moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
          doc.moveDown(0.4);
        };

        const drawKeyValueGrid = (items: Array<{ label: string; value: string }>) => {
          const boxH = 36;
          const gap = 12;
          const cols = 2;
          const boxW = (contentWidth - gap) / cols;
          const startY = doc.y;

          items.forEach((item, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const x = margin + col * (boxW + gap);
            const y = startY + row * (boxH + gap);
            doc.roundedRect(x, y, boxW, boxH, 10).fillAndStroke('#ffffff', line);
            doc.font('Helvetica').fillColor(muted).fontSize(9).text(item.label, x + 12, y + 10, { width: boxW - 24 });
            doc.font('Helvetica-Bold').fillColor(text).fontSize(11).text(item.value, x + 12, y + 21, { width: boxW - 24 });
          });

          const rows = Math.ceil(items.length / cols);
          doc.y = startY + rows * (boxH + gap);
          doc.x = margin;
          doc.fillColor(text);
        };

        drawPageHeader('Audit Summary');

        drawSectionTitle('Financial Snapshot');
        drawKeyValueGrid([
          { label: 'Contributions In', value: formatMoney(group.currencyCode, totalIn) },
          { label: 'Payouts Out', value: formatMoney(group.currencyCode, totalOut) },
          { label: 'Net Position', value: formatMoney(group.currencyCode, balance) },
          { label: 'Period Days', value: String(Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))) },
        ]);

        doc.moveDown(0.2);
        doc.font('Helvetica').fillColor(muted).fontSize(9).text(
          'This is an automated audit summary generated by DigiSav.',
          margin,
          doc.y,
          { width: contentWidth }
        );

        drawFooter();

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
    endDate: Date,
    memberId?: string
  ): Promise<string> {
    if (type === 'contributions') {
      const group = await prisma.group.findUnique({ where: { id: groupId }, select: { currencyCode: true } });
      const members = await prisma.member.findMany({
        where: {
          groupId,
          status: 'ACTIVE',
          ...(memberId ? { id: memberId } : {}),
        },
        include: { user: { select: { fullName: true } } },
      });
      const baseEntries = ((await prisma.transaction.findMany({
        where: {
          groupId,
          transactionType: { in: ['CONTRIBUTION', 'FEE'] },
          timestamp: { gte: startDate, lte: endDate },
          ...(memberId ? { memberId } : {}),
        },
        include: {
          member: { include: { user: { select: { fullName: true } } } },
          recorder: { select: { fullName: true } },
        },
        orderBy: [{ memberId: 'asc' }, { timestamp: 'asc' }],
      })) as any[]) || [];

      const adjustments = ((await prisma.transaction.findMany({
        where: {
          groupId,
          transactionType: 'ADJUSTMENT',
          timestamp: { lte: endDate },
          ...(memberId ? { memberId } : {}),
        },
        select: { amount: true, referenceId: true, metadata: true },
      })) as any[]) || [];

      const getBaseKey = (e: any) => e?.metadata?.contributionId || e?.metadata?.depositId || e?.referenceId || e?.id;
      const getAdjustmentKey = (a: any) => a?.metadata?.contributionId || a?.metadata?.depositId || a?.referenceId;
      const getSigned = (e: any) => Math.abs(Number(e.amount || 0));

      const getType = (e: any) => {
        if (e.transactionType === 'ADJUSTMENT') return 'CORRECTION';
        if (e.transactionType === 'FEE') return 'FEE';
        return 'CONTRIBUTION';
      };

      const header = 'Date,Member,Type,Amount,Currency,Method,Reference,Recorded By\n';
      const itemsByKey = new Map<string, { entry: any; effectiveAmount: number }>();
      for (const e of baseEntries) {
        const key = String(getBaseKey(e));
        itemsByKey.set(key, { entry: e, effectiveAmount: getSigned(e) });
      }

      for (const a of adjustments) {
        const key = getAdjustmentKey(a);
        if (!key) continue;
        const item = itemsByKey.get(String(key));
        if (!item) continue;
        item.effectiveAmount += Number(a.amount || 0);
      }

      const entries = Array.from(itemsByKey.values())
        .map((x) => ({ ...x.entry, effectiveAmount: x.effectiveAmount }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const rows = entries
        .map((e: any) => {
          const method = e.transactionType === 'FEE' ? 'FEE' : (e.metadata?.paymentMethod || '');
          const memberName = e.member?.user?.fullName || 'System';
          const recorder = e.recorder?.fullName || '';
          return `${e.timestamp.toISOString().split('T')[0]},"${memberName}",${getType(e)},${Number(e.effectiveAmount || 0).toFixed(2)},${e.currencyCode},${method},"${e.referenceId || ''}","${recorder}"`;
        })
        .join('\n');

      const memberAgg = new Map<
        string,
        { memberName: string; entries: number; netTotal: number; lastEntryDate: Date | null }
      >();

      for (const m of members) {
        memberAgg.set(m.id, {
          memberName: m.user.fullName,
          entries: 0,
          netTotal: 0,
          lastEntryDate: null,
        });
      }

      for (const e of entries) {
        if (!e.memberId) continue;
        const existing = memberAgg.get(e.memberId);
        const ts = new Date(e.timestamp);
        const signed = Number(e.effectiveAmount || getSigned(e));
        if (!existing) {
          memberAgg.set(e.memberId, {
            memberName: e.member?.user?.fullName || 'Unknown',
            entries: 1,
            netTotal: signed,
            lastEntryDate: ts,
          });
        } else {
          existing.entries += 1;
          existing.netTotal += signed;
          if (!existing.lastEntryDate || ts > existing.lastEntryDate) {
            existing.lastEntryDate = ts;
          }
        }
      }

      const memberHeader = '\n\nMember Summary\nMember,Entries,Net Total,Currency,Last Entry\n';
      const memberRows = Array.from(memberAgg.values())
        .sort((a, b) => a.memberName.localeCompare(b.memberName))
        .map((m) =>
          `"${m.memberName}",${m.entries},${m.netTotal.toFixed(2)},${group?.currencyCode || ''},${m.lastEntryDate ? m.lastEntryDate.toISOString().split('T')[0] : ''}`
        )
        .join('\n');

      return header + rows + memberHeader + memberRows;
    } else if (type === 'payouts') {
      const payouts = await prisma.transaction.findMany({
        where: {
          groupId,
          transactionType: 'PAYOUT',
          timestamp: { gte: startDate, lte: endDate },
          ...(memberId ? { memberId } : {}),
        },
        include: { member: { include: { user: { select: { fullName: true } } } } }
      });
      const header = 'Date,Member,Amount,Reference\n';
      const rows = payouts.map(p => 
        `${p.timestamp.toISOString().split('T')[0]},"${p.member?.user.fullName || 'System'}",${p.amount},"${p.referenceId || ''}"`
      ).join('\n');
      return header + rows;
    } else {
      const inflows = ((await prisma.transaction.findMany({
        where: {
          groupId,
          transactionType: { in: ['CONTRIBUTION', 'FEE', 'ADJUSTMENT'] },
          timestamp: { gte: startDate, lte: endDate },
        },
        select: { transactionType: true, amount: true },
      })) as any[]) || [];
      const payouts = await prisma.transaction.findMany({
        where: { groupId, transactionType: 'PAYOUT', timestamp: { gte: startDate, lte: endDate } }
      });
      const totalIn = inflows.reduce((sum, e: any) => {
        const raw = Number(e.amount || 0);
        return sum + (e.transactionType === 'ADJUSTMENT' ? raw : Math.abs(raw));
      }, 0);
      const totalOut = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
      
      return `DigiSav Audit Summary\nPeriod,${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\nTotal Contributions,${totalIn}\nTotal Payouts,${totalOut}\nBalance,${totalIn - totalOut}\n`;
    }
  }

  private generateReportHash(data: any): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
