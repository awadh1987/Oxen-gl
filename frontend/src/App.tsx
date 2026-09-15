import React, { useState, useEffect, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NotificationTopBar } from './components/NotificationTopBar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import type { ExportDocType } from './components/ExportPrintModal';
import { Building2, Cpu, CreditCard, Layers, FileSpreadsheet, Landmark, LayoutDashboard, Menu, Palette, Receipt, Scale, Sparkles, Truck, Users, Wrench, X, Globe, Radio } from 'lucide-react';
import { UserRole } from './types';

// Code-split dynamic view imports
const DashboardView = React.lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const TenantLandingHubView = React.lazy(() => import('./views/TenantLandingHubView').then(m => ({ default: m.TenantLandingHubView })));
const OperationsLogView = React.lazy(() => import('./views/OperationsLogView').then(m => ({ default: m.OperationsLogView })));
const CustomerInvoicingView = React.lazy(() => import('./views/CustomerInvoicingView').then(m => ({ default: m.CustomerInvoicingView })));
const CrusherLedgerView = React.lazy(() => import('./views/CrusherLedgerView').then(m => ({ default: m.CrusherLedgerView })));
const TransporterPerformanceView = React.lazy(() => import('./views/TransporterPerformanceView').then(m => ({ default: m.TransporterPerformanceView })));
const AIOperationsView = React.lazy(() => import('./views/AIOperationsView').then(m => ({ default: m.AIOperationsView })));
const ExecutiveAdminView = React.lazy(() => import('./views/ExecutiveAdminView').then(m => ({ default: m.ExecutiveAdminView })));
const MasterDataView = React.lazy(() => import('./views/MasterDataView').then(m => ({ default: m.MasterDataView })));
const FinancialVouchersView = React.lazy(() => import('./views/FinancialVouchersView').then(m => ({ default: m.FinancialVouchersView })));
const TenantLoginView = React.lazy(() => import('./views/TenantLoginView').then(m => ({ default: m.TenantLoginView })));
const TenantRegistrationView = React.lazy(() => import('./views/TenantRegistrationView').then(m => ({ default: m.TenantRegistrationView })));
const LandingPageView = React.lazy(() => import('./views/LandingPageView').then(m => ({ default: m.LandingPageView })));
const SuperAdminLoginView = React.lazy(() => import('./views/SuperAdminLoginView').then(m => ({ default: m.SuperAdminLoginView })));
const SuperAdminCockpitView = React.lazy(() => import('./views/SuperAdminCockpitView').then(m => ({ default: m.SuperAdminCockpitView })));
const PublicSharedInvoiceView = React.lazy(() => import('./views/PublicSharedInvoiceView').then(m => ({ default: m.PublicSharedInvoiceView })));
const WorkflowAutomationView = React.lazy(() => import('./views/WorkflowAutomationView').then(m => ({ default: m.WorkflowAutomationView })));
const DesignSystemStudioView = React.lazy(() => import('./views/DesignSystemStudioView').then(m => ({ default: m.DesignSystemStudioView })));
const TenantBillingView = React.lazy(() => import('./views/TenantBillingView').then(m => ({ default: m.TenantBillingView })));
const FleetMaintenanceView = React.lazy(() => import('./views/FleetMaintenanceView').then(m => ({ default: m.FleetMaintenanceView })));
const FleetMapView = React.lazy(() => import('./views/FleetMapView').then(m => ({ default: m.FleetMapView })));
const ExportPrintModal = React.lazy(() => import('./components/ExportPrintModal').then(m => ({ default: m.ExportPrintModal })));
const TenantSettingsPanel = React.lazy(() => import('./components/platform/TenantSettingsPanel').then(m => ({ default: m.TenantSettingsPanel })));
const PlanningDepartmentView = React.lazy(() => import('./components/PlanningDepartmentView').then(m => ({ default: m.PlanningDepartmentView })));
const ApprovalQueueView = React.lazy(() => import('./views/ApprovalQueueView').then(m => ({ default: m.ApprovalQueueView })));
const MfaVerificationView = React.lazy(() => import('./views/MfaVerificationView').then(m => ({ default: m.MfaVerificationView })));
const CustomsClearanceView = React.lazy(() => import('./views/CustomsClearanceView').then(m => ({ default: m.CustomsClearanceView })));
const FinanceReportsView = React.lazy(() => import('./views/FinanceReportsView').then(m => ({ default: m.FinanceReportsView })));

