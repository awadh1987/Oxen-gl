import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { PersistentNavbarNotifications } from './PersistentNavbarNotifications';
import { useTheme } from '../hooks/useOxenThemeEngine';
import {
  Bell,
  Globe,
  UserCheck,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
  Printer,
  Truck,
  TrendingDown,
  Landmark,
  Receipt,
  FileSpreadsheet,
  Building2,
  Database,
  ShieldCheck,
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  ChevronRight,
  Moon,
  Sun,
  Crown,
  KeyRound,
  CreditCard,
  Activity,
  Sliders,
  Megaphone,
  Cloud,
} from 'lucide-react';
import { UserRole } from '../types';

export type ActiveTab =
  | 'hub'
  | 'dashboard'
  | 'operations'
  | 'invoicing'
  | 'vouchers'
  | 'accounting'
  | 'crushers'
  | 'transporters'
  | 'ai-insights'
  | 'executive-admin'
  | 'master-data'
  | 'platform-tenants'
  | 'platform-licenses'
  | 'platform-pricing'
  | 'platform-health'
  | 'platform-settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAIModal?: () => void;
  onOpenExportPrintModal?: () => void;
  onOpenGoogleDriveModal?: () => void;
  onLogout?: () => void;
}

interface NavSubItem {
  id: ActiveTab;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string | null;
  hintAr?: string;
  hintEn?: string;
}

