import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ActiveTab } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardView } from './views/DashboardView';
import { TenantLandingHubView } from './views/TenantLandingHubView';
import { OperationsLogView } from './views/OperationsLogView';
import { CustomerInvoicingView } from './views/CustomerInvoicingView';
import { CrusherLedgerView } from './views/CrusherLedgerView';
import { TransporterPerformanceView } from './views/TransporterPerformanceView';
import { AIOperationsView } from './views/AIOperationsView';
import { ExecutiveAdminView } from './views/ExecutiveAdminView';
import { MasterDataView } from './views/MasterDataView';
import { FinancialVouchersView } from './views/FinancialVouchersView';
import { LoginView } from './views/LoginView';
import { OxenGLCloudPortal } from './views/OxenGLCloudPortal';
import { SuperAdminCockpitView } from './views/SuperAdminCockpitView';
import { PublicSharedInvoiceView } from './views/PublicSharedInvoiceView';
import { WorkflowAutomationView } from './views/WorkflowAutomationView';
import { DesignSystemStudioView } from './views/DesignSystemStudioView';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { ExportPrintModal, ExportDocType } from './components/ExportPrintModal';
import { Building2, Cpu, FileSpreadsheet, Landmark, LayoutDashboard, Menu, Palette, Receipt, Scale, Sparkles, Truck, Users, X } from 'lucide-react';
import { UserRole } from './types';