const ViewLoadingFallback = () => (
  <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-12 text-center">
    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 mb-3 animate-pulse">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
    </div>
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
      جاري تحميل بيانات الشاشة... / Loading screen...
    </p>
  </div>
);

export interface RouteProps {
  path: string;
  element: React.ReactNode;
}

export const Route: React.FC<RouteProps> = ({ element }) => <>{element}</>;

function AppContent() {
  const { language, currentUser, brandConfig, isDriverMode, themeMode, authTier, tenantId, logoutUser, isTwoTierAuthenticated } = useApp();
  const isAr = language === 'ar';

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem('oxengl_session_active') === 'true' || localStorage.getItem('oxengl_auth_jwt'));
  });

  useEffect(() => {
    if (isTwoTierAuthenticated) {
      setIsLoggedIn(true);
    }
  }, [isTwoTierAuthenticated]);

  const [inspectingWorkspace, setInspectingWorkspace] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => (typeof window !== 'undefined' && window.location.pathname === '/planning' ? 'planning' : 'hub'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);
  useEffect(() => {
    const syncPath = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        setCurrentPath(path);
        if (path === '/planning') {
          setActiveTab('planning');
        } else if (path === '/finance/chart') {
          setActiveTab('finance-chart');
        } else if (path === '/finance/trial-balance') {
          setActiveTab('finance-trial-balance');
        } else if (path === '/finance/audit-closing') {
          setActiveTab('finance-audit-closing');
        }
      }
    };
    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    if (activeTab === 'planning' && typeof window !== 'undefined' && window.location.pathname !== '/planning') {
      window.history.pushState({}, '', '/planning');
    }
  }, [activeTab]);


  const tenantNavigation: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; group: 'Operations & Logistics' | 'Finance, Accounting & Control' }[] = [
    { id: 'hub', label: 'Home Hub', icon: Building2, group: 'Operations & Logistics' },
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, group: 'Operations & Logistics' },
    { id: 'planning', label: 'Planning Department', icon: Layers, group: 'Operations & Logistics' },
    { id: 'operations', label: 'Daily Operations Logs', icon: Truck, group: 'Operations & Logistics' },
    { id: 'maintenance', label: 'Fleet Maintenance & Fuel', icon: Wrench, group: 'Operations & Logistics' },
    { id: 'fleet-map', label: 'Live Fleet Radar & Map', icon: Radio, group: 'Operations & Logistics' },
    { id: 'transporters', label: 'Transporters & Shrinkage', icon: Scale, group: 'Operations & Logistics' },
    { id: 'crushers', label: 'Crusher Statements', icon: Building2, group: 'Operations & Logistics' },
    { id: 'master-data', label: 'Master Data & Pricing', icon: Users, group: 'Operations & Logistics' },
    { id: 'workflow-builder', label: 'Workflow Automation', icon: Cpu, group: 'Operations & Logistics' },
    { id: 'invoicing', label: 'Customer Tax Invoicing', icon: FileSpreadsheet, group: 'Finance, Accounting & Control' },
    { id: 'vouchers', label: 'Financial Vouchers', icon: Receipt, group: 'Finance, Accounting & Control' },
    { id: 'finance-chart', label: 'Chart of Accounts', icon: Landmark, group: 'Finance, Accounting & Control' },
    { id: 'finance-trial-balance', label: 'Trial Balance', icon: Scale, group: 'Finance, Accounting & Control' },
    { id: 'finance-audit-closing', label: 'Annual Audit Closing', icon: FileSpreadsheet, group: 'Finance, Accounting & Control' },
    { id: 'billing', label: 'SaaS Plan & Billing', icon: CreditCard, group: 'Finance, Accounting & Control' },
    { id: 'executive-admin', label: 'Executive Approvals & Audit', icon: Landmark, group: 'Finance, Accounting & Control' },
    { id: 'ai-insights', label: 'AI Operations Auditor', icon: Sparkles, group: 'Finance, Accounting & Control' },
    { id: 'design-studio', label: 'Design System & AI Studio', icon: Palette, group: 'Finance, Accounting & Control' },
    { id: 'tenant-settings', label: 'Tenant Admin & Domains', icon: Globe, group: 'Finance, Accounting & Control' },
    { id: 'customs', label: 'Customs Clearance Board', icon: Globe, group: 'Operations & Logistics' },
  ];

  useEffect(() => {
    const openOperationalIntelligence = () => setIsAIChatOpen(true);
    window.addEventListener('oxengl-open-ai', openOperationalIntelligence);
    return () => window.removeEventListener('oxengl-open-ai', openOperationalIntelligence);
  }, []);

  useEffect(() => {
    localStorage.setItem('oxengl_session_active', String(isLoggedIn));
    if (isLoggedIn) setActiveTab(currentUser.role === 'Super_Admin' ? 'dashboard' : 'hub');
    else localStorage.removeItem('oxengl_recovery_session');
  }, [isLoggedIn, currentUser.role]);

  // If driver mode is turned on and current tab is restricted, switch to operations
  useEffect(() => {
    if (isDriverMode && activeTab !== 'operations' && activeTab !== 'transporters') {
      setActiveTab('operations');
    }
  }, [isDriverMode, activeTab]);

  // Derive default document type based on current active tab
  const defaultDocTypeForTab: ExportDocType = React.useMemo(() => {
    switch (activeTab) {
      case 'operations':
        return 'daily-operations';
      case 'invoicing':
        return 'vat-invoice';
      case 'crushers':
        return 'crusher-statement';
      case 'transporters':
        return 'transporter-shrinkage';
      case 'vouchers':
        return 'financial-vouchers';
      default:
        return 'vat-invoice';
    }
  }, [activeTab]);

  // Check URL for public shared invoice link (?shared_invoice=INV-2026-08-1048&token=...)
  const [sharedInvoiceParams, setSharedInvoiceParams] = useState<{
    invoiceNumber: string;
    token?: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedInv = urlParams.get('shared_invoice');
      const token = urlParams.get('token') || undefined;
      if (sharedInv) {
        return { invoiceNumber: sharedInv, token };
      }
    }
    return null;
  });

  // If a public shared invoice link was accessed, render the standalone auditor view
  if (sharedInvoiceParams) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <PublicSharedInvoiceView
          invoiceNumber={sharedInvoiceParams.invoiceNumber}
          token={sharedInvoiceParams.token}
          onBackToPortal={() => {
            // Clear query params and show login/portal
            window.history.replaceState({}, document.title, window.location.pathname);
            setSharedInvoiceParams(null);
          }}
        />
      </Suspense>
    );
  }

  if (currentPath === '/customs') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <Route path="/customs" element={<CustomsClearanceView />} />
      </Suspense>
    );
  }

  if (currentPath === '/admin') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <Route path="/admin" element={<SuperAdminLoginView onLoginSuccess={() => setIsLoggedIn(true)} />} />
      </Suspense>
    );
  }

  if (currentPath === '/register') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <Route
          path="/register"
          element={
            <TenantRegistrationView
              onSuccess={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
            />
          }
        />
      </Suspense>
    );
  }

  if (currentPath === '/login') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <Route path="/login" element={<TenantLoginView onLoginSuccess={() => setIsLoggedIn(true)} />} />
      </Suspense>
    );
  }

  if (currentPath === '/' && !isLoggedIn) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <Route path="/" element={<LandingPageView onLoginSuccess={() => setIsLoggedIn(true)} />} />
      </Suspense>
    );
  }

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <Route path="/login" element={<TenantLoginView onLoginSuccess={() => setIsLoggedIn(true)} />} />
      </Suspense>
    );
  }

  const leaveWorkspace = () => {
    logoutUser();
    setIsLoggedIn(false);
    setInspectingWorkspace(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if ((authTier === 'master' || currentUser.role === 'Super_Admin') && !inspectingWorkspace) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <ProtectedRoute
          tier="master"
          isLoggedIn={isLoggedIn}
          onRequireLogin={leaveWorkspace}
          onNavigateHome={() => setIsLoggedIn(false)}
        >
          <SuperAdminCockpitView
            onOpenTenantOnboarding={() => {
              logoutUser();
              setIsLoggedIn(false);
            }}
            onLogout={leaveWorkspace}
            onInspectTenantWorkspace={() => { setInspectingWorkspace(true); setActiveTab('hub'); }}
          />
        </ProtectedRoute>
      </Suspense>
    );
  }

  // View-level RBAC role mappings
  const viewRoleRequirements: Record<ActiveTab, UserRole[] | undefined> = {
    hub: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    dashboard: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    planning: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    operations: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    maintenance: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    invoicing: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Guest'],
    vouchers: ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    billing: ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    crushers: ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    transporters: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry'],
    'ai-insights': ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    'executive-admin': ['Super_Admin', 'Admin', 'COO'],
    'master-data': ['Super_Admin', 'Admin', 'COO'],
    'workflow-builder': ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    'design-studio': ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    'tenant-settings': ['Super_Admin', 'Admin', 'COO'],
    'fleet-map': ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    'finance-chart': ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    'finance-trial-balance': ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    'finance-audit-closing': ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    approvals: ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    procurement: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry'],
    inventory: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry'],
    mfa: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    customs: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
  };

  const renderActiveViewContent = () => {
    switch (activeTab) {
      case 'hub':
        return <TenantLandingHubView onNavigateToTab={setActiveTab} />;
      case 'dashboard':
        return <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />;
      case 'customs':
        return <CustomsClearanceView />;
      case 'approvals':
        return <ApprovalQueueView />;
      case 'mfa':
        return <MfaVerificationView onCancel={() => setActiveTab('dashboard')} />;
      case 'planning':
        return <PlanningDepartmentView />;
      case 'operations':
        return <OperationsLogView />;
      case 'maintenance':
        return <FleetMaintenanceView />;
      case 'fleet-map':
        return <FleetMapView />;
      case 'invoicing':
        return <CustomerInvoicingView />;
      case 'vouchers':
        return <FinancialVouchersView />;
      case 'finance-chart':
        return <FinanceReportsView initialMode="chart" />;
      case 'finance-trial-balance':
        return <FinanceReportsView initialMode="trial-balance" />;
      case 'finance-audit-closing':
        return <FinanceReportsView initialMode="audit-closing" />;
      case 'billing':
        return <TenantBillingView />;
      case 'crushers':
        return <CrusherLedgerView />;
      case 'transporters':
        return <TransporterPerformanceView />;
      case 'ai-insights':
        return <AIOperationsView />;
      case 'executive-admin':
        return <ExecutiveAdminView />;
      case 'master-data':
        return <MasterDataView />;
      case 'workflow-builder':
        return <WorkflowAutomationView />;
      case 'design-studio':
        return <DesignSystemStudioView />;
      case 'tenant-settings':
        return (
          <TenantSettingsPanel
            tenantId={(brandConfig as any)?.tenantId || '44f9ed53-be0a-454e-acbf-c87e54ff9438'}
            tenantSlug={(brandConfig as any)?.slug || 'horizon-logistics'}
          />
        );
      default:
        return <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div
      id="meayon-erp-app-root"
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen font-sans antialiased selection:bg-[#F05627] selection:text-white relative transition-colors ${
        themeMode === 'dark' ? 'bg-[#0b0d19] text-slate-100' : 'bg-slate-100 text-neutral-900'
      }`}
    >
      <NotificationTopBar />
      {activeTab !== 'hub' && <Navbar
        onOpenAIModal={() => setIsAIChatOpen(true)}
        onOpenExportPrintModal={() => setIsExportPrintModalOpen(true)}
        onLogout={leaveWorkspace}
      />}

      {activeTab !== 'hub' && (() => {
        const isTenant = authTier === 'tenant' || Boolean(tenantId);
        const activeTenantNav = isTenant
          ? tenantNavigation.filter((item) => item.id !== 'tenant-settings')
          : tenantNavigation;

        return (
          <div className={`border-b shadow-sm ${themeMode === 'dark' ? 'border-slate-800 bg-[#0e1324]' : 'border-slate-200 bg-white'}`} dir={isAr ? 'rtl' : 'ltr'}>
            <div className={`flex min-h-9 items-center gap-2 border-b px-4 sm:px-6 ${themeMode === 'dark' ? 'border-slate-800/60' : 'border-slate-100'}`}><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black ${themeMode === 'dark' ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-slate-700'}`}><Truck className="h-3 w-3 text-orange-500" />Operations & Logistics</span><div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">{activeTenantNav.filter((item) => item.group === 'Operations & Logistics').map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-bold transition-colors ${activeTab === item.id ? 'border-orange-500 text-orange-400' : themeMode === 'dark' ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-950'}`}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}</div></div>
            <div className="flex min-h-9 items-center gap-2 px-4 sm:px-6"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black ${themeMode === 'dark' ? 'bg-violet-950/60 text-violet-300' : 'bg-violet-50 text-violet-800'}`}><Landmark className="h-3 w-3 text-violet-400" />Finance, Accounting & Control</span><div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">{activeTenantNav.filter((item) => item.group === 'Finance, Accounting & Control').map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-bold transition-colors ${activeTab === item.id ? 'border-violet-500 text-violet-400' : themeMode === 'dark' ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-950'}`}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}</div></div>
          </div>
        );
      })()}

      <div className="flex">
        {activeTab !== 'hub' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        )}
        <main className={activeTab === 'hub' ? 'min-w-0 flex-1' : `min-w-0 flex-1 p-4 sm:p-6 lg:p-8 ${themeMode === 'dark' ? 'bg-[#0b0d19]' : 'bg-slate-100'}`}>
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 shadow-xs">{isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}<span>{isAr ? 'Navigation' : 'Menu'}</span></button>
            <span className="text-xs font-black text-[#F05627]">{isAr ? brandConfig.companyNameAr : brandConfig.companyNameEn}</span>
          </div>
          <div className="mx-auto w-full max-w-[1600px]">
            <ProtectedRoute
              tier="tenant"
              allowedRoles={viewRoleRequirements[activeTab]}
              isLoggedIn={isLoggedIn}
              onRequireLogin={leaveWorkspace}
              onNavigateHome={() => setActiveTab('dashboard')}
            >
              <Suspense fallback={<ViewLoadingFallback />}>
                {renderActiveViewContent()}
              </Suspense>
            </ProtectedRoute>
          </div>
        </main>
      </div>

      {/* Global Live Preview & Print/Export Modal */}
      {isExportPrintModalOpen && (
        <Suspense fallback={null}>
          <ExportPrintModal
            isOpen={isExportPrintModalOpen}
            onClose={() => setIsExportPrintModalOpen(false)}
            initialDocType={defaultDocTypeForTab}
          />
        </Suspense>
      )}

      {/* Persistent AI Assistant Widget */}
      <AIAssistantWidget
        isOpenExternal={isAIChatOpen}
        onCloseExternal={() => setIsAIChatOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setIsAIChatOpen(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
