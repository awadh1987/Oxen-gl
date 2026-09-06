import React from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { ActiveTab } from '../components/Navbar';
import { UserRole } from '../types';
import {
  Truck,
  Building2,
  FileCheck2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  BarChart3,
  Scale,
  Award,
  Layers,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Receipt,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  DollarSign,
  Landmark,
  PlusCircle,
  Zap,
  Compass,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatTonnage } from '../utils/formatters';

interface TenantLandingHubViewProps {
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const TenantLandingHubView: React.FC<TenantLandingHubViewProps> = ({ onNavigateToTab }) => {
  const {
    language,
    currentUser,
    activeTenantLicense,
    activeTenantId,
    brandConfig,
    kpis,
    accessibleOperations,
    vouchers,
    accounts,
    customers,
    crushers,
    transporters,
    editRequests,
    canAccessFinancials,
  } = useApp();

  const isAr = language === 'ar';

  const companyName =
    activeTenantLicense?.companyName ||
    brandConfig?.companyNameAr ||
    (isAr ? 'شركة ميون الاقتصادية المحدودة' : 'Mayon Economic Company Ltd');
  const companyNameEn =
    activeTenantLicense?.companyNameEn || brandConfig?.companyNameEn || 'Mayon Economic Company Ltd';
  const commercialRegister = activeTenantLicense?.crNumber || brandConfig?.crNumber || '1010892341';
  const taxNumber = activeTenantLicense?.taxNumber || brandConfig?.taxNumber || '310294857200003';
  const bankName = brandConfig?.bankNameAr || (isAr ? 'مصرف الراجحي - الحساب الرسمي المعتمد' : 'Al Rajhi Bank');
  const contactPhone = brandConfig?.phone || '+966 11 456 7890';
  const contactEmail = brandConfig?.email || 'operations@meayon.sa';
  const contactAddress =
    brandConfig?.addressAr ||
    (isAr
      ? 'طريق الملك فهد، حي الملقا، الرياض، المملكة العربية السعودية'
      : 'King Fahd Road, Al Malqa, Riyadh, Saudi Arabia');
  const tenantKey = activeTenantLicense?.tenantId || activeTenantId || 'tenant-default-001';

  // Computed summary metrics
  const recentOperations = accessibleOperations.slice(0, 6);
  const pendingApprovalsCount = (editRequests || []).filter((r) => r.status === 'Pending').length;

  // 1. Quick Access Shortcuts (Horizontal Rectangles Row)
  const quickShortcuts = [
    {
      id: 'shortcut-ops',
      tab: 'operations' as ActiveTab,
      titleAr: 'تسجيل نقلة جديدة',
      titleEn: 'New Trip Entry',
      subtitleAr: 'إدخال وزن ومستندات الحمولة',
      subtitleEn: 'Weighbridge & slip log',
      badgeAr: `${kpis.totalTrips || accessibleOperations.length} نقلة`,
      badgeEn: `${kpis.totalTrips || accessibleOperations.length} trips`,
      icon: Truck,
      color: 'bg-orange-500/15 text-[#F05627] border-orange-500/30',
      badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-800/60',
    },
    {
      id: 'shortcut-inv',
      tab: 'invoicing' as ActiveTab,
      titleAr: 'إصدار فاتورة ضريبية',
      titleEn: 'Create Tax Invoice',
      subtitleAr: 'إصدار وتصدير فواتير ZATCA',
      subtitleEn: 'ZATCA Phase 2 billing',
      badgeAr: `${customers.length} عميل`,
      badgeEn: `${customers.length} clients`,
      icon: FileSpreadsheet,
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    },
    {
      id: 'shortcut-vouchers',
      tab: 'vouchers' as ActiveTab,
      titleAr: 'تحرير سند قبض / صرف',
      titleEn: 'New Financial Voucher',
      subtitleAr: 'سندات الدفع والقبض والتفقيط',
      subtitleEn: 'Payment & receipt vouchers',
      badgeAr: `${vouchers.length} سند`,
      badgeEn: `${vouchers.length} vouchers`,
      icon: Receipt,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    },
    {
      id: 'shortcut-accounting',
      tab: 'accounting' as ActiveTab,
      titleAr: 'دليل الحسابات والقيود',
      titleEn: 'Chart of Accounts & GL',
      subtitleAr: 'ميزان المراجعة وقائمة الدخل',
      subtitleEn: 'Double-entry & trial balance',
      badgeAr: `${accounts.length} حساب`,
      badgeEn: `${accounts.length} accounts`,
      icon: Landmark,
      color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    },
  ];

  // 2. The 4 Core Enterprise Pillars (Horizontal Rectangles in 2 balanced rows)
  const corePillars = [
    {
      id: 'pillar-fleet',
      tab: 'operations' as ActiveTab,
      titleAr: 'أسطول النقل الثقيل والتريلات',
      titleEn: 'Heavy Transport Fleet',
      descAr: 'أسطول تريلات وناقلات ثقيلة مجهزة لنقل الدفان، البحص، الصخور، والركام بجدولة زمنية دقيقة.',
      descEn: 'High-capacity tippers delivering aggregate, road base, and sand to major infrastructure.',
      icon: Truck,
      badgeAr: `${brandConfig?.homepageFleetCount || '+120'} شاحنة وتريلا`,
      badgeEn: '120+ Fleet Trucks',
      iconBg: 'bg-orange-600/20 text-orange-400 border-orange-500/30',
      actionAr: 'فتح قيد العمليات والرحلات',
      actionEn: 'Open Operations',
    },
    {
      id: 'pillar-crushers',
      tab: 'crushers' as ActiveTab,
      titleAr: 'عقود توريد وتغطية الكسارات',
      titleEn: 'Crusher & Quarry Networks',
      descAr: 'شراكات مع كبرى كسارات ومقالع المملكة مع نظام دائن ومدين آلي لتسوية الأرصدة وسندات الصرف.',
      descEn: 'Quarry partnerships with automated credit/debit tracking, royalties, and payment vouchers.',
      icon: Building2,
      badgeAr: `${crushers.length || 25}+ كسارة معتمدة`,
      badgeEn: '25+ Quarries',
      iconBg: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
      actionAr: 'استعراض حسابات الكسارات',
      actionEn: 'Open Crusher Ledgers',
    },
    {
      id: 'pillar-weighbridge',
      tab: 'transporters' as ActiveTab,
      titleAr: 'رصد الفاقد وموازين البسكول',
      titleEn: 'Weighbridge & Loss Control',
      descAr: 'حساب تلقائي للفارق بين الوزن المحمل والوزن الصافي المستلم وتحديد نسب الهدر لكل ناقل.',
      descEn: 'Real-time calculation of loaded vs net weight per trip to pinpoint transit wastage.',
      icon: Scale,
      badgeAr: `${(kpis.overallWastagePercent || 0.85).toFixed(2)}% متوسط الفاقد`,
      badgeEn: 'Wastage Control',
      iconBg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
      actionAr: 'متابعة أداء الناقلين والفاقد',
      actionEn: 'Transporter Rankings',
    },
    {
      id: 'pillar-zatca',
      tab: 'invoicing' as ActiveTab,
      titleAr: 'فواتير ضريبية معتمدة ZATCA',
      titleEn: 'ZATCA Tax Invoicing Engine',
      descAr: 'إصدار الفواتير الضريبية برمز الاستجابة السريع المعتمد ودورة اعتمادات رقمية وتوقيعات تنفيذية.',
      descEn: 'Official tax invoice generator featuring Phase-2 QR code, multi-tier approvals, and signed exports.',
      icon: FileCheck2,
      badgeAr: '100% مطابقة ZATCA المرحلة 2',
      badgeEn: 'ZATCA Phase 2',
      iconBg: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
      actionAr: 'إصدار الفواتير والضريبة',
      actionEn: 'Issue Invoices',
    },
  ];

  // 3. 9 Internal Modules (Horizontal Rectangles Grid: 3 columns)
  const quickActionCards = [
    {
      id: 'hub-action-operations',
      tab: 'operations' as ActiveTab,
      titleAr: 'قيد العمليات وتذاكر الميزان',
      titleEn: 'Daily Operations & Weighbridge',
      descAr: 'تسجيل ومطابقة بطاقات التوريد الميدانية، أوزان الكسارات والمواقع، واحتساب الفاقد فورياً.',
      descEn: 'Log weighbridge tickets, loading and unloading weights, and track daily transport operations.',
      icon: Truck,
      color: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
      badgeAr: `${formatNumber(accessibleOperations.length)} شحنة`,
      badgeEn: `${accessibleOperations.length} trips`,
    },
    {
      id: 'hub-action-dashboard',
      tab: 'dashboard' as ActiveTab,
      titleAr: 'لوحة القيادة والمؤشرات',
      titleEn: 'Executive Dashboard & KPIs',
      descAr: 'مؤشرات الأداء المالي، الرسوم البيانية للحمولات والمبيعات، ومعدلات هوامش الأرباح.',
      descEn: 'Executive financial and operational KPIs, tonnage trends, and margin analysis.',
      icon: BarChart3,
      color: 'bg-orange-600/20 text-orange-400 border-orange-500/30',
      badgeAr: 'مؤشرات حية',
      badgeEn: 'Live KPIs',
    },
    {
      id: 'hub-action-invoicing',
      tab: 'invoicing' as ActiveTab,
      titleAr: 'الفواتير الضريبية وإقرارات ZATCA',
      titleEn: 'Customer Invoicing & Tax',
      descAr: 'إصدار الفواتير الضريبية المعتمدة نظامياً، رمز الاستجابة السريع QR، وكشوفات العملاء.',
      descEn: 'Issue ZATCA-compliant VAT invoices, credit notes, and customer account statements.',
      icon: FileSpreadsheet,
      color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
      badgeAr: `${customers.length} عميل`,
      badgeEn: `${customers.length} clients`,
    },
    {
      id: 'hub-action-accounting',
      tab: 'accounting' as ActiveTab,
      titleAr: 'دليل الحسابات والمالية العامة',
      titleEn: 'Chart of Accounts & GL',
      descAr: 'شجرة الحسابات، قيود اليومية المحاسبية المزدوجة، ميزان المراجعة، وقائمة الأرباح والخسائر.',
      descEn: 'Double-entry journals, chart of accounts, trial balance, and real-time P&L reporting.',
      icon: Landmark,
      color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
      badgeAr: `${accounts.length} حساب`,
      badgeEn: `${accounts.length} accounts`,
    },
    {
      id: 'hub-action-vouchers',
      tab: 'vouchers' as ActiveTab,
      titleAr: 'سندات القبض والصرف والتفقيط',
      titleEn: 'Financial Vouchers',
      descAr: 'تحرير سندات القبض والصرف النقدية والبنكية مع التفقيط التلقائي بالعربية ودورة التوقيع.',
      descEn: 'Receipt and payment vouchers with automatic Tafqeet currency wording and approvals.',
      icon: Receipt,
      color: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
      badgeAr: `${vouchers.length} سند`,
      badgeEn: `${vouchers.length} vouchers`,
    },
    {
      id: 'hub-action-crushers',
      tab: 'crushers' as ActiveTab,
      titleAr: 'كشوفات حساب الكسارات والريع',
      titleEn: 'Crusher Ledgers & Royalties',
      descAr: 'مطالبات مواقع الكسارات، حسابات الموردين، تسويات الريع الحكومي، والدفعات المالية.',
      descEn: 'Quarry supplier balances, delivery claims, royalty deductions, and payables.',
      icon: Layers,
      color: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
      badgeAr: `${crushers.length} كسارة`,
      badgeEn: `${crushers.length} crushers`,
    },
    {
      id: 'hub-action-transporters',
      tab: 'transporters' as ActiveTab,
      titleAr: 'أداء الناقلين ورصد الفاقد',
      titleEn: 'Transporters & Shrinkage',
      descAr: 'تحليل نسب نقص الأوزان بين مواقع التحميل ومحطة التفريغ، وغرامات السائقين والأسطول.',
      descEn: 'Transporter weight shrinkage analysis, penalty enforcement, and driver rankings.',
      icon: TrendingDown,
      color: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
      badgeAr: `${transporters.length} ناقل`,
      badgeEn: `${transporters.length} transporters`,
    },
    {
      id: 'hub-action-executive-admin',
      tab: 'executive-admin' as ActiveTab,
      titleAr: 'الاعتمادات وسجل التدقيق التنفيذي',
      titleEn: 'Executive Approvals & Audit',
      descAr: 'مراجعة طلبات التعديل المعلقة، إدارة صلاحيات المستخدمين، وسجل التدقيق الشامل.',
      descEn: 'Review pending change approvals, manage user roles, and inspect the audit trail.',
      icon: ShieldCheck,
      color: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
      badgeAr: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} معلق` : 'سجل منتظم',
      badgeEn: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending` : 'All clear',
    },
    {
      id: 'hub-action-ai-insights',
      tab: 'ai-insights' as ActiveTab,
      titleAr: 'المدقق الذكي المالي واللوجستي',
      titleEn: 'AI Operations & Audit Assistant',
      descAr: 'تحليل الفاقد وتدقيق المخاطر والتنبؤات المالية الذكية بدعم محرك الذكاء الاصطناعي.',
      descEn: 'AI-assisted operational audit, shrinkage anomaly detection, and predictive insights.',
      icon: Sparkles,
      color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      badgeAr: 'Gemini AI',
      badgeEn: 'Gemini AI',
    },
  ];

