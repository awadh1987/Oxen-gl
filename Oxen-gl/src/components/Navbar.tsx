import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import {
  Bell,
  Globe,
  UserCheck,
  Shield,
  LogOut,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Settings,
  Sun,
  Moon,
  Rows3,
  Rows4,
  Check,
} from 'lucide-react';
import { UserRole } from '../types';
import { TENANT_PALETTES } from '../theme/designTokens';

interface NavbarProps {
  onOpenAIModal?: () => void;
  onOpenExportPrintModal?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
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
    currentCompany,
    companies,
    setCurrentCompany,
    brandConfig,
    themeMode,
    setThemeMode,
    densityMode,
    setDensityMode,
    tenantTheme,
    setTenantTheme,
    isolationTelemetry,
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';
  const activePalette = TENANT_PALETTES[tenantTheme] || TENANT_PALETTES.orange;
  const paletteList = Object.values(TENANT_PALETTES);

  const roleColors: Record<UserRole, { bg: string; text: string; border: string; labelAr: string; labelEn: string }> = {
    Super_Admin: {
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      text: 'text-violet-800 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-800/60',
      labelAr: 'مدير المنصة (Super Admin)',
      labelEn: 'Platform Super Admin',
    },
    Admin: {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-[#F05627] dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800/60',
      labelAr: 'المدير العام CEO (Admin)',
      labelEn: 'Admin / CEO',
    },
    COO: {
      bg: 'bg-neutral-100 dark:bg-slate-800',
      text: 'text-neutral-900 dark:text-slate-200',
      border: 'border-neutral-300 dark:border-slate-700',
      labelAr: 'مدير العمليات (COO)',
      labelEn: 'COO Executive',
    },
    Accountant: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
      labelAr: 'محاسب (Accountant)',
      labelEn: 'Accountant',
    },
    Data_Entry: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      labelAr: 'مدخل بيانات (Data Entry)',
      labelEn: 'Data Entry Operator',
    },
    Guest: {
      bg: 'bg-slate-50 dark:bg-slate-900',
      text: 'text-slate-700 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-800',
      labelAr: 'مراجع / بوابة عميل (Guest)',
      labelEn: 'Guest / Client Auditor',
    },
  };

  const highLossAlertCount = kpis.overallWastagePercent > 2.0 ? 3 : 1;

  return (
    <header
      id="main-app-header"
      className={`sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b px-4 sm:px-6 backdrop-blur-md transition-all ${
        isDark
          ? 'border-slate-800 bg-[#0e1324]/95 text-slate-100'
          : 'border-neutral-200/80 bg-white/95 text-neutral-900'
      }`}
    >
      {/* Left Section: Essentials Context (Logo, Subtitle, Tenant Selector, System Latency/Status) */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <BrandLogo
            size="md"
            showText={true}
            horizontal={true}
            theme={isDark ? 'dark' : 'light'}
            customLogoUrl={currentCompany?.uiLogoUrl || undefined}
            companyNameEn={currentCompany?.name || brandConfig.companyNameEn}
            companyNameAr={currentCompany?.name || brandConfig.companyNameAr}
            primaryColor={currentCompany?.uiPrimaryColor}
            secondaryColor={currentCompany?.uiSecondaryColor}
          />
          <div className="hidden h-7 w-px bg-neutral-200 dark:bg-slate-800 md:block" />
          <div className="hidden flex-col md:flex">
            <span className="text-[11px] font-bold tracking-wider text-[#F05627] uppercase">
              {isAr ? 'منصة OxenGL لإدارة التوريد والخدمات اللوجستية' : 'OxenGL Supply & Logistics ERP'}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-slate-400 font-medium">
              {isAr ? 'المملكة العربية السعودية • ZATCA Compatible' : 'Kingdom of Saudi Arabia • ZATCA'}
            </span>
          </div>
        </div>

        {/* Tenant Dropdown Selector */}
        {currentCompany && (
          <>
            <div className="hidden h-7 w-px bg-neutral-200 dark:bg-slate-800 lg:block" />
            <select
              id="nav-tenant-selector"
              aria-label={isAr ? 'الشركة والمستأجر النشط' : 'Active Tenant Company'}
              value={currentCompany.id}
              onChange={(event) => {
                const company = companies.find((item) => item.id === event.target.value);
                if (company) setCurrentCompany(company);
              }}
              className={`hidden max-w-44 truncate rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors focus:border-orange-500 lg:block ${
                isDark
                  ? 'border-slate-800 bg-slate-900/90 text-slate-200 hover:border-slate-700'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </>
        )}

        {/* System Latency & Live Status Badge */}
        {!isOnline ? (
          <div
            id="nav-offline-status-pill"
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-xs animate-pulse"
            title={
              isAr
                ? 'وضع العمل دون اتصال نشط: يتم حفظ العمليات والسندات محلياً في الذاكرة التخزينية الميدانية'
                : 'Offline Mode Active: All weighbridge data and vouchers persist locally'
            }
          >
            <WifiOff className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">
              {isAr ? 'أوفلاين (حفظ محلي)' : 'Offline Mode'}
            </span>
          </div>
        ) : (
          <div
            id="nav-online-status-pill"
            className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
              isDark
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
            }`}
            title={
              isAr
                ? `متصل بقاعدة البيانات المركزية • زمن الاستجابة ${isolationTelemetry.cloudLatencyMs}ms`
                : `Online & Synchronized • Cloud Latency ${isolationTelemetry.cloudLatencyMs}ms`
            }
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] font-bold">{isolationTelemetry.cloudLatencyMs}ms</span>
            <span className="opacity-40">|</span>
            <span>{isAr ? 'مزامنة فورية' : 'Live Sync'}</span>
          </div>
        )}
      </div>

      {/* Right Section: Clean Controls (Settings Dropdown, Notifications, Language, Role / Avatar) */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Consolidated Settings Dropdown (⚙️ Icon) */}
        <div className="relative">
          <button
            id="nav-settings-btn"
            type="button"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowNotifications(false);
              setShowRoleDropdown(false);
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              showSettings
                ? 'border-orange-500 bg-orange-50 text-[#F05627] dark:border-orange-500/80 dark:bg-orange-950/40 dark:text-orange-400'
                : isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
            title={isAr ? 'إعدادات العرض والمظهر' : 'Display & Theme Settings'}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {showSettings && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSettings(false)}
              />
              <div
                className={`absolute top-11 ${
                  isAr ? 'left-0' : 'right-0'
                } z-50 w-72 origin-top-right rounded-2xl border p-3 shadow-xl backdrop-blur-xl transition-all ${
                  isDark
                    ? 'border-slate-800 bg-[#0e1324]/95 text-slate-100 shadow-black/80'
                    : 'border-neutral-200 bg-white/95 text-neutral-900 shadow-xl'
                }`}
              >
                {/* Popover Header */}
                <div className="mb-3 flex items-center justify-between border-b pb-2 border-neutral-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase text-neutral-800 dark:text-slate-200">
                    <Settings className="h-3.5 w-3.5 text-[#F05627]" />
                    {isAr ? 'إعدادات الواجهة والمظهر' : 'Interface Settings'}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {isolationTelemetry.cloudLatencyMs}ms
                  </span>
                </div>

                {/* Theme Mode Toggle (Light / Dark) */}
                <div className="mb-3 space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400">
                    {isAr ? 'نمط الألوان (المظهر)' : 'Theme Mode'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setThemeMode('light')}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                        !isDark
                          ? 'border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-200'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>{isAr ? 'نهاري' : 'Light'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                        isDark
                          ? 'border-indigo-500 bg-indigo-950/80 text-indigo-200 ring-1 ring-indigo-400'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{isAr ? 'ليلي' : 'Dark ERP'}</span>
                    </button>
                  </div>
                </div>

                {/* Density Mode Toggle */}
                <div className="mb-3 space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400">
                    {isAr ? 'كثافة العرض (Density)' : 'Grid Density'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDensityMode('comfortable')}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                        densityMode === 'comfortable'
                          ? isDark
                            ? 'border-orange-500/80 bg-orange-950/40 text-orange-300 ring-1 ring-orange-400/50'
                            : 'border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-200'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <Rows3 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{isAr ? 'مريح' : 'Comfortable'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDensityMode('compact')}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                        densityMode === 'compact'
                          ? isDark
                            ? 'border-orange-500/80 bg-orange-950/40 text-orange-300 ring-1 ring-orange-400/50'
                            : 'border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-200'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <Rows4 className="h-3.5 w-3.5 text-amber-500" />
                      <span>{isAr ? 'مضغوط' : 'Compact'}</span>
                    </button>
                  </div>
                </div>

                {/* Tenant White-Labeling Theme Accent */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400">
                      {isAr ? 'سمة ألوان المستأجر' : 'Tenant Palette'}
                    </label>
                    <span className="text-[10px] font-semibold text-[#F05627]">
                      {activePalette.nameEn}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-neutral-100 dark:border-slate-800/80 bg-neutral-50/50 dark:bg-slate-900/50">
                    {paletteList.map((palette) => {
                      const isSelected = tenantTheme === palette.id;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() => setTenantTheme(palette.id)}
                          className={`group relative flex flex-col items-center justify-center rounded-lg p-1.5 text-center transition-all ${
                            isSelected
                              ? 'ring-2 ring-orange-500 bg-white dark:bg-slate-800 shadow-xs'
                              : 'hover:bg-white/80 dark:hover:bg-slate-800/50'
                          }`}
                          title={isAr ? palette.nameAr : palette.nameEn}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-white/30 shadow-xs transition-transform group-hover:scale-110"
                            style={{ backgroundColor: palette.primary }}
                          />
                          <span className="mt-1 text-[9px] font-medium text-neutral-600 dark:text-slate-400 truncate w-full">
                            {palette.nameEn.split(' ')[0]}
                          </span>
                          {isSelected && (
                            <Check className="absolute top-1 right-1 h-2.5 w-2.5 text-orange-600 dark:text-orange-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            id="nav-notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSettings(false);
              setShowRoleDropdown(false);
            }}
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              showNotifications
                ? 'border-orange-500 bg-orange-50 text-[#F05627] dark:border-orange-500/80 dark:bg-orange-950/40 dark:text-orange-400'
                : isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
            title={isAr ? 'التنبيهات والإشعارات' : 'Notifications'}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {highLossAlertCount}
            </span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div
                className={`absolute top-11 ${
                  isAr ? 'left-0' : 'right-0'
                } z-50 w-80 rounded-2xl border p-4 shadow-xl backdrop-blur-xl ${
                  isDark
                    ? 'border-slate-800 bg-[#0e1324]/95 text-slate-100 shadow-black/80'
                    : 'border-neutral-200 bg-white/95 text-neutral-900 shadow-xl'
                }`}
              >
                <div className="mb-3 flex items-center justify-between border-b pb-2 border-neutral-100 dark:border-slate-800">
                  <span className="text-sm font-bold text-neutral-800 dark:text-slate-200">
                    {isAr ? 'مركز الإشعارات والرقابة' : 'Alerts & Operations'}
                  </span>
                  <span className="rounded-full bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 text-[10px] font-semibold text-[#F05627]">
                    {isAr ? '3 تنبيهات' : '3 Alerts'}
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-amber-900 dark:text-amber-200 border border-amber-200/50 dark:border-amber-800/30">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold">{isAr ? 'تنبيه فاقد وزن زائد' : 'Excess Wastage Alert'}</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        {isAr
                          ? 'رحلة شاحنة (3190-ر س ب) سجلت فاقداً 1.4 طن لعميل يوني بيتون.'
                          : 'Truck 3190 recorded 1.4 tons loss to UniBeton.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 p-2.5 text-orange-900 dark:text-orange-200 border border-orange-200/50 dark:border-orange-800/30">
                    <UserCheck className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="font-semibold">{isAr ? 'جاهزية الفاتورة الشهرية' : 'Monthly Invoices Ready'}</p>
                      <p className="text-[11px] text-orange-700 dark:text-orange-300">
                        {isAr
                          ? 'تم تجميع بيانات شهر أغسطس لشركة الكفاح وجاهزة للتصدير الضريبي.'
                          : 'August logs ready for Kifah billing.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Language Selector */}
        <button
          id="nav-lang-toggle-btn"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
            isDark
              ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
              : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
          }`}
          title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
        >
          <Globe className="h-3.5 w-3.5 text-[#F05627]" />
          <span>{language === 'ar' ? 'English' : 'عربي'}</span>
        </button>

        {/* Role Quick-Switch Dropdown */}
        <div className="relative">
          <button
            id="nav-role-switcher-btn"
            onClick={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowSettings(false);
              setShowNotifications(false);
            }}
            className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all ${
              roleColors[currentUser.role].bg
            } ${roleColors[currentUser.role].border} ${roleColors[currentUser.role].text}`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isAr ? roleColors[currentUser.role].labelAr : roleColors[currentUser.role].labelEn}
            </span>
            <span className="sm:hidden">{currentUser.role}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>

          {showRoleDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowRoleDropdown(false)}
              />
              <div
                className={`absolute top-11 ${
                  isAr ? 'left-0' : 'right-0'
                } z-50 w-72 rounded-2xl border p-2 shadow-xl backdrop-blur-xl ${
                  isDark
                    ? 'border-slate-800 bg-[#0e1324]/95 text-slate-100 shadow-black/80'
                    : 'border-neutral-200 bg-white/95 text-neutral-900 shadow-xl'
                }`}
              >
                <div className="mb-2 border-b border-neutral-100 dark:border-slate-800 px-3 py-1.5 text-[11px] font-semibold text-neutral-500 dark:text-slate-400">
                  {isAr ? 'تبديل الحساب والدور (RBAC Switcher):' : 'Switch Role / User:'}
                </div>
                <div className="space-y-1">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setShowRoleDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-xs transition-colors ${
                          isSelected
                            ? isDark
                              ? 'bg-orange-950/50 font-bold text-orange-300 ring-1 ring-orange-500/50'
                              : 'bg-orange-50 font-bold text-orange-950 ring-1 ring-orange-200'
                            : isDark
                            ? 'hover:bg-slate-800/60 text-slate-300'
                            : 'hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <div className="flex flex-col text-right">
                          <span className="font-semibold text-neutral-900 dark:text-slate-100">{isAr ? u.fullNameAr : u.fullName}</span>
                          <span className="text-[10px] text-neutral-500 dark:text-slate-400">{u.email}</span>
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

                <div className="mt-2 border-t border-neutral-100 dark:border-slate-800 pt-2">
                  <button
                    onClick={() => {
                      if (confirm(isAr ? 'هل تود إعادة تعيين كافة البيانات إلى الحالة الافتراضية؟' : 'Reset all data to defaults?')) {
                        resetToDefaults();
                        setShowRoleDropdown(false);
                      }
                    }}
                    className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-neutral-500 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-800 hover:text-neutral-800 dark:hover:text-slate-200"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{isAr ? 'إعادة ضبط البيانات النموذجية' : 'Reset Demo Seed'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Avatar & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1A1A1A] to-[#F05627] font-bold text-white shadow-xs text-xs"
            title={`${currentUser.fullName} (${currentUser.role})`}
          >
            {currentUser.username.slice(0, 2).toUpperCase()}
          </div>
          {onLogout && (
            <button
              onClick={() => {
                void signOutAuth();
                onLogout();
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
              }`}
              title={isAr ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

