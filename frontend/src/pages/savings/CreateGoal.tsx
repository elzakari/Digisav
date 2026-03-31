import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { savingsService } from '@/services/savings.service';
import { groupService } from '@/services/group.service';
import { authService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';

const createGoalSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  targetAmount: z.number().positive('Amount must be positive'),
  category: z.enum([
    'EMERGENCY_FUND',
    'EDUCATION',
    'HOUSING',
    'BUSINESS',
    'TRAVEL',
    'ELECTRONICS',
    'MEDICAL',
    'WEDDING',
    'OTHER'
  ]),
  targetDate: z.string().optional(),
  isPublic: z.boolean(),
  groupId: z.string().uuid('Select a Micro‑Savings group'),
});

type CreateGoalForm = z.infer<typeof createGoalSchema>;

export function CreateGoalPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const { data: groups, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupService.getMyGroups(),
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  });

  const microGroups = React.useMemo(() => {
    return (groups || []).filter((g: any) => g.groupType === 'MICRO_SAVINGS' && g.status === 'ACTIVE');
  }, [groups]);

  const createGoalMutation = useMutation({
    mutationFn: savingsService.createGoal,
    onSuccess: () => {
      toast.success('Goal created');
      navigate('/savings');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
      toast.error(String(msg || 'Could not create goal'));
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateGoalForm>({
    resolver: zodResolver(createGoalSchema) as any,
    defaultValues: {
      name: '',
      targetAmount: 1000,
      category: 'EMERGENCY_FUND',
      isPublic: false,
      groupId: '' as any,
    },
  });

  // Automatically select the group if there's only one
  React.useEffect(() => {
    if (microGroups.length === 1) {
      setValue('groupId', microGroups[0].id);
    }
  }, [microGroups, setValue]);

  const hasMicroGroups = microGroups.length > 0;
  const selectedGroupId = watch('groupId');
  const isPublic = watch('isPublic');
  const selectedGroup = microGroups.find((g: any) => g.id === selectedGroupId);
  const currencyCode = selectedGroup?.currencyCode || user?.defaultCurrency || 'KES';

  React.useEffect(() => {
    if (isPublic && !hasMicroGroups) {
      setValue('isPublic', false);
    }
  }, [hasMicroGroups, isPublic, setValue]);

  if (isGroupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-indigo-400 font-medium">Synced groups...</div>
      </div>
    );
  }

  const onSubmit: SubmitHandler<CreateGoalForm> = (data) => {
    const selectedGroup = microGroups.find((g: any) => g.id === data.groupId);
    const currencyCode = selectedGroup?.currencyCode || user?.defaultCurrency || 'KES';
    createGoalMutation.mutate({
      ...data,
      groupId: data.groupId,
      currencyCode,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up py-10">
      <div className="glass-card p-8 md:p-10 space-y-10 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white uppercase">New Savings Goal</h1>
            <p className="text-slate-400">Set a target and start your journey to financial freedom.</p>
          </div>
          <Link to="/savings" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
          {!hasMicroGroups ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
              <div className="text-sm font-bold">Micro‑Savings group required</div>
              <div className="mt-1 text-xs text-amber-100/80">
                You must be an active member of a Micro‑Savings group before creating goals.
              </div>
              <div className="mt-3">
                <Link
                  to="/join"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white"
                >
                  Join a group
                </Link>
              </div>
            </div>
          ) : null}

          <div className="space-y-6">
            {/* Goal Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                Goal Name
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full glass-input"
                placeholder="e.g. New Business Fund"
              />
              {errors.name && (
                <p className="text-rose-400 text-xs ml-1 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Target Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Target Amount ({currencyCode})
                </label>
                <input
                  {...register('targetAmount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full glass-input"
                  placeholder="50,000"
                />
                {errors.targetAmount && (
                  <p className="text-rose-400 text-xs ml-1 font-medium">{errors.targetAmount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Target Date (Optional)
                </label>
                <input
                  {...register('targetDate')}
                  type="date"
                  className="w-full glass-input"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                Category
              </label>
              <select
                {...register('category')}
                className="w-full glass-input appearance-none bg-[#1e1b4b]"
              >
                <option value="EMERGENCY_FUND">Emergency Fund</option>
                <option value="EDUCATION">Education</option>
                <option value="HOUSING">Housing</option>
                <option value="BUSINESS">Business</option>
                <option value="TRAVEL">Travel</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="MEDICAL">Medical</option>
                <option value="WEDDING">Wedding</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.category && (
                <p className="text-rose-400 text-xs ml-1 font-medium">{errors.category.message}</p>
              )}
            </div>

            {/* Group Selection */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                Micro‑Savings Group
              </label>
              <select
                {...register('groupId')}
                className="w-full glass-input appearance-none bg-[#1e1b4b]"
                disabled={!hasMicroGroups || microGroups.length === 1}
              >
                <option value="">Select a Micro‑Savings group</option>
                {microGroups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.groupName}</option>
                ))}
              </select>
              {errors.groupId && (
                <p className="text-rose-400 text-xs ml-1 font-medium">{errors.groupId.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full glass-input resize-none"
                placeholder="What are you saving for specifically?"
              />
            </div>

            {/* Public Option */}
            <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <input
                {...register('isPublic')}
                type="checkbox"
                id="isPublic"
                disabled={!hasMicroGroups}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-slate-300 cursor-pointer">
                Make goal visible to group members (Shared Progress)
              </label>
            </div>
            {!hasMicroGroups ? (
              <div className="text-xs text-slate-500">
                Join a group to enable shared goals.
              </div>
            ) : null}
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              type="submit"
              disabled={!hasMicroGroups || createGoalMutation.isPending}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {createGoalMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Launch Savings Goal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
