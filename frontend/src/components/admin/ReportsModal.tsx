import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Download, 
  Calendar, 
  FileType, 
  LayoutDashboard, 
  ArrowRightLeft, 
  ShieldCheck,
  FileText,
  Table as TableIcon,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { contributionService } from '@/services/contribution.service';
import { groupService } from '@/services/group.service';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function ReportsModal({ isOpen, onClose, groupId }: ReportsModalProps) {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<'contributions' | 'payouts' | 'audit'>('contributions');
  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'custom'>('this_month');
  const [formatType, setFormatType] = useState<'pdf' | 'csv'>('pdf');
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [memberId, setMemberId] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupService.getGroupMembers(groupId),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (reportType === 'audit') {
      setMemberId('');
    }
    setShareLink('');
  }, [isOpen, reportType, dateRange, formatType, memberId]);

  const derivedPeriod = useMemo(() => {
    if (dateRange === 'custom') {
      return {
        startIso: new Date(startDate).toISOString(),
        endIso: new Date(endDate).toISOString(),
        label: `${startDate} → ${endDate}`,
      };
    }

    const now = new Date();
    if (dateRange === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        label: `${format(start, 'yyyy-MM-dd')} → ${format(end, 'yyyy-MM-dd')}`,
      };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = now;
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: `${format(start, 'yyyy-MM-dd')} → ${format(end, 'yyyy-MM-dd')}`,
    };
  }, [dateRange, startDate, endDate]);

  const selectedMemberName = useMemo(() => {
    if (!memberId) return null;
    return members?.find((m: any) => m.id === memberId)?.user?.fullName || null;
  }, [members, memberId]);

  const canScopeToMember = reportType === 'contributions' || reportType === 'payouts';

  if (!isOpen) return null;

  const sanitizeFilePart = (value: string) => {
    return value
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
  };

  const handleGenerate = async () => {
    if (dateRange === 'custom' && new Date(startDate) > new Date(endDate)) {
      toast.error(t('reports.invalid_date_range', 'Start date must be before end date'));
      return;
    }

    setIsGeneratingDownload(true);
    try {
      const blob = await contributionService.downloadReport(
        groupId,
        derivedPeriod.startIso,
        derivedPeriod.endIso,
        reportType,
        formatType,
        memberId || undefined
      );

      const memberPart = selectedMemberName ? `-${sanitizeFilePart(selectedMemberName)}` : memberId ? `-${sanitizeFilePart(memberId)}` : '';
      const datePart = sanitizeFilePart(derivedPeriod.label.replace(' → ', '_to_'));
      const fileName = `${reportType}${memberPart}-report-${datePart}.${formatType}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t('reports.download_ready', 'Report downloaded'));
    } catch (error) {
      console.error('Failed to generate report', error);
      toast.error(t('common.report_error') || 'Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingDownload(false);
    }
  };
  
  const handleWhatsAppShare = async () => {
    if (dateRange === 'custom' && new Date(startDate) > new Date(endDate)) {
      toast.error(t('reports.invalid_date_range', 'Start date must be before end date'));
      return;
    }

    setIsGeneratingShare(true);
    try {
      const shareLink = await contributionService.getShareLink(groupId, {
        startDate: derivedPeriod.startIso,
        endDate: derivedPeriod.endIso,
        type: reportType,
        format: formatType,
        memberId: memberId || undefined,
      });

      const reportName = t(`reports.${reportType}`);
      const memberName = selectedMemberName;
      const text = encodeURIComponent(
        `Hi, please find the ${memberName ? memberName + " " : ""}${reportName} report here: ${shareLink}\n\nGenerated via Germinos.`
      );

      setShareLink(shareLink);
      toast.success(t('reports.share_link_ready', 'Share link created'));
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch (error) {
      console.error('Failed to share report', error);
      toast.error(t('common.report_error') || 'Failed to share report. Please try again.');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success(t('reports.link_copied', 'Link copied'));
    } catch {
      toast.error(t('reports.copy_failed', 'Could not copy link'));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Content */}
      <div className="glass-card w-full max-w-xl p-6 relative border border-white/10 shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
        
        <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
        >
            <X className="w-5 h-5" />
        </button>

        <div className="mb-6 flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex-shrink-0">
                <Download className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white tracking-tight">{t('dashboard.export_report')}</h2>
                <p className="text-slate-400 text-xs mt-0.5">{t('reports.export_config')}</p>
            </div>
        </div>

        <div className="space-y-6">
          {/* Report Type Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <LayoutDashboard className="w-3 h-3" />
              {t('reports.type')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'contributions', label: t('reports.contributions'), icon: FileText, color: 'text-emerald-400' },
                { id: 'payouts', label: t('reports.payouts'), icon: ArrowRightLeft, color: 'text-blue-400' },
                { id: 'audit', label: t('reports.audit_summary'), icon: ShieldCheck, color: 'text-purple-400' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id as any)}
                  className={`flex flex-col items-center gap-2 p-3 text-center rounded-xl border transition-all duration-300 group ${
                    reportType === type.id 
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/50' 
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors duration-300 ${
                    reportType === type.id ? 'bg-indigo-500/20' : 'bg-slate-800'
                  }`}>
                    <type.icon className={`w-4 h-4 ${type.color}`} />
                  </div>
                  <p className={`text-xs font-bold transition-colors duration-300 ${
                    reportType === type.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                  }`}>
                    {type.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Range Selector */}
            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Calendar className="w-3 h-3" />
                {t('reports.period')}
              </label>
              <div className="relative group/select">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none transition-all group-hover/select:border-white/20"
                  >
                    <option value="this_month" className="bg-slate-900">{t('reports.this_month')}</option>
                    <option value="last_month" className="bg-slate-900">{t('reports.last_month')}</option>
                    <option value="custom" className="bg-slate-900">{t('reports.custom_range')}</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  </div>
              </div>
            </div>

            {/* Export Format Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <FileType className="w-3 h-3" />
                {t('reports.format')}
              </label>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setFormatType('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    formatType === 'pdf' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => setFormatType('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    formatType === 'csv' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>
            </div>
          </div>

          {canScopeToMember && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                {t('reports.scope', 'Scope')}
              </label>
              <div className="relative group/select">
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none transition-all group-hover/select:border-white/20"
                  disabled={isMembersLoading}
                >
                  <option value="" className="bg-slate-900">
                    {t('reports.all_members', 'All members')}
                  </option>
                  {(members || []).map((m: any) => (
                    <option key={m.id} value={m.id} className="bg-slate-900">
                      {m.user?.fullName || m.id}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 ml-1">
                {isMembersLoading ? t('common.loading', 'Loading...') : selectedMemberName ? `${t('reports.for_member', 'For')} ${selectedMemberName}` : t('reports.for_group', 'For the whole group')}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white">{t('reports.summary', 'Summary')}</div>
              <div className="text-[10px] text-slate-400">
                {t('reports.period', 'Time Period')}: {derivedPeriod.label}
              </div>
              <div className="text-[10px] text-slate-400">
                {t('reports.format', 'Format')}: {formatType.toUpperCase()} · {t(`reports.${reportType}`)}
              </div>
            </div>
            {shareLink ? (
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-bold text-slate-200"
              >
                {t('reports.copy_link', 'Copy link')}
              </button>
            ) : null}
          </div>

          {/* Custom Date Selection */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('common.start_date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('common.end_date')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 text-sm font-bold hover:bg-white/10 hover:text-white transition-all border border-white/5 text-center"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGeneratingDownload || isGeneratingShare}
              className="flex-1 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 px-4 py-3 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all text-center flex items-center justify-center gap-2 group"
            >
              {isGeneratingDownload ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  {t('reports.generate')}
                </>
              )}
            </button>
          </div>
          
          <button
            onClick={handleWhatsAppShare}
            disabled={isGeneratingDownload || isGeneratingShare}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] text-sm font-bold border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all group"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {isGeneratingShare ? t('common.processing') : t('reports.share_whatsapp')}
          </button>
        </div>
      </div>
    </div>
  );
}
