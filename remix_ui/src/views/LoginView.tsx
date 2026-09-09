import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Crown,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Globe,
  Layers,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { setCurrentUser, language, setLanguage, availableTenants, switchTenant } = useApp();
  const isAr = language === 'ar';

  const { tenantId: routeTenantId } = useParams<{ tenantId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // State passed from onboarding redirect in OxenGLPortalView
  const onboardingState = location.state as {
    justRegistered?: boolean;
    companyName?: string;
    companyNameEn?: string;
    adminEmail?: string;
    adminName?: string;
    tenantId?: string;
  } | undefined;

  const isFromOnboarding = Boolean(onboardingState?.justRegistered);

  // If no tenantId provided in route, redirect directly to OxenGL Portal
  useEffect(() => {
    if (!routeTenantId) {
      navigate('/portal', { replace: true });
    }
  }, [routeTenantId, navigate]);

  // Determine mode based on routeTenantId
  const isMasterPlatformLogin =
    routeTenantId === 'oxengl-platform' || routeTenantId === 'oxengl' || routeTenantId === 'platform';
  const isDedicatedTenantLogin = Boolean(routeTenantId && !isMasterPlatformLogin);
  const effectiveTenantId = isMasterPlatformLogin ? 'oxengl-platform' : routeTenantId || 'tenant-default-001';

  // Metadata for the target tenant
  const targetTenantMeta = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'oxengl-platform') return null;

    const found = availableTenants.find((t) => t.tenantId === effectiveTenantId);
    if (found) return found;

    if (onboardingState?.companyName) {
      return {
        tenantId: effectiveTenantId,
        companyName: onboardingState.companyName,
        companyNameEn: onboardingState.companyNameEn || onboardingState.companyName,
        subscriptionTier: 'PRO',
        crNumber: '1010892341',
        taxNumber: '300189452300003',
        status: 'Active',
      };
    }

    // Default fallback based on ID
    if (effectiveTenantId === 'tenant-default-001') {
      return {
        tenantId: 'tenant-default-001',
        companyName: 'شركة ميون الاقتصادية المحدودة',
        companyNameEn: 'Mayon Economic Company Ltd',
        subscriptionTier: 'PRO',
        crNumber: '1010992341',
        taxNumber: '300189452300003',
        status: 'Active',
      };
    }

    return {
      tenantId: effectiveTenantId,
      companyName: effectiveTenantId,
      companyNameEn: effectiveTenantId,
      subscriptionTier: 'PRO',
      crNumber: '—',
      taxNumber: '—',
      status: 'Active',
    };
  }, [effectiveTenantId, availableTenants, onboardingState]);

  // Credentials form state
  const [username, setUsername] = useState<string>(() => {
    if (isFromOnboarding && onboardingState?.adminEmail) {
      return onboardingState.adminEmail;
    }
    if (isMasterPlatformLogin) {
      return 'awadh.a.1987@gmail.com';
    }
    if (effectiveTenantId === 'tenant-default-001') {
      return 'admin@meayon.local';
    }
    if (effectiveTenantId) {
      return `admin@${effectiveTenantId}.sa`;
    }
    return 'admin@meayon.local';
  });

  const [password, setPassword] = useState('ChangeMe123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Sync username when URL params or onboarding state change
  useEffect(() => {
    if (isMasterPlatformLogin) {
      setUsername('awadh.a.1987@gmail.com');
    } else if (effectiveTenantId) {
      if (isFromOnboarding && onboardingState?.adminEmail) {
        setUsername(onboardingState.adminEmail);
      } else if (effectiveTenantId === 'tenant-default-001') {
        setUsername('admin@meayon.local');
      } else {
        setUsername(`admin@${effectiveTenantId}.sa`);
      }
    }
  }, [effectiveTenantId, isMasterPlatformLogin, isFromOnboarding, onboardingState]);

  // Execute Direct Credentials Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const targetTenant = isMasterPlatformLogin ? 'oxengl-platform' : effectiveTenantId;

    try {
      const isOwner = targetTenant === 'oxengl-platform';
      const effectiveApiTenant = isOwner ? 'tenant-default-001' : targetTenant;

      const success = await apiService.login(username, password, effectiveApiTenant);
      if (success) {
        if (!isOwner) {
          await switchTenant(targetTenant);
        } else {
          localStorage.setItem('meayon_active_tenant_id', 'oxengl-platform');
        }

        const profile = await apiService.getCurrentUser().catch(() => null);
        const isSuperAdminEmail =
          username.toLowerCase().includes('awadh') ||
          (isOwner && username.toLowerCase().includes('admin'));

        setCurrentUser({
          id: profile?.id || username,
          username: profile?.username || username.split('@')[0],
          fullName: profile?.fullName || profile?.fullNameAr || username,
          fullNameAr: profile?.fullNameAr || profile?.fullName || username,
          email: profile?.email || username,
          role: (profile?.role || (isSuperAdminEmail ? 'Admin' : 'Accountant')) as UserRole,
          status: 'Active',
          tenantId: isOwner ? 'oxengl-platform' : targetTenant,
          tenantRole: profile?.tenantRole || 'Admin',
          isPlatformSuperAdmin: isOwner || isSuperAdminEmail,
        });

        onLoginSuccess();
        if (isOwner) {
          navigate('/platform');
        } else {
          navigate(`/workspace/${targetTenant}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      setErrorMessage(message || (isAr ? 'بيانات الدخول غير صحيحة، يرجى التحقق وإعادة المحاولة.' : 'Invalid credentials, please verify and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationMessage('');

    const fullName = registrationForm.fullName.trim();
    const email = registrationForm.email.trim().toLowerCase();
    const phone = registrationForm.phone.trim();
    const passwordValue = registrationForm.password;

    if (!fullName || !email || !phone || passwordValue.length < 8) {
      setRegistrationMessage(isAr ? 'يرجى إدخال الاسم والبريد والجوال وكلمة مرور من 8 أحرف على الأقل.' : 'Full name, email, mobile number, and an 8-character password are required.');
      return;
    }

    setIsRegistering(true);
    try {
      const usernameFromEmail = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '').toLowerCase() || `user${Date.now()}`;
      const response = await fetch('/api/user-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          username: usernameFromEmail,
          email,
          phone,
          password: passwordValue,
          requested_role: 'Guest',
          notes: `Native signup request for ${effectiveTenantId}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || (isAr ? 'تعذر إرسال طلب التسجيل.' : 'Could not submit registration.'));
      }

      setUsername(email);
      setRegistrationForm({ fullName: '', email: '', phone: '', password: '' });
      setRegistrationMessage(isAr ? 'تم إرسال طلب التسجيل بنجاح. يمكن تسجيل الدخول بعد اعتماد الحساب.' : 'Registration request submitted. You can sign in after approval.');
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      setRegistrationMessage(message || (isAr ? 'تعذر إرسال طلب التسجيل.' : 'Could not submit registration.'));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      id="oxengl-login-view"
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-indigo-600 selection:text-white"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isMasterPlatformLogin ? (
          <>
            <div className="absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-amber-500/10 blur-[140px]" />
            <div className="absolute top-1/3 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[140px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[120px]" />
            <div className="absolute top-1/3 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[140px]" />
            <div className="absolute -bottom-40 right-1/3 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[130px]" />
          </>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Top Header Navigation Strip */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        {/* Brand Left/Right */}
        <div className="flex items-center gap-3">
          {isMasterPlatformLogin ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 border border-amber-300">
              <Crown className="h-6 w-6" />
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-white/20">
              <Building2 className="h-6 w-6 text-indigo-200" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                {isMasterPlatformLogin
                  ? 'OxenGL Master'
                  : targetTenantMeta?.companyName || 'منشأة معزولة'}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black border ${
                  isMasterPlatformLogin
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                    : 'bg-white/10 text-indigo-300 border-white/10'
                }`}
              >
                {isMasterPlatformLogin ? 'Super-Admin' : 'Isolated Tenant'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isMasterPlatformLogin
                ? isAr
                  ? 'كونسول الإدارة السحابية والتحكم بالتراخيص'
                  : 'Platform Super-Admin Master Console'
                : isAr
                ? `بيئة عمل مستقلة ومحمية | ${targetTenantMeta?.subscriptionTier || 'PRO'}`
                : `Dedicated Isolated Enterprise Workspace | ${targetTenantMeta?.subscriptionTier || 'PRO'}`}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Back to Portal button */}
          <button
            type="button"
            onClick={() => navigate('/portal')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:text-white transition shadow-sm cursor-pointer"
            title={isAr ? 'الانتقال إلى بوابة العبور لاختيار منشأة' : 'Back to OxenGL Portal'}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>{isAr ? 'بوابة المنشآت (Portal)' : 'Portal'}</span>
          </button>

          {/* Super-Admin shortcut if on regular tenant login */}
          {!isMasterPlatformLogin && (
            <button
              type="button"
              onClick={() => navigate('/login/oxengl-platform')}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/50 px-3.5 py-2 text-xs font-bold text-amber-300 transition cursor-pointer"
            >
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>{isAr ? 'دخول مالك المنصة' : 'OxenGL Super-Admin'}</span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition backdrop-blur-md cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-400" />
            <span>{isAr ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </header>

      {/* Center Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl rounded-3xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/80">
          {/* Onboarding Success Banner (Requirement 2) */}
          {isFromOnboarding && (
            <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-slate-900 p-5 text-xs text-emerald-200 flex items-start gap-4 shadow-xl">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-0.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-white text-sm sm:text-base">
                  {isAr
                    ? '🎉 تم تأسيس وتسجيل المنشأة بنجاح في المنظومة!'
                    : '🎉 Organization Successfully Registered!'}
                </p>
                <p className="text-emerald-300/90 leading-relaxed text-xs">
                  {isAr
                    ? `تم إنشاء بيئة العمل المعزولة لشركة (${targetTenantMeta?.companyName || onboardingState?.companyName}) وتجهيز قواعد البيانات الـ 17 المخصصة. يرجى تسجيل الدخول بأمان بحساب المدير المسؤول للبدء في تشغيل النظام.`
                    : `Dedicated isolated workspace for (${targetTenantMeta?.companyNameEn || onboardingState?.companyNameEn || 'Tenant'}) is ready with isolated database rows. Please sign in with your administrator credentials.`}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono text-emerald-400">
                  <span>🏢 {isAr ? 'كود المنشأة:' : 'Tenant ID:'} {effectiveTenantId}</span>
                  <span>•</span>
                  <span>📧 {isAr ? 'البريد المسجل:' : 'Registered Email:'} {onboardingState?.adminEmail}</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Header */}
          <div className="flex flex-col items-center text-center mb-8">
            {isMasterPlatformLogin ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/60 px-4 py-1.5 text-xs font-bold text-amber-300 mb-3 backdrop-blur-md">
                <Crown className="h-4 w-4 text-amber-400" />
                <span>{isAr ? 'لوحة تحكم مالك المنصة المركزية (Super-Admin)' : 'OxenGL Master Super-Admin Console'}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-4 py-1.5 text-xs font-bold text-indigo-300 mb-3 backdrop-blur-md">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>{isAr ? 'شاشة دخول المنشأة المعزولة والمحمية' : 'Dedicated Isolated Company Login'}</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isMasterPlatformLogin
                ? isAr
                  ? 'تسجيل دخول كونسول مالك المنصة'
                  : 'OxenGL Platform Master Login'
                : isAr
                ? `تسجيل الدخول - ${targetTenantMeta?.companyName || 'بيئة العمل'}`
                : `Sign In - ${targetTenantMeta?.companyNameEn || 'Workspace'}`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md">
              {isMasterPlatformLogin
                ? isAr
                  ? 'الوصول المباشر لإدارة التراخيص السحابية، مراقبة المنشآت وتوليد تقارير المنصة.'
                  : 'Direct access to cloud licensing, tenant metrics, and cross-organization supervision.'
                : isAr
                ? 'قم بإدخال بيانات الاعتماد للوصول الآمن لحسابات وبيانات منشأتك المعزولة بالكامل.'
                : 'Enter your credentials to securely access your isolated company environment.'}
            </p>

            {/* Tenant Metadata Badges for Dedicated Login */}
            {isDedicatedTenantLogin && targetTenantMeta && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 border border-slate-700 text-indigo-300 font-mono">
                  ID: {effectiveTenantId}
                </span>
                {targetTenantMeta.crNumber && targetTenantMeta.crNumber !== '—' && (
                  <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 border border-slate-700 text-slate-300 font-mono">
                    {isAr ? 'س.ت:' : 'CR:'} {targetTenantMeta.crNumber}
                  </span>
                )}
                {targetTenantMeta.taxNumber && targetTenantMeta.taxNumber !== '—' && (
                  <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 border border-slate-700 text-slate-300 font-mono">
                    {isAr ? 'ضريبي:' : 'VAT:'} {targetTenantMeta.taxNumber}
                  </span>
                )}
                <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/30 text-emerald-400 font-bold">
                  {targetTenantMeta.subscriptionTier || 'PRO'}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-950/50 p-4 text-xs font-bold text-rose-300 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CREDENTIALS LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Scope Display */}
            {isMasterPlatformLogin ? (
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isAr ? 'النطاق المستهدف: كونسول مالك المنصة المركزية' : 'Target Scope: OxenGL Master Console'}</span>
                </label>
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-black text-white">
                        {isAr ? 'منصة OxenGL المركزية (oxengl-platform)' : 'OxenGL Master Platform'}
                      </p>
                      <p className="text-[10px] text-amber-300/80 font-mono">
                        {isAr ? 'صلاحيات مالك المنصة والسحابة الشاملة' : 'Cloud Master Super-Admin Permissions'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-400/30">
                    Master
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isAr ? 'بيئة المنشأة المستهدفة (معزولة ومقيدة)' : 'Target Organization (Isolated & Scoped)'}</span>
                  <Link
                    to="/portal"
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                  >
                    <span>{isAr ? 'تغيير المنشأة' : 'Change Tenant'}</span>
                    {isAr ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                  </Link>
                </label>
                <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-4 py-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-black text-indigo-200">
                      <Building2 className="h-4 w-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-black text-white">
                        {targetTenantMeta?.companyName || effectiveTenantId}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {effectiveTenantId}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{isAr ? 'معزول أمنياً' : 'Scoped'}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Email / Username */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? 'البريد الإلكتروني / اسم المستخدم' : 'Email or Username'}
              </label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium"
                placeholder="name@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showPassword ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium"
                placeholder="••••••••"
              />
            </div>

            {/* Remember Me & Note */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">{isAr ? 'تذكر بياناتي' : 'Remember me'}</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {isAr ? 'تتم إدارة الجلسة عبر ملف تعريف ارتباط آمن' : 'Session is managed by a secure HttpOnly cookie'}
              </span>
            </div>

            {/* Action Buttons: Sign In + Request Account Registration */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3">
              {/* Primary Login Submit Button */}
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isLoading}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{isAr ? 'جاري التحقق والربط...' : 'Authenticating...'}</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>
                      {isMasterPlatformLogin
                        ? isAr
                          ? 'تسجيل الدخول'
                          : 'Sign In to Master'
                        : isAr
                        ? 'تسجيل الدخول'
                        : 'Sign In to Workspace'}
                    </span>
                  </>
                )}
              </button>

              {/* Request Account Button (طلب تسجيل حساب) */}
              <button
                type="button"
                id="login-request-account-btn"
                onClick={() => setIsRegistrationModalOpen(true)}
                className="flex-1 py-3.5 px-4 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/70 to-slate-900/90 hover:from-indigo-900/80 hover:to-slate-800 text-indigo-200 hover:text-white font-black text-xs shadow-md shadow-black/40 hover:border-indigo-400 transition-all hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 cursor-pointer ring-1 ring-white/5"
                title={isAr ? 'تقديم طلب تسجيل حساب جديد للمنشأة' : 'Request New Company Account Registration'}
              >
                <UserPlus className="h-4 w-4 text-indigo-400" />
                <span>{isAr ? 'طلب تسجيل حساب' : 'Request Account'}</span>
              </button>
            </div>
          </form>

          {isRegistrationModalOpen && (
            <form onSubmit={handleRegistrationSubmit} className="mt-6 space-y-4 rounded-2xl border border-indigo-500/30 bg-slate-950/70 p-5">
              <div>
                <h2 className="text-sm font-black text-white">{isAr ? 'طلب تسجيل مستخدم جديد' : 'New User Registration'}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {isAr ? 'استخدم بريداً إلكترونياً عادياً ورقم جوال صالح. سيتم تفعيل الحساب بعد اعتماد الإدارة.' : 'Use a standard email address and valid mobile number. Access begins after administrator approval.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={registrationForm.fullName}
                  onChange={(event) => setRegistrationForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={isAr ? 'الاسم الكامل' : 'Full name'}
                />
                <input
                  type="email"
                  required
                  value={registrationForm.email}
                  onChange={(event) => setRegistrationForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="name@example.com"
                />
                <input
                  type="tel"
                  required
                  value={registrationForm.phone}
                  onChange={(event) => setRegistrationForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="+966 50 123 4567"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={registrationForm.password}
                  onChange={(event) => setRegistrationForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={isAr ? 'كلمة مرور من 8 أحرف' : 'Password, 8+ characters'}
                />
              </div>

              {registrationMessage && (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs font-semibold text-slate-200">
                  {registrationMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsRegistrationModalOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 sm:w-1/3"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/25 disabled:opacity-60 sm:flex-1"
                >
                  {isRegistering ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال طلب التسجيل' : 'Submit Registration')}
                </button>
              </div>
            </form>
          )}

          {/* Prompt for new companies */}
          <div className="text-center pt-4">
            <span className="text-xs text-slate-400">
              {isAr ? 'منشأة جديدة ترغب بالانضمام للمنظومة؟' : 'New enterprise looking to join?'}
            </span>{' '}
            <button
              type="button"
              id="link-request-account-prompt"
              onClick={() => setIsRegistrationModalOpen(true)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>{isAr ? 'تقديم طلب تسجيل حساب للمنشأة' : 'Apply for company registration'}</span>
              {isAr ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
            </button>
          </div>

          {/* Bottom Trust & Compliance Strip */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>{isAr ? 'عزل تام للبيانات (17 جداول)' : 'Strict Multi-Tenant Row Isolation'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{isAr ? 'معتمد ومطابق لـ ZATCA المرحلة 2' : 'ZATCA Phase 2 E-Invoicing Ready'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{isAr ? 'تشفير سحابي عالي الأمان 256-Bit' : '256-Bit End-to-End Encryption'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Copyright */}
      <footer className="relative z-10 w-full text-center py-4 text-xs text-slate-500">
        <p>
          {isAr
            ? 'منظومة OxenGL السحابية © 2026 - جميع الحقوق محفوظة لقطاع النقليات والمقاولات'
            : 'OxenGL Enterprise Cloud Platform © 2026. All rights reserved.'}
        </p>
      </footer>

    </div>
  );
};
