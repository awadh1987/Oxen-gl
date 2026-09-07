import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { BrandLogo } from '../components/BrandLogo';
import { LoginButton } from '../components/LoginButton';
import {
  Truck,
  ShieldCheck,
  Building2,
  FileCheck2,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  BarChart3,
  Scale,
  Award,
  Layers,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  UserPlus,
  LogIn,
  Check,
} from 'lucide-react';

interface LandingPageViewProps {
  onLoginSuccess: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onLoginSuccess }) => {
  const {
    users,
    setCurrentUser,
    language,
    setLanguage,
    brandConfig,
    userRequests,
    logAuditAction,
    currentCompany,
    companies,
    setCurrentCompany,
  } = useApp();
  const isAr = language === 'ar';

  // Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'usr-1');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Sign Up Form State (Subject to Admin Approval)
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    fullNameAr: '',
    username: '',
    email: '',
    phone: '',
    organization: '',
    requestedRole: 'Guest' as UserRole,
    notes: '',
  });
  const [signupSubmitted, setSignupSubmitted] = useState(false);

  const handleQuickRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const matchedUser = users.find((u) => u.role === role);
    if (matchedUser) {
      setSelectedUserId(matchedUser.id);
      setUsernameInput(matchedUser.username);
    }
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find((u) => u.id === selectedUserId) || users[0];
    setCurrentUser(targetUser);

    logAuditAction({
      userId: targetUser.id,
      userName: targetUser.fullNameAr || targetUser.fullName,
      userRole: targetUser.role,
      action: 'READ',
      entityType: 'User',
      entityId: targetUser.id,
      summary: `تسجيل دخول ناجح إلى النظام بصلاحية: (${targetUser.role})`,
    });

    onLoginSuccess();
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.fullName || !signupForm.username || !signupForm.email) return;

    // Create user request
    const newReq = {
      id: `req-usr-${Date.now()}`,
      fullName: signupForm.fullName,
      fullNameAr: signupForm.fullNameAr || signupForm.fullName,
      username: signupForm.username.toLowerCase().trim(),
      email: signupForm.email,
      phone: signupForm.phone,
      requestedRole: signupForm.requestedRole,
      requestedAt: new Date().toISOString(),
      status: 'Pending' as const,
      notes: `${signupForm.organization ? `الجهة: ${signupForm.organization} | ` : ''}${signupForm.notes || 'طلب تسجيل حساب جديد عبر البوابة العامة'}`,
    };

    // Save to user requests state in localStorage
    const current = JSON.parse(localStorage.getItem('meayon_user_requests') || '[]');
    localStorage.setItem('meayon_user_requests', JSON.stringify([newReq, ...current]));

    logAuditAction({
      userId: 'anonymous-visitor',
      userName: signupForm.fullNameAr || signupForm.fullName,
      userRole: signupForm.requestedRole,
      action: 'CREATE',
      entityType: 'User',
      entityId: newReq.id,
      summary: `تقديم طلب فتح حساب مستخدم جديد (${signupForm.fullName}) قيد مراجعة المدير التنفيذي`,
      newData: newReq,
    });

    setSignupSubmitted(true);
  };

  const openAuthModalWithTab = (tab: 'signin' | 'signup') => {
    setAuthTab(tab);
    setSignupSubmitted(false);
    setIsAuthModalOpen(true);
  };

  return (
    <div
      id="meayon-public-landing-page"
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#111111] font-sans text-neutral-100 antialiased selection:bg-[#F05627] selection:text-white"
    >
      {/* 1. Public Top Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#161616]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showText={false} />
            <div>
              <span className="text-sm font-black tracking-tight text-white sm:text-base">
                {brandConfig.companyNameAr}
              </span>
              <p className="text-[10px] font-bold tracking-widest text-[#F05627] uppercase sm:text-xs">
                {brandConfig.companyNameEn}
              </p>
            </div>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden items-center gap-6 text-xs font-semibold text-neutral-300 md:flex">
            <a href="#about" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'عن OxenGL' : 'About OxenGL'}
            </a>
            <a href="#services" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'الخدمات والأسطول' : 'Fleet & Services'}
            </a>
            <a href="#zatca" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'الامتثال و ZATCA' : 'ZATCA Compliance'}
            </a>
            <a href="#contact" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'الموقع والتواصل' : 'Contact'}
            </a>
          </nav>

          {/* Actions: Language & Auth triggers */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setLanguage(isAr ? 'en' : 'ar')}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:bg-neutral-800"
            >
              {isAr ? 'English' : 'العربية'}
            </button>

            <button
              onClick={() => openAuthModalWithTab('signup')}
              className="hidden rounded-xl border border-orange-500/40 bg-orange-950/40 px-3.5 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-900/50 sm:flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{isAr ? 'طلب فتح حساب' : 'Request Account'}</span>
            </button>

            <button
              onClick={() => openAuthModalWithTab('signin')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-1.5 text-xs font-black text-white shadow-lg shadow-orange-500/20 hover:opacity-95"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{isAr ? 'دخول النظام' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow Effects & Backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[700px] rounded-full bg-gradient-to-tr from-orange-600/15 via-amber-600/15 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left/Right Text Content */}
            <div className="space-y-6 text-center lg:col-span-7 lg:text-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-950/60 px-4 py-1.5 text-xs font-bold text-orange-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#F05627]" />
                <span>
                  {isAr
                    ? brandConfig.homepageBadgeAr || 'المنظومة الرقمية الرائدة في توريد المواد الإنشائية'
                    : brandConfig.homepageBadgeEn || 'Premier Heavy Transport & Quarry ERP'}
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.15]">
                {isAr ? (
                  brandConfig.homepageHeroTitleAr ? (
                    <span>{brandConfig.homepageHeroTitleAr}</span>
                  ) : (
                    <>
                      الريادة في أسطول النقل الثقيل{' '}
                      <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                        وتوريدات الكسارات والمشاريع
                      </span>
                    </>
                  )
                ) : brandConfig.homepageHeroTitleEn ? (
                  <span>{brandConfig.homepageHeroTitleEn}</span>
                ) : (
                  <>
                    Pioneering Heavy Transport Fleet &{' '}
                    <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      Quarry Material Supply
                    </span>
                  </>
                )}
              </h1>

              <p className="max-w-2xl text-sm text-neutral-300 sm:text-base leading-relaxed">
                {isAr
                  ? brandConfig.homepageHeroSubtitleAr ||
                    'تدير شركة ميون للمقاولات المحدودة دورة لوجستية متكاملة تشمل توريد الركام والدفان والبحص، إدارة أسطول الشاحنات الثقيلة، حساب الفاقد بدقة موازين البسكول، وإصدار الفواتير الضريبية المعتمدة وفق اشتراطات هيئة الزكاة والضريبة والجمارك.'
                  : brandConfig.homepageHeroSubtitleEn ||
                    'OxenGL manages an end-to-end operational lifecycle for raw-material sourcing, logistics services, weighbridge tickets, and invoicing.'}
              </p>

              {/* CTAs */}
              <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row lg:justify-start pt-2">
                <button
                  onClick={() => openAuthModalWithTab('signin')}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-600/30 transition-all hover:scale-[1.02] hover:shadow-orange-600/50"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isAr ? 'الدخول إلى بوابة العمليات ERP' : 'Enter Enterprise ERP Portal'}</span>
                </button>

                <button
                  onClick={() => openAuthModalWithTab('signup')}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900/90 px-6 py-3.5 text-sm font-bold text-neutral-200 hover:border-orange-500 hover:bg-neutral-800"
                >
                  <UserPlus className="h-4 w-4 text-[#F05627]" />
                  <span>{isAr ? 'تقديم طلب اعتماد حساب جديد' : 'Request Account Access'}</span>
                </button>
              </div>

              {/* Key Trust Badges */}
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-800/80 pt-6 sm:grid-cols-4">
                <div>
                  <div className="text-xl font-black text-white sm:text-2xl font-mono">
                    {brandConfig.homepageAnnualTonnage || '+500,000'}
                  </div>
                  <div className="text-[11px] text-neutral-400">{isAr ? 'طن توريدات سنوياً' : 'Annual Tonnage'}</div>
                </div>
                <div>
                  <div className="text-xl font-black text-[#F05627] sm:text-2xl font-mono">
                    {brandConfig.homepageFleetCount || '+120'}
                  </div>
                  <div className="text-[11px] text-neutral-400">{isAr ? 'شاحنة وتريلا بالأسطول' : 'Heavy Fleet Trucks'}</div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-400 sm:text-2xl font-mono">100%</div>
                  <div className="text-[11px] text-neutral-400">{isAr ? 'مطابقة ZATCA المرحلة 2' : 'ZATCA Compliant'}</div>
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-400 sm:text-2xl font-mono">
                    {brandConfig.homepageCrushersCount || '+25'}
                  </div>
                  <div className="text-[11px] text-neutral-400">{isAr ? 'مورد مواد خام معتمد' : 'Raw Materials Suppliers'}</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup / Portal Card */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur-xl">
                {/* Header of Preview Box */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-mono text-neutral-400 ms-2">
                      meayon-cloud-erp-v2026.sa
                    </span>
                  </div>
                  <span className="rounded-md bg-orange-950/80 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                    {isAr ? 'نظام حي' : 'Live System'}
                  </span>
                </div>

                {/* Simulated Dashboard UI */}
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">{isAr ? 'إجمالي المبيعات النشطة' : 'Active Revenue'}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">+18.4%</span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-white font-mono">1,025,480.00 ر.س</div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400">
                      <Scale className="h-3.5 w-3.5 text-[#F05627]" />
                      <span>{isAr ? 'تمت مطابقة 154 تذكرة ميزان بنجاح' : '154 Scale tickets reconciled'}</span>
                    </div>
                  </div>

                  {/* Fast 1-Click Role Login triggers */}
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-bold text-neutral-300">
                        {isAr ? 'حسابات التجربة والاعتماد الفوري (Trial Demo Accounts):' : 'Instant Evaluation (Seeded Demo Accounts):'}
                      </p>
                      <span className="text-[10px] font-mono text-[#F05627]">
                        {users.length} {isAr ? 'حسابات نشطة' : 'Active Accounts'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {/* 1. Muath SALAIH - CEO */}
                      <button
                        onClick={() => {
                          const user = users.find((u) => u.fullName.includes('Muath') || u.role === 'Admin') || users[0];
                          setCurrentUser(user);
                          onLoginSuccess();
                        }}
                        className="flex items-center justify-between rounded-xl border border-orange-500/40 bg-orange-950/40 p-2.5 text-right transition hover:bg-orange-900/60"
                      >
                        <div>
                          <div className="text-[11px] font-black text-orange-200">
                            {isAr ? 'معاذ صالح (CEO)' : 'Muath SALAIH (CEO)'}
                          </div>
                          <div className="text-[9px] text-orange-400">
                            {isAr ? 'المدير العام والتنفيذي • صلاحيات كاملة' : 'Executive CEO • Full Authority'}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      </button>

                      {/* 2. Abdulmajeed Ahmed - COO */}
                      <button
                        onClick={() => {
                          const user = users.find((u) => u.fullName.includes('Abdulmajeed') || u.role === 'COO') || users[0];
                          setCurrentUser(user);
                          onLoginSuccess();
                        }}
                        className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/40 p-2.5 text-right transition hover:bg-amber-900/60"
                      >
                        <div>
                          <div className="text-[11px] font-black text-amber-200">
                            {isAr ? 'عبدالمجيد أحمد (COO)' : 'Abdulmajeed Ahmed (COO)'}
                          </div>
                          <div className="text-[9px] text-amber-400">
                            {isAr ? 'المدير التنفيذي للعمليات • اعتمادات' : 'Chief Operating Officer • Approvals'}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      </button>

                      {/* 3. Abdullah Alqess - Finance Director */}
                      <button
                        onClick={() => {
                          const user = users.find((u) => u.fullName.includes('Abdullah') || u.username === 'abdullah.alqess') || users[0];
                          setCurrentUser(user);
                          onLoginSuccess();
                        }}
                        className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2.5 text-right transition hover:bg-emerald-900/60"
                      >
                        <div>
                          <div className="text-[11px] font-black text-emerald-200">
                            {isAr ? 'عبدالله القيس (Finance)' : 'Abdullah Alqess (Finance)'}
                          </div>
                          <div className="text-[9px] text-emerald-400">
                            {isAr ? 'المدير المالي • مراجعة الفواتير وموردي المواد الخام' : 'Finance Director • Accounting'}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      </button>

                      {/* 4. Maher Almkhalafi - Accountant */}
                      <button
                        onClick={() => {
                          const user = users.find((u) => u.fullName.includes('Maher') || u.username === 'maher.almkhalafi') || users[0];
                          setCurrentUser(user);
                          onLoginSuccess();
                        }}
                        className="flex items-center justify-between rounded-xl border border-teal-500/40 bg-teal-950/40 p-2.5 text-right transition hover:bg-teal-900/60"
                      >
                        <div>
                          <div className="text-[11px] font-black text-teal-200">
                            {isAr ? 'ماهر المخلافي (Accountant)' : 'Maher Almkhalafi (Accountant)'}
                          </div>
                          <div className="text-[9px] text-teal-400">
                            {isAr ? 'محاسب مالي • كشوف حساب ومطابقات' : 'Accountant • Ledgers & Payments'}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                      </button>

                      {/* 5. Amar Hudroom - Data Entry */}
                      <button
                        onClick={() => {
                          const user = users.find((u) => u.fullName.includes('Amar') || u.username === 'amar.hudroom' || u.role === 'Data_Entry') || users[0];
                          setCurrentUser(user);
                          onLoginSuccess();
                        }}
                        className="flex items-center justify-between rounded-xl border border-orange-500/40 bg-neutral-900 p-2.5 text-right transition hover:bg-neutral-800 sm:col-span-2"
                      >
                        <div>
                          <div className="text-[11px] font-black text-orange-200">
                            {isAr ? 'عمار حضرم (Data Entry)' : 'Amar Hudroom (Data Entry)'}
                          </div>
                          <div className="text-[9px] text-orange-400">
                            {isAr ? 'مدخل بيانات العمليات • تسجيل تذاكر الميزان والرحلات اليومية' : 'Data Entry Specialist • Daily Trips & Scale Tickets'}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Enterprise Capabilities Section */}
      <section id="services" className="border-t border-slate-900 bg-slate-900/50 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              {isAr ? 'ركائز المنظومة اللوجستية والتشغيلية' : 'Enterprise Logistics & Financial Capabilities'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isAr
                ? 'حلول متكاملة تضمن دقة الأوزان وسرعة الإمداد والشفافية المالية التامة بين موردي المواد الخام ومزودي الخدمات والعملاء.'
                : 'Engineered for high precision, automated scale reconciliations, and airtight financial tracking across supply chains.'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 transition-all hover:border-orange-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600/20 text-orange-400">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-black text-white">
                {isAr ? 'أسطول النقل الثقيل والتريلات' : 'Heavy Transport Fleet'}
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'أسطول تريلات وناقلات ثقيلة مجهزة لنقل الدفان، البحص، الصخور، والركام بجدولة زمنية دقيقة على مدار الساعة.'
                  : 'High-capacity heavy tippers delivering aggregate, road base, subbase, and sand to major infrastructure projects.'}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 transition-all hover:border-amber-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600/20 text-purple-400">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-black text-white">
                {isAr ? 'عقود توريد المواد الخام' : 'Raw Materials Supplier Network'}
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'شراكات مع كبرى كسارات ومقالع المملكة مع نظام دائن ومدين آلي لتسوية الأرصدة وسندات الصرف.'
                  : 'Direct partnerships with leading Saudi quarries with automated credit/debit ledger tracking and payment vouchers.'}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 transition-all hover:border-emerald-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400">
                <Scale className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-black text-white">
                {isAr ? 'رصد الفاقد وموازين البسكول' : 'Weighbridge & Loss Control'}
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'حساب تلقائي للفارق بين الوزن المحمل والوزن الصافي المستلم لكل رحلة وتحديد نسب الهدر لكل مزود خدمة.'
                  : 'Real-time calculation of loaded vs net weight per trip to pinpoint transit wastage and optimize fleet efficiency.'}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 transition-all hover:border-pink-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-600/20 text-pink-400">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-black text-white">
                {isAr ? 'فواتير ضريبية معتمدة ZATCA' : 'ZATCA Tax Invoicing Engine'}
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'إصدار الفواتير الضريبية برمز الاستجابة السريع المعتمد ودورة اعتمادات رقمية متقدمة وتوقيعات تنفيذية.'
                  : 'Official compliant tax invoice generator featuring Phase-2 QR code, multi-tier approval state-machine, and signed exports.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Vision 2030 & ZATCA Section */}
      <section id="zatca" className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-orange-900/30 bg-gradient-to-br from-neutral-900/90 via-[#181818] to-[#121212] p-8 sm:p-12 lg:flex lg:items-center lg:justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-lg bg-orange-600/20 px-3 py-1 text-xs font-bold text-orange-300">
                <Award className="h-4 w-4 text-[#F05627]" />
                <span>{isAr ? 'متوافق مع مستهدفات رؤية المملكة 2030' : 'Aligned with Saudi Vision 2030'}</span>
              </div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">
                {isAr
                  ? brandConfig.homepageAboutTitleAr || 'حوكمة تشغيلية وأمان مالي رقمي بمقاييس عالمية'
                  : brandConfig.homepageAboutTitleEn || 'Operational Governance & Digital Financial Security'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {isAr
                  ? brandConfig.homepageAboutDescriptionAr ||
                    'تلتزم شركة ميون للمقاولات المحدودة بأعلى معايير الرقابة والشفافية عبر نظام سجلات التدقيق الشامل (Audit Trail)، الحذف الآمن (Soft Delete)، والتوقيع الرقمي للمدير التنفيذي مع حماية خصوصية بيانات الشركاء.'
                  : brandConfig.homepageAboutDescriptionEn ||
                    'OxenGL enforces enterprise-grade audit logging, digital approvals, recoverability, and multi-tier role access.'}
              </p>
            </div>

            <div className="mt-8 lg:mt-0 flex flex-col gap-3 shrink-0">
              <button
                onClick={() => openAuthModalWithTab('signin')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-xs font-black text-white hover:bg-orange-500 shadow-lg shadow-orange-600/30"
              >
                <LogIn className="h-4 w-4" />
                <span>{isAr ? 'تسجيل الدخول للموظفين والشركاء' : 'Partner & Employee Login'}</span>
              </button>
              <button
                onClick={() => openAuthModalWithTab('signup')}
                className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-800/80 px-6 py-3.5 text-xs font-bold text-neutral-300 hover:bg-neutral-700"
              >
                <UserPlus className="h-4 w-4 text-[#F05627]" />
                <span>{isAr ? 'طلب اعتماد مورد أو مزود خدمة جديد' : 'Register New Supplier'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contact & Corporate Location Footer */}
      <footer id="contact" className="border-t border-neutral-800 bg-[#0e0e0e] py-12 text-neutral-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <BrandLogo size="sm" showText={false} />
                <span className="text-sm font-black text-white">{brandConfig.companyNameAr}</span>
              </div>
              <p className="text-xs text-neutral-400">
                {brandConfig.companyNameEn}
              </p>
              <p className="text-[11px] text-neutral-500">
                {isAr ? 'المملكة العربية السعودية - الرياض' : 'Riyadh, Kingdom of Saudi Arabia'}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                {isAr ? 'البيانات التجارية والضريبية' : 'Commercial Info'}
              </h4>
              <p>
                <span className="text-neutral-500">{isAr ? 'السجل التجاري:' : 'CR Number:'}</span>{' '}
                <strong className="font-mono text-neutral-300">{brandConfig.crNumber}</strong>
              </p>
              <p>
                <span className="text-neutral-500">{isAr ? 'الرقم الضريبي:' : 'VAT Number:'}</span>{' '}
                <strong className="font-mono text-neutral-300">{brandConfig.taxNumber}</strong>
              </p>
              <p>
                <span className="text-neutral-500">{isAr ? 'الحساب البنكي:' : 'Bank Account:'}</span>{' '}
                <span className="text-neutral-300">{brandConfig.bankNameAr}</span>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                {isAr ? 'التواصل المباشر' : 'Direct Contact'}
              </h4>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#F05627]" />
                <span dir="ltr" className="font-mono text-neutral-300">{brandConfig.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#F05627]" />
                <span className="text-neutral-300">{brandConfig.email}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#F05627]" />
                <span className="text-neutral-300">{brandConfig.addressAr}</span>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                {isAr ? 'بوابة الدخول السريع' : 'Quick Portal'}
              </h4>
              <button
                onClick={() => openAuthModalWithTab('signin')}
                className="w-full rounded-xl bg-orange-600/20 border border-orange-500/30 py-2 text-xs font-bold text-orange-300 hover:bg-orange-600 hover:text-white transition"
              >
                {isAr ? 'دخول النظام السحابي ERP' : 'Enter ERP Cloud'}
              </button>
            </div>
          </div>

          <div className="mt-10 border-t border-neutral-900 pt-6 text-center text-xs text-neutral-500">
            <p>
              © {new Date().getFullYear()} {brandConfig.companyNameAr} ({brandConfig.companyNameEn}).{' '}
              {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>

      {/* 6. Integrated Authentication Modal (Sign In + Sign Up with Approval Queue) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div
            id="auth-modal-dialog"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-[#181818] shadow-2xl"
          >
            {/* Modal Header */}
            <div className="border-b border-neutral-800 bg-[#121212] p-6 text-center">
              <div className="flex justify-center mb-3">
                <BrandLogo size="md" showText={false} />
              </div>
              <h3 className="text-base font-black text-white">
                {brandConfig.companyNameAr}
              </h3>
              <p className="text-[10px] font-bold text-[#F05627] tracking-wider uppercase">
                {brandConfig.companyNameEn}
              </p>

              {/* Tabs: Sign In vs Sign Up */}
              <div className="mt-4 flex rounded-xl bg-neutral-900 p-1 border border-neutral-800">
                <button
                  onClick={() => {
                    setAuthTab('signin');
                    setSignupSubmitted(false);
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    authTab === 'signin'
                      ? 'bg-[#F05627] text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {isAr ? 'تسجيل الدخول (Sign In)' : 'Sign In'}
                </button>
                <button
                  onClick={() => {
                    setAuthTab('signup');
                    setSignupSubmitted(false);
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    authTab === 'signup'
                      ? 'bg-[#F05627] text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {isAr ? 'طلب حساب جديد (Sign Up)' : 'Request Account'}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {authTab === 'signin' ? (
                /* --- Sign In Tab --- */
                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-neutral-300">
                      {isAr ? 'الشركة / رمز المؤسسة' : 'Company / organization code'}
                    </label>
                    <select
                      value={currentCompany?.id || ''}
                      onChange={(event) => {
                        const company = companies.find((item) => item.id === event.target.value);
                        if (company) setCurrentCompany(company);
                      }}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-xs font-semibold text-neutral-100 outline-none focus:border-orange-500"
                    >
                      <option value="" disabled>{isAr ? 'اختر المؤسسة' : 'Select organization'}</option>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.slug})</option>)}
                    </select>
                  </div>
                  {/* Google Sign-In (Firebase Auth) */}
                  <div>
                    <LoginButton
                      variant="dark"
                      onSuccess={() => {
                        setIsAuthModalOpen(false);
                        onLoginSuccess();
                      }}
                    />
                    <div className="relative my-3 flex items-center justify-center">
                      <div className="w-full border-t border-neutral-800" />
                      <span className="absolute bg-[#181818] px-2 text-[10px] font-semibold text-neutral-500 uppercase">
                        {isAr ? 'أو الدخول التجريبي المباشر' : 'or quick role access'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Role Selection Pills */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-neutral-300">
                      {isAr ? 'اختر الدور والصلاحية المطلوبة للدخول:' : 'Select Access Role:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { role: 'Admin' as UserRole, label: isAr ? 'المدير العام CEO' : 'Admin / CEO' },
                        { role: 'COO' as UserRole, label: isAr ? 'مدير العمليات' : 'COO Exec' },
                        { role: 'Accountant' as UserRole, label: isAr ? 'المحاسب' : 'Accountant' },
                        { role: 'Data_Entry' as UserRole, label: isAr ? 'مدخل البيانات' : 'Data Entry' },
                        { role: 'Guest' as UserRole, label: isAr ? 'بوابة العميل' : 'Guest / Audit' },
                      ].map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => handleQuickRoleSelect(item.role)}
                          className={`rounded-xl border p-2 text-center text-xs font-bold transition ${
                            selectedRole === item.role
                              ? 'border-orange-500 bg-orange-950/80 text-orange-300 ring-1 ring-orange-500'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* User Profile Selector */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-neutral-300">
                      {isAr ? 'الحساب المعتمد:' : 'Select User Profile:'}
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => {
                        setSelectedUserId(e.target.value);
                        const u = users.find((x) => x.id === e.target.value);
                        if (u) {
                          setSelectedRole(u.role);
                          setUsernameInput(u.username);
                        }
                      }}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
                    >
                      {users
                        .filter((u) => u.role === selectedRole || selectedRole === 'Admin')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullNameAr || u.fullName} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Password mock field */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-neutral-300">
                      {isAr ? 'كلمة المرور المشفرة:' : 'Password:'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value="••••••••••••"
                        readOnly
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-xs font-mono text-neutral-400 focus:outline-none"
                      />
                      <Lock className="absolute end-3 top-3 h-3.5 w-3.5 text-neutral-500" />
                    </div>
                    <span className="mt-1 block text-[10px] text-neutral-500">
                      {isAr ? 'الدخول السريع مفعل لأغراض التقييم والاعتماد' : 'Quick access enabled for system preview'}
                    </span>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(false)}
                      className="w-1/3 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-xs font-bold text-neutral-400 hover:bg-neutral-800"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-2.5 text-xs font-black text-white hover:opacity-95 shadow-md shadow-orange-600/30"
                    >
                      {isAr ? 'دخول فوري للنظام' : 'Enter System Now'}
                    </button>
                  </div>
                </form>
              ) : signupSubmitted ? (
                /* --- Sign Up Success / Pending Approval Banner --- */
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">
                      {isAr ? 'تم استلام طلبكم بنجاح!' : 'Request Submitted Successfully!'}
                    </h4>
                    <p className="mt-1.5 text-xs text-amber-300 font-semibold">
                      {isAr
                        ? 'طلبك الآن قيد مراجعة واعتماد المدير التنفيذي (Pending CEO Approval)'
                        : 'Your account request is queued for Executive CEO Approval.'}
                    </p>
                    <p className="mt-2 text-[11px] text-neutral-400 leading-relaxed">
                      {isAr
                        ? 'سيتم تفعيل حسابك وإشعارك فور مصادقة الإدارة التنفيذية على الصلاحيات المطلوبة.'
                        : 'You will receive access credentials once the Executive Admin verifies your organization.'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setAuthTab('signin');
                      setSignupSubmitted(false);
                    }}
                    className="w-full rounded-xl bg-neutral-800 py-2.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
                  >
                    {isAr ? 'العودة لتسجيل الدخول السريع' : 'Back to Sign In'}
                  </button>
                </div>
              ) : (
                /* --- Sign Up Form (Approval Workflow Queue) --- */
                <form onSubmit={handleSignUpSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-neutral-300">
                      {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'م. عبد الله الشهري' : 'Eng. Abdullah Al-Shehri'}
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value, fullNameAr: e.target.value })}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-300">
                        {isAr ? 'اسم المستخدم *' : 'Username *'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="a_shehri"
                        value={signupForm.username}
                        onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-300">
                        {isAr ? 'الصلاحية المطلوبة' : 'Requested Role'}
                      </label>
                      <select
                        value={signupForm.requestedRole}
                        onChange={(e) => setSignupForm({ ...signupForm, requestedRole: e.target.value as UserRole })}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-orange-300 focus:border-orange-500 focus:outline-none"
                      >
                        <option value="Guest">{isAr ? 'بوابة عميل / مدقق (Guest)' : 'Client Portal (Guest)'}</option>
                        <option value="Data_Entry">{isAr ? 'مدخل بيانات (Data Entry)' : 'Data Entry'}</option>
                        <option value="Accountant">{isAr ? 'محاسب مالي (Accountant)' : 'Accountant'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-300">
                        {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="user@company.sa"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-300">
                        {isAr ? 'رقم الجوال' : 'Phone Number'}
                      </label>
                      <input
                        type="tel"
                        placeholder="+966 50 123 4567"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-neutral-300">
                      {isAr ? 'الشركة / الجهة التابع لها' : 'Organization / Contractor'}
                    </label>
                    <input
                      type="text"
                      placeholder={isAr ? 'شركة مقاولات / ناقل فرعي / عميل خرسانة' : 'Contractor / Subcontractor Name'}
                      value={signupForm.organization}
                      onChange={(e) => setSignupForm({ ...signupForm, organization: e.target.value })}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(false)}
                      className="w-1/3 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-xs font-bold text-neutral-400 hover:bg-neutral-800"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-2.5 text-xs font-black text-white hover:opacity-95 shadow-md shadow-orange-600/30"
                    >
                      {isAr ? 'إرسال الطلب للاعتماد' : 'Submit for CEO Approval'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
