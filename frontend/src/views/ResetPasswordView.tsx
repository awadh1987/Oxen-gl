import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  Globe2,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ResetPasswordViewProps {
  onSuccessRedirect?: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onSuccessRedirect }) => {
  const { language, setLanguage } = useApp();
  const isAr = language === 'ar';

  const [token, setToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('token');
      return param ? param.trim() : '';
    }
    return '';
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (success && countdown === 0) {
      if (onSuccessRedirect) {
        onSuccessRedirect();
      } else {
        navigateTo('/login');
      }
    }
    return () => clearTimeout(timer);
  }, [success, countdown, onSuccessRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanToken = token.trim();
    if (!cleanToken) {
      setError(
        isAr
          ? 'رمز استعادة كلمة المرور مفقود. يرجى استخدام الرابط المستلم أو إدخال الرمز.'
          : 'Password reset token is missing. Please use your recovery link or enter the token.'
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        isAr
          ? 'يجب ألا تقل كلمة المرور عن 8 خانات وتحتوي على أحرف وأرقام.'
          : 'Password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cleanToken,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            (isAr
              ? 'تعذر إعادة تعيين كلمة المرور. قد يكون الرمز منتهياً أو غير صالح.'
              : 'Failed to reset password. The token may be expired or invalid.')
        );
      }

      setSuccess(true);
      setSuccessMessage(
        data?.message ||
          (isAr
            ? 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
            : 'Password reset completed successfully. You may now log in with your new credentials.')
      );
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء معالجة الطلب.' : 'An error occurred during password reset.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-[#0a0d17] text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-500 selection:text-white"
    >
      {/* Background Ambience */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #38bdf8 1px, transparent 1px),
            linear-gradient(to bottom, #38bdf8 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 mx-auto w-full max-w-5xl flex items-center justify-between py-3">
        <button
          type="button"
          onClick={() => navigateTo('/login')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign-In'}</span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition shadow-sm"
        >
          <Globe2 className="h-3.5 w-3.5 text-indigo-400" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Main Card */}
      <main className="relative z-10 mx-auto w-full max-w-md my-auto py-6">
        <div className="relative rounded-3xl border border-slate-800/90 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-white/5">
          {/* Top Gradient Banner */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500" />

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3 py-1 text-[11px] font-black text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isAr ? 'إعادة تعيين كلمة المرور الآمنة' : 'Secure Password Reset'}</span>
            </div>
            <h1 className="mt-3 text-xl font-black text-white sm:text-2xl">
              {isAr ? 'تعيين كلمة مرور جديدة' : 'Reset Account Password'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {isAr
                ? 'أنشئ كلمة مرور قوية ومشفرة بتقنية Argon2id لحماية حسابك'
                : 'Configure a strong, Argon2id-hardened passphrase to secure your access'}
            </p>
          </div>

          {/* SUCCESS BANNER */}
          {success ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-5 text-center shadow-lg shadow-emerald-900/20">
                <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-emerald-200">
                  {isAr ? 'اكتملت العملية بنجاح' : 'Reset Successful!'}
                </h3>
                <p className="mt-1.5 text-xs text-emerald-300/80 leading-relaxed">
                  {successMessage}
                </p>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-400 font-mono">
                  <span>{isAr ? 'جاري التحويل تلقائياً خلال' : 'Redirecting to login in'}</span>
                  <span className="font-bold text-emerald-400">{countdown}</span>
                  <span>{isAr ? 'ثوان...' : 'seconds...'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onSuccessRedirect) {
                    onSuccessRedirect();
                  } else {
                    navigateTo('/login');
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition hover:brightness-110"
              >
                <LogIn className="h-4 w-4" />
                <span>{isAr ? 'الانتقال لتسجيل الدخول الآن' : 'Proceed to Sign-In Now'}</span>
              </button>
            </div>
          ) : (
            /* RESET FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Token Input (If not passed or if user needs to edit) */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{isAr ? 'رمز الأمان (Reset Token)' : 'Verification Reset Token'}</span>
                  {token && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {isAr ? 'تم التحميل من الرابط' : 'Loaded from Link'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={isAr ? 'رمز التحقق المشفر' : 'Cryptographic Reset Token'}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-4 py-2.5 font-mono text-xs text-indigo-200 placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{isAr ? 'إدخال كلمة المرور الآمنة الجديدة' : 'Enter New Secure Password'}</span>
                  <span className="text-[10px] text-slate-500">{isAr ? 'الحد الأدنى 8 خانات' : 'Min 8 chars'}</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus={Boolean(token)}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-white transition"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-white" />
                )}
                <span>
                  {loading
                    ? (isAr ? 'جاري تشفير وتحديث كلمة المرور...' : 'Hashing & Updating Password...')
                    : (isAr ? 'تأكيد إعادة تعيين كلمة المرور' : 'Confirm Password Reset')}
                </span>
              </button>

              {/* Back Link */}
              <div className="pt-3 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => navigateTo('/login')}
                  className="text-xs text-slate-400 hover:text-indigo-300 transition"
                >
                  {isAr ? 'تذكرت كلمة المرور؟ العودة لتسجيل الدخول' : 'Remembered your password? Back to Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer Note */}
      <footer className="relative z-10 text-center text-[11px] text-slate-600 py-3">
        OxenGL Cloud Monolith Engine &bull; Zero-Trust Tenant Isolation Architecture
      </footer>
    </div>
  );
};
