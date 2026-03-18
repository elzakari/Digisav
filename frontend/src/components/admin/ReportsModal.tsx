import { useState } from 'react';
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
import { format } from 'date-fns';

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
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let finalStart = startDate;
      let finalEnd = endDate;

      if (dateRange === 'this_month') {
        const now = new Date();
        finalStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        finalEnd = now.toISOString();
      } else if (dateRange === 'last_month') {
        const now = new Date();
        finalStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        finalEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      } else {
        finalStart = new Date(startDate).toISOString();
        finalEnd = new Date(endDate).toISOString();
      }

      const blob = await contributionService.downloadReport(
        groupId,
        finalStart,
        finalEnd,
        reportType,
        formatType
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${groupId}.${formatType}`;
      a.click();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error('Failed to generate report', error);
      alert(t('common.report_error') || 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleWhatsAppShare = async () => {
    setIsGenerating(true);
    try {
      let finalStart = startDate;
      let finalEnd = endDate;

      if (dateRange === 'this_month') {
        const now = new Date();
        finalStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        finalEnd = now.toISOString();
      } else if (dateRange === 'last_month') {
        const now = new Date();
        finalStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        finalEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      } else {
        finalStart = new Date(startDate).toISOString();
        finalEnd = new Date(endDate).toISOString();
      }

      const shareLink = await contributionService.getShareLink(groupId, {
        startDate: finalStart,
        endDate: finalEnd,
        type: reportType,
        format: formatType
      });

      const reportName = t(`reports.${reportType}`);
      const text = encodeURIComponent(
        `Hi, please find the ${reportName} report for our group here: ${shareLink}\n\nGenerated via DigiSav.`
      );
      
      window.open(`https://wa.me/?text=${text}`, '_blank');
      onClose();
    } catch (error) {
      console.error('Failed to share report', error);
      alert(t('common.report_error') || 'Failed to share report. Please try again.');
    } finally {
      setIsGenerating(false);
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
              disabled={isGenerating}
              className="flex-1 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 px-4 py-3 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all text-center flex items-center justify-center gap-2 group"
            >
              {isGenerating ? (
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
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] text-sm font-bold border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all group"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {t('reports.share_whatsapp')}
          </button>
        </div>
      </div>
    </div>
  );
}
