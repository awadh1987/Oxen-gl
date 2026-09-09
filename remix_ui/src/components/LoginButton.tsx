import React, { useState } from 'react';
import { AlertCircle, Loader2, LogIn, Mail, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { UserRole } from '../types';

interface LoginButtonProps {
  onSuccess?: (user?: any) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline';
  text?: string;
  showIcon?: boolean;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  onSuccess,
  className = '',
  variant = 'primary',
  text,
  showIcon = true,
}) => {
  const { language, setCurrentUser } = useApp();
  const isAr = language === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNativeLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      await apiService.login(email, password);
      const profile = await apiService.getCurrentUser();
      if (!profile) {
        throw new Error(isAr ? 'تعذر تحميل ملف المستخدم بعد تسجيل الدخول.' : 'Could not load the user profile after sign-in.');
      }

      const verifiedUser = {
        id: profile.id || profile.email,
        username: profile.username || profile.email?.split('@')[0] || 'user',
        fullName: profile.fullName || profile.fullNameAr || profile.email,
        fullNameAr: profile.fullNameAr || profile.fullName || profile.email,
        email: profile.email,
        role: (profile.role || 'Admin') as UserRole,
        status: profile.status || 'Active',
        tenantId: profile.tenantId || 'tenant-default-001',
        tenantRole: profile.tenantRole || 'Admin',
        isPlatformSuperAdmin: profile.isPlatformSuperAdmin ?? profile.role === 'Admin',
      };

      setCurrentUser(verifiedUser);
      onSuccess?.(verifiedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      setErrorMessage(message || (isAr ? 'فشل تسجيل الدخول. تحقق من بياناتك.' : 'Sign-in failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const defaultStyles = {
    primary: 'rounded-2xl border border-orange-500/40 bg-neutral-950/80 p-4 shadow-xl shadow-black/30',
    secondary: 'rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-xl shadow-black/20',
    dark: 'rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-xl shadow-black/30',
    outline: 'rounded-2xl border border-slate-300 bg-white p-4 shadow-sm',
  };

  const inputClass = variant === 'outline'
    ? 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
    : 'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20';

  return (
    <form onSubmit={handleNativeLogin} className={className || defaultStyles[variant]}>
      <div className="space-y-3">
        <label className="block text-xs font-bold text-neutral-300">
          {isAr ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <div className="relative">
          <Mail className="absolute start-3 top-3 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${inputClass} ps-9`}
            placeholder="name@example.com"
          />
        </div>

        <label className="block text-xs font-bold text-neutral-300">
          {isAr ? 'كلمة المرور' : 'Password'}
        </label>
        <div className="relative">
          <Lock className="absolute start-3 top-3 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} ps-9`}
            placeholder={isAr ? 'كلمة المرور' : 'Password'}
          />
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-semibold text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange-600/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showIcon ? (
            <LogIn className="h-4 w-4" />
          ) : null}
          <span>{loading ? (isAr ? 'جاري التحقق...' : 'Signing in...') : text || (isAr ? 'تسجيل الدخول' : 'Sign in')}</span>
        </button>
      </div>
    </form>
  );
};

export default LoginButton;