function AppContent() {
  const { language, currentUser, brandConfig, isDriverMode, themeMode } = useApp();
  const isAr = language === 'ar';

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('oxengl_session_active') === 'true');
  const [inspectingWorkspace, setInspectingWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('hub');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);

  const tenantNavigation: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; group: 'Operations & Logistics' | 'Finance, Accounting & Control' }[] = [
    { id: 'hub', label: 'Home Hub', icon: Building2, group: 'Operations & Logistics' },
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, group: 'Operations & Logistics' },
    { id: 'operations', label: 'Daily Operations Logs', icon: Truck, group: 'Operations & Logistics' },
    { id: 'transporters', label: 'Transporters & Shrinkage', icon: Scale, group: 'Operations & Logistics' },
    { id: 'crushers', label: 'Crusher Statements', icon: Building2, group: 'Operations & Logistics' },
    { id: 'master-data', label: 'Master Data & Pricing', icon: Users, group: 'Operations & Logistics' },
    { id: 'workflow-builder', label: 'Workflow Automation', icon: Cpu, group: 'Operations & Logistics' },
    { id: 'invoicing', label: 'Customer Tax Invoicing', icon: FileSpreadsheet, group: 'Finance, Accounting & Control' },
    { id: 'vouchers', label: 'Financial Vouchers', icon: Receipt, group: 'Finance, Accounting & Control' },
    { id: 'executive-admin', label: 'Executive Approvals & Audit', icon: Landmark, group: 'Finance, Accounting & Control' },
    { id: 'ai-insights', label: 'AI Operations Auditor', icon: Sparkles, group: 'Finance, Accounting & Control' },
    { id: 'design-studio', label: 'Design System & AI Studio', icon: Palette, group: 'Finance, Accounting & Control' },
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
      <PublicSharedInvoiceView
        invoiceNumber={sharedInvoiceParams.invoiceNumber}
        token={sharedInvoiceParams.token}
        onBackToPortal={() => {
          // Clear query params and show login/portal
          window.history.replaceState({}, document.title, window.location.pathname);
          setSharedInvoiceParams(null);
        }}
      />
    );
  }

  if (!isLoggedIn) {
    return <OxenGLCloudPortal onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  if (currentUser.role === 'Super_Admin' && !inspectingWorkspace) {
    return (
      <SuperAdminCockpitView
        onOpenTenantOnboarding={() => setIsLoggedIn(false)}
        onLogout={() => setIsLoggedIn(false)}
        onInspectTenantWorkspace={() => { setInspectingWorkspace(true); setActiveTab('hub'); }}
      />
    );
  }

  // View-level RBAC role mappings
  const viewRoleRequirements: Record<ActiveTab, UserRole[] | undefined> = {
    hub: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    dashboard: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    operations: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    invoicing: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Guest'],
    vouchers: ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    crushers: ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    transporters: ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry'],
    'ai-insights': ['Super_Admin', 'Admin', 'COO', 'Accountant'],
    'executive-admin': ['Super_Admin', 'Admin', 'COO'],
    'master-data': ['Super_Admin', 'Admin', 'COO'],
    'workflow-builder': ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
    'design-studio': ['Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest'],
  };

  const leaveWorkspace = () => {
    if (currentUser.role === 'Super_Admin') setInspectingWorkspace(false);
    else setIsLoggedIn(false);
  };

  const renderActiveViewContent = () => {
    switch (activeTab) {
      case 'hub':
        return <TenantLandingHubView onNavigateToTab={setActiveTab} />;
      case 'dashboard':
        return <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />;
      case 'operations':
        return <OperationsLogView />;
      case 'invoicing':
        return <CustomerInvoicingView />;
      case 'vouchers':
        return <FinancialVouchersView />;
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
      {activeTab !== 'hub' && <Navbar
        onOpenAIModal={() => setIsAIChatOpen(true)}
        onOpenExportPrintModal={() => setIsExportPrintModalOpen(true)}
        onLogout={leaveWorkspace}
      />}

      {activeTab !== 'hub' && <div className={`border-b shadow-sm ${themeMode === 'dark' ? 'border-slate-800 bg-[#0e1324]' : 'border-slate-200 bg-white'}`} dir={isAr ? 'rtl' : 'ltr'}>
        <div className={`flex min-h-9 items-center gap-2 border-b px-4 sm:px-6 ${themeMode === 'dark' ? 'border-slate-800/60' : 'border-slate-100'}`}><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black ${themeMode === 'dark' ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-slate-700'}`}><Truck className="h-3 w-3 text-orange-500" />Operations & Logistics</span><div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">{tenantNavigation.filter((item) => item.group === 'Operations & Logistics').map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-bold transition-colors ${activeTab === item.id ? 'border-orange-500 text-orange-400' : themeMode === 'dark' ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-950'}`}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}</div></div>
        <div className="flex min-h-9 items-center gap-2 px-4 sm:px-6"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black ${themeMode === 'dark' ? 'bg-violet-950/60 text-violet-300' : 'bg-violet-50 text-violet-800'}`}><Landmark className="h-3 w-3 text-violet-400" />Finance, Accounting & Control</span><div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">{tenantNavigation.filter((item) => item.group === 'Finance, Accounting & Control').map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-bold transition-colors ${activeTab === item.id ? 'border-violet-500 text-violet-400' : themeMode === 'dark' ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-950'}`}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}</div></div>
      </div>}

      <main className={activeTab === 'hub' ? 'min-w-0 flex-1' : `min-w-0 flex-1 p-4 sm:p-6 lg:p-8 ${themeMode === 'dark' ? 'bg-[#0b0d19]' : 'bg-slate-100'}`}>
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 shadow-xs">{isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}<span>{isAr ? 'Navigation' : 'Menu'}</span></button>
            <span className="text-xs font-black text-[#F05627]">{isAr ? brandConfig.companyNameAr : brandConfig.companyNameEn}</span>
          </div>
          <div className="mx-auto w-full max-w-[1600px]">
            <ProtectedRoute
              allowedRoles={viewRoleRequirements[activeTab]}
              isLoggedIn={isLoggedIn}
              onRequireLogin={leaveWorkspace}
              onNavigateHome={() => setActiveTab('dashboard')}
            >
              {renderActiveViewContent()}
            </ProtectedRoute>
          </div>
      </main>

      {/* Global Live Preview & Print/Export Modal */}
      <ExportPrintModal
        isOpen={isExportPrintModalOpen}
        onClose={() => setIsExportPrintModalOpen(false)}
        initialDocType={defaultDocTypeForTab}
      />

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
