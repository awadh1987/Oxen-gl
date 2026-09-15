import React from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationTopBar } from '../components/NotificationTopBar';
import {
  Building2,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Globe2,
  Lock,
  Sparkles,
  Server,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface LandingPageViewProps {
  onLoginSuccess?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = () => {
  const { language, setLanguage } = useApp();
  const isAr = language === 'ar';

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const portalCards = [
    {
      id: 'tenant-login',
      path: '/login',
      titleAr: 'بوابة تسجيل دخول المنشآت',
      titleEn: 'Tenant Workspace Portal',
      subtitleAr: 'الدخول إلى مساحة العمل الخاصة بالمنشأة عبر المعرف المخصص وعزل البيانات',
      subtitleEn: 'Access your isolated corporate workspace with Zero-Knowledge tenancy',
      icon: Building2,
      badgeAr: 'للمنشآت والشركاء',
      badgeEn: 'Tenants & Partners',
      buttonTextAr: 'الدخول إلى المنشأة',
      buttonTextEn: 'Enter Workspace',
      colorClass: 'from-orange-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-orange-500/40 hover:border-orange-400',
      iconBg: 'bg-orange-500/20 text-orange-400',
      btnBg: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20',
    },
    {
      id: 'super-admin',
      path: '/admin',
      titleAr: 'بوابة التحكم والمشرف العام',
      titleEn: 'Platform Master Control Plane',
      subtitleAr: 'إدارة البنية التحتية، عزل قواعد البيانات، واعتمادات العمليات الفائقة',
      subtitleEn: 'Container-level administration, RLS policies, and global system telemetry',
      icon: ShieldCheck,
      badgeAr: 'المشرفين فقط',
      badgeEn: 'Restricted Root',
      buttonTextAr: 'لوحة المشرف العام',
      buttonTextEn: 'Admin Cockpit',
      colorClass: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      btnBg: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-500/20',
    },
    {
      id: 'tenant-register',
      path: '/register',
      titleAr: 'تسجيل منشأة جديدة',
      titleEn: 'Enterprise Onboarding',
      subtitleAr: 'إنشاء بيئة سحابية معزولة لمنشأتك مع تفعيل السجل التجاري والضريبي الفوري',
      subtitleEn: 'Provision a new isolated ERP partition with automated CR and ZATCA compliance',
      icon: UserPlus,
      badgeAr: 'انضمام فوري',
      badgeEn: 'Instant Setup',
      buttonTextAr: 'إنشاء مساحة عمل',
      buttonTextEn: 'Register Workspace',
      colorClass: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20',
    },
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#070b14] text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-white flex flex-col justify-between"
    >
      <NotificationTopBar />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0c1222]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showText={false} />
            <div>
              <span className="text-sm font-black tracking-wider uppercase text-white">
                OXENGL ENTERPRISE CLOUD
              </span>
              <p className="text-[10px] text-slate-400 font-mono">
                {isAr ? 'منصة العمليات اللوجستية والموارد المؤسسية' : 'Unified Logistics & Supply Chain Cloud'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition shadow-xs"
            >
              <Globe2 className="h-3.5 w-3.5 text-orange-400" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Hero & Neutral Routing Grid */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-xs font-bold text-orange-300 mb-4">
            <Sparkles className="h-4 w-4 text-orange-400" />
            <span>
              {isAr
                ? 'بنية تحتية سحابية معزولة بنظام Multi-Tenancy الصارم'
                : 'Zero-Knowledge Multi-Tenant Logistics Infrastructure'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
            {isAr ? 'بوابة الوصول الموحدة للمنظومة' : 'Unified Enterprise Access Gateway'}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {isAr
              ? 'اختر مسار الدخول المخصص لبيئتك. تتم إدارة هويات المنشآت وحسابات المشرفين عبر مسارات أمان مشفرة ومعزولة كلياً.'
              : 'Select your designated portal route. Tenant identities, control planes, and onboarding pipelines are strictly partitioned with end-to-end isolation.'}
          </p>
        </div>

        {/* The Neutral Routing Grid: Exactly 3 Interactive Icon Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto w-full">
          {portalCards.map((card) => {
            const IconComp = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigateTo(card.path)}
                className={`group relative cursor-pointer rounded-3xl border ${card.borderColor} bg-slate-900/70 p-7 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden flex flex-col justify-between`}
              >
                {/* Background Gradient Mesh */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${card.colorClass} opacity-40 group-hover:opacity-80 transition duration-300 pointer-events-none`}
                />

                <div className="relative z-10">
                  {/* Card Header & Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`flex h-13 w-13 items-center justify-center rounded-2xl ${card.iconBg} shadow-inner ring-1 ring-white/10 group-hover:scale-105 transition-transform`}
                    >
                      <IconComp className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold text-slate-300 font-mono">
                      {isAr ? card.badgeAr : card.badgeEn}
                    </span>
                  </div>

                  {/* Card Titles */}
                  <h2 className="text-xl font-black text-white mb-2 group-hover:text-white transition">
                    {isAr ? card.titleAr : card.titleEn}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {isAr ? card.subtitleAr : card.subtitleEn}
                  </p>
                </div>

                {/* Tactical Link Button */}
                <div className="relative z-10 pt-4 border-t border-slate-800/60">
                  <div
                    className={`flex w-full items-center justify-center gap-2 rounded-xl ${card.btnBg} py-3 px-4 text-xs font-bold shadow-md transition group-hover:opacity-95`}
                  >
                    <span>{isAr ? card.buttonTextAr : card.buttonTextEn}</span>
                    {isAr ? (
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    ) : (
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Assurance Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{isAr ? 'عزل أمني كامل لقواعد البيانات (RLS)' : 'Row Level Security Isolated (RLS)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{isAr ? 'مصادقة Argon2id المشفرة' : 'Argon2id Memory-Hardened Auth'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{isAr ? 'متوافق مع ZATCA المرحلة الثانية' : 'ZATCA Phase 2 E-Invoicing'}</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0a0f1d] py-4">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-mono">
          <div>
            © {new Date().getFullYear()} OxenGL Cloud Logistics • All Rights Reserved
          </div>
          <div>
            Zero-Knowledge Isolated Tenancy • Tier-2 Architectural Partition
          </div>
        </div>
      </footer>
    </div>
  );
};
