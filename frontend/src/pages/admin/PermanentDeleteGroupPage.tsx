import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { groupService } from '@/services/group.service';
import { authService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import { publishAppEvent } from '@/lib/appEvents';

export function PermanentDeleteGroupPage() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = authService.getCurrentUser();
  const [confirmText, setConfirmText] = useState('');

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupById(groupId!),
    enabled: !!groupId,
  });

  const canUse = user?.role === 'ADMIN' || user?.role === 'SYS_ADMIN';

  const confirmed = useMemo(() => {
    return confirmText === group?.groupName;
  }, [confirmText, group?.groupName]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error('Missing groupId');
      return groupService.permanentlyDeleteGroup(groupId, confirmText);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      publishAppEvent({ type: 'groups_changed', groupId });
      toast.success('Group deleted');
      navigate('/admin/dashboard', { replace: true });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
      toast.error(msg || 'Failed to delete group');
    },
  });

  if (!canUse) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-lg font-black text-white">{String(t('common.forbidden', { defaultValue: 'Forbidden' } as any))}</div>
        <div className="mt-2 text-sm text-slate-400">{String(t('common.insufficient_permissions', { defaultValue: 'Insufficient permissions.' } as any))}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-indigo-400 font-medium text-lg">{String(t('common.loading', { defaultValue: 'Loading...' } as any))}</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-lg font-black text-white">Group not found</div>
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard', { replace: true })}
          className="mt-4 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-200 hover:bg-white/[0.05]"
        >
          Back
        </button>
      </div>
    );
  }

  const isClosed = group.status === 'CLOSED';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="glass-card p-6 border border-rose-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-300 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white tracking-tight">Permanently delete group</div>
            <div className="mt-1 text-sm text-slate-400">
              This is irreversible. The group will be removed from UI and access will be revoked.
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Impact summary</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Members</div>
              <div className="mt-1 text-lg font-black text-white tabular-nums">{group._count?.members || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Contributions</div>
              <div className="mt-1 text-lg font-black text-white tabular-nums">{group._count?.contributions || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Status</div>
              <div className="mt-1 text-lg font-black text-white tabular-nums">{group.status}</div>
            </div>
          </div>
        </div>

        {!isClosed ? (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
            Close the group first, then come back here for permanent deletion.
          </div>
        ) : null}

        <div className="mt-6 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Type <span className="text-slate-200">{group.groupName}</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full bg-white/5 border border-rose-500/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700 font-mono"
            placeholder="Group name"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-slate-200 hover:bg-white/[0.05] text-xs font-black uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!isClosed || !confirmed || mutation.isPending}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {mutation.isPending ? String(t('common.processing', { defaultValue: 'Processing...' } as any)) : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
