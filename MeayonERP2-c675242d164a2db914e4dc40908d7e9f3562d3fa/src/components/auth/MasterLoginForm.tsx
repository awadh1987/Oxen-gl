import React, { useState } from 'react';
import { Crown, KeyRound, Loader2, Lock, Mail, Phone, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MasterLoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSwitchToTenant?: () => void;
}

export const MasterLoginForm: React.FC<MasterLoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onSwitchToTenant,
}) => {
  const { language, loginMaster } = useApp();
  const isAr = language === 'ar';

  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentity = identity.trim();
    if (!cleanIdentity) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني أو رقم الجوال' : 'Please enter your email or mobile number');
      return;
    }
    if (!password) {
      setError(isAr ? 'يرجى إدخال كلمة المرور' : 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await loginMaster({ identity: cleanIdentity, password });
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || (isAr ? 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.' : 'Login failed. Please verify your credentials.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isPhone = /^\+?[0-9\s-]{7,15}$/.test(identity.trim());

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/25">
          <Crown className="h-6 w-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-950/40 px-3 py-1 text-[11px] font-black text-amber-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{isAr ? 'بوابة التحكم الرئيسية للمنصة' : 'Master Control Plane Console'}</span>
        </div>
        <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
          {isAr ? 'تسجيل دخول المشرف العام' : 'Platform Master Sign-In'}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {isAr
            ? 'وصول عالي الأمان لإدارة التراخيص، مقاييس المستأجرين والإشراف الشامل'
            : 'High-security access to licensing, tenant telemetry, and global oversight'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
            <span>{isAr ? 'البريد الإلكتروني أو رقم الجوال' : 'Email or Mobile Number'}</span>
            <span className="text-[10px] text-amber-300/80 font-mono">05XXXXXXXX / +966</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
              {isPhone ? <Phone className="h-4 w-4 text-amber-400" /> : <Mail className="h-4 w-4" />}
            </div>
            <input
              type="text"
              required
              autoFocus
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={isAr ? 'superadmin@oxengl.com أو 0500000001' : 'superadmin@oxengl.com or 0500000001'}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition"
              >
                {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
              </button>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
          ) : (
            <KeyRound className="h-4 w-4 text-slate-950" />
          )}
          <span>
            {loading
              ? (isAr ? 'جاري التحقق من أمان المشرف...' : 'Verifying Master Credentials...')
              : (isAr ? 'دخول المشرف العام (Control Plane)' : 'Sign In to Master Console')}
          </span>
        </button>

        {onSwitchToTenant && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onSwitchToTenant}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <span>{isAr ? 'التبديل إلى بوابة مساحة عمل المنشأة' : 'Switch to Tenant Workspace Login'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
