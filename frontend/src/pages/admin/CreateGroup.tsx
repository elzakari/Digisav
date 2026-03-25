import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';

const createGroupSchema = z.object({
  groupName: z.string().min(3, 'Name must be at least 3 characters'),
  contributionAmount: z.number().positive('Amount must be positive'),
  currencyCode: z.string().length(3, 'Invalid currency code'),
  paymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  customFrequencyDays: z.number().optional(),
  maxMembers: z.number().int().min(3).max(100),
  payoutOrderType: z.enum(['MANUAL', 'RANDOM', 'ROTATION']),
  startDate: z.string().optional(),
  gracePeriodDays: z.number().int().min(0).max(30),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

export function CreateGroupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      groupName: '',
      contributionAmount: 0,
      currencyCode: 'KES',
      paymentFrequency: 'MONTHLY',
      maxMembers: 10,
      payoutOrderType: 'ROTATION',
      gracePeriodDays: 3,
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: groupService.createGroup,
    onSuccess: () => {
      navigate('/admin/dashboard');
    },
  });

  const onSubmit: SubmitHandler<CreateGroupForm> = (data) => {
    createGroupMutation.mutate(data);
  };

  const paymentFrequency = watch('paymentFrequency');

  return (
    <div className="w-full max-w-2xl animate-fade-in-up">
      <div className="glass-card p-8 md:p-10 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin.create_group_title')}</h1>
            <p className="text-slate-400">{t('admin.create_group_subtitle')}</p>
          </div>
          <Link to="/admin/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            {t('common.cancel')}
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300 ml-1">
                {t('admin.group_name')}
              </label>
              <input
                {...register('groupName')}
                type="text"
                className="w-full glass-input"
                placeholder={t('admin.group_name') + '...'}
              />
              {errors.groupName && (
                <p className="text-rose-400 text-xs ml-1">{errors.groupName.message}</p>
              )}
            </div>

            {/* Contribution Amount & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  {t('admin.contribution_amount')}
                </label>
                <input
                  {...register('contributionAmount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full glass-input"
                  placeholder="1000"
                />
                {errors.contributionAmount && (
                  <p className="text-rose-400 text-xs ml-1">
                    {errors.contributionAmount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  {t('admin.currency')}
                </label>
                <input
                  {...register('currencyCode')}
                  type="text"
                  maxLength={3}
                  className="w-full glass-input"
                  placeholder="KES"
                />
                {errors.currencyCode && (
                  <p className="text-rose-400 text-xs ml-1">
                    {errors.currencyCode.message}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  {t('admin.payment_frequency')}
                </label>
                <select
                  {...register('paymentFrequency')}
                  className="w-full glass-input appearance-none"
                >
                  <option value="DAILY">{t('frequency.daily')}</option>
                  <option value="WEEKLY">{t('frequency.weekly')}</option>
                  <option value="BIWEEKLY">{t('frequency.biweekly')}</option>
                  <option value="MONTHLY">{t('frequency.monthly')}</option>
                  <option value="CUSTOM">{t('frequency.custom')}</option>
                </select>
                {paymentFrequency === 'CUSTOM' && (
                  <div className="mt-3">
                    <input
                      {...register('customFrequencyDays', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full glass-input"
                      placeholder={t('admin.interval_days')}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  {t('admin.max_members')}
                </label>
                <input
                  {...register('maxMembers', { valueAsNumber: true })}
                  type="number"
                  min="3"
                  max="100"
                  className="w-full glass-input"
                />
                {errors.maxMembers && (
                  <p className="text-rose-400 text-xs ml-1">{errors.maxMembers.message}</p>
                )}
              </div>
            </div>

            {/* Payout Order & Start Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  {t('admin.payout_order_strategy')}
                </label>
                <select
                  {...register('payoutOrderType')}
                  className="w-full glass-input appearance-none"
                >
                  <option value="MANUAL">{t('admin.payout_manual')}</option>
                  <option value="RANDOM">{t('admin.payout_random')}</option>
                  <option value="ROTATION">{t('admin.payout_rotation')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  {t('admin.start_date')}
                </label>
                <input
                  {...register('startDate')}
                  type="date"
                  className="w-full glass-input"
                />
              </div>
            </div>

            {/* Grace Period */}
            <div className="space-y-1.5 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <label className="block text-sm font-bold uppercase tracking-widest text-indigo-400 mb-1 ml-1">
                {t('admin.grace_period')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  {...register('gracePeriodDays', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="30"
                  className="w-24 glass-input text-center"
                />
                <span className="text-sm text-slate-500 font-medium">
                  {t('admin.grace_period_desc')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              type="submit"
              disabled={createGroupMutation.isPending}
              className="w-full glass-button py-4 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createGroupMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('admin.finalizing')}
                </>
              ) : (
                t('admin.create_group_btn')
              )}
            </button>

            {createGroupMutation.isError && (
              <p className="text-rose-400 text-sm text-center mt-4">
                {(createGroupMutation.error as any).message || t('admin.failed_create_group') || 'Failed to create group. Please check your data.'}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
