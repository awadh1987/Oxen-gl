import React from 'react';
import {
  Building2,
  KeyRound,
  CreditCard,
  Activity,
  ShieldCheck,
  ExternalLink,
  Crown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Layers,
  LayoutDashboard,
  Settings,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export type PlatformTab =
  | 'cockpit'
  | 'tenants'
  | 'licenses'
  | 'pricing'
  | 'system-health'
  | 'settings';

interface PlatformSidebarProps {
  activeTab: PlatformTab;
  setActiveTab: (tab: PlatformTab) => void;
  onLogout: () => void;
}

export const PlatformSidebar: React.FC<PlatformSidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const { language, currentUser, activeTenantId, switchTenant } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const menuItems: {
    id: PlatformTab;
    labelAr: string;
    labelEn: string;
    descriptionAr: string;
    descriptionEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      id: 'cockpit',
      labelAr: 'البانوراما المركزية (Cockpit)',
      labelEn: 'Global Mission Cockpit',
      descriptionAr: 'المؤشرات البانورامية الشاملة والأداء',
      descriptionEn: 'Panoramic MRR, volume & telemetry',
      icon: LayoutDashboard,
      badge: 'LIVE',
    },
    {
      id: 'tenants',
      labelAr: 'سجل المنشآت والشركات (Tenants)',
      labelEn: 'Tenants Registry',
      descriptionAr: 'قائمة العملاء وإدارة الحسابات',
      descriptionEn: 'Client accounts & tenant entities',
      icon: Building2,
    },
    {
      id: 'licenses',
      labelAr: 'إدارة التراخيص والمفاتيح (Licenses)',
      labelEn: 'License Provisioner',
      descriptionAr: 'توليد مفاتيح JWT وضبط الحصص',
      descriptionEn: 'JWT license key issuer',
      icon: KeyRound,
      badge: 'JWT',
    },
    {
      id: 'pricing',
      labelAr: 'خطط الأسعار والباقات (Pricing)',
      labelEn: 'Pricing & Subscription Plans',
      descriptionAr: 'تسعير الباقات ومميزاتها وحصصها',
      descriptionEn: 'Tiers, quotas & features',
      icon: CreditCard,
    },
    {
      id: 'system-health',
      labelAr: 'عزل النظام والأمان (Security & RLS)',
      labelEn: 'System Isolation & Health',
      descriptionAr: 'فحص مصفوفة الـ 17 جدولاً والتهديدات',
      descriptionEn: '17 tables audit & engine metrics',
      icon: Activity,
      badge: '100%',
    },
    {
      id: 'settings',
      labelAr: 'إعدادات مالك المنصة (OxenGL Settings)',
      labelEn: 'Platform Master Settings',
      descriptionAr: 'الهوية البصرية والإعلانات العامة والتشفير',
      descriptionEn: 'Platform branding & announcement',
      icon: Settings,
    },
  ];

  const handleLaunchMyonWorkspace = async () => {
    await switchTenant('tenant-default-001');
    navigate('/workspace/tenant-default-001');
  };

  return (
    <aside
      id="platform-admin-sidebar"
      className="flex h-screen w-80 flex-col justify-between border-e border-slate-800 bg-[#0B132B] text-white shadow-2xl p-4 shrink-0 font-sans select-none overflow-y-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Branding (OxenGL Global Master Console) */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 border-b border-blue-900/50 pb-4 pt-1 px-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 shrink-0">
            <Crown className="h-6 w-6 text-amber-300" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight text-white font-mono">
                OxenGL
              </span>
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-black text-blue-300 border border-blue-400/30">
                MASTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {isAr ? 'لوحة تحكم مالك المنصة المركزية' : 'Central Platform Owner Console'}
            </p>
          </div>
        </div>

        {/* Global Inspection Banner */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/40 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              {isAr ? 'بيئة المالك العالمية' : 'Global Master Environment'}
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-slate-200 font-bold text-xs flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isAr ? 'التحكم المركزي الكامل (Super Admin)' : 'Central Super Admin Root'}</span>
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
            {isAr ? 'الوحدات الإدارية المركزية' : 'Platform Administration Modules'}
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-start transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-black'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-300'
                    }`}
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold leading-tight">{isAr ? item.labelAr : item.labelEn}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {isAr ? item.descriptionAr : item.descriptionEn}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`shrink-0 ms-2 rounded-md px-1.5 py-0.5 text-[9px] font-black font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-400/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions: Jump to Portal, Tenant Workspace & Logout */}
      <div className="space-y-2.5 pt-4 border-t border-slate-800">
        {/* Jump to OxenGL Portal */}
        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="w-full flex items-center justify-between rounded-xl bg-indigo-950/70 border border-indigo-700/60 p-2.5 text-indigo-200 hover:bg-indigo-900/80 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-indigo-200" />
            </div>
            <div className="text-start">
              <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                {isAr ? 'بوابة المنشآت (OxenGL Portal)' : 'OxenGL Portal Gateway'}
              </div>
              <div className="text-[10px] text-indigo-300/80">
                {isAr ? 'دليل الشركات والتسجيل الفوري' : 'Organizations Directory & Onboarding'}
              </div>
            </div>
          </div>
          {isAr ? <ArrowLeft className="h-4 w-4 shrink-0 text-indigo-400" /> : <ArrowRight className="h-4 w-4 shrink-0 text-indigo-400" />}
        </button>

        {/* Jump to Tenant Workspace (Myon) */}
        <button
          type="button"
          onClick={handleLaunchMyonWorkspace}
          className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 p-3 text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#F05627] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              M
            </div>
            <div className="text-start">
              <div className="text-xs font-bold text-white group-hover:text-amber-300">
                {isAr ? 'الدخول لبيئة شركة ميون' : 'Launch Myon Workspace'}
              </div>
              <div className="text-[10px] text-amber-200/80">
                {isAr ? 'تجربة النظام التشغيلي للمشتركين' : 'Inspect Tenant Experience'}
              </div>
            </div>
          </div>
          {isAr ? <ArrowLeft className="h-4 w-4 shrink-0 text-amber-400" /> : <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" />}
        </button>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800/90 p-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.fullNameAr ? currentUser.fullNameAr.charAt(0) : 'A'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {currentUser?.fullNameAr || currentUser?.fullName || 'عوض القحطاني'}
              </div>
              <div className="text-[10px] text-blue-300 font-mono">
                {isAr ? 'مالك المنصة • Super Admin' : 'Platform Owner • Super Admin'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title={isAr ? 'تسجيل الخروج' : 'Logout'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