  // RBAC permissions per tab for authentic role-based display
  const tabRolePermissions: Record<ActiveTab, UserRole[]> = {
    hub: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    dashboard: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    operations: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    invoicing: ['Admin', 'COO', 'Accountant', 'Guest'],
    vouchers: ['Admin', 'COO', 'Accountant'],
    accounting: ['Admin', 'COO', 'Accountant'],
    crushers: ['Admin', 'COO', 'Accountant'],
    transporters: ['Admin', 'COO', 'Accountant', 'Data_Entry'],
    'ai-insights': ['Admin', 'COO', 'Accountant'],
    'executive-admin': ['Admin', 'COO'],
    'master-data': ['Admin', 'COO'],
    'platform-tenants': ['Admin'],
    'platform-licenses': ['Admin'],
    'platform-pricing': ['Admin'],
    'platform-health': ['Admin'],
    'platform-settings': ['Admin'],
  };

  const isTabAccessible = (tab: ActiveTab): boolean => {
    const roles = tabRolePermissions[tab];
    return roles ? roles.includes(currentUser.role) : true;
  };

  const permittedShortcuts = quickShortcuts.filter((sc) => isTabAccessible(sc.tab));
  const permittedPillars = corePillars.filter((p) => isTabAccessible(p.tab));
  const permittedActionCards = quickActionCards.filter((card) => isTabAccessible(card.tab));

