import React, { useState } from 'react';
import { Building2, KeyRound, Loader2, Lock, Mail, Phone, AlertCircle, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Company } from '../../types';

interface TenantLoginFormProps {
  initialTenantSlug?: string;
  selectedCompany?: Company | null;
  onSuccess?: () => void;
  onForgotPassword?: (slug?: string) => void;
  onRegisterNew?: () => void;
  onSwitchToMaster?: () => void;
}

export const TenantLoginForm: React.FC<TenantLoginFormProps> = ({
  initialTenantSlug = '',
  selectedCompany,
  onSuccess,
  onForgotPassword,
  onRegisterNew,
  onSwitchToMaster,
}) => {
  const { language, loginTenant, companies } = useApp();
  const isAr = language === 'ar';

  const [tenantSlug, setTenantSlug] = useState(() => {
    return initialTenantSlug || selectedCompany?.slug || (companies.length > 0 ? companies[0].slug : '');
  });
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSlug = tenantSlug.trim().toLowerCase();
    const cleanIdentity = identity.trim();

    if (!cleanSlug) {
      setError(isAr ? 'يرجى إدخال أو تحديد معرف المنشأة (Workspace Slug)' : 'Please enter or select a workspace slug');
      return;
    }
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
      await loginTenant({
        tenant_slug: cleanSlug,
        identity: cleanIdentity,
        password,
      });
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || (isAr ? 'بيانات الاعتماد غير صالحة لمساحة العمل هذه.' : 'Invalid credentials for this workspace.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isPhone = /^\+?[0-9\s-]{7,15}$/.test(identity.trim());

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3 py-1 text-[11px] font-black text-indigo-300">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>{isAr ? 'تسجيل دخول مساحة عمل المنشأة' : 'Tenant Workspace Sign-In'}</span>
        </div>
        <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
          {selectedCompany?.name || (isAr ? 'دخول منظومة الأعمال' : 'Access Dedicated ERP')}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {isAr
            ? 'سجل الدخول باستخدام بريدك المعتمد أو رقم الجوال السعودي'
            : 'Sign in using your authorized company email or Saudi mobile'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Workspace Slug Selector / Input */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
            <span>{isAr ? 'رمز المنشأة (Workspace Slug)' : 'Tenant Workspace Slug'}</span>
            <span className="text-[10px] text-indigo-300 font-mono">e.g. meayon-logistics</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
              <Building2 className="h-4 w-4" />
            </div>
            <input
              type="text"
              required
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={isAr ? 'meayon-logistics' : 'meayon-logistics'}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-4 py-2.5 font-mono text-xs text-indigo-200 placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>

          {/* Quick Slug Switcher if multiple companies */}
          {companies.length > 0 && !selectedCompany && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-500">{isAr ? 'منشآت سريعة:' : 'Quick select:'}</span>
              {companies.slice(0, 3).map((comp) => (
                <button
                  type="button"
                  key={comp.id}
                  onClick={() => setTenantSlug(comp.slug)}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-semibold transition ${
                    tenantSlug === comp.slug
                      ? 'border border-indigo-400 bg-indigo-600/30 text-indigo-200'
                      : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {comp.slug}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Identity Input (Email or Mobile) */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
            <span>{isAr ? 'البريد الإلكتروني أو رقم الجوال' : 'Email or Mobile Number'}</span>
            <span className="text-[10px] text-indigo-300 font-mono">05XXXXXXXX / +966</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
              {isPhone ? <Phone className="h-4 w-4 text-emerald-400" /> : <Mail className="h-4 w-4" />}
            </div>
            <input
              type="text"
              required
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={isAr ? 'admin@company.com أو 0551234567' : 'admin@company.com or 0551234567'}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={() => onForgotPassword(tenantSlug)}
                className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 transition"
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
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <LogIn className="h-4 w-4 text-white" />
          )}
          <span>
            {loading
              ? (isAr ? 'جاري المصادقة وفتح قاعدة البيانات...' : 'Authenticating Tenant Database...')
              : (isAr ? 'تسجيل الدخول إلى المنظومة' : 'Sign In to Workspace')}
          </span>
        </button>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          {onRegisterNew && (
            <button
              type="button"
              onClick={onRegisterNew}
              className="text-indigo-300 hover:text-white transition font-medium"
            >
              {isAr ? 'تسجيل منشأة جديدة (حساب جديد)' : 'Register New Enterprise'}
            </button>
          )}

          {onSwitchToMaster && (
            <button
              type="button"
              onClick={onSwitchToMaster}
              className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 transition font-medium"
            >
              <span>{isAr ? 'دخول المشرف العام للمنصة' : 'Master Super-Admin'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
