import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import React from 'react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      await authService.register(data);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="glass-card p-8 md:p-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold tracking-tight">Create Account</h2>
          <p className="text-slate-400">Join DigiSav and start your savings journey</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300 ml-1">Full Name</label>
            <input
              {...register('fullName', { required: 'Full Name is required' })}
              className="w-full glass-input"
              placeholder="John Doe"
              autoComplete="name"
            />
            {errors.fullName && (
              <span className="text-red-400 text-xs ml-1">{errors.fullName.message as string}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300 ml-1">Email Address</label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="w-full glass-input"
              placeholder="john@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <span className="text-red-400 text-xs ml-1">{errors.email.message as string}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300 ml-1">Phone Number</label>
            <input
              {...register('phoneNumber', { required: 'Phone Number is required' })}
              className="w-full glass-input"
              placeholder="+254 700 000000"
              autoComplete="tel"
            />
            {errors.phoneNumber && (
              <span className="text-red-400 text-xs ml-1">{errors.phoneNumber.message as string}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300 ml-1">Password</label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="w-full glass-input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && (
              <span className="text-red-400 text-xs ml-1">{errors.password.message as string}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Register Now'}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-white hover:text-indigo-300 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
