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
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
  Printer,
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onOpenAIModal?: () => void;
  onOpenExportPrintModal?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAIModal, onOpenExportPrintModal, onLogout }) => {
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
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAr = language === 'ar';

  const roleColors: Record<UserRole, { bg: string; text: string; border: string; labelAr: string; labelEn: string }> = {
    Super_Admin: {
      bg: 'bg-violet-50',
      text: 'text-violet-800',
      border: 'border-violet-200',
      labelAr: 'مدير المنصة (Super Admin)',
      labelEn: 'Platform Super Admin',
    },
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

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 flex h-18 w-full items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4 backdrop-blur-md transition-all sm:px-6"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <BrandLogo
          size="md"
          showText={true}
          horizontal={true}
          customLogoUrl={currentCompany?.uiLogoUrl || undefined}
          companyNameEn={currentCompany?.name || brandConfig.companyNameEn}
          companyNameAr={currentCompany?.name || brandConfig.companyNameAr}
          primaryColor={currentCompany?.uiPrimaryColor}
          secondaryColor={currentCompany?.uiSecondaryColor}
        />
        <div className="hidden h-8 w-px bg-neutral-200 md:block" />
        <div className="hidden flex-col md:flex">
          <span className="text-[11px] font-bold tracking-wider text-[#F05627] uppercase">
            {isAr ? 'منصة OxenGL لإدارة التوريد والخدمات اللوجستية' : 'OxenGL Supply & Logistics ERP'}
          </span>
          <span className="text-[10px] text-neutral-500 font-medium">
            {isAr ? 'المملكة العربية السعودية • ZATCA Compatible' : 'Kingdom of Saudi Arabia'}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {currentCompany && (
          <select
            aria-label={isAr ? 'الشركة النشطة' : 'Active company'}
            value={currentCompany.id}
            onChange={(event) => {
              const company = companies.find((item) => item.id === event.target.value);
              if (company) setCurrentCompany(company);
            }}
            className="hidden max-w-44 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs font-semibold text-neutral-700 outline-none focus:border-orange-500 lg:block"
          >
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        )}
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
            <span className="hidden sm:inline">
              {isAr ? 'موقع الإرسال (أوفلاين - حفظ محلي)' : 'Dispatch Site Offline Mode'}
            </span>
          </div>
        ) : (
          <div
            id="nav-online-status-pill"
            className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 lg:flex"
            title={isAr ? 'متصل بقاعدة البيانات المركزية' : 'Online & Synchronized'}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>{isAr ? 'مزامنة فورية' : 'Live Sync'}</span>
          </div>
        )}

        {/* Print & Export Studio Quick Button */}
        {onOpenExportPrintModal && (
          <button
            id="nav-export-print-btn"
            onClick={onOpenExportPrintModal}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 shadow-xs hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-900 transition-all"
            title={isAr ? 'معاينة حية للطباعة وتصدير المستندات' : 'Live Print Preview & Export'}
          >
            <Printer className="h-3.5 w-3.5 text-[#F05627]" />
            <span className="hidden sm:inline">{isAr ? 'معاينة وطباعة' : 'Export & Print'}</span>
          </button>
        )}

        {/* AI Quick Button */}
        {onOpenAIModal && currentUser.role !== 'Guest' && (
          <button
            id="nav-ai-assistant-btn"
            onClick={onOpenAIModal}
            className="group relative hidden items-center gap-1.5 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1.5 text-xs font-bold text-orange-900 shadow-xs transition-all hover:border-orange-300 hover:shadow-sm sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-600 animate-pulse" />
            <span>{isAr ? 'ذكاء العمليات OxenGL' : 'OxenGL Operational Intelligence'}</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            id="nav-notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
              } z-50 w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-sm font-bold text-neutral-800">
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
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
          title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
        >
          <Globe className="h-3.5 w-3.5 text-[#F05627]" />
          <span>{language === 'ar' ? 'English' : 'عربي'}</span>
        </button>

        {/* Role Quick-Switch Dropdown */}
        <div className="relative">
          <button
            id="nav-role-switcher-btn"
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
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
            <div
              className={`absolute top-11 ${
                isAr ? 'left-0' : 'right-0'
              } z-50 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl`}
            >
              <div className="mb-2 border-b border-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-500">
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
                        isSelected ? 'bg-orange-50 font-bold text-orange-950 ring-1 ring-orange-200' : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <div className="flex flex-col text-right">
                        <span className="font-semibold text-neutral-900">{isAr ? u.fullNameAr : u.fullName}</span>
                        <span className="text-[10px] text-neutral-500">{u.email}</span>
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

              <div className="mt-2 border-t border-neutral-100 pt-2">
                <button
                  onClick={() => {
                    if (confirm(isAr ? 'هل تود إعادة تعيين كافة البيانات إلى الحالة الافتراضية؟' : 'Reset all data to defaults?')) {
                      resetToDefaults();
                      setShowRoleDropdown(false);
                    }
                  }}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{isAr ? 'إعادة ضبط البيانات النموذجية' : 'Reset Demo Seed'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Logout */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1A1A1A] to-[#F05627] font-bold text-white shadow-xs"
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
