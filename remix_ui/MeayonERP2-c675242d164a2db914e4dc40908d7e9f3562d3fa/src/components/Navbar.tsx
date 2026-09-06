import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
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
  Menu,
  X,
} from 'lucide-react';
import { UserRole } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'operations'
  | 'invoicing'
  | 'vouchers'
  | 'accounting'
  | 'crushers'
  | 'transporters'
  | 'ai-insights'
  | 'executive-admin'
  | 'master-data';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAIModal?: () => void;
  onOpenExportPrintModal?: () => void;
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
    firebaseUser,
    signOutAuth,
    isDriverMode,
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const isAr = language === 'ar';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
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

  const highLossAlertCount = kpis.overallWastagePercent > 2.0 ? 3 : 1;

  // Categories Structure:
  // 1. Operations (العمليات التشغيلية)
  // 2. Finance (الشؤون المالية)
  // 3. Master Data (البيانات الأساسية)
  // 4. Admin (الإدارة والرقابة)
  const navCategories: NavCategory[] = [
    {
      id: 'operations-cat',
      labelAr: 'العمليات التشغيلية',
      labelEn: 'Operations',
      icon: Truck,
      items: [
        {
          id: 'operations',
          labelAr: 'قيد العمليات اليومية (Daily Logs)',
          labelEn: 'Daily Operations Logs',
          icon: Truck,
          roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
          badge: isDriverMode ? (isAr ? 'نشط' : 'Active') : null,
          hintAr: 'تسجيل وتدقيق بطاقات التوريد والموازين الميدانية',
          hintEn: 'Daily trip logs & weighbridge tickets',
        },
        {
          id: 'transporters',
          labelAr: 'أداء الناقلين ورصد الفاقد (Transporters)',
          labelEn: 'Transporter Performance & Shrinkage',
          icon: TrendingDown,
          roles: ['Admin', 'COO', 'Accountant', 'Data_Entry'],
          badge: isAr ? 'الفاقد' : 'Loss',
          hintAr: 'تتبع نسب النقص وغرامات الشحن وتصنيف السائقين',
          hintEn: 'Driver metrics & shrinkage fines',
        },
      ],
    },
    {
      id: 'finance-cat',
      labelAr: 'الشؤون المالية',
      labelEn: 'Finance',
      icon: Landmark,
      items: [
        {
          id: 'accounting',
          labelAr: 'دليل الحسابات والقوائم المالية (Chart of Accounts)',
          labelEn: 'Chart of Accounts & GL',
          icon: Landmark,
          roles: ['Admin', 'COO', 'Accountant'],
          badge: 'CoA',
          hintAr: 'شجرة الحسابات، قيود اليومية، ميزان المراجعة والأرباح',
          hintEn: 'Chart of accounts, journals, trial balance & P&L',
        },
        {
          id: 'vouchers',
          labelAr: 'سندات القبض والصرف (Vouchers)',
          labelEn: 'Financial Vouchers',
          icon: Receipt,
          roles: ['Admin', 'COO', 'Accountant'],
          badge: isAr ? 'سندات' : 'Vouchers',
          hintAr: 'إيصالات المقبوضات والمدفوعات البنكية والنقدية والتفقيط',
          hintEn: 'Receipt & payment vouchers with Tafqeet',
        },
        {
          id: 'invoicing',
          labelAr: 'الفواتير الضريبية للعملاء (Invoices)',
          labelEn: 'Customer Invoicing & Tax',
          icon: FileSpreadsheet,
          roles: ['Admin', 'COO', 'Accountant', 'Guest'],
          badge: 'ZATCA',
          hintAr: 'إصدار وتوقيع الفواتير الضريبية وإشعارات الخصم المعتمدة',
          hintEn: 'ZATCA compliant tax invoices & statements',
        },
        {
          id: 'crushers',
          labelAr: 'كشوفات حساب الكسارات (Statements)',
          labelEn: 'Crusher Statements & Ledger',
          icon: Building2,
          roles: ['Admin', 'COO', 'Accountant'],
          hintAr: 'مطالبات ومستحقات مواقع الكسارات والمدفوعات',
          hintEn: 'Quarry payable statements & balances',
        },
      ],
    },
    {
      id: 'master-cat',
      labelAr: 'البيانات الأساسية',
      labelEn: 'Master Data',
      icon: Database,
      items: [
        {
          id: 'master-data',
          labelAr: 'العملاء والكسارات والمواد (Master Data)',
          labelEn: 'Customers, Crushers & Materials',
          icon: Database,
          roles: ['Admin', 'COO'],
          badge: isAr ? 'تأسيس' : 'Master',
          hintAr: 'إدارة العملاء، الكسارات، المواد، الناقلين والتسعير المعتمد',
          hintEn: 'Clients, quarry partners, materials & approved pricing',
        },
      ],
    },
    {
      id: 'admin-cat',
      labelAr: 'الإدارة والرقابة',
      labelEn: 'Admin & Control',
      icon: ShieldCheck,
      items: [
        {
          id: 'executive-admin',
          labelAr: 'لوحة الاعتمادات وسجل التدقيق (Audit & Users)',
          labelEn: 'Executive Approvals & Audit Trail',
          icon: ShieldCheck,
          roles: ['Admin', 'COO'],
          badge: kpis.pendingApprovalsCount > 0 ? `${kpis.pendingApprovalsCount}` : null,
          hintAr: 'سجل التدقيق الشامل، إدارة المستخدمين والاعتمادات التنفيذية',
          hintEn: 'Comprehensive audit trail, users & executive approvals',
        },
        {
          id: 'ai-insights',
          labelAr: 'المدقق الذكي والتحليلات (AI Insights)',
          labelEn: 'AI Operations & Audit Assistant',
          icon: Sparkles,
          roles: ['Admin', 'COO', 'Accountant'],
          badge: 'Gemini AI',
          hintAr: 'تحليل الفاقد وتدقيق المخاطر والتنبؤات بالذكاء الاصطناعي',
          hintEn: 'Smart wastage detection & anomaly analysis',
        },
      ],
    },
  ];

  // Helper to check if current activeTab belongs to a category
  const isCategoryActive = (category: NavCategory) => {
    return category.items.some((item) => item.id === activeTab);
  };

  // Filter items based on current user role
  const isItemVisible = (item: NavSubItem) => {
    return item.roles.includes(currentUser.role);
  };

  const isCategoryVisible = (category: NavCategory) => {
    return category.items.some((item) => isItemVisible(item));
  };

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
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Brand Logo & Corporate Title (Far Right in RTL) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] text-right bg-transparent border-0 p-0 cursor-pointer"
              title={isAr ? 'الذهاب للوحة القيادة' : 'Go to Executive Dashboard'}
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

            {/* Notifications */}
            <div className="relative">
              <button
                id="nav-notifications-btn"
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title={isAr ? 'التنبيهات والإشعارات' : 'Notifications'}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {highLossAlertCount}
                </span>
              </button>

              {showNotifications && (
                <div
                  className={`absolute top-11 ${
                    isAr ? 'left-0' : 'right-0'
                  } z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl`}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-bold text-slate-800">
                      {isAr ? 'مركز الإشعارات والرقابة' : 'Alerts & Operations'}
                    </span>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#F05627]">
                      {isAr ? '3 تنبيهات' : '3 Alerts'}
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex gap-2.5 rounded-lg bg-amber-50 p-2.5 text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-semibold">{isAr ? 'تنبيه فاقد وزن زائد' : 'Excess Wastage Alert'}</p>
                        <p className="text-[11px] text-amber-700">
                          {isAr
                            ? 'رحلة شاحنة (3190-ر س ب) سجلت فاقداً 1.4 طن لعميل يوني بيتون.'
                            : 'Truck 3190 recorded 1.4 tons loss to UniBeton.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 rounded-lg bg-orange-50 p-2.5 text-orange-900">
                      <UserCheck className="h-4 w-4 shrink-0 text-orange-600" />
                      <div>
                        <p className="font-semibold">{isAr ? 'جاهزية الفاتورة الشهرية' : 'Monthly Invoices Ready'}</p>
                        <p className="text-[11px] text-orange-700">
                          {isAr
                            ? 'تم تجميع بيانات شهر أغسطس لشركة الكفاح وجاهزة للتصدير الضريبي.'
                            : 'August logs ready for Kifah billing.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-xl border border-orange-200 object-cover shadow-xs"
                  title={`${currentUser.fullName} (${firebaseUser.email})`}
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1A1A1A] to-[#F05627] font-bold text-white shadow-xs"
                  title={`${currentUser.fullName} (${currentUser.role})`}
                >
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    if (firebaseUser) {
                      signOutAuth();
                    }
                    onLogout();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title={isAr ? 'تسجيل الخروج' : 'Logout'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TIER 2 (BOTTOM BAR): MAIN NAVIGATION BUTTONS & DROPDOWNS */}
      {/* ======================================================== */}
      <div
        ref={navContainerRef}
        className="hidden md:block border-b border-slate-200/80 bg-slate-50/70"
      >
        <div className="mx-auto flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 py-2">
          
          {/* 1. Direct Dashboard Button */}
          <button
            id="nav-link-dashboard"
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setOpenDropdown(null);
            }}
            className={`group relative flex items-center gap-2 px-3.5 py-2 text-sm font-bold transition-all rounded-xl ${
              activeTab === 'dashboard'
                ? 'text-[#F05627] bg-white shadow-2xs border border-orange-200/70 font-black'
                : 'text-slate-900 hover:text-[#F05627] hover:bg-white/60'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 transition-colors ${
              activeTab === 'dashboard' ? 'text-[#F05627]' : 'text-slate-500 group-hover:text-[#F05627]'
            }`} />
            <span>{isAr ? 'لوحة القيادة والمؤشرات' : 'Dashboard'}</span>

            {/* Active animated indicator */}
            {activeTab === 'dashboard' && (
              <span className="absolute inset-x-2 -bottom-2 h-0.5 bg-[#F05627] rounded-full animate-in fade-in duration-200" />
            )}
          </button>

          {/* 2. Categorized Dropdown Menus */}
          {navCategories.map((category) => {
            if (!isCategoryVisible(category)) return null;
            const categoryActive = isCategoryActive(category);
            const isOpen = openDropdown === category.id;
            const CategoryIcon = category.icon;

            return (
              <div
                key={category.id}
                className="relative"
                onMouseEnter={() => setOpenDropdown(category.id)}
                onMouseLeave={() => setOpenDropdown((prev) => (prev === category.id ? null : prev))}
              >
                {/* Category Header Button */}
                <button
                  type="button"
                  onClick={() => setOpenDropdown(isOpen ? null : category.id)}
                  className={`group relative flex items-center gap-2 px-3.5 py-2 text-sm font-bold transition-all rounded-xl ${
                    categoryActive
                      ? 'text-[#F05627] bg-white shadow-2xs border border-orange-200/70 font-black'
                      : 'text-slate-900 hover:text-[#F05627] hover:bg-white/60'
                  }`}
                >
                  <CategoryIcon className={`h-4 w-4 transition-colors ${
                    categoryActive ? 'text-[#F05627]' : 'text-slate-500 group-hover:text-[#F05627]'
                  }`} />
                  <span>{isAr ? category.labelAr : category.labelEn}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#F05627]' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />

                  {/* Active indicator */}
                  {categoryActive && (
                    <span className="absolute inset-x-2 -bottom-2 h-0.5 bg-[#F05627] rounded-full animate-in fade-in duration-200" />
                  )}
                </button>

                {/* Dropdown Menu Panel */}
                {isOpen && (
                  <div
                    className={`absolute top-full pt-2 z-50 w-72 lg:w-84 transition-all animate-in fade-in-50 zoom-in-95 duration-150 ${
                      isAr ? 'right-0' : 'left-0'
                    }`}
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5">
                      {/* Dropdown header */}
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          {isAr ? category.labelAr : category.labelEn}
                        </span>
                        <CategoryIcon className="h-3.5 w-3.5 text-[#F05627]" />
                      </div>

                      {/* Dropdown Sub-Items List */}
                      <div className="mt-1 space-y-1">
                        {category.items
                          .filter((item) => isItemVisible(item))
                          .map((item) => {
                            const isSelected = activeTab === item.id;
                            const ItemIcon = item.icon;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab(item.id);
                                  setOpenDropdown(null);
                                }}
                                className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-right transition-all ${
                                  isSelected
                                    ? 'bg-orange-50/80 text-[#F05627] font-black border border-orange-200/60 shadow-2xs'
                                    : 'hover:bg-slate-50 text-slate-700 font-bold hover:text-slate-900'
                                }`}
                              >
                                <div
                                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                    isSelected
                                      ? 'bg-white text-[#F05627] shadow-xs'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <ItemIcon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs truncate">
                                      {isAr ? item.labelAr : item.labelEn}
                                    </span>
                                    {item.badge && (
                                      <span
                                        className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono font-bold shrink-0 ${
                                          isSelected
                                            ? 'bg-[#F05627] text-white'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                                    {isAr ? item.hintAr : item.hintEn}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE COLLAPSIBLE DRAWER FOR SMALL SCREENS               */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white p-4 md:hidden animate-in slide-in-from-top-2 duration-150 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Direct Dashboard link */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl p-2.5 text-right font-bold text-sm ${
              activeTab === 'dashboard'
                ? 'bg-orange-50 text-[#F05627] border border-orange-200'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-[#F05627]" />
            <span>{isAr ? 'لوحة القيادة والمؤشرات' : 'Executive Dashboard'}</span>
          </button>

          {/* Categories List */}
          {navCategories.map((cat) => {
            if (!isCategoryVisible(cat)) return null;
            const CatIcon = cat.icon;

            return (
              <div key={cat.id} className="space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 px-2 text-xs font-black text-slate-400 uppercase">
                  <CatIcon className="h-3.5 w-3.5 text-[#F05627]" />
                  <span>{isAr ? cat.labelAr : cat.labelEn}</span>
                </div>

                <div className="grid grid-cols-1 gap-1">
                  {cat.items
                    .filter((item) => isItemVisible(item))
                    .map((item) => {
                      const isSelected = activeTab === item.id;
                      const ItemIcon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center justify-between rounded-xl p-2.5 text-right text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-orange-50 text-[#F05627] border border-orange-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <ItemIcon className="h-4 w-4" />
                            <span>{isAr ? item.labelAr : item.labelEn}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
};
