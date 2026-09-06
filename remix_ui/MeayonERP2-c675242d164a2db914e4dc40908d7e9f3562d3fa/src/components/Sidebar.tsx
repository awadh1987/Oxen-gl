import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Truck,
  FileSpreadsheet,
  Building2,
  TrendingDown,
  Sparkles,
  Database,
  ShieldCheck,
  Lock,
  Receipt,
  Landmark,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  SlidersHorizontal,
  DollarSign,
} from 'lucide-react';

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

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MenuItem {
  id: ActiveTab;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string | null;
  highlight?: boolean;
  hintAr?: string;
  hintEn?: string;
}

interface MenuGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed: propIsCollapsed,
  onToggleCollapse: propOnToggleCollapse,
}) => {
  const { currentUser, language, kpis, isDriverMode, toggleDriverMode } = useApp();
  const isAr = language === 'ar';

  // Local collapse state if not controlled from parent
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('myon_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (propOnToggleCollapse) {
      propOnToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('myon_sidebar_collapsed', String(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  };

  // State for collapsible category accordions
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    admin: true,
    operations: true,
    finance: true,
    master: true,
  });

  // Categorized Navigation Structure
  const menuGroups: MenuGroup[] = [
    {
      id: 'admin',
      titleAr: 'الإدارة والنظام',
      titleEn: 'Executive & Control',
      icon: ShieldCheck,
      items: [
        {
          id: 'dashboard',
          labelAr: 'لوحة القيادة والمؤشرات',
          labelEn: 'Executive Dashboard',
          icon: LayoutDashboard,
          roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
          badge: isAr ? 'رئيسي' : 'Core',
          hintAr: 'نظرة عامة على الإيرادات والكميات',
          hintEn: 'High-level revenues & operational KPIs',
        },
        {
          id: 'ai-insights',
          labelAr: 'الذكاء التشغيلي والرقابة',
          labelEn: 'AI Operations & Audit',
          icon: Sparkles,
          roles: ['Admin', 'COO', 'Accountant'],
          badge: 'AI Suite',
          hintAr: 'تحليل الفاقد وتدقيق المخاطر',
          hintEn: 'Smart wastage & fraud audit',
        },
        {
          id: 'executive-admin',
          labelAr: 'لوحة الاعتمادات والرقابة',
          labelEn: 'Executive Approvals',
          icon: ShieldCheck,
          roles: ['Admin', 'COO'],
          badge: kpis.pendingApprovalsCount > 0 ? `${kpis.pendingApprovalsCount} ${isAr ? 'معلق' : 'Req'}` : null,
          highlight: true,
          hintAr: 'اعتماد الفواتير والسندات والأسعار',
          hintEn: 'Audit logs & executive sign-offs',
        },
      ],
    },
    {
      id: 'operations',
      titleAr: 'العمليات واللوجستيات',
      titleEn: 'Operations & Logistics',
      icon: Truck,
      items: [
        {
          id: 'operations',
          labelAr: 'قيد العمليات اليومية',
          labelEn: 'Daily Operations Entry',
          icon: Truck,
          roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
          badge: isDriverMode ? (isAr ? 'نشط' : 'Active') : null,
          hintAr: 'تسجيل وتدقيق بطاقات التوريد',
          hintEn: 'Log trips, weighbridge & scale slips',
        },
        {
          id: 'transporters',
          labelAr: 'أداء الناقلين ورصد الفاقد',
          labelEn: 'Transporter Audit & Loss',
          icon: TrendingDown,
          roles: ['Admin', 'COO', 'Accountant', 'Data_Entry'],
          badge: isAr ? 'تتبع الفاقد' : 'Wastage',
          hintAr: 'نسب النقص وغرامات الشحن',
          hintEn: 'Driver metrics & shrinkage fines',
        },
      ],
    },
    {
      id: 'finance',
      titleAr: 'المالية والمحاسبة',
      titleEn: 'Finance & Accounting',
      icon: Landmark,
      items: [
        {
          id: 'accounting',
          labelAr: 'دليل الحسابات والقوائم المالية',
          labelEn: 'Chart of Accounts & GL',
          icon: Landmark,
          roles: ['Admin', 'COO', 'Accountant'],
          badge: 'CoA',
          hintAr: 'شجرة الحسابات وقيود اليومية والقوائم',
          hintEn: 'General Ledger, Trial Balance, P&L',
        },
        {
          id: 'vouchers',
          labelAr: 'سندات القبض والصرف',
          labelEn: 'Financial Vouchers',
          icon: Receipt,
          roles: ['Admin', 'COO', 'Accountant'],
          badge: isAr ? 'سندات' : 'Vouchers',
          hintAr: 'إيصالات المقبوضات والمدفوعات',
          hintEn: 'Payment and receipt receipts',
        },
        {
          id: 'invoicing',
          labelAr: 'الفواتير الضريبية للعملاء',
          labelEn: 'Customer Invoicing',
          icon: FileSpreadsheet,
          roles: ['Admin', 'COO', 'Accountant', 'Guest'],
          badge: 'ZATCA',
          hintAr: 'إصدار الفواتير المعتمدة وإشعارات الخصم',
          hintEn: 'ZATCA-compliant invoices & debit notes',
        },
        {
          id: 'crushers',
          labelAr: 'حسابات الكسارات (دائن/مدين)',
          labelEn: 'Crusher Payables Ledger',
          icon: Building2,
          roles: ['Admin', 'COO', 'Accountant'],
          hintAr: 'مطالبات ومستحقات مواقع التوريد',
          hintEn: 'Quarry statements & payables',
        },
      ],
    },
    {
      id: 'master',
      titleAr: 'البيانات المرجعية',
      titleEn: 'Master Data',
      icon: Database,
      items: [
        {
          id: 'master-data',
          labelAr: 'البيانات المرجعية والمستخدمين',
          labelEn: 'Master Data & Pricing',
          icon: Database,
          roles: ['Admin', 'COO'],
          badge: isAr ? 'إعدادات' : 'Setup',
          hintAr: 'العملاء والكسارات والمواد والتسعير',
          hintEn: 'Clients, crushers, fleets & pricing',
        },
      ],
    },
  ];

  // Auto-expand the accordion containing the active tab on tab change
  useEffect(() => {
    menuGroups.forEach((group) => {
      const containsActive = group.items.some((item) => item.id === activeTab);
      if (containsActive) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleToggleDriverView = () => {
    const nextState = !isDriverMode;
    toggleDriverMode();
    if (nextState && activeTab !== 'operations' && activeTab !== 'transporters') {
      setActiveTab('operations');
    }
  };

  // Filter groups in Driver Mode
  const displayedGroups = isDriverMode
    ? menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.id === 'operations' || item.id === 'transporters'),
        }))
        .filter((group) => group.items.length > 0)
    : menuGroups;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        id="app-sidebar-navigation"
        className={`fixed top-18 z-40 h-[calc(100vh-4.5rem)] bg-[#1A1A1A] text-gray-300 border-r border-neutral-800/80 shadow-2xl transition-all duration-300 ease-in-out lg:static lg:block flex flex-col justify-between select-none ${
          isCollapsed ? 'w-20' : 'w-68'
        } ${
          isOpenMobile
            ? 'translate-x-0'
            : isAr
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section / Header & Driver Mode */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          {/* Driver View Banner / Mode Switcher */}
          {!isCollapsed ? (
            <div
              className={`mb-4 rounded-2xl border p-3 transition-all ${
                isDriverMode
                  ? 'border-[#F05627]/60 bg-gradient-to-r from-[#F05627]/15 to-amber-500/10 shadow-md shadow-orange-950/20'
                  : 'border-neutral-800/80 bg-neutral-900/60 hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                      isDriverMode ? 'bg-[#F05627] text-white shadow-md' : 'bg-neutral-800 text-gray-400'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-white">
                      {isAr ? 'وضع السائقين' : 'Driver View'}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-medium">
                      {isDriverMode
                        ? isAr
                          ? 'العمليات واللوجستيات فقط'
                          : 'Field Logistics only'
                        : isAr
                        ? 'العرض الكامل للنظام'
                        : 'Full ERP View'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="driver-view-mode-toggle"
                  onClick={handleToggleDriverView}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDriverMode ? 'bg-[#F05627]' : 'bg-neutral-700'
                  }`}
                  aria-pressed={isDriverMode}
                  title={isAr ? 'تبديل وضع السائقين المبسط' : 'Toggle Driver View Mode'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isDriverMode ? (isAr ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isDriverMode && (
                <div className="mt-2.5 rounded-lg bg-[#F05627]/15 px-2.5 py-1 text-[10px] font-bold text-[#F05627] flex items-center gap-1.5 border border-[#F05627]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F05627] animate-ping" />
                  <span>{isAr ? 'الواجهة مخصصة للعمليات الميدانية' : 'Field Operations Active'}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 flex flex-col items-center">
              <button
                type="button"
                onClick={handleToggleDriverView}
                title={isAr ? 'تبديل وضع السائقين' : 'Toggle Driver View'}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                  isDriverMode
                    ? 'bg-[#F05627] text-white shadow-lg shadow-orange-950/40'
                    : 'bg-neutral-900 text-gray-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                }`}
              >
                <Truck className="h-4 w-4" />
                {isDriverMode && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#1A1A1A]" />
                )}
              </button>
            </div>
          )}

          {/* Navigation Accordion Groups */}
          <div className="space-y-4">
            {displayedGroups.map((group) => {
              const isOpen = !!openGroups[group.id];
              const GroupIcon = group.icon;
              const hasActiveChild = group.items.some((item) => item.id === activeTab);

              return (
                <div key={group.id} className="space-y-1">
                  {/* Category Header (when expanded) */}
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
                        hasActiveChild ? 'text-[#F05627]' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GroupIcon className={`h-3.5 w-3.5 transition-colors ${hasActiveChild ? 'text-[#F05627]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                        <span>{isAr ? group.titleAr : group.titleEn}</span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-0 text-gray-400' : isAr ? 'rotate-90 text-gray-600' : '-rotate-90 text-gray-600'
                        }`}
                      />
                    </button>
                  ) : (
                    // In Mini mode, subtle divider separating groups
                    <div className="my-2 border-t border-neutral-800/80 px-2 pt-1">
                      <span className="sr-only">{group.titleEn}</span>
                    </div>
                  )}

                  {/* Items List (Collapsible in full mode, always visible icons in mini mode) */}
                  {(isOpen || isCollapsed) && (
                    <div className={`space-y-1 ${!isCollapsed ? (isAr ? 'pr-1.5' : 'pl-1.5') : ''}`}>
                      {group.items.map((item) => {
                        const isAllowed = item.roles.includes(currentUser.role);
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;

                        if (!isAllowed) {
                          return !isCollapsed ? (
                            <div
                              key={item.id}
                              className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2 text-neutral-600 opacity-50"
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon className="h-4 w-4 text-neutral-600" />
                                <span className="text-xs font-semibold">
                                  {isAr ? item.labelAr : item.labelEn}
                                </span>
                              </div>
                              <Lock className="h-3 w-3 text-neutral-600" />
                            </div>
                          ) : (
                            <div
                              key={item.id}
                              className="flex h-10 w-10 mx-auto cursor-not-allowed items-center justify-center rounded-xl text-neutral-700 opacity-40"
                              title={`${isAr ? item.labelAr : item.labelEn} (مغلق)`}
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </div>
                          );
                        }

                        return !isCollapsed ? (
                          // Full-Expanded Item View
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              if (onCloseMobile) onCloseMobile();
                            }}
                            className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                              isActive
                                ? 'bg-[#F05627] text-white shadow-lg shadow-orange-950/30'
                                : item.highlight && kpis.pendingApprovalsCount > 0
                                ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                                : 'text-gray-400 hover:bg-neutral-800/80 hover:text-white'
                            }`}
                          >
                            {/* Active Indicator bar */}
                            {isActive && (
                              <span
                                className={`absolute inset-y-1.5 w-1 rounded-full bg-white ${
                                  isAr ? '-right-1' : '-left-1'
                                }`}
                              />
                            )}

                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                                  isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-gray-400 group-hover:text-white'
                                }`}
                              />
                              <span className="truncate">{isAr ? item.labelAr : item.labelEn}</span>
                            </div>

                            {item.badge && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black shrink-0 ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : item.highlight && kpis.pendingApprovalsCount > 0
                                    ? 'bg-[#F05627] text-white animate-pulse'
                                    : 'bg-neutral-800 text-[#F05627] border border-neutral-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ) : (
                          // Collapsed Mini-Mode Icon Button with Rich Flyout Tooltip
                          <div key={item.id} className="relative group flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id);
                                if (onCloseMobile) onCloseMobile();
                              }}
                              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                                isActive
                                  ? 'bg-[#F05627] text-white shadow-lg shadow-orange-950/40 ring-2 ring-[#F05627]/40'
                                  : item.highlight && kpis.pendingApprovalsCount > 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                  : 'text-gray-400 hover:bg-neutral-800 hover:text-white'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {item.badge && !isActive && (
                                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#F05627]" />
                              )}
                            </button>

                            {/* Floating Tooltip flyout on Hover in Mini Mode */}
                            <div
                              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white shadow-2xl border border-neutral-700 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:pointer-events-auto ${
                                isAr
                                  ? 'right-full mr-3 origin-right'
                                  : 'left-full ml-3 origin-left'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{isAr ? item.labelAr : item.labelEn}</span>
                                {item.badge && (
                                  <span className="rounded-md bg-[#F05627] px-1.5 py-0.5 text-[9px] font-black text-white">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                                {isAr ? item.hintAr : item.hintEn}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section / User Profile & Collapse Toggle */}
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/40 space-y-2">
          {/* User Profile Card */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between rounded-xl bg-neutral-900/80 border border-neutral-800 p-2.5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="relative shrink-0">
                  <img
                    src={
                      currentUser.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={currentUser.fullName}
                    className="h-8 w-8 rounded-lg object-cover ring-2 ring-[#F05627]/40"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#1A1A1A]" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-black text-white">
                    {currentUser.fullNameAr || currentUser.fullName}
                  </p>
                  <p className="truncate text-[10px] font-bold text-[#F05627]">
                    {currentUser.role === 'Admin'
                      ? 'المدير التنفيذي CEO'
                      : currentUser.role === 'COO'
                      ? 'المدير التنفيذي للعمليات COO'
                      : currentUser.role === 'Accountant'
                      ? 'المحاسب المالي'
                      : currentUser.role === 'Data_Entry'
                      ? 'مدخل بيانات العمليات'
                      : 'بوابة العميل / مدقق'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative group">
                <img
                  src={
                    currentUser.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.fullName}
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-[#F05627]/40"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#1A1A1A]" />

                {/* Tooltip on mini profile */}
                <div
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white shadow-2xl border border-neutral-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                    isAr ? 'right-full mr-3' : 'left-full ml-3'
                  }`}
                >
                  <p className="text-white">{currentUser.fullNameAr || currentUser.fullName}</p>
                  <p className="text-[10px] text-[#F05627] font-semibold">{currentUser.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Mini/Expand Toggle Button */}
          <button
            type="button"
            id="sidebar-collapse-toggle-btn"
            onClick={handleToggleCollapse}
            className={`hidden lg:flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-gray-400 hover:bg-neutral-800 hover:text-white transition-all ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
            title={isCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar') : (isAr ? 'تصغير القائمة (Mini Mode)' : 'Collapse Sidebar')}
          >
            {isCollapsed ? (
              isAr ? <ChevronLeft className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 text-gray-400" />
                <span className="text-[11px]">{isAr ? 'طي القائمة الجانبية' : 'Mini Sidebar'}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
