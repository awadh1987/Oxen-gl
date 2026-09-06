import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { apiService } from './services/api';
import { DashboardView } from './views/DashboardView';
import { OperationsLogView } from './views/OperationsLogView';
import { CustomerInvoicingView } from './views/CustomerInvoicingView';
import { CrusherLedgerView } from './views/CrusherLedgerView';
import { TransporterPerformanceView } from './views/TransporterPerformanceView';
import { AIOperationsView } from './views/AIOperationsView';
import { ExecutiveAdminView } from './views/ExecutiveAdminView';
import { MasterDataView } from './views/MasterDataView';
import { FinancialVouchersView } from './views/FinancialVouchersView';
import { AccountingView } from './views/AccountingView';
import { LoginView } from './views/LoginView';
import { PublicSharedInvoiceView } from './views/PublicSharedInvoiceView';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { ExportPrintModal, ExportDocType } from './components/ExportPrintModal';
import { UserRole } from './types';
import { useOxenThemeEngine } from './hooks/useOxenThemeEngine';

function AppContent() {
  const { language, currentUser, brandConfig, isDriverMode, setCurrentUser } = useApp();
  const isAr = language === 'ar';
  const tenantLicenseKey = localStorage.getItem('tenant_license_key') || undefined;
  useOxenThemeEngine(tenantLicenseKey);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!localStorage.getItem('meayon_access_token'));

  const handleLogout = () => {
    localStorage.removeItem('meayon_access_token');
    localStorage.removeItem('meayon_session_user');
    localStorage.removeItem('meayon_user');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      const token = localStorage.getItem('meayon_access_token');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const profile = await apiService.getCurrentUser();
        if (!profile) {
          setIsLoggedIn(false);
          return;
        }

        setCurrentUser({
          id: profile.id || profile.email,
          username: profile.username || profile.email?.split('@')[0] || 'user',
          fullName: profile.fullName || profile.fullNameAr || profile.email,
          fullNameAr: profile.fullNameAr || profile.fullName || profile.email,
          email: profile.email,
          role: (profile.role || 'Admin') as any,
          status: profile.status || 'Active',
        });
        setIsLoggedIn(true);
      } catch {
        apiService.logout();
        setIsLoggedIn(false);
      }
    };

    bootstrapSession();
  }, [setCurrentUser]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);

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
      case 'accounting':
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
    return <LoginView onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  // View-level RBAC role mappings
  const viewRoleRequirements: Record<ActiveTab, UserRole[] | undefined> = {
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
  };

  const renderActiveViewContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />;
      case 'operations':
        return <OperationsLogView />;
      case 'invoicing':
        return <CustomerInvoicingView />;
      case 'vouchers':
        return <FinancialVouchersView />;
      case 'accounting':
        return <AccountingView />;
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
      default:
        return <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div
      id="meayon-erp-app-root"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'var(--font-family)' }}
      className="min-h-screen bg-slate-50/70 font-sans text-neutral-900 antialiased selection:bg-[#F05627] selection:text-white flex flex-col"
    >
      {/* Top Corporate Horizontal Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAIModal={() => setIsAIChatOpen(true)}
        onOpenExportPrintModal={() => setIsExportPrintModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Full-Width Content Container (Maximized Screen Space for Data Tables) */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Current Active View Component wrapped in ProtectedRoute */}
        <ProtectedRoute
          allowedRoles={viewRoleRequirements[activeTab]}
          isLoggedIn={isLoggedIn}
          onRequireLogin={() => setIsLoggedIn(false)}
          onNavigateHome={() => setActiveTab('dashboard')}
        >
          {renderActiveViewContent()}
        </ProtectedRoute>
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
