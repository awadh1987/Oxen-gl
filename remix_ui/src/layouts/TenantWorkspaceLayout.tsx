import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar, ActiveTab } from '../components/Navbar';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardView } from '../views/DashboardView';
import { TenantLandingHubView } from '../views/TenantLandingHubView';
import { OperationsLogView } from '../views/OperationsLogView';
import { CustomerInvoicingView } from '../views/CustomerInvoicingView';
import { CrusherLedgerView } from '../views/CrusherLedgerView';
import { TransporterPerformanceView } from '../views/TransporterPerformanceView';
import { AIOperationsView } from '../views/AIOperationsView';
import { ExecutiveAdminView } from '../views/ExecutiveAdminView';
import { MasterDataView } from '../views/MasterDataView';
import { FinancialVouchersView } from '../views/FinancialVouchersView';
import { AccountingView } from '../views/AccountingView';
import { AIAssistantWidget } from '../components/AIAssistantWidget';
import { ExportPrintModal, ExportDocType } from '../components/ExportPrintModal';
import { GoogleDriveModal } from '../components/GoogleDriveModal';
import { UserRole } from '../types';
import { Crown, ArrowRight, ArrowLeft, Building2, ShieldAlert, Globe, Compass } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface TenantWorkspaceLayoutProps {
  onLogout: () => void;
}

export const TenantWorkspaceLayout: React.FC<TenantWorkspaceLayoutProps> = ({
  onLogout,
}) => {
  const { tenantId: routeTenantId } = useParams<{ tenantId?: string }>();
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
  const navigate = useNavigate();

  // Synchronize tenant with URL route parameter
  useEffect(() => {
    if (routeTenantId && routeTenantId !== activeTenantId) {
      void switchTenant(routeTenantId);
    }
  }, [routeTenantId, activeTenantId, switchTenant]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('hub');
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);

  // If driver mode is turned on and current tab is restricted, switch to operations
  useEffect(() => {
    if (isDriverMode && activeTab !== 'operations' && activeTab !== 'transporters') {
      setActiveTab('operations');
    }
  }, [isDriverMode, activeTab]);

  // Role-Based Access Control (RBAC): If active tab is not allowed for current role, fall back to hub
  useEffect(() => {
    const allowedRoles = tabRolePermissions[activeTab];
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      setActiveTab('hub');
    }
  }, [currentUser.role, activeTab]);

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
      case 'hub':
        return <TenantLandingHubView onNavigateToTab={setActiveTab} />;
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
      default:
        return <TenantLandingHubView onNavigateToTab={setActiveTab} />;
    }
  };

  const isSuperAdmin = Boolean(isPlatformSuperAdmin || currentUser?.role === 'Admin');

  return (
    <div
      id="tenant-workspace-layout"
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-slate-100 font-sans text-slate-900 antialiased flex flex-col transition-colors duration-200"
    >
      {/* 1. Authentic Myon Enterprise 2-Tier Navbar (Hidden exclusively on Tenant Landing Hub) */}
      {activeTab !== 'hub' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAIModal={() => setIsAIChatOpen(true)}
          onOpenExportPrintModal={() => setIsExportPrintModalOpen(true)}
          onOpenGoogleDriveModal={() => setIsGoogleDriveModalOpen(true)}
          onLogout={onLogout}
        />
      )}

      {/* 2. Driver Mode Dedicated Alert Strip */}
      {isDriverMode && activeTab !== 'hub' && (
        <div
          id="driver-mode-strip"
          className="border-b border-amber-300 bg-amber-500/10 px-4 py-2 text-center text-xs font-bold text-amber-900"
        >
          {isAr
            ? 'وضع الميدان / السائقين نشط: تم تبسيط الواجهة وتثبيت الحقول السريعة للعمليات'
            : 'Field / Driver Mode Active: Interface simplified for rapid trip logging'}
        </div>
      )}

      {/* 3. Main Workspace Container (Uniform p-6 padding scale, centered max-width container for dashboards, tables, and cards, 100% width on mobile) */}
      <main
        id="main-workspace-content"
        className={`flex-1 w-full ${activeTab === 'hub' ? 'p-0' : 'p-4 sm:p-6 md:p-6'} transition-all`}
      >
        {activeTab === 'hub' ? (
          <ProtectedRoute
            allowedRoles={tabRolePermissions[activeTab]}
            isLoggedIn={true}
            onRequireLogin={onLogout}
            onNavigateHome={() => setActiveTab('hub')}
          >
            {renderActiveView()}
          </ProtectedRoute>
        ) : (
          <div className="w-full max-w-[1600px] mx-auto">
            <ProtectedRoute
              allowedRoles={tabRolePermissions[activeTab]}
              isLoggedIn={true}
              onRequireLogin={onLogout}
              onNavigateHome={() => setActiveTab('hub')}
            >
              {renderActiveView()}
            </ProtectedRoute>
          </div>
        )}
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

      {/* 6. Google Drive Cloud Archive & Sync Modal */}
      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
      />

      {/* 7. Authentic Enterprise Isolated Footer (Internal pages only; Hub has its own dark footer) */}
      {activeTab !== 'hub' && (
        <footer className="border-t border-slate-200 bg-white text-xs text-slate-500 mt-auto w-full">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col items-center justify-between gap-3 sm:flex-row px-4 sm:px-6 md:px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                {activeTenantLicense?.companyName || (isAr ? 'شركة ميون الاقتصادية المحدودة' : 'Mayon Economic Company Ltd')}
              </span>
              <span>•</span>
              <span className="text-slate-500">
                {isAr ? 'المنظومة الرقمية لإدارة النقليات والكسارات' : 'Logistics & Quarry Management ERP'}
              </span>
              <span>•</span>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'كافة الحقوق محفوظة © 2026' : '© 2026 All Rights Reserved'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-600">
                  {isAr ? 'بيئة معزولة وآمنة' : 'Isolated & Secure'}: {activeTenantLicense?.subscriptionTier || 'PRO'}
                </span>
              </div>
              <span>•</span>
              <span className="font-mono text-slate-400">
                ID: {activeTenantId}
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
