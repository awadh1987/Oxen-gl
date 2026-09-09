import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar, ActiveTab } from '../components/Navbar';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardView } from '../views/DashboardView';
import { OperationsLogView } from '../views/OperationsLogView';
import { CustomerInvoicingView } from '../views/CustomerInvoicingView';
import { CrusherLedgerView } from '../views/CrusherLedgerView';
import { TransporterPerformanceView } from '../views/TransporterPerformanceView';
import { AIOperationsView } from '../views/AIOperationsView';
import { ExecutiveAdminView } from '../views/ExecutiveAdminView';
import { MasterDataView } from '../views/MasterDataView';
import { FinancialVouchersView } from '../views/FinancialVouchersView';
import { AccountingView } from '../views/AccountingView';
import { TenantsRegistryView } from '../components/platform/TenantsRegistryView';
import { SaaSLicenseProvisioner } from '../components/SaaSLicenseProvisioner';
import { PricingPlansView } from '../components/platform/PricingPlansView';
import { SystemAuditView } from '../components/platform/SystemAuditView';
import { OxenGLPlatformSettings } from '../components/platform/OxenGLPlatformSettings';
import { AIAssistantWidget } from '../components/AIAssistantWidget';
import { ExportPrintModal, ExportDocType } from '../components/ExportPrintModal';
import { UserRole } from '../types';
import { Crown, Building2, ShieldAlert } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface UnifiedAppLayoutProps {
  onLogout: () => void;
  initialContext?: 'platform' | 'workspace';
}

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({
  onLogout,
  initialContext,
}) => {
  const {
    language,
    currentUser,
    isDriverMode,
    activeTenantId,
    activeTenantLicense,
    isPlatformSuperAdmin,
    switchTenant,
  } = useApp();
  const isAr = language === 'ar';
  const location = useLocation();

  const isPlatformMaster = activeTenantId === 'oxengl-platform';

  // Determine starting tab based on route or active tenant
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (location.pathname.startsWith('/platform') || activeTenantId === 'oxengl-platform') {
      return 'platform-tenants';
    }
    return 'dashboard';
  });

  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);

  // Sync tab when switching to/from platform master
  useEffect(() => {
    if (activeTenantId === 'oxengl-platform' && !activeTab.startsWith('platform-')) {
      // If user switched to platform master and was on tenant-only tab, open tenants registry
      setActiveTab('platform-tenants');
    }
  }, [activeTenantId]);

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
      case 'accounting':
      case 'vouchers':
        return 'financial-vouchers';
      default:
        return 'daily-operations';
    }
  }, [activeTab]);

  // Define allowed roles per tab
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

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateToTab={setActiveTab} />;
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
      case 'platform-tenants':
        return <TenantsRegistryView />;
      case 'platform-licenses':
        return <SaaSLicenseProvisioner />;
      case 'platform-pricing':
        return <PricingPlansView />;
      case 'platform-health':
        return <SystemAuditView />;
      case 'platform-settings':
        return <OxenGLPlatformSettings />;
      default:
        return <DashboardView onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <div
      id="unified-app-layout"
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased flex flex-col transition-colors duration-200"
    >
      {/* 1. Context-Aware Unified Navbar */}
      {activeTab !== 'hub' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAIModal={() => setIsAIChatOpen(true)}
          onOpenExportPrintModal={() => setIsExportPrintModalOpen(true)}
          onLogout={onLogout}
        />
      )}

      {/* 2. Driver Mode Dedicated Alert Strip */}
      {isDriverMode && (
        <div
          id="driver-mode-strip"
          className="border-b border-amber-300 bg-amber-500/10 px-4 py-2 text-center text-xs font-bold text-amber-900"
        >
          {isAr
            ? 'وضع الميدان / السائقين نشط: تم تبسيط الواجهة وتثبيت الحقول السريعة للعمليات'
            : 'Field / Driver Mode Active: Interface simplified for rapid trip logging'}
        </div>
      )}

      {/* 3. Main Workspace Container with Role-Based Access Protection */}
      <main
        id="main-workspace-content-unified"
        className="flex-1 w-full p-4 sm:p-6 transition-all"
      >
        <ProtectedRoute
          allowedRoles={tabRolePermissions[activeTab]}
          isLoggedIn={true}
          onRequireLogin={onLogout}
          onNavigateHome={() => setActiveTab('dashboard')}
        >
          {renderActiveView()}
        </ProtectedRoute>
      </main>

      {/* 4. Global Floating AI Assistant Widget */}
      {currentUser.role !== 'Guest' && (
        <AIAssistantWidget
          isOpenExternal={isAIChatOpen}
          onCloseExternal={() => setIsAIChatOpen(false)}
          onNavigateToTab={setActiveTab}
        />
      )}

      {/* 5. Global Live Export & Print Modal */}
      <ExportPrintModal
        isOpen={isExportPrintModalOpen}
        onClose={() => setIsExportPrintModalOpen(false)}
        initialDocType={defaultDocTypeForTab}
      />

      {/* 6. Context-Aware Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white/95 text-xs text-slate-500 mt-auto w-full">
        <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              {isPlatformMaster
                ? (isAr ? 'منصة OxenGL السحابية المركزية' : 'OxenGL Multi-Tenant Cloud Platform')
                : (activeTenantLicense?.companyName || (isAr ? 'مؤسسة معين للنقليات' : 'Moeen Logistics Est.'))}
            </span>
            <span>•</span>
            <span className="text-[11px] text-slate-400">
              {isAr ? 'كافة الحقوق محفوظة © 2026' : '© 2026 All Rights Reserved'}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
              v3.2.0-SaaS
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-600">
                {isPlatformMaster
                  ? (isAr ? 'منظومة OxenGL Master نشطة' : 'OxenGL Master Active')
                  : `${isAr ? 'بيئة معزولة:' : 'Isolated:'} ${activeTenantLicense?.subscriptionTier || 'PRO'}`}
              </span>
            </div>
            <span>•</span>
            <span className="font-mono text-slate-400">
              ID: {activeTenantId}
            </span>
            {isPlatformSuperAdmin && !isPlatformMaster && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={async () => {
                    await switchTenant('oxengl-platform');
                    setActiveTab('platform-tenants');
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {isAr ? 'العودة لـ OxenGL' : 'Return to OxenGL'}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

// Aliases for backward compatibility and clean architecture
export const OxenGLMasterLayout = UnifiedAppLayout;
export const TenantWorkspaceLayout = UnifiedAppLayout;
export const PlatformAdminLayout = UnifiedAppLayout;
