import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Shield,
  Layers,
  Users,
  Building,
  Crown,
  Zap,
  HelpCircle,
  FileCheck,
  CreditCard,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';

export const PricingPlansView: React.FC = () => {
  const { language } = useApp();
  const isAr = language === 'ar';

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getTenants()
      .then((data) => {
        if (Array.isArray(data)) setTenants(data);
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  const basicCount = tenants.filter(
    (t) => (t.subscriptionTier || t.subscription_tier || '').toUpperCase() === 'BASIC'
  ).length;
  const proCount = tenants.filter(
    (t) => (t.subscriptionTier || t.subscription_tier || '').toUpperCase() === 'PROFESSIONAL'
  ).length;
  const entCount = tenants.filter(
    (t) => (t.subscriptionTier || t.subscription_tier || '').toUpperCase() === 'ENTERPRISE'
  ).length;

  const plans = [
    {
      id: 'plan-basic',
      tier: 'BASIC',
      nameAr: 'الباقة الأساسية (النقل والتشغيل)',
      nameEn: 'Basic Logistics Tier',
      badgeAr: 'للمؤسسات الناشئة',
      badgeEn: 'Starter Fleet',
      priceMonthly: 2500,
      priceYearly: 25500, // 15% discount
      activeCount: basicCount,
      color: 'from-amber-600 to-amber-700',
      borderAccent: 'border-amber-300',
      features: [
        { textAr: 'إدارة أسطول النقل والشاحنات (حتى 15 شاحنة)', textEn: 'Fleet management (up to 15 trucks)' },
        { textAr: 'تذاكر ميزان البسكول الآلية ومراقبة الهدر', textEn: 'Automated weighbridge tickets & wastage' },
        { textAr: '5 مراكز تكلفة تشغيلية فقط', textEn: '5 Cost Centers max' },
        { textAr: '5 مستخدمين بصلاحيات محددة', textEn: '5 User accounts' },
        { textAr: 'محرك الفواتير الضريبية 15% المعتمد', textEn: 'Standard 15% VAT invoicing' },
        { textAr: 'تقارير الأرباح التشغيلية الشهرية', textEn: 'Monthly operations margin reports' },
      ],
      notIncluded: [
        { textAr: 'الربط المباشر مع ZATCA الفاتورة الإلكترونية المرحلة 2', textEn: 'ZATCA Phase 2 Live Integration' },
        { textAr: 'محرك إهلاك الأصول الثابتة الآلي', textEn: 'Automated fixed assets depreciation' },
        { textAr: 'شجرة حسابات مالية مخصصة ومراكز تكلفة متقدمة', textEn: 'Custom multi-level chart of accounts' },
      ],
    },
    {
      id: 'plan-pro',
      tier: 'PROFESSIONAL',
      nameAr: 'الباقة الاحترافية (ERP المتكامل للمقاولات)',
      nameEn: 'Professional ERP Tier',
      badgeAr: 'الأكثر طلباً للشركات',
      badgeEn: 'Most Popular',
      priceMonthly: 6500,
      priceYearly: 66300, // 15% discount
      activeCount: proCount,
      color: 'from-blue-600 to-indigo-700',
      borderAccent: 'border-blue-400 ring-2 ring-blue-500/20 shadow-xl',
      highlight: true,
      features: [
        { textAr: 'تشغيل أسطول غير محدود من الشاحنات والناقلين', textEn: 'Unlimited fleet & transporter haulage' },
        { textAr: 'تتبع كشوف حسابات الكسارات وحسابات المقاصة', textEn: 'Crusher ledgers & payment clearances' },
        { textAr: '25 مركز تكلفة مستقل مع ميزانيات تقديرية', textEn: '25 Cost Centers with budgeting' },
        { textAr: '15 مستخدم بنظام صلاحيات تدقيق وفصل مهام (RBAC)', textEn: '15 RBAC Users with dual approvals' },
        { textAr: 'محرك القيود اليومية التلقائي والمطابقة المحاسبية', textEn: 'Automated journal engine & audit trail' },
        { textAr: 'محرك ضريبة القيمة المضافة 15% مع الإقرار الضريبي', textEn: 'Advanced VAT declaration & reconciliations' },
        { textAr: 'التخصيص الكامل للهوية البصرية والترويسة الرسمية', textEn: 'White-labeling & branded letterheads' },
      ],
      notIncluded: [
        { textAr: 'استضافة على خوادم سحابية خاصة مخصصة', textEn: 'Dedicated private cloud container' },
      ],
    },
    {
      id: 'plan-enterprise',
      tier: 'ENTERPRISE',
      nameAr: 'الباقة المؤسسية (المجموعات القابضة والتعدين)',
      nameEn: 'Enterprise Conglomerate Tier',
      badgeAr: 'حلول الشركات الكبرى',
      badgeEn: 'Corporate Enterprise',
      priceMonthly: 14000,
      priceYearly: 142800, // 15% discount
      activeCount: entCount,
      color: 'from-purple-700 to-slate-900',
      borderAccent: 'border-purple-300',
      features: [
        { textAr: 'كافة مميزات المنظومة بدون أي قيود أو حدود', textEn: 'All ERP features without limits' },
        { textAr: 'مراكز تكلفة وفروع متعددة غير محدودة (50+ مركز)', textEn: 'Unlimited Cost Centers & Branches' },
        { textAr: '50+ مستخدم مع محرك اعتماد تنفيذي متعدد المستويات', textEn: '50+ Users with executive workflow' },
        { textAr: 'الربط المباشر مع ZATCA الفاتورة الإلكترونية عبر API', textEn: 'ZATCA Phase 2 direct API connector' },
        { textAr: 'محرك إهلاك الأصول الثابتة الآلي ومسيرات الرواتب', textEn: 'Fixed assets engine & payroll ledger' },
        { textAr: 'تشفير كامل لقواعد البيانات وعزل مادي للأرشفة', textEn: 'Dedicated isolated database partition' },
        { textAr: 'دعم فني مخصص على مدار الساعة مع SLA 99.9%', textEn: '24/7 Dedicated Support & 99.9% SLA' },
      ],
      notIncluded: [],
    },
  ];

  return (
    <div className="space-y-6" id="pricing-plans-view">
      {/* Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 text-white shadow-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-inner">
            <CreditCard className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              {isAr ? 'باقات وخطط الاشتراك السحابي' : 'Cloud Subscription & Pricing Plans'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'إدارة تسعير تراخيص ERP للمستأجرين، تحديد حدود مراكز التكلفة والمستخدمين، ومتابعة توزيع المنشآت النشطة على الباقات.'
                : 'Configure tenant pricing tiers, resource quotas, and monitor distribution across active client companies.'}
            </p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center rounded-2xl bg-slate-800/80 p-1 border border-slate-700">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الدفع الشهري' : 'Monthly'}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              billingCycle === 'yearly'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{isAr ? 'الدفع السنوي' : 'Yearly'}</span>
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">
              {isAr ? 'خصم 15%' : '15% Off'}
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all hover:shadow-lg ${
                plan.borderAccent
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-[11px] font-black text-white shadow-md">
                  {isAr ? plan.badgeAr : plan.badgeEn}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {plan.tier}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>
                      {plan.activeCount} {isAr ? 'منشأة مشتركة' : 'Subscribers'}
                    </span>
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black text-slate-900">
                  {isAr ? plan.nameAr : plan.nameEn}
                </h3>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline gap-1 border-b border-slate-100 pb-5">
                  <span className="text-3xl font-black text-slate-950 font-mono">
                    {price.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {isAr ? 'ر.س / شهرياً' : 'SAR / month'}
                  </span>
                  {billingCycle === 'yearly' && (
                    <span className="text-[10px] text-slate-400 mr-2">
                      ({isAr ? 'تُدفع سنوياً ' : 'billed yearly '}
                      <strong className="font-mono">{plan.priceYearly.toLocaleString('en-US')}</strong> ر.س)
                    </span>
                  )}
                </div>

                {/* Features List */}
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-black text-slate-800">
                    {isAr ? 'الميزات والقدرات المتضمنة:' : 'Included features:'}
                  </p>
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{isAr ? feat.textAr : feat.textEn}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 mt-4 space-y-2">
                      <p className="text-[11px] font-bold text-slate-400">
                        {isAr ? 'غير متوفر بهذه الباقة:' : 'Not included:'}
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        {plan.notIncluded.map((notFeat, idx) => (
                          <li key={idx} className="flex items-start gap-2 line-through opacity-75">
                            <span className="text-slate-300">•</span>
                            <span>{isAr ? notFeat.textAr : notFeat.textEn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <div className="rounded-2xl bg-slate-50 p-3 text-center text-xs text-slate-600 font-medium">
                  {isAr ? 'يتم تعيين الباقة تلقائياً عند إصدار مفتاح الترخيص للمستأجر' : 'Tier is assigned when generating tenant license'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
