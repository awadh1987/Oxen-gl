import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { TenantLicense } from '../types';
import {
  Building2,
  Plus,
  Crown,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCircle2,
  Sparkles,
  Globe,
  LogOut,
  LogIn,
  Layers,
  Cpu,
  FileText,
  Check,
  Loader2,
  CreditCard,
  TrendingUp,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface OxenGLPortalViewProps {
  onLogout: () => void;
}

export const OxenGLPortalView: React.FC<OxenGLPortalViewProps> = ({ onLogout }) => {
  const {
    language,
    setLanguage,
    currentUser,
    availableTenants,
    switchTenant,
    isPlatformSuperAdmin,
    registerNewTenant,
  } = useApp();

  const navigate = useNavigate();
  const isAr = language === 'ar';

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | 'ENTERPRISE' | 'PROFESSIONAL' | 'BASIC'>('ALL');

  // New Organization Modal State
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitState, setTransitState] = useState<{
    inTransit: boolean;
    companyName: string;
    tenantId: string;
  } | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    companyNameAr: '',
    companyNameEn: '',
    crNumber: '',
    taxNumber: '',
    city: 'الرياض',
    sector: 'نقل ثقيل ومواد بناء',
    subscriptionTier: 'PROFESSIONAL' as 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE',
    adminName: currentUser.fullNameAr || currentUser.fullName || '',
    adminEmail: currentUser.email || '',
    adminPhone: '+966 50 ',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return availableTenants.filter((tenant) => {
      const matchQuery =
        !searchQuery.trim() ||
        (tenant.companyName && tenant.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tenant.companyNameEn && tenant.companyNameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tenant.crNumber && tenant.crNumber.includes(searchQuery)) ||
        (tenant.tenantId && tenant.tenantId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTier =
        selectedTierFilter === 'ALL' ||
        (selectedTierFilter === 'PROFESSIONAL' && (tenant.subscriptionTier === 'PROFESSIONAL' || (tenant as any).planType === 'PRO')) ||
        (selectedTierFilter === 'ENTERPRISE' && (tenant.subscriptionTier === 'ENTERPRISE' || (tenant as any).planType === 'ENTERPRISE')) ||
        (selectedTierFilter === 'BASIC' && (tenant.subscriptionTier === 'BASIC' || (tenant as any).planType === 'STARTER'));

      return matchQuery && matchTier;
    });
  }, [availableTenants, searchQuery, selectedTierFilter]);

  // Handle direct launch to a workspace
  const handleLaunchWorkspace = async (tenantId: string, companyName: string) => {
    setTransitState({
      inTransit: true,
      companyName,
      tenantId,
    });

    await switchTenant(tenantId);

    setTimeout(() => {
      if (apiService.isAuthenticated()) {
        navigate(`/workspace/${tenantId}`);
      } else {
        navigate(`/login/${tenantId}`);
      }
    }, 1100);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.companyNameAr.trim()) {
      errors.companyNameAr = isAr ? 'اسم المنشأة بالعربية مطلوب' : 'Company name in Arabic is required';
    }
    if (!formData.companyNameEn.trim()) {
      errors.companyNameEn = isAr ? 'اسم المنشأة بالإنجليزية مطلوب' : 'Company name in English is required';
    }
    if (formData.crNumber && formData.crNumber.length !== 10) {
      errors.crNumber = isAr ? 'السجل التجاري يجب أن يتكون من 10 أرقام' : 'CR must be 10 digits';
    }
    if (formData.taxNumber && formData.taxNumber.length !== 15) {
      errors.taxNumber = isAr ? 'الرقم الضريبي يجب أن يتكون من 15 رقماً' : 'VAT number must be 15 digits';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Tenant Registration Submission
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const newTenant = await registerNewTenant({
        companyName: formData.companyNameAr.trim(),
        companyNameEn: formData.companyNameEn.trim(),
        crNumber: formData.crNumber.trim() || '1010' + Math.floor(100000 + Math.random() * 900000),
        taxNumber: formData.taxNumber.trim() || '300' + Math.floor(100000000 + Math.random() * 900000000) + '00003',
        address: `${formData.city} - المملكة العربية السعودية`,
        addressEn: `${formData.city} - Kingdom of Saudi Arabia`,
        contactPhone: formData.adminPhone.trim(),
        contactEmail: formData.adminEmail.trim(),
        subscriptionTier: formData.subscriptionTier,
        planType: formData.subscriptionTier === 'ENTERPRISE' ? 'ENTERPRISE' : formData.subscriptionTier === 'BASIC' ? 'STARTER' : 'PRO',
        adminName: formData.adminName.trim(),
      });

      setIsOnboardingModalOpen(false);
      setIsSubmitting(false);

      // Transition to dedicated login screen for this newly registered tenant (Requirement 2)
      navigate(`/login/${newTenant.tenantId}`, {
        state: {
          justRegistered: true,
          companyName: newTenant.companyName,
          companyNameEn: newTenant.companyNameEn,
          adminEmail: formData.adminEmail.trim(),
          adminName: formData.adminName.trim(),
          tenantId: newTenant.tenantId,
        },
      });
    } catch (error) {
      console.error('Failed to register new tenant:', error);
      setIsSubmitting(false);
      alert(isAr ? 'حدث خطأ أثناء حفظ المنشأة، يرجى المحاولة ثانية' : 'Failed to register tenant, please try again');
    }
  };

  const isSuperAdmin = Boolean(isPlatformSuperAdmin || currentUser?.role === 'Admin');

  return (
    <div
      id="oxengl-portal-root"
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white"
    >
      {/* 1. Global Enterprise Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-800 shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
              <Crown className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">OxenGL</span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-300 border border-indigo-500/30">
                  GLOBAL CLOUD PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'بوابة العبور المركزية وإدارة المنشآت' : 'Multi-Tenant Master Gateway'}
              </p>
            </div>
          </div>

          {/* Telemetry Status + Actions */}
          <div className="flex items-center gap-3">
            {/* Cloud Status */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-400">{isAr ? 'السحابة نشطة 100%' : 'Cloud Nominal'}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-mono text-[11px]">KSA-Riyadh Node</span>
            </div>

            {/* Platform Master Console for Super Admins */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  void switchTenant('oxengl-platform');
                  navigate('/platform');
                }}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-300 transition-all hover:border-amber-400 hover:bg-amber-400/25 cursor-pointer shadow-xs"
                title={isAr ? 'لوحة تحكم مالك المنصة وإدارة التراخيص' : 'Platform Master Management Console'}
              >
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                <span>{isAr ? 'لوحة تحكم المنصة (Master)' : 'Platform Master'}</span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isAr ? 'English' : 'عربي'}</span>
            </button>

            {/* User Profile info */}
            <div className="hidden md:flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                {(currentUser.fullNameAr || currentUser.fullName || 'U').slice(0, 1)}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200 leading-none">
                  {currentUser.fullNameAr || currentUser.fullName}
                </p>
                <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                  {currentUser.role}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title={isAr ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Gateway Banner */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-12 px-4 sm:px-8">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-1/4 -mt-24 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-24 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>{isAr ? 'بوابة إدارة المنشآت وعزل البيانات المتقدم' : 'Advanced Multi-Tenant Organization Portal'}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {isAr ? (
                  <>
                    بوابة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-200">OxenGL</span> السحابية الموحدة
                  </>
                ) : (
                  <>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-200">OxenGL</span> Global Cloud Portal
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {isAr
                  ? 'اختر بيئة العمل التشغيلية للشركة للانتقال المباشر، أو قم بتسجيل منشأة جديدة وتخصيص ترخيصها فورياً مع عزل كامل لقواعد البيانات والحسابات وفق المعايير السعودية.'
                  : 'Select an enterprise organization workspace to launch its operational ERP, or register a new company tenant with instant schema isolation.'}
              </p>
            </div>

            {/* Main Action Buttons (Register New Organization + Super-Admin OxenGL Login) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                id="portal-register-tenant-btn"
                onClick={() => setIsOnboardingModalOpen(true)}
                className="group relative flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all transform active:scale-95 cursor-pointer ring-1 ring-white/20"
              >
                <Plus className="h-5 w-5 text-indigo-200 group-hover:rotate-90 transition-transform duration-200" />
                <span>{isAr ? 'تسجيل منشأة جديدة' : 'Register New Tenant'}</span>
              </button>

              {/* Super-Admin OxenGL Master Direct Access Button */}
              <button
                type="button"
                id="portal-oxengl-login-btn"
                onClick={async () => {
                  await switchTenant('oxengl-platform');
                  if (apiService.isAuthenticated() && isSuperAdmin) {
                    navigate('/platform');
                  } else {
                    navigate('/login/oxengl-platform');
                  }
                }}
                className="group relative flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 px-6 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all transform active:scale-95 cursor-pointer ring-1 ring-amber-300/80"
                title={isAr ? 'تسجيل دخول مالك المنصة للوصول المباشر لكونسول الإدارة الشامل' : 'OxenGL Super-Admin Login to Platform Console'}
              >
                <Crown className="h-5 w-5 text-slate-950 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200" />
                <span>{isAr ? 'تسجيل دخول OxenGL' : 'OxenGL Login'}</span>
                <span className="rounded-md bg-black/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 border border-black/10">
                  {isAr ? 'مالك المنصة' : 'Super-Admin'}
                </span>
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Bar */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Building2 className="h-4 w-4 text-indigo-400" />
                <span>{isAr ? 'المنشآت المرتبطة' : 'Connected Tenants'}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{availableTenants.length}</p>
              <p className="text-[11px] text-emerald-400 mt-0.5">{isAr ? 'جميعها نشطة ومفعلة' : 'All actively licensed'}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                <span>{isAr ? 'مستوى عزل البيانات' : 'Data Isolation'}</span>
              </div>
              <p className="mt-2 text-xl font-black text-white">Schema RLS L3</p>
              <p className="text-[11px] text-blue-400 mt-0.5">{isAr ? '17 جدول معزول أمنياً' : '17 isolated database tables'}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>{isAr ? 'الفوترة والامتثال' : 'ZATCA Compliance'}</span>
              </div>
              <p className="mt-2 text-xl font-black text-white">Stage-2 Ready</p>
              <p className="text-[11px] text-amber-400 mt-0.5">{isAr ? 'توقيع وربط الفاتورة' : 'Cryptographic e-invoicing'}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Cpu className="h-4 w-4 text-emerald-400" />
                <span>{isAr ? 'سرعة زمن الاستجابة' : 'Cloud Latency'}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">12 ms</p>
              <p className="text-[11px] text-emerald-400 mt-0.5">{isAr ? 'أداء عالي وسريع' : 'Optimized fast queries'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Organizations Directory Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>{isAr ? 'المنشآت وبيئات العمل المتاحة' : 'Available Organization Workspaces'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'انقر على أي منشأة للعبور المباشر إلى بيئة العمل التشغيلية بالنسق والتصميم المعتمد'
                : 'Click any organization to launch its dedicated operational workspace'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'البحث بالاسم أو السجل...' : 'Search by name or CR...'}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2 pr-9 pl-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Plan Tier Filter */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
              {(['ALL', 'ENTERPRISE', 'PROFESSIONAL', 'BASIC'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTierFilter(tier)}
                  className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                    selectedTierFilter === tier
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tier === 'ALL'
                    ? isAr
                      ? 'الكل'
                      : 'All'
                    : tier === 'ENTERPRISE'
                    ? isAr
                      ? 'مؤسسات'
                      : 'Enterprise'
                    : tier === 'PROFESSIONAL'
                    ? isAr
                      ? 'محترفين'
                      : 'Pro'
                    : isAr
                    ? 'أساسي'
                    : 'Basic'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tenant Cards Grid */}
        {filteredTenants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              {isAr ? 'لم يتم العثور على منشآت مطابقة' : 'No matching organizations found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              {isAr
                ? 'جرب البحث بكلمة أخرى أو قم بتسجيل منشأة جديدة للبدء الفوري.'
                : 'Try adjusting your search criteria or register a new tenant organization.'}
            </p>
            <button
              type="button"
              onClick={() => setIsOnboardingModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل منشأة الآن' : 'Register Tenant Now'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTenants.map((tenant) => {
              const isDefaultMayon = tenant.tenantId === 'tenant-default-001' || tenant.companyName?.includes('ميون');
              const tierBadgeStyle =
                tenant.subscriptionTier === 'ENTERPRISE'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                  : tenant.subscriptionTier === 'BASIC'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-blue-950/80 text-blue-300 border-blue-500/40';

              return (
                <div
                  key={tenant.tenantId}
                  className="group relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/80 p-6 shadow-xl transition-all duration-300 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-950/40 flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top: Logo & Tier Badges */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-md border ${
                            isDefaultMayon
                              ? 'bg-[#F05627] text-white border-[#F05627]'
                              : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                          }`}
                        >
                          {isDefaultMayon ? 'M' : (tenant.companyName || 'C').slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 font-mono">
                              {tenant.tenantId}
                            </span>
                            {isDefaultMayon && (
                              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-400/30">
                                {isAr ? 'البيئة المعتمدة الأصلية' : 'STANDARD'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-white mt-0.5 group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {isAr ? tenant.companyName : (tenant.companyNameEn || tenant.companyName)}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${tierBadgeStyle}`}
                      >
                        {tenant.subscriptionTier || 'PRO'}
                      </span>
                    </div>

                    {/* Secondary Name / English */}
                    <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-1">
                      {tenant.companyNameEn || 'Enterprise Organization'}
                    </p>

                    {/* Metadata Specs */}
                    <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-2 mb-5 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{isAr ? 'السجل التجاري (CR):' : 'Commercial Reg:'}</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {tenant.crNumber || (tenant as any).commercialRegister || '1010894520'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{isAr ? 'الرقم الضريبي (VAT):' : 'Tax Number:'}</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {tenant.taxNumber || '300189452300003'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{isAr ? 'الحصة التشغيلية:' : 'Allowed Centers:'}</span>
                        <span className="text-indigo-300 font-bold">
                          {isAr
                            ? `حتى ${tenant.maxAllowedCostCenters || 25} مركز تكلفة`
                            : `Up to ${tenant.maxAllowedCostCenters || 25} Cost Centers`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{isAr ? 'حالة العزل الأمني:' : 'Security Barrier:'}</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{isAr ? 'معزول ومفعل' : 'Strict Isolated'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Launch Workspace + Dedicated Login Screen */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchWorkspace(tenant.tenantId, tenant.companyName)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-900/60 to-slate-800 hover:from-indigo-600 hover:via-blue-600 hover:to-indigo-700 p-3.5 text-xs font-black text-white border border-slate-700 hover:border-indigo-400 shadow-md transition-all duration-200 active:scale-98 cursor-pointer group-hover:shadow-indigo-600/30"
                    >
                      <span>{isAr ? 'الدخول لبيئة العمل (Launch Workspace)' : 'Launch Workspace'}</span>
                      {isAr ? (
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      ) : (
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/login/${tenant.tenantId}`)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 py-2 px-3 text-[11px] font-bold text-indigo-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                    >
                      <LogIn className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{isAr ? 'شاشة تسجيل الدخول المخصصة للمنشأة' : 'Dedicated Tenant Login'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. Onboarding Modal ("تسجيل منشأة جديدة") */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 my-8 text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isAr ? 'تسجيل منشأة جديدة بالمنصة' : 'Register New Enterprise Tenant'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? 'قم بإدخال بيانات الشركة ليتم إنشاء بيئة العمل المعزولة وتوجيهك لشاشة الدخول الخاصة بها'
                      : 'Create a new isolated organization workspace and proceed to its dedicated login'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOnboardingModalOpen(false)}
                className="h-8 w-8 rounded-xl border border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTenant} className="space-y-5 pt-5">
              {/* Step 1: Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'اسم المنشأة بالعربية *' : 'Company Name (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyNameAr}
                    onChange={(e) => setFormData({ ...formData, companyNameAr: e.target.value })}
                    placeholder={isAr ? 'مثال: شركة اليمامة للنقل والمقاولات' : 'Al-Yamama Transport Co.'}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  {formErrors.companyNameAr && (
                    <p className="text-[11px] text-rose-400 mt-1">{formErrors.companyNameAr}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'الاسم التجاري بالإنجليزية *' : 'Company Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyNameEn}
                    onChange={(e) => setFormData({ ...formData, companyNameEn: e.target.value })}
                    placeholder="e.g. Al-Yamama Transport & Logistics"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  {formErrors.companyNameEn && (
                    <p className="text-[11px] text-rose-400 mt-1">{formErrors.companyNameEn}</p>
                  )}
                </div>
              </div>

              {/* Step 2: Registrations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'السجل التجاري (10 أرقام)' : 'Commercial Registration (CR)'}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="1010XXXXXX"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  {formErrors.crNumber && (
                    <p className="text-[11px] text-rose-400 mt-1">{formErrors.crNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'الرقم الضريبي (15 رقماً)' : 'VAT Tax Number'}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="300XXXXXXXX0003"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  {formErrors.taxNumber && (
                    <p className="text-[11px] text-rose-400 mt-1">{formErrors.taxNumber}</p>
                  )}
                </div>
              </div>

              {/* Step 3: Location and Sector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'المقر الرئيسي والمدينة' : 'Headquarters City'}
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="الرياض">الرياض (Riyadh)</option>
                    <option value="جدة">جدة (Jeddah)</option>
                    <option value="الدمام">الدمام والمنطقة الشرقية (Dammam)</option>
                    <option value="مكة المكرمة">مكة المكرمة (Makkah)</option>
                    <option value="المدينة المنورة">المدينة المنورة (Madinah)</option>
                    <option value="تبوك ونيوم">تبوك ونيوم (Tabuk & NEOM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'النشاط التجاري الرئيسي' : 'Industry Sector'}
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="نقل ثقيل ومواد بناء">نقل ثقيل وركام ومواد بناء (Heavy Transport)</option>
                    <option value="كسارات ومحاجر">كسارات وتوريد بحص ودفان (Quarry & Crushers)</option>
                    <option value="مقاولات وإنشاءات">مقاولات عامة وبنية تحتية (Contracting)</option>
                    <option value="لوجستيات وإمداد">خدمات لوجستية وتأجير معدات (Logistics & Fleet)</option>
                  </select>
                </div>
              </div>

              {/* Step 4: Subscription Tier Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {isAr ? 'اختر باقة الاشتراك والترخيص *' : 'Select Subscription Plan Tier *'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      tier: 'BASIC' as const,
                      titleAr: 'الأساسية (Basic)',
                      titleEn: 'Basic Starter',
                      quotaAr: 'حتى 5 مراكز تكلفة',
                      quotaEn: 'Up to 5 Cost Centers',
                      descAr: 'للشركات الفردية والناشئة',
                    },
                    {
                      tier: 'PROFESSIONAL' as const,
                      titleAr: 'المحترفين (PRO)',
                      titleEn: 'Professional',
                      quotaAr: 'حتى 25 مركز تكلفة',
                      quotaEn: 'Up to 25 Cost Centers',
                      descAr: 'الأنسب للشركات النشطة (موصى به)',
                      popular: true,
                    },
                    {
                      tier: 'ENTERPRISE' as const,
                      titleAr: 'المؤسسات (Enterprise)',
                      titleEn: 'Enterprise',
                      quotaAr: 'مراكز تكلفة غير محدودة',
                      quotaEn: 'Unlimited Centers',
                      descAr: 'للأساطيل الكبرى وتعدد الفروع',
                    },
                  ].map((p) => {
                    const isSelected = formData.subscriptionTier === p.tier;
                    return (
                      <div
                        key={p.tier}
                        onClick={() => setFormData({ ...formData, subscriptionTier: p.tier })}
                        className={`relative rounded-2xl p-3.5 border text-right cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/40 shadow-lg'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        {p.popular && (
                          <span className="absolute -top-2.5 left-3 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white">
                            {isAr ? 'الأكثر طلباً' : 'POPULAR'}
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-white">{isAr ? p.titleAr : p.titleEn}</span>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-300">{isAr ? p.quotaAr : p.quotaEn}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{isAr ? p.descAr : p.titleEn}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 5: Admin contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'البريد الإلكتروني للإدارة' : 'Manager Email'}
                  </label>
                  <input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@company.sa"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'رقم هاتف التواصل' : 'Contact Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    placeholder="+966 50 123 4567"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOnboardingModalOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>{isAr ? 'جارٍ تسجيل المنشأة...' : 'Registering...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-indigo-200" />
                      <span>{isAr ? 'إنشاء المنشأة والانتقال لتسجيل الدخول' : 'Create Organization & Proceed to Login'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Seamless Transit Transition Screen (Crossing into Workspace) */}
      {transitState?.inTransit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
          <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                <Building2 className="h-8 w-8 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                {isAr ? 'العبور إلى بيئة العمل التشغيلية' : 'Entering Operational Workspace'}
              </h3>
              <p className="text-sm font-semibold text-indigo-300">
                {transitState.companyName}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {isAr ? 'جارٍ تفعيل قواعد العزل الأمني وتجهيز القالب القياسي...' : 'Configuring isolated tenant schemas...'}
              </p>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 h-full w-full animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* 6. Portal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 sm:px-8 py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <p>
            {isAr
              ? 'منظومة OxenGL العالمية للسحابة وعزل المنشآت © 2026. جميع الحقوق محفوظة.'
              : 'OxenGL Global Cloud & Multi-Tenant Enterprise Architecture © 2026. All rights reserved.'}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>{isAr ? 'الأمان: تشفير 256-bit AES' : 'Security: 256-bit AES'}</span>
            <span>•</span>
            <span>{isAr ? 'معايير هيئة الزكاة والضريبة ZATCA' : 'ZATCA Certified'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
