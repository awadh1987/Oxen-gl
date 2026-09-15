import React from 'react';
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
  Cpu,
  Palette,
  Wrench,
  CreditCard,
  Globe,
  Layers,
  MapPin,
  Radio,
  Network,
  Scale,
  FileCheck2,
} from 'lucide-react';

export type ActiveTab =
  | 'hub'
  | 'dashboard'
  | 'planning'
  | 'operations'
  | 'maintenance'
  | 'fleet-map'
  | 'billing'
  | 'invoicing'
  | 'vouchers'
  | 'finance-chart'
  | 'finance-trial-balance'
  | 'finance-audit-closing'
  | 'crushers'
  | 'transporters'
  | 'ai-insights'
  | 'executive-admin'
  | 'master-data'
  | 'workflow-builder'
  | 'design-studio'
  | 'tenant-settings'
  | 'approvals'
  | 'procurement'
  | 'inventory'
  | 'mfa'
  | 'customs';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const {
    currentUser,
    language,
    canAccessFinancials,
    kpis,
    isDriverMode,
    toggleDriverMode,
    setIsDriverMode,
    isolationTelemetry,
    tenantId,
    currentCompany,
    authTier,
  } = useApp();
  const isAr = language === 'ar';

  const [availableViews, setAvailableViews] = React.useState<string[] | null>(null);

  // Fetch tenant configurations using the active X-Tenant-ID header to pull available views from isolated schema
  React.useEffect(() => {
    const activeTenantId = tenantId || (authTier === 'tenant' ? currentCompany?.id : null) || 'tenant_001';

    const fetchTenantConfig = async () => {
      try {
        const response = await fetch('/api/tenant/control/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': activeTenantId,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const views = data?.settings?.modules || data?.settings?.available_views || data?.availableViews;
          if (Array.isArray(views) && views.length > 0) {
            setAvailableViews(views);
          }
        }
      } catch (err) {
        console.warn('Tenant config lookup failed, using local schema fallback:', err);
      }
    };

    fetchTenantConfig();
  }, [tenantId, currentCompany?.id, authTier]);

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      labelAr: 'لوحة القيادة والمؤشرات',
      labelEn: 'Executive Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: isAr ? 'رئيسي' : 'Core',
    },
    {
      id: 'planning' as ActiveTab,
      labelAr: 'إدارة التخطيط الاستراتيجي',
      labelEn: 'Planning Department',
      icon: Layers,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: 'Tier 1-3',
    },
    {
      id: 'operations' as ActiveTab,
      labelAr: 'قيد العمليات اليومية',
      labelEn: 'Daily Operations Entry',
      icon: Truck,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: isDriverMode ? (isAr ? 'نشط' : 'Active') : null,
    },
    {
      id: 'maintenance' as ActiveTab,
      labelAr: 'صيانة الأسطول ومصروفات الوقود',
      labelEn: 'Fleet Maintenance & Fuel',
      icon: Wrench,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry'],
      badge: isAr ? 'أوامر ووقود' : 'Fleet Ops',
    },
    {
      id: 'fleet-map' as ActiveTab,
      labelAr: 'خريطة التتبع والرادار المباشر',
      labelEn: 'Live Fleet Radar & Map',
      icon: Radio,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: isAr ? 'رادار حي' : 'Live GPS',
    },
    {
      id: 'invoicing' as ActiveTab,
      labelAr: 'الفواتير الضريبية للعملاء',
      labelEn: 'Customer Invoicing',
      icon: FileSpreadsheet,
      roles: ['Admin', 'COO', 'Accountant', 'Guest'],
      badge: 'ZATCA',
    },
    {
      id: 'vouchers' as ActiveTab,
      labelAr: 'سندات القبض والصرف',
      labelEn: 'Payment & Receipt Vouchers',
      icon: Receipt,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: isAr ? 'سندات' : 'Vouchers',
    },
    {
      id: 'finance-chart' as ActiveTab,
      labelAr: 'دليل الحسابات الشجري',
      labelEn: 'Chart of Accounts',
      path: '/finance/chart',
      icon: Network,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: '5-Deep',
    },
    {
      id: 'finance-trial-balance' as ActiveTab,
      labelAr: 'ميزان المراجعة العام',
      labelEn: 'Trial Balance',
      path: '/finance/trial-balance',
      icon: Scale,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: 'GL',
    },
    {
      id: 'finance-audit-closing' as ActiveTab,
      labelAr: 'الإقفال المالي والمراجعة السنوية',
      labelEn: 'Annual Audit Closing',
      path: '/finance/audit-closing',
      icon: FileCheck2,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: 'Audit',
    },
    {
      id: 'billing' as ActiveTab,
      labelAr: 'اشتراك المنصة والفوترة',
      labelEn: 'SaaS Subscription & Billing',
      icon: CreditCard,
      roles: ['Admin', 'COO'],
      badge: 'SaaS',
    },
    {
      id: 'crushers' as ActiveTab,
      labelAr: 'موردو المواد الخام وحساباتهم',
      labelEn: 'Raw Material Sourcing Ledger',
      icon: Building2,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: null,
    },
    {
      id: 'transporters' as ActiveTab,
      labelAr: 'أداء مزودي الخدمات والتسويات',
      labelEn: 'Carrier Performance & Settlement',
      icon: TrendingDown,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry'],
      badge: isAr ? 'تتبع الفاقد' : 'Wastage',
    },
    {
      id: 'ai-insights' as ActiveTab,
      labelAr: 'ذكاء العمليات OxenGL',
      labelEn: 'OxenGL Operational Intelligence',
      icon: Sparkles,
      roles: ['Admin', 'COO', 'Accountant'],
      badge: 'OxenGL AI',
    },
    {
      id: 'executive-admin' as ActiveTab,
      labelAr: 'لوحة الإدارة والاعتمادات',
      labelEn: 'Executive Approvals & Audit',
      icon: ShieldCheck,
      roles: ['Admin', 'COO'],
      badge: kpis.pendingApprovalsCount > 0 ? `${kpis.pendingApprovalsCount} ${isAr ? 'معلق' : 'Req'}` : null,
      highlight: true,
    },
    {
      id: 'master-data' as ActiveTab,
      labelAr: 'البيانات المرجعية والمستخدمين',
      labelEn: 'Master Data & Users',
      icon: Database,
      roles: ['Admin', 'COO'],
      badge: null,
    },
    {
      id: 'workflow-builder' as ActiveTab,
      labelAr: 'أتمتة وسير العمليات',
      labelEn: 'Workflow Automation',
      icon: Cpu,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: 'Visual BPM',
    },
    {
      id: 'design-studio' as ActiveTab,
      labelAr: 'استوديو التصميم وهوية المستأجر',
      labelEn: 'Design Studio & Themes',
      icon: Palette,
      roles: ['Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: 'Themes',
    },
    {
      id: 'tenant-settings' as ActiveTab,
      labelAr: 'إدارة المنشأة والنطاقات',
      labelEn: 'Tenant Admin & Domains',
      icon: Globe,
      roles: ['Admin', 'COO'],
      badge: 'RLS',
    },
    {
      id: 'customs' as ActiveTab,
      label: 'Customs Clearance Board',
      labelAr: 'إدارة وتخليص الجمارك',
      labelEn: 'Customs Clearance Board',
      path: '/customs',
      icon: '🌍',
      roles: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
      badge: 'Phase 5',
    },
  ];

  // Restrict super-admin elements to master path and pull available views from isolated schema
  const tenantFilteredItems = React.useMemo(() => {
    const isTenant = authTier === 'tenant' || Boolean(tenantId);
    let items = menuItems;
    if (isTenant) {
      // Restrict super-admin elements to the master path
      items = items.filter((item) => item.id !== 'tenant-settings');
    }
    if (availableViews && availableViews.length > 0) {
      items = items.filter((item) => availableViews.includes(item.id));
    }
    return items;
  }, [menuItems, authTier, tenantId, availableViews]);

  // In Driver View mode, restrict the menu to Operations Log and Carrier Performance.
  const displayedMenuItems = isDriverMode
    ? tenantFilteredItems.filter((item) => item.id === 'operations' || item.id === 'transporters')
    : tenantFilteredItems;

  const handleToggleDriverView = () => {
    const nextState = !isDriverMode;
    toggleDriverMode();
    if (nextState && activeTab !== 'operations' && activeTab !== 'transporters') {
      setActiveTab('operations');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar-navigation"
        className={`fixed top-18 z-40 h-[calc(100vh-4.5rem)] w-68 border-r border-slate-800 bg-[#0B132B] text-slate-100 shadow-xl shadow-slate-950/10 transition-transform duration-300 lg:static lg:block ${
          isOpenMobile ? 'translate-x-0' : isAr ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="space-y-2">
            {/* Driver View Toggle Switch Banner */}
            <div className={`rounded-xl border p-3 transition-all ${
              isDriverMode 
                ? 'border-orange-400/50 bg-gradient-to-r from-orange-500/20 to-amber-500/10 shadow-xs' 
                : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/70'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    isDriverMode ? 'bg-[#F05627] text-white shadow-xs' : 'bg-slate-800 text-blue-300'
                  }`}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-white">
                      {isAr ? 'وضع السائقين' : 'Driver View'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-semibold">
                      {isDriverMode 
                        ? (isAr ? 'العمليات والناقلين فقط' : 'Operations & Logistics only')
                        : (isAr ? 'العرض الكامل للنظام' : 'Full ERP View')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="driver-view-mode-toggle"
                  onClick={handleToggleDriverView}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDriverMode ? 'bg-[#F05627]' : 'bg-slate-600'
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
                <div className="mt-2 rounded-lg bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-[#F05627] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F05627] animate-pulse" />
                  <span>{isAr ? 'تم تقييد الواجهة للعمليات الميدانية' : 'UI restricted to Field & Logistics'}</span>
                </div>
              )}
            </div>

            <div className="px-1 pt-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase">
                {isDriverMode 
                  ? (isAr ? 'القائمة الميدانية المبسطة' : 'Field Operations') 
                  : (isAr ? 'القائمة الرئيسية' : 'Main Navigation')}
              </span>
            </div>

            <div className="space-y-1">
              {displayedMenuItems.map((item) => {
                const isAllowed = item.roles.includes(currentUser.role);
                const isActive = activeTab === item.id;
                const renderIconNode = (icon: any, className: string) => {
                  if (typeof icon === 'string') {
                    return <span className={`text-sm inline-flex items-center justify-center leading-none ${className}`}>{icon}</span>;
                  }
                  const IconComp = icon;
                  return <IconComp className={className} />;
                };

                if (!isAllowed) {
                  return (
                    <div
                      key={item.id}
                      className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-slate-600 opacity-70"
                    >
                      <div className="flex items-center gap-3">
                        {renderIconNode(item.icon, "h-4 w-4 text-slate-600")}
                        <span className="text-xs font-semibold">
                          {isAr ? item.labelAr : item.labelEn}
                        </span>
                      </div>
                      <Lock className="h-3 w-3 text-slate-600" />
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if ((item as any).path) {
                        window.history.pushState({}, '', (item as any).path);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'border-blue-400/40 bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-950/30'
                        : item.highlight
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15'
                        : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {renderIconNode(item.icon, `h-4 w-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-300' : 'text-blue-400'}`)}
                      <span>{isAr ? item.labelAr : item.labelEn}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.highlight && kpis.pendingApprovalsCount > 0
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-400/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slide-out Sidebar Panel: Platform Performance Metrics */}
          <div
            id="sidebar-telemetry-panel"
            className="mb-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-emerald-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono text-xs font-bold">{isolationTelemetry?.cloudLatencyMs ?? 12}ms</span>
                <span className="opacity-40 text-xs">|</span>
                <span className="text-xs font-semibold">{isAr ? 'مزامنة فورية' : 'Live Sync'}</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400/70">
                {isAr ? 'بيانات معزولة' : 'Isolated'}
              </span>
            </div>
          </div>

          {/* User Role Card in Sidebar */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="flex items-center gap-2.5">
              <img
                src={
                  currentUser.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                }
                alt={currentUser.fullName}
                className="h-9 w-9 rounded-lg object-cover ring-2 ring-blue-400/30"
              />
              <div className="overflow-hidden">
                <p className="truncate text-xs font-black text-white">
                  {currentUser.fullNameAr || currentUser.fullName}
                </p>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-blue-300">
                    {currentUser.role === 'Admin'
                      ? 'المدير التنفيذي CEO'
                      : currentUser.role === 'COO'
                      ? 'المدير التنفيذي للعمليات COO'
                      : currentUser.role === 'Accountant'
                      ? 'المحاسب المالي'
                      : currentUser.role === 'Data_Entry'
                      ? 'مدخل بيانات العمليات'
                      : 'بوابة العميل / مدقق'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
