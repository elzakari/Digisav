import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  isLoading?: boolean;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  isLoading = false
}: ConfirmActionModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const styles = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-400',
      buttonBg: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20',
      border: 'border-rose-500/20',
      glow: 'bg-rose-500/10'
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      buttonBg: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20',
      border: 'border-amber-500/20',
      glow: 'bg-amber-500/10'
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      buttonBg: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20',
      border: 'border-emerald-500/20',
      glow: 'bg-emerald-500/10'
    },
    info: {
      icon: AlertCircle,
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-400',
      buttonBg: 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20',
      border: 'border-indigo-500/20',
      glow: 'bg-indigo-500/10'
    }
  };

  const currentStyle = styles[variant];
  const Icon = currentStyle.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative w-full max-w-md bg-slate-900/90 border ${currentStyle.border} rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 backdrop-blur-xl group`}>
        {/* Glow Effect */}
        <div className={`absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 ${currentStyle.glow} rounded-full blur-3xl group-hover:bg-opacity-20 transition-all duration-700`} />
        
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div className={`p-3 ${currentStyle.iconBg} rounded-2xl flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${currentStyle.iconColor}`} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3.5 rounded-2xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700/50 disabled:opacity-50"
            >
              {cancelLabel || t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-[1.5] ${currentStyle.buttonBg} px-6 py-3.5 rounded-2xl text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.processing', 'Processing...')}
                </>
              ) : (
                confirmLabel || t('common.confirm', 'Confirm')
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
