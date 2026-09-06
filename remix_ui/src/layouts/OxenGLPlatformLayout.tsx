import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlatformSidebar, PlatformTab } from '../components/platform/PlatformSidebar';
import { OxenGLPanoramicCockpit } from '../components/platform/OxenGLPanoramicCockpit';
import { TenantsRegistryView } from '../components/platform/TenantsRegistryView';
import { SaaSLicenseProvisioner } from '../components/SaaSLicenseProvisioner';
import { PricingPlansView } from '../components/platform/PricingPlansView';
import { SystemAuditView } from '../components/platform/SystemAuditView';
import { OxenGLPlatformSettings } from '../components/platform/OxenGLPlatformSettings';
import {
  ShieldCheck,
  Building2,
  ExternalLink,
  Search,
  Bell,
  Globe,
  Radio,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OxenGLPlatformLayoutProps {
  onLogout: () => void;
}

export const OxenGLPlatformLayout: React.FC<OxenGLPlatformLayoutProps> = ({
  onLogout,
}) => {
  const { language, setLanguage, currentUser, activeTenantId, switchTenant } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PlatformTab>('cockpit');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTenantSelectorOpen, setIsTenantSelectorOpen] = useState(false);

  const handleSelectTenant = async (tenantId: string) => {
    await switchTenant(tenantId);
    setIsTenantSelectorOpen(false);
    navigate('/workspace');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'cockpit':
        return <OxenGLPanoramicCockpit onNavigateTab={setActiveTab} />;
      case 'tenants':
        return <TenantsRegistryView />;
      case 'licenses':
        return <SaaSLicenseProvisioner />;
      case 'pricing':
        return <PricingPlansView />;
      case 'system-health':
        return <SystemAuditView />;
      case 'settings':
        return <OxenGLPlatformSettings />;
      default:
        return <OxenGLPanoramicCockpit onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div
      id="oxengl-platform-root"
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex h-screen w-full overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased"
    >
      {/* 1. Global Enterprise Command Rail / Sidebar */}
      <PlatformSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />

      {/* 2. Main Executive Content Stage */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-100">
        {/* Top Global Command Ribbon (SAP Fiori / Oracle Cloud Fusion Shell) */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-black uppercase text-blue-900 tracking-wider">
                OxenGL • MASTER ROOT
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Quick Global Search */}
            <div className="relative hidden md:block w-72 lg:w-96">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث شامل في المنشآت، التراخيص، وسجلات التدقيق...' : 'Search tenants, licenses, audit logs...'}
                className="w-full rounded-xl bg-slate-100 border border-slate-200 py-1.5 pe-3 ps-9 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Tenant Impersonation / Inspection Jump */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTenantSelectorOpen(!isTenantSelectorOpen)}
                className="flex items-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-800 transition-all cursor-pointer"
              >
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>{isAr ? 'فحص بيئة منشأة:' : 'Inspect Tenant:'}</span>
                <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                  {activeTenantId === 'oxengl-platform' ? 'Central Master' : activeTenantId}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
              </button>

              {isTenantSelectorOpen && (
                <div className="absolute end-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="p-2 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">
                      {isAr ? 'اختر بيئة المنشأة للفحص' : 'Select Tenant Workspace to Inspect'}
                    </p>
                  </div>
                  <div className="py-1 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectTenant('tenant-default-001')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-start text-slate-800 font-bold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-[#F05627] text-white flex items-center justify-center text-[10px] font-black">
                          M
                        </div>
                        <div>
                          <div>{isAr ? 'شركة ميون الاقتصادية المحدودة' : 'Mayon Economic Co.'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">tenant-default-001 • PRO</div>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTenant('tenant-gulf-002')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-start text-slate-800 font-bold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">
                          G
                        </div>
                        <div>
                          <div>{isAr ? 'شركة أفق الخليج للنقليات' : 'Gulf Horizon Heavy Transport'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">tenant-gulf-002 • ENTERPRISE</div>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTenant('tenant-riyadh-003')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-start text-slate-800 font-bold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                          R
                        </div>
                        <div>
                          <div>{isAr ? 'مؤسسة محاجر الرياض' : 'Riyadh Quarries Est.'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">tenant-riyadh-003 • BASIC</div>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(isAr ? 'en' : 'ar')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>{isAr ? 'English' : 'عربي'}</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </header>

        {/* Global Broadcast Announcement Banner (if configured) */}
        {(() => {
          const isAnnActive = typeof window !== 'undefined' && localStorage.getItem('oxengl_announcement_active') === 'true';
          const annText = typeof window !== 'undefined' ? localStorage.getItem('oxengl_announcement') : '';
          if (!isAnnActive || !annText) return null;
          return (
            <div className="bg-amber-500 text-slate-950 px-6 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 animate-pulse text-amber-900" />
                <span className="font-black uppercase">{isAr ? 'إعلان المنصة المركزي:' : 'Platform Broadcast:'}</span>
                <span>{annText}</span>
              </div>
              <span className="text-[10px] bg-amber-900 text-amber-100 px-2 py-0.5 rounded font-mono">GLOBAL BROADCAST</span>
            </div>
          );
        })()}

        {/* 3. Main Panoramic Workspace Stage (Fluid Widescreen Enterprise Layout) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full transition-all">
          {renderActiveView()}
        </main>

        {/* 4. Enterprise Institutional Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-2.5 text-xs text-slate-500 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">OxenGL Global Cloud ERP Core</span>
            <span>•</span>
            <span className="text-[11px] font-mono text-slate-400">Build: 2026.09-ENTERPRISE-PRO</span>
            <span>•</span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Multi-Tenant Schema Level 3 Isolation</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {isAr ? 'مركز عمليات مالك المنصة • جميع الحقوق محفوظة © 2026' : 'Central Platform Ops • All Rights Reserved © 2026'}
          </div>
        </footer>
      </div>
    </div>
  );
};

export const PlatformAdminLayout = OxenGLPlatformLayout;