  return (
    <div
      id="meayon-authentic-landing-hub"
      dir={isAr ? 'rtl' : 'ltr'}
      className="w-full min-h-screen bg-[#111111] font-sans text-neutral-100 antialiased selection:bg-[#F05627] selection:text-white space-y-8 sm:space-y-10 pb-16"
    >
      {/* ======================================================== */}
      {/* 1. AUTHENTIC MEAYON TOP BANNER & IDENTITY BAR           */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#161616]/95 backdrop-blur-md px-6 py-3">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showText={false} />
            <div>
              <span className="text-sm sm:text-base font-black tracking-tight text-white block">
                {companyName}
              </span>
              <p className="text-[10px] sm:text-xs font-bold tracking-widest text-[#F05627] uppercase">
                {companyNameEn}
              </p>
            </div>
          </div>

          {/* Quick Anchor Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-bold text-neutral-300">
            <a href="#about" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'عن المنشأة' : 'About'}
            </a>
            <a href="#kpi-cards" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'المؤشرات التنفيذية' : 'Executive KPIs'}
            </a>
            <a href="#quick-shortcuts" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'الوصول السريع' : 'Quick Access'}
            </a>
            <a href="#services" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'الركائز التشغيلية' : 'Core Capabilities'}
            </a>
            <a href="#modules" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'بوابة الأقسام' : 'Modules'}
            </a>
            <a href="#contact" className="hover:text-[#F05627] transition-colors">
              {isAr ? 'الموقع والتواصل' : 'Contact'}
            </a>
          </nav>

          {/* User Session Badge & Direct Launcher (NO RE-LOGIN!) */}
          <div className="flex items-center gap-2.5">
            {/* Active User Chip */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-neutral-300 font-medium">
                {isAr ? currentUser.fullNameAr || currentUser.fullName : currentUser.fullName}
              </span>
              <span className="rounded-md bg-orange-950/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-orange-300 border border-orange-900/60">
                {currentUser.role}
              </span>
            </div>

            {/* Direct 1-Click Operations Button */}
            <button
              type="button"
              id="landing-header-btn-operations"
              onClick={() => onNavigateToTab('operations')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:opacity-95 px-3.5 py-1.5 text-xs font-black text-white shadow-md shadow-orange-600/30 transition-all cursor-pointer"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>{isAr ? 'الانتقال للعمليات' : 'Operations'}</span>
            </button>

            {/* Direct 1-Click Dashboard Button */}
            <button
              type="button"
              id="landing-header-btn-dashboard"
              onClick={() => onNavigateToTab('dashboard')}
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-200 transition-all cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
              <span>{isAr ? 'المؤشرات' : 'Dashboard'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION: PIONEERING HEAVY TRANSPORT & FLEET      */}
      {/* ======================================================== */}
      <section id="about" className="relative overflow-hidden pt-6 pb-8 lg:pt-10 lg:pb-10 px-4 sm:px-6 lg:px-8">
        {/* Glow Effects & Ambient Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-[650px] rounded-full bg-gradient-to-tr from-orange-600/20 via-amber-600/15 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="w-full">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left/Right Text Content */}
            <div className="space-y-5 text-center lg:col-span-7 lg:text-start">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-950/60 px-3.5 py-1 text-xs font-bold text-orange-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#F05627]" />
                <span>
                  {isAr
                    ? brandConfig?.homepageBadgeAr || 'المنظومة الرقمية الرائدة في توريد المواد الإنشائية ونقليات المقاولات'
                    : brandConfig?.homepageBadgeEn || 'Premier Heavy Transport & Quarry Logistics ERP'}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.25]">
                {isAr ? (
                  <>
                    الريادة في أسطول النقل الثقيل{' '}
                    <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      وتوريدات الكسارات والمشاريع
                    </span>
                  </>
                ) : (
                  <>
                    Pioneering Heavy Transport Fleet &{' '}
                    <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      Quarry Material Supply
                    </span>
                  </>
                )}
              </h1>

              {/* Subtitle Description */}
              <p className="max-w-2xl text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {isAr
                  ? brandConfig?.homepageHeroSubtitleAr ||
                    'تدير شركة ميون للمقاولات المحدودة دورة لوجستية متكاملة تشمل توريد الركام والدفان والبحص، إدارة أسطول الشاحنات الثقيلة، حساب الفاقد بدقة موازين البسكول، وإصدار الفواتير الضريبية المعتمدة وفق اشتراطات هيئة الزكاة والضريبة والجمارك.'
                  : brandConfig?.homepageHeroSubtitleEn ||
                    'Meayon Economic Contracting Co. Ltd. manages an end-to-end operational lifecycle for building materials haulage, crusher payables, weighbridge scale tickets, and ZATCA Phase-2 certified invoicing.'}
              </p>

              {/* DIRECT ACTION BUTTONS (NO REPEATED LOGIN!) */}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start pt-1">
                <button
                  type="button"
                  id="hero-btn-operations"
                  onClick={() => onNavigateToTab('operations')}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Truck className="h-4 w-4" />
                  <span>{isAr ? 'الدخول المباشر إلى قيد العمليات وتذاكر الميزان' : 'Open Operations & Weighbridge'}</span>
                </button>

                <button
                  type="button"
                  id="hero-btn-dashboard"
                  onClick={() => onNavigateToTab('dashboard')}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/90 px-5 py-3 text-xs sm:text-sm font-bold text-neutral-200 hover:border-orange-500 hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span>{isAr ? 'استعراض لوحة المؤشرات المالية' : 'View Financial Dashboard'}</span>
                </button>
              </div>

              {/* Key Trust Badges in a Horizontal Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-neutral-800/80 pt-4">
                <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2.5 text-center">
                  <div className="text-lg font-black text-white font-mono">
                    {formatTonnage(kpis.totalDeliveredTonnage || 500000)}
                  </div>
                  <div className="text-[10.5px] text-neutral-400 mt-0.5">{isAr ? 'طن توريدات' : 'Delivered Tons'}</div>
                </div>
                <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2.5 text-center">
                  <div className="text-lg font-black text-[#F05627] font-mono">
                    {brandConfig?.homepageFleetCount || '+120'}
                  </div>
                  <div className="text-[10.5px] text-neutral-400 mt-0.5">{isAr ? 'شاحنة وتريلا' : 'Fleet Trucks'}</div>
                </div>
                <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2.5 text-center">
                  <div className="text-lg font-black text-amber-400 font-mono">100%</div>
                  <div className="text-[10.5px] text-neutral-400 mt-0.5">{isAr ? 'مطابقة ZATCA 2' : 'ZATCA Phase 2'}</div>
                </div>
                <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2.5 text-center">
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {crushers.length || 25}+
                  </div>
                  <div className="text-[10.5px] text-neutral-400 mt-0.5">{isAr ? 'كسارة ومحجر' : 'Partner Quarries'}</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup / Live Portal Box */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 shadow-2xl backdrop-blur-xl">
                {/* Header of Simulated Preview Box */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-mono text-neutral-400 ms-2">
                      meayon-cloud-erp-v2026.sa
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-800/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isAr ? 'نظام حي معزول' : 'Live Isolated'}</span>
                  </span>
                </div>

                {/* Horizontal Rectangular Live Metric Strips */}
                <div className="mt-3.5 space-y-2.5">
                  {/* Revenue Horizontal Strip */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">{isAr ? 'إجمالي المبيعات النشطة' : 'Active Revenue'}</span>
                      <span className="text-lg font-black text-white font-mono">
                        {formatCurrency(kpis.totalSales || 1025480)}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 block">+18.4% نمو</span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {formatNumber(accessibleOperations.length || 154)} {isAr ? 'تذكرة ميزان' : 'tickets'}
                      </span>
                    </div>
                  </div>

                  {/* Profit Margin Strip */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">{isAr ? 'صافي الربح التشغيلي' : 'Net Operating Profit'}</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {formatCurrency(kpis.netOperatingProfit || 156820)}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-mono font-bold text-amber-400 block">
                        {(kpis.profitMarginPercent || 15.2).toFixed(1)}% هامش
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {isAr ? 'مطابق محاسبياً' : 'Reconciled'}
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Launch Button */}
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('operations')}
                    className="w-full flex items-center justify-between rounded-xl border border-orange-500/40 bg-orange-950/30 p-2.5 text-right transition hover:bg-orange-900/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-orange-400 shrink-0" />
                      <div>
                        <div className="text-xs font-black text-orange-200">
                          {isAr ? 'فتح قيد العمليات وتذاكر الميزان' : 'Open Operations View'}
                        </div>
                        <div className="text-[10px] text-orange-400">
                          {isAr ? 'دخول مباشر دون الحاجة لإعادة تسجيل الدخول' : 'Direct access without re-login'}
                        </div>
                      </div>
                    </div>
                    {isAr ? <ChevronLeft className="h-4 w-4 text-orange-400" /> : <ChevronRight className="h-4 w-4 text-orange-400" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. EXECUTIVE KPI CARDS ROW: RECTANGULAR IN HORIZONTAL ROW */}
      {/* ======================================================== */}
      <section id="kpi-cards" className="px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#F05627]" />
              <span>{isAr ? 'المؤشرات المالية والتشغيلية التنفيذية (KPIs)' : 'Executive Financial & Operational KPIs'}</span>
            </h2>
            <span className="text-[11px] font-bold text-neutral-500">
              {isAr ? 'مستخرجة مباشرة من سجل العمليات والقيود' : 'Direct from ledger & tickets'}
            </span>
          </div>

          {/* 4 Rectangular Horizontal Cards in a Side-by-Side Row */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4">
            {/* KPI 1: Gross Sales */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-sm hover:border-orange-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-400 block">
                  {isAr ? 'إجمالي المبيعات (النشطة)' : 'Gross Sales'}
                </span>
                <div className="text-lg sm:text-xl font-black text-white font-mono">
                  {canAccessFinancials ? formatCurrency(kpis.totalSales, language) : '*** محمي'}
                </div>
                <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-semibold font-mono">
                  <span>{isAr ? '+14.2% نمو تشغيلي' : '+14.2% MoM'}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-[#F05627] border border-orange-500/30">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            {/* KPI 2: Net Operating Profit */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-sm hover:border-emerald-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-400 block">
                  {isAr ? 'صافي هامش الربح التشغيلي' : 'Net Operating Profit'}
                </span>
                <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                  {canAccessFinancials ? formatCurrency(kpis.netOperatingProfit, language) : '*** محمي'}
                </div>
                <div className="text-[10.5px] text-amber-400 font-semibold font-mono">
                  {isAr ? 'الهامش:' : 'Margin:'} {kpis.profitMarginPercent.toFixed(1)}%
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            {/* KPI 3: Delivered Tonnage */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-sm hover:border-blue-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-400 block">
                  {isAr ? 'الحمولات المستلمة' : 'Delivered Tonnage'}
                </span>
                <div className="text-lg sm:text-xl font-black text-white font-mono">
                  {formatTonnage(kpis.totalDeliveredTonnage, language)}
                </div>
                <div className="text-[10.5px] text-neutral-400 font-semibold">
                  <span>{kpis.totalTrips || accessibleOperations.length} {isAr ? 'رحلة مسجلة' : 'trips'}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Scale className="h-5 w-5" />
              </div>
            </div>

            {/* KPI 4: Haulage Wastage Loss */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-sm hover:border-rose-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-400 block">
                  {isAr ? 'فاقد النقل وموازين البسكول' : 'Cumulative Wastage Loss'}
                </span>
                <div className="text-lg sm:text-xl font-black text-rose-400 font-mono">
                  {formatTonnage(kpis.totalWastageTonnage, language)}
                </div>
                <div className="text-[10.5px] text-neutral-400 font-semibold font-mono">
                  <span className="text-rose-400">{kpis.overallWastagePercent.toFixed(2)}%</span> {isAr ? 'متوسط الفاقد' : 'avg loss'}
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. QUICK SHORTCUTS HUB: 4 HORIZONTAL RECTANGULAR CARDS   */}
      {/* ======================================================== */}
      <section id="quick-shortcuts" className="px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/90 to-neutral-950/70 p-4 sm:p-5 shadow-sm">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F05627] text-white shadow-xs">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-wider text-white">
                  {isAr ? 'مركز الوصول السريع للعمليات والفواتير' : 'Quick Access Command Hub'}
                </h2>
              </div>
              <span className="text-[11px] font-bold text-neutral-400">
                {isAr ? 'روابط التشغيل والإدخال المباشر' : 'Instant ERP Shortcuts'}
              </span>
            </div>

            {/* 4 Horizontal Rectangles Side-by-Side */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4">
              {permittedShortcuts.map((sc) => {
                const Icon = sc.icon;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onNavigateToTab(sc.tab)}
                    className="group flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/95 p-3.5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${sc.color} transition-transform group-hover:scale-105`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white group-hover:text-orange-400 transition-colors">
                            {isAr ? sc.titleAr : sc.titleEn}
                          </span>
                          <PlusCircle className="h-3.5 w-3.5 text-[#F05627] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                          {isAr ? sc.subtitleAr : sc.subtitleEn}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold border ${sc.badgeBg} shrink-0`}>
                      {isAr ? sc.badgeAr : sc.badgeEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. CORE PILLARS: 4 HORIZONTAL RECTANGULAR CARDS          */}
      {/* ======================================================== */}
      <section id="services" className="px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="mb-3.5 flex items-center justify-between border-b border-neutral-800 pb-2">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#F05627]" />
                <span>{isAr ? 'ركائز المنظومة اللوجستية والتشغيلية المعتمدة' : 'Enterprise Logistics & Financial Capabilities'}</span>
              </h2>
            </div>
            <span className="text-[11px] font-bold text-neutral-500">
              {isAr ? 'حلول متكاملة تضمن دقة الأوزان وسرعة الإمداد' : 'High precision & scale reconciliations'}
            </span>
          </div>

          {/* 4 Cards Formatted as Sleek Horizontal Rectangles in 2 Rows */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {permittedPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.id}
                  onClick={() => onNavigateToTab(pillar.tab)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-sm hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${pillar.iconBg} transition-transform group-hover:scale-105`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-orange-400 transition-colors">
                          {isAr ? pillar.titleAr : pillar.titleEn}
                        </h3>
                        <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-mono font-bold text-neutral-300 border border-neutral-700">
                          {isAr ? pillar.badgeAr : pillar.badgeEn}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xl">
                        {isAr ? pillar.descAr : pillar.descEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 border-neutral-800 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-start">
                    <span className="text-xs font-bold text-orange-400 group-hover:text-orange-300 transition-colors">
                      {isAr ? pillar.actionAr : pillar.actionEn}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-800 text-orange-400 group-hover:bg-[#F05627] group-hover:text-white transition-all">
                      {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. VISION 2030 & ZATCA COMPLIANCE (HORIZONTAL RECTANGLE) */}
      {/* ======================================================== */}
      <section id="zatca" className="px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 rounded-2xl border border-orange-900/40 bg-gradient-to-r from-neutral-900/95 via-[#181818] to-[#141414] p-5 sm:p-6 shadow-xl">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md bg-orange-600/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-300 border border-orange-600/30">
                <Award className="h-3.5 w-3.5 text-[#F05627]" />
                <span>{isAr ? 'متوافق مع مستهدفات رؤية المملكة 2030' : 'Aligned with Saudi Vision 2030'}</span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {isAr
                  ? brandConfig?.homepageAboutTitleAr || 'حوكمة تشغيلية وأمان مالي رقمي بمقاييس عالمية'
                  : brandConfig?.homepageAboutTitleEn || 'Operational Governance & Digital Financial Security'}
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {isAr
                  ? brandConfig?.homepageAboutDescriptionAr ||
                    'تلتزم شركة ميون للمقاولات المحدودة بأعلى معايير الرقابة والشفافية عبر نظام سجلات التدقيق الشامل (Audit Trail)، الحذف الآمن (Soft Delete)، والتوقيع الرقمي للمدير التنفيذي مع حماية خصوصية بيانات الشركاء.'
                  : brandConfig?.homepageAboutDescriptionEn ||
                    'Meayon Economic Contracting Co. Ltd. enforces enterprise-grade audit logging, digital cryptographic approvals, and soft-delete recoverability.'}
              </p>
            </div>

            <div className="flex flex-row gap-2.5 shrink-0 w-full md:w-auto justify-end">
              {isTabAccessible('executive-admin') && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('executive-admin')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-600/30 transition cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{isAr ? 'سجل الاعتمادات والرقابة' : 'Audit Trail'}</span>
                </button>
              )}
              {isTabAccessible('accounting') && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('accounting')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 px-4 py-2.5 text-xs font-bold text-neutral-300 transition cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-[#F05627]" />
                  <span>{isAr ? 'دليل الحسابات' : 'Chart of Accounts'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. INTERACTIVE MODULE HUB: HORIZONTAL RECTANGULAR CARDS   */}
      {/* ======================================================== */}
      <section id="modules" className="px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5 mb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#F05627]" />
                <span>{isAr ? 'بوابة الانتقال المباشر لأقسام المنظومة' : 'Operations & Accounting Launchpad'}</span>
              </h2>
            </div>
            <div className="text-xs font-mono text-neutral-400">
              {permittedActionCards.length} {isAr ? 'وحدات مفعّلة' : 'Active Modules'}
            </div>
          </div>

          {/* Horizontal Rectangles Arranged in Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-3.5">
            {permittedActionCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  id={card.id}
                  onClick={() => onNavigateToTab(card.tab)}
                  className="group flex items-center justify-between gap-3.5 rounded-xl border border-neutral-800 bg-neutral-900/90 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/60 hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${card.color} transition-transform group-hover:scale-105`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-orange-400 transition-colors truncate">
                          {isAr ? card.titleAr : card.titleEn}
                        </h3>
                        <span className="rounded-full bg-neutral-800 px-2 py-0.2 text-[10px] font-mono font-bold text-neutral-300 border border-neutral-700 shrink-0">
                          {isAr ? card.badgeAr : card.badgeEn}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {isAr ? card.descAr : card.descEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-orange-400 group-hover:bg-[#F05627] group-hover:text-white transition-all">
                    {isAr ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. LIVE WEIGHBRIDGE OPERATIONS SNAPSHOT TABLE            */}
      {/* ======================================================== */}
      <section id="recent-ops" className="px-4 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-neutral-800">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#F05627]" />
                <span>{isAr ? 'عينة حية من أحدث الشحنات والعمليات المسجلة' : 'Recent Recorded Weighbridge Operations'}</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('operations')}
              className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'عرض كافة العمليات الميدانية' : 'View All Operations'}</span>
              {isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>

          {recentOperations.length === 0 ? (
            <div className="p-6 text-center text-neutral-500 text-xs">
              {isAr ? 'لا توجد عمليات مسجلة حالياً، ابدأ بتسجيل أول بطاقة ميزان.' : 'No operations found. Start by recording your first weighbridge ticket.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-bold">
                    <th className="py-2 px-3">{isAr ? 'رقم الإشعار / الشحنة' : 'Ticket #'}</th>
                    <th className="py-2 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2 px-3">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="py-2 px-3">{isAr ? 'الكسارة' : 'Quarry'}</th>
                    <th className="py-2 px-3">{isAr ? 'المادة' : 'Material'}</th>
                    <th className="py-2 px-3">{isAr ? 'الصافي (طن)' : 'Net Tons'}</th>
                    <th className="py-2 px-3">{isAr ? 'نسبة الفاقد' : 'Shrinkage %'}</th>
                    <th className="py-2 px-3">{isAr ? 'صافي الربح' : 'Net Profit'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {recentOperations.map((op) => (
                    <tr key={op.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-orange-300">{op.scale_ticket_no || op.id}</td>
                      <td className="py-2 px-3 text-neutral-400">{op.loading_date}</td>
                      <td className="py-2 px-3 font-bold text-neutral-200">{op.destination_customer}</td>
                      <td className="py-2 px-3 text-neutral-400">{op.loading_source}</td>
                      <td className="py-2 px-3 text-neutral-400">{op.material_type}</td>
                      <td className="py-2 px-3 font-mono font-bold text-neutral-200">{formatTonnage(op.qty_delivered || 0)}</td>
                      <td className="py-2 px-3 font-mono font-bold">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                          (op.wastage_percentage || 0) > 1.5 ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                        }`}>
                          {(op.wastage_percentage || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(op.net_profit || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. AUTHENTIC CONTACT & COMMERCIAL INFO FOOTER            */}
      {/* ======================================================== */}
      <footer id="contact" className="border-t border-neutral-800/80 bg-[#0e0e0e] pt-8 pb-5 px-4 sm:px-6 lg:px-8 text-neutral-400">
        <div className="w-full">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4">
            {/* Col 1: Identity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" showText={false} />
                <span className="text-xs sm:text-sm font-black text-white">{companyName}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {companyNameEn}
              </p>
              <p className="text-[10px] text-neutral-500">
                {isAr ? 'المملكة العربية السعودية - الرياض' : 'Riyadh, Kingdom of Saudi Arabia'}
              </p>
              <div className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-orange-400 border border-neutral-800">
                <span>Tenant ID: {tenantKey}</span>
              </div>
            </div>

            {/* Col 2: Commercial & Tax Info */}
            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                {isAr ? 'البيانات التجارية والضريبية' : 'Commercial Info'}
              </h4>
              <p className="text-[11px]">
                <span className="text-neutral-500">{isAr ? 'السجل التجاري:' : 'CR:'}</span>{' '}
                <strong className="font-mono text-neutral-200">{commercialRegister}</strong>
              </p>
              <p className="text-[11px]">
                <span className="text-neutral-500">{isAr ? 'الرقم الضريبي:' : 'VAT:'}</span>{' '}
                <strong className="font-mono text-neutral-200">{taxNumber}</strong>
              </p>
              <p className="text-[11px]">
                <span className="text-neutral-500">{isAr ? 'الحساب البنكي:' : 'Bank:'}</span>{' '}
                <span className="text-neutral-300">{bankName}</span>
              </p>
            </div>

            {/* Col 3: Direct Contact */}
            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                {isAr ? 'التواصل المباشر' : 'Direct Contact'}
              </h4>
              <p className="flex items-center gap-1.5 text-[11px]">
                <Phone className="h-3 w-3 text-[#F05627]" />
                <span dir="ltr" className="font-mono text-neutral-300">{contactPhone}</span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px]">
                <Mail className="h-3 w-3 text-[#F05627]" />
                <span className="text-neutral-300">{contactEmail}</span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px]">
                <MapPin className="h-3 w-3 text-[#F05627]" />
                <span className="text-neutral-300">{contactAddress}</span>
              </p>
            </div>

            {/* Col 4: Quick Launch Shortcuts */}
            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                {isAr ? 'الانتقال السريع للأقسام' : 'Quick Launch'}
              </h4>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('operations')}
                  className="rounded-lg bg-neutral-900 border border-neutral-800 p-1.5 text-center text-[10.5px] font-bold text-neutral-300 hover:text-white hover:border-orange-500/50 transition cursor-pointer"
                >
                  {isAr ? 'العمليات' : 'Operations'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('dashboard')}
                  className="rounded-lg bg-neutral-900 border border-neutral-800 p-1.5 text-center text-[10.5px] font-bold text-neutral-300 hover:text-white hover:border-orange-500/50 transition cursor-pointer"
                >
                  {isAr ? 'المؤشرات' : 'Dashboard'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('invoicing')}
                  className="rounded-lg bg-neutral-900 border border-neutral-800 p-1.5 text-center text-[10.5px] font-bold text-neutral-300 hover:text-white hover:border-orange-500/50 transition cursor-pointer"
                >
                  {isAr ? 'الفواتير' : 'Invoices'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('accounting')}
                  className="rounded-lg bg-neutral-900 border border-neutral-800 p-1.5 text-center text-[10.5px] font-bold text-neutral-300 hover:text-white hover:border-orange-500/50 transition cursor-pointer"
                >
                  {isAr ? 'الحسابات' : 'Accounting'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-neutral-900 pt-4 text-center text-[11px] text-neutral-500">
            <p>
              © {new Date().getFullYear()} {companyName} ({companyNameEn}).{' '}
              {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