interface NavCategory {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavSubItem[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAIModal,
  onOpenExportPrintModal,
  onOpenGoogleDriveModal,
  onLogout,
}) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    language,
    setLanguage,
    resetToDefaults,
    kpis,
    isOnline,
    signOutAuth,
    isDriverMode,
    activeTenantId,
    activeTenantLicense,
    availableTenants,
    switchTenant,
    isPlatformSuperAdmin,
    tenantRole,
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const tenantDropdownRef = useRef<HTMLDivElement>(null);
  const { themeMode, toggleThemeMode } = useTheme();
  const navigate = useNavigate();

  const isAr = language === 'ar';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(event.target as Node)) {
        setShowTenantDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleColors: Record<UserRole, { bg: string; text: string; border: string; labelAr: string; labelEn: string }> = {
    Admin: {
      bg: 'bg-orange-50',
      text: 'text-[#F05627]',
      border: 'border-orange-200',
      labelAr: 'المدير العام CEO (Admin)',
      labelEn: 'Admin / CEO',
    },
    COO: {
      bg: 'bg-neutral-100',
      text: 'text-neutral-900',
      border: 'border-neutral-300',
      labelAr: 'مدير العمليات (COO)',
      labelEn: 'COO Executive',
    },
    Accountant: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      labelAr: 'محاسب (Accountant)',
      labelEn: 'Accountant',
    },
    Data_Entry: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      labelAr: 'مدخل بيانات (Data Entry)',
      labelEn: 'Data Entry Operator',
    },
    Guest: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      labelAr: 'مراجع / بوابة عميل (Guest)',
      labelEn: 'Guest / Client Auditor',
    },
  };

  const isPlatformOwner = isPlatformSuperAdmin || currentUser.role === 'Admin';
  const isPlatformMasterActive = activeTenantId === 'oxengl-platform';

  // ==========================================================
  // TWO HORIZONTAL NAVIGATION ROWS DEFINITIONS (AUTHENTIC MYON ERP)
  // ==========================================================
  // Row 1: Operations, Field Logistics & Core Foundation
  const row1Items: NavSubItem[] = [
    {
      id: 'hub',
      labelAr: 'الرئيسية (مركز المنشأة)',
      labelEn: 'Home Hub',
      icon: Building2,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: 'Hub',
      hintAr: 'لوحة الهبوط المركزية والمؤشرات الأساسية للمنشأة',
      hintEn: 'Main company landing hub and quick metrics',
    },
    {
      id: 'dashboard',
      labelAr: 'لوحة القيادة والمؤشرات',
      labelEn: 'Executive Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: 'KPIs',
      hintAr: 'مؤشرات الأداء المالي والتشغيلي وتحليلات الإيرادات',
      hintEn: 'Executive KPIs, analytics and operational charts',
    },
    {
      id: 'operations',
      labelAr: 'قيد العمليات اليومية',
      labelEn: 'Daily Operations Logs',
      icon: Truck,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: isDriverMode ? (isAr ? 'نشط' : 'Active') : null,
      hintAr: 'تسجيل وتدقيق بطاقات التوريد وتذاكر الميزان الميدانية',
      hintEn: 'Daily trip logs & weighbridge tickets',
    },
    {
      id: 'transporters',
      labelAr: 'أداء الناقلين ورصد الفاقد',
      labelEn: 'Transporters & Shrinkage',
      icon: TrendingDown,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry'],
      badge: isAr ? 'الفاقد' : 'Loss',
      hintAr: 'تتبع نسب النقص وغرامات الشحن وتصنيف أداء السائقين',
      hintEn: 'Driver metrics & shrinkage fines',
    },
    {
      id: 'crushers',
      labelAr: 'كشوفات حساب الكسارات',
      labelEn: 'Crusher Statements',
      icon: Building2,
      roles: ['Admin', 'COO', 'Accountant'],
      hintAr: 'مطالبات ومستحقات مواقع الكسارات والمدفوعات',
      hintEn: 'Quarry payable statements & balances',
    },
    {
      id: 'master-data',
      labelAr: 'البيانات الأساسية والتسعير',
      labelEn: 'Master Data & Pricing',
      icon: Database,
      roles: ['Admin', 'COO'],
      badge: isAr ? 'تأسيس' : 'Master',
      hintAr: 'إدارة العملاء، الكسارات، المواد، والناقلين والتسعير المعتمد',
      hintEn: 'Clients, quarry partners, materials & approved pricing',
    },
  ];

  // Row 2: Finance, Tax Invoicing, Approvals & Smart AI Auditor
  const row2Items: NavSubItem[] = [
    {
      id: 'invoicing',
      labelAr: 'الفواتير الضريبية للعملاء',
      labelEn: 'Customer Tax Invoicing',
      icon: FileSpreadsheet,
      roles: ['Admin', 'COO', 'Accountant', 'Guest'],
      badge: 'ZATCA',
      hintAr: 'إصدار وتوقيع الفواتير الضريبية وإشعارات الخصم المعتمدة',
      hintEn: 'ZATCA compliant tax invoices & statements',
    },
    {
      id: 'vouchers',
      labelAr: 'سندات القبض والصرف',
      labelEn: 'Financial Vouchers',
      icon: Receipt,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: isAr ? 'سندات' : 'Vouchers',
      hintAr: 'إيصالات المقبوضات والمدفوعات البنكية والنقدية والتفقيط',
      hintEn: 'Receipt & payment vouchers with Tafqeet',
    },
    {
      id: 'accounting',
      labelAr: 'دليل الحسابات والقوائم المالية',
      labelEn: 'Chart of Accounts & GL',
      icon: Landmark,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: 'CoA',
      hintAr: 'شجرة الحسابات، قيود اليومية، ميزان المراجعة والأرباح',
      hintEn: 'Chart of accounts, journals, trial balance & P&L',
    },
    {
      id: 'executive-admin',
      labelAr: 'لوحة الاعتمادات وسجل التدقيق',
      labelEn: 'Executive Approvals & Audit',
      icon: ShieldCheck,
      roles: ['Admin', 'COO'],
      badge: kpis.pendingApprovalsCount > 0 ? `${kpis.pendingApprovalsCount}` : null,
      hintAr: 'سجل التدقيق الشامل، إدارة المستخدمين والاعتمادات التنفيذية',
      hintEn: 'Comprehensive audit trail, users & executive approvals',
    },
    {
      id: 'ai-insights',
      labelAr: 'المدقق الذكي والتحليلات',
      labelEn: 'AI Operations Auditor',
      icon: Sparkles,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: 'Gemini AI',
      hintAr: 'تحليل الفاقد وتدقيق المخاطر والتنبؤات بالذكاء الاصطناعي',
      hintEn: 'Smart wastage detection & anomaly analysis',
    },
  ];

  // Platform Master items (when active in platform master console)
  const platformNavItems: NavSubItem[] = [
    {
      id: 'platform-tenants',
      labelAr: 'سجل المنشآت والشركات (Tenants)',
      labelEn: 'Tenants Registry',
      icon: Building2,
      roles: ['Admin'],
      badge: 'SaaS',
      hintAr: 'قائمة حسابات وتراخيص الشركات المشتركة',
      hintEn: 'Client accounts & tenant entities',
    },
    {
      id: 'platform-licenses',
      labelAr: 'إدارة التراخيص وتوليد المفاتيح',
      labelEn: 'License Provisioner',
      icon: KeyRound,
      roles: ['Admin'],
      badge: 'JWT',
      hintAr: 'توليد المفاتيح الرقمية وضبط حصص الشركات',
      hintEn: 'Issue cryptographic licenses & limits',
    },
    {
      id: 'platform-pricing',
      labelAr: 'خطط وباقات الأسعار',
      labelEn: 'Pricing Plans & Quotas',
      icon: CreditCard,
      roles: ['Admin'],
      hintAr: 'باقات Starter و Pro و Enterprise والخصائص',
      hintEn: 'Subscription tiers & features',
    },
    {
      id: 'platform-health',
      labelAr: 'فحص عزل النظام (17 جدولاً)',
      labelEn: 'System Isolation & Health',
      icon: Activity,
      roles: ['Admin'],
      badge: 'RLS',
      hintAr: 'تدقيق سلامة العزل المشترك للبيانات والامتثال',
      hintEn: 'Multi-tenant row-level security audit',
    },
    {
      id: 'platform-settings',
      labelAr: 'إعدادات مالك المنصة والهوية',
      labelEn: 'Platform Owner Settings',
      icon: Sliders,
      roles: ['Admin'],
      badge: 'Master',
      hintAr: 'الهوية البصرية، الشعار، ومعايير منصة OxenGL',
      hintEn: 'Master branding, announcements & defaults',
    },
  ];

  // Filter items based on current user role (RBAC)
  const isItemVisible = (item: NavSubItem) => {
    return item.roles.includes(currentUser.role);
  };

  const visibleRow1Items = row1Items.filter(isItemVisible);
  const visibleRow2Items = (isPlatformMasterActive ? platformNavItems : row2Items).filter(isItemVisible);

  return (
    <header
      id="main-app-header"
      dir={isAr ? 'rtl' : 'ltr'}
      className="sticky top-0 z-40 w-full bg-white shadow-xs transition-all"
    >
      {/* ======================================================== */}
      {/* TIER 1 (TOP BAR): BRANDING, LOGO & UTILITY TOOLS         */}
      {/* ======================================================== */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-6">
          
          {/* Brand Logo & Corporate Title (Far Right in RTL) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] text-right bg-transparent border-0 p-0 cursor-pointer"
              title={isAr ? 'الذهاب لصفحة الهبوط الرئيسية (Hub)' : 'Go to Tenant Landing Hub'}
            >
              <BrandLogo size="md" showText={true} horizontal={true} />
            </button>
            
            <div className="hidden h-7 w-px bg-slate-200 xl:block" />
            <span className="hidden text-xs font-bold text-slate-500 xl:inline">
              {isAr ? 'المنظومة الرقمية لإدارة النقليات والكسارات' : 'Meayon Enterprise Logistics & Quarry ERP'}
            </span>
          </div>

          {/* Utility Tools & User Profile (Far Left in RTL) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Offline / Quarry Sync Indicator */}
            {!isOnline ? (
              <div
                id="nav-offline-status-pill"
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-xs animate-pulse"
                title={
                  isAr
                    ? 'وضع العمل دون اتصال نشط: يتم حفظ العمليات والسندات محلياً في الذاكرة التخزينية الميدانية'
                    : 'Offline Mode Active: All weighbridge data and vouchers persist locally'
                }
              >
                <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden xl:inline">
                  {isAr ? 'أوفلاين - حفظ محلي' : 'Offline'}
                </span>
              </div>
            ) : (
              <div
                id="nav-online-status-pill"
                className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 xl:flex"
                title={isAr ? 'متصل بقاعدة البيانات المركزية' : 'Online & Synchronized'}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>{isAr ? 'مزامنة فورية' : 'Live Sync'}</span>
              </div>
            )}

            {/* Print & Export Quick Button */}
            {onOpenExportPrintModal && (
              <button
                id="nav-export-print-btn"
                type="button"
                onClick={onOpenExportPrintModal}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-900 transition-all"
                title={isAr ? 'معاينة حية للطباعة وتصدير المستندات' : 'Live Print Preview & Export'}
              >
                <Printer className="h-3.5 w-3.5 text-[#F05627]" />
                <span className="hidden lg:inline">{isAr ? 'طباعة وتصدير' : 'Export & Print'}</span>
              </button>
            )}

            {/* Google Drive Cloud Archive & Sync Button */}
            {onOpenGoogleDriveModal && (
              <button
                id="nav-google-drive-btn"
                type="button"
                onClick={onOpenGoogleDriveModal}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-bold text-indigo-900 shadow-xs hover:border-indigo-300 hover:bg-indigo-100 transition-all cursor-pointer"
                title={isAr ? 'Google Drive - سحابة التخزين والأرشفة' : 'Google Drive Cloud Storage & Sync'}
              >
                <Cloud className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">{isAr ? 'Google Drive' : 'Drive'}</span>
              </button>
            )}

            {/* AI Quick Button */}
            {onOpenAIModal && currentUser.role !== 'Guest' && (
              <button
                id="nav-ai-assistant-btn"
                type="button"
                onClick={onOpenAIModal}
                className="hidden lg:inline-flex group relative items-center gap-1.5 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1.5 text-xs font-bold text-orange-900 shadow-xs transition-all hover:border-orange-300 hover:shadow-sm"
                title={isAr ? 'المدقق الذكي (Gemini AI)' : 'AI Operations Auditor'}
              >
                <Sparkles className="h-3.5 w-3.5 text-orange-600 animate-pulse" />
                <span className="hidden xl:inline">{isAr ? 'المدقق الذكي' : 'AI Auditor'}</span>
              </button>
            )}

            {/* Persistent Notifications & Approvals Center */}
            <PersistentNavbarNotifications setActiveTab={setActiveTab} />

            {/* Theme Mode Toggle */}
            <button
              id="nav-theme-toggle-btn"
              type="button"
              onClick={toggleThemeMode}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title={
                themeMode === 'dark'
                  ? isAr
                    ? 'التبديل إلى الوضع الفاتح (Light Mode)'
                    : 'Switch to Light Mode'
                  : isAr
                  ? 'التبديل إلى الوضع الداكن (Dark Mode)'
                  : 'Switch to Dark Mode'
              }
              aria-label={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {themeMode === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            {/* Language Toggle */}
            <button
              id="nav-lang-toggle-btn"
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
            >
              <Globe className="h-3.5 w-3.5 text-[#F05627]" />
              <span className="hidden sm:inline">{language === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Enterprise Multi-Tenant Switcher */}
            <div className="relative" ref={tenantDropdownRef}>
              <button
                id="nav-tenant-switcher-btn"
                type="button"
                onClick={() => {
                  setShowTenantDropdown(!showTenantDropdown);
                  setShowRoleDropdown(false);
                }}
                className={`flex h-9 items-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3 text-xs font-bold shadow-xs transition-all ${
                  isPlatformMasterActive
                    ? 'border-amber-400/50 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-amber-300 shadow-md'
                    : 'border-indigo-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 text-indigo-950 hover:border-indigo-300'
                }`}
                title={isAr ? 'بيئة المستأجر وعزل البيانات (Multi-Tenant)' : 'Multi-Tenant Isolation & License'}
              >
                {isPlatformMasterActive ? (
                  <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                )}
                <span className="max-w-[110px] sm:max-w-[140px] truncate hidden md:inline">
                  {isPlatformMasterActive
                    ? (isAr ? 'OxenGL المركزية' : 'OxenGL Master')
                    : (activeTenantLicense?.companyName || (isAr ? 'شركة ميون الاقتصادية المحدودة' : 'Mayon Economic Co.'))}
                </span>
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  isPlatformMasterActive
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : 'bg-indigo-600/10 text-indigo-700'
                }`}>
                  {isPlatformMasterActive ? 'MASTER' : (activeTenantLicense?.subscriptionTier || 'PRO')}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 opacity-60 ${isPlatformMasterActive ? 'text-amber-300' : 'text-indigo-700'}`} />
              </button>

              {showTenantDropdown && (
                <div
                  className={`absolute top-11 ${
                    isAr ? 'left-0' : 'right-0'
                  } z-50 w-80 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl`}
                >
                  <div className="mb-2 border-b border-slate-100 px-2 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {isAr ? 'بيئة العمل وعزل المنشآت (Tenant Context)' : 'Active Tenant Context'}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        {isAr ? 'عزل أمني تام' : 'Strict Isolation'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">
                      {isAr
                        ? 'المنشآت وبيئات العمل المصرح لك بالوصول إليها.'
                        : 'Authorized organizations and workspaces available to your account.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                    {(availableTenants.length > 0 ? availableTenants : [
                      {
                        tenantId: 'tenant-default-001',
                        companyName: 'شركة ميون الاقتصادية المحدودة',
                        companyNameEn: 'Mayon Economic Company Ltd',
                        subscriptionTier: 'PROFESSIONAL',
                        planType: 'PRO',
                        licenseKey: 'OXEN-PRO-DEFAULT-MASTER',
                        isActive: true,
                        maxAllowedCostCenters: 25,
                      },
                      {
                        tenantId: 'tenant-gulf-002',
                        companyName: 'شركة الخليج للنقليات والمقاولات',
                        companyNameEn: 'Gulf Transport & Contracting Co.',
                        subscriptionTier: 'ENTERPRISE',
                        planType: 'ENTERPRISE',
                        licenseKey: 'OXEN-ENT-GULF-8821',
                        isActive: true,
                        maxAllowedCostCenters: 100,
                      },
                      {
                        tenantId: 'tenant-alriyadh-003',
                        companyName: 'مؤسسة الرياض للتوريدات والكسارات',
                        companyNameEn: 'Riyadh Quarries & Supplies Est.',
                        subscriptionTier: 'BASIC',
                        planType: 'STARTER',
                        licenseKey: 'OXEN-BAS-RIYADH-3392',
                        isActive: true,
                        maxAllowedCostCenters: 5,
                      },
                    ]).map((t: any) => {
                      const isSelected = !isPlatformMasterActive && (activeTenantLicense?.tenantId || activeTenantId) === t.tenantId;
                      return (
                        <button
                          key={t.tenantId}
                          type="button"
                          onClick={async () => {
                            await switchTenant(t.tenantId);
                            navigate(`/workspace/${t.tenantId}`);
                            if (activeTab.startsWith('platform-')) {
                              setActiveTab('dashboard');
                            }
                            setShowTenantDropdown(false);
                          }}
                          className={`flex w-full flex-col text-right rounded-xl p-2 text-xs transition-all border ${
                            isSelected
                              ? 'bg-indigo-50/90 border-indigo-300 font-bold text-indigo-950 shadow-2xs ring-1 ring-indigo-200'
                              : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-slate-900 truncate max-w-[190px]">
                              {isAr ? t.companyName : (t.companyNameEn || t.companyName)}
                            </span>
                            <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9.5px] font-black text-indigo-800 uppercase">
                              {t.subscriptionTier || 'PRO'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full mt-1 text-[10px] text-slate-500">
                            <span className="font-mono text-[10px] text-slate-600">ID: {t.tenantId}</span>
                            <span className="font-mono text-[9px] truncate max-w-[120px] text-slate-400">{t.licenseKey}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Role Quick-Switch Dropdown */}
            <div className="relative">
              <button
                id="nav-role-switcher-btn"
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className={`flex h-9 items-center gap-2 rounded-xl border px-2.5 sm:px-3 text-xs font-semibold transition-all ${
                  roleColors[currentUser.role].bg
                } ${roleColors[currentUser.role].border} ${roleColors[currentUser.role].text}`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden md:inline">
                  {isAr ? roleColors[currentUser.role].labelAr : roleColors[currentUser.role].labelEn}
                </span>
                <span className="md:hidden">{currentUser.role}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>

              {showRoleDropdown && (
                <div
                  className={`absolute top-11 ${
                    isAr ? 'left-0' : 'right-0'
                  } z-50 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl`}
                >
                  <div className="mb-2 border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                    {isAr ? 'تبديل الحساب والدور (RBAC Switcher):' : 'Switch Role / User:'}
                  </div>
                  <div className="space-y-1">
                    {users.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setCurrentUser(u);
                            setShowRoleDropdown(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-xs transition-colors ${
                            isSelected ? 'bg-orange-50 font-bold text-orange-950 ring-1 ring-orange-200' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex flex-col text-right">
                            <span className="font-semibold text-slate-900">{isAr ? u.fullNameAr : u.fullName}</span>
                            <span className="text-[10px] text-slate-500">{u.email}</span>
                          </div>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              roleColors[u.role].bg
                            } ${roleColors[u.role].text}`}
                          >
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(isAr ? 'هل تود إعادة تعيين كافة البيانات إلى الحالة الافتراضية؟' : 'Reset all data to defaults?')) {
                          resetToDefaults();
                          setShowRoleDropdown(false);
                        }
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>{isAr ? 'إعادة ضبط البيانات النموذجية' : 'Reset Demo Seed'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar & Logout */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1A1A1A] to-[#F05627] font-bold text-white shadow-xs"
                title={`${currentUser.fullName} (${currentUser.role})`}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    void signOutAuth();
                    onLogout();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title={isAr ? 'تسجيل الخروج' : 'Logout'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TIER 2 (HORIZONTAL ROWS): TWO HORIZONTAL NAVIGATION ROWS */}
      {/* ======================================================== */}
      <div
        id="navbar-two-horizontal-rows"
        ref={navContainerRef}
        className="flex flex-col w-full border-b border-slate-200/90 shadow-2xs"
      >
        {/* --- ROW 1 (الصف الأفقي الأول: العمليات والتشغيل الميداني والأساسيات) --- */}
        <div
          id="navbar-horizontal-row-1"
          className="w-full bg-slate-50/95 border-b border-slate-200/75 py-2"
        >
          <div className="flex w-full items-center justify-between gap-3 overflow-x-auto scrollbar-none px-6">
            {/* Category / Row Label */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200/80 px-2.5 py-1 text-[11px] font-black text-slate-700 tracking-wider">
                <Truck className="h-3.5 w-3.5 text-[#F05627]" />
                <span>{isAr ? 'العمليات والتشغيل الميداني' : 'Operations & Logistics'}</span>
              </span>
              <div className="h-4 w-px bg-slate-300 hidden lg:block" />
            </div>

            {/* Nav Items List */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
              {visibleRow1Items.map((item) => {
                const isSelected = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    title={isAr ? item.hintAr : item.hintEn}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-[#F05627] font-black shadow-xs border border-orange-300 ring-1 ring-orange-200/70'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-white/80 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 transition-colors ${
                        isSelected ? 'text-[#F05627]' : 'text-slate-500 group-hover:text-slate-900'
                      }`}
                    />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-mono font-bold leading-none ${
                          isSelected
                            ? 'bg-[#F05627] text-white'
                            : 'bg-slate-200/80 text-slate-700 group-hover:bg-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute inset-x-2 -bottom-1.5 h-0.5 bg-[#F05627] rounded-full animate-in fade-in duration-200" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- ROW 2 (الصف الأفقي الثاني: الشؤون المالية والرقابة والذكاء الاصطناعي) --- */}
        {visibleRow2Items.length > 0 && (
          <div
            id="navbar-horizontal-row-2"
            className="w-full bg-white/95 py-2"
          >
            <div className="flex w-full items-center justify-between gap-3 overflow-x-auto scrollbar-none px-6">
              {/* Category / Row Label */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-900 tracking-wider border border-indigo-100">
                  <Landmark className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{isAr ? 'الشؤون المالية والرقابة' : 'Finance, Accounting & Control'}</span>
                </span>
                <div className="h-4 w-px bg-slate-200 hidden lg:block" />
              </div>

              {/* Nav Items List */}
              <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
                {visibleRow2Items.map((item) => {
                  const isSelected = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`nav-link-${item.id}`}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      title={isAr ? item.hintAr : item.hintEn}
                      className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-indigo-50/90 text-indigo-950 font-black shadow-xs border border-indigo-300 ring-1 ring-indigo-200/70'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 transition-colors ${
                          isSelected ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-900'
                        }`}
                      />
                      <span>{isAr ? item.labelAr : item.labelEn}</span>
                      {item.badge && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-mono font-bold leading-none ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute inset-x-2 -bottom-1.5 h-0.5 bg-indigo-600 rounded-full animate-in fade-in duration-200" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
