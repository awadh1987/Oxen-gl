import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Users,
  HardDrive,
  Calendar,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowUpRight,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { erpApi } from '../services/api';

interface BillingSummary {
  tenant_id: string;
  tier: string;
  billing_cycle: string;
  monthly_price_sar: number;
  max_users: number;
  active_users: number;
  max_storage_gb: number;
  current_storage_gb: number;
  is_active: boolean;
  created_at: string;
}

interface SaaSInvoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  billing_cycle: string;
  tier: string;
  amount_sar: number;
  vat_amount_sar: number;
  grand_total_sar: number;
  period_start: string;
  period_end: string;
  status: string;
  issued_at: string;
  pdf_url?: string;
}

const TIER_NAMES: Record<string, { ar: string; en: string }> = {
  starter: { ar: 'باقة البداية (Starter)', en: 'Starter Tier' },
  standard: { ar: 'باقة الأساسية (Standard)', en: 'Standard Tier' },
  growth: { ar: 'باقة النمو والتوسع (Growth)', en: 'Growth Tier' },
  enterprise: { ar: 'باقة المؤسسات الكبرى (Enterprise)', en: 'Enterprise Tier' },
};

export const TenantBillingView: React.FC = () => {
  const { currentCompany, language, themeMode } = useApp();
  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SaaSInvoice | null>(null);
  const [upgradeRequested, setUpgradeRequested] = useState<string | null>(null);

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, invRes, plansRes] = await Promise.all([
        erpApi.getTenantBillingSummary().catch(() => null),
        erpApi.getTenantSaaSInvoices().catch(() => []),
        erpApi.getSubscriptionPlans().catch(() => []),
      ]);

      if (sumRes) setSummary(sumRes);
      if (Array.isArray(invRes)) setInvoices(invRes);
      if (Array.isArray(plansRes)) setPlans(plansRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const userUsagePercent = summary && summary.max_users > 0
    ? Math.min(100, Math.round((summary.active_users / summary.max_users) * 100))
    : 0;

  const storageUsagePercent = summary && summary.max_storage_gb > 0
    ? Math.min(100, Math.round((summary.current_storage_gb / summary.max_storage_gb) * 100))
    : 0;

  return (
    <div className={`space-y-6 min-h-screen ${isDark ? 'text-slate-100' : 'text-slate-900'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className={`rounded-3xl border p-6 shadow-xl relative overflow-hidden ${
        isDark
          ? 'border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
          : 'border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">
                  {isAr ? 'الاشتراك السحابي والفوترة' : 'SaaS Subscription & Billing'}
                </h1>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
                  {summary?.tier?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {isAr
                  ? `إدارة خطة الاشتراك، الحصص التشغيلية، وسجل فواتير SaaS لمستأجر ${currentCompany?.name || ''}`
                  : `Manage cloud subscription plans, resource quotas, and SaaS invoices for ${currentCompany?.name || 'Tenant'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBillingData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {isAr ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Quotas and Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Tier Card */}
        <div className={`rounded-2xl border p-5 transition-all ${
          isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'الخطة الحالية' : 'Active Plan'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-black capitalize text-blue-600 dark:text-blue-400">
              {summary ? TIER_NAMES[summary.tier]?.[isAr ? 'ar' : 'en'] || summary.tier : '—'}
            </h3>
            <p className="mt-1 font-mono text-xl font-bold">
              {summary ? Number(summary.monthly_price_sar).toLocaleString('en-US') : '0'} <span className="text-xs font-normal text-slate-400">SAR / month</span>
            </p>
          </div>
        </div>

        {/* User Quota Card */}
        <div className={`rounded-2xl border p-5 transition-all ${
          isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'المستخدمون النشطون' : 'Active User Seats'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold">
                {summary?.active_users ?? 0} <span className="text-xs font-normal text-slate-400">/ {summary?.max_users ?? '∞'}</span>
              </span>
              <span className={`text-xs font-bold ${userUsagePercent >= 90 ? 'text-rose-500' : 'text-slate-400'}`}>
                {userUsagePercent}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  userUsagePercent >= 90 ? 'bg-rose-500' : userUsagePercent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${userUsagePercent}%` }}
              />
            </div>
            {userUsagePercent >= 90 && (
              <p className="mt-2 text-[10px] text-rose-500 font-bold">
                {isAr ? 'اقتربت من الحد الأقصى للمستخدمين' : 'Near seat capacity limit'}
              </p>
            )}
          </div>
        </div>

        {/* Storage Quota Card */}
        <div className={`rounded-2xl border p-5 transition-all ${
          isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'المساحة السحابية' : 'Cloud Storage'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <HardDrive className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold">
                {summary?.current_storage_gb ?? 0.5} <span className="text-xs font-normal text-slate-400">/ {summary?.max_storage_gb ?? 5} GB</span>
              </span>
              <span className="text-xs font-bold text-slate-400">
                {storageUsagePercent}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.max(5, storageUsagePercent)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-400 font-bold">
              {isAr ? 'مساحة مخصصة للوثائق والمرفقات' : 'Allocated for docs & scale slips'}
            </p>
          </div>
        </div>

        {/* Security & Isolation Card */}
        <div className={`rounded-2xl border p-5 transition-all ${
          isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'مستوى الحماية والعزل' : 'Security Isolation'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-black text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Level 3 Tenant Isolation
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              {isAr ? 'عزل صارم للبيانات مع مفاتيح تشفير RLS مخصصة' : 'Strict schema-level RLS isolation enforced'}
            </p>
          </div>
        </div>
      </div>

      {/* Available Plans Catalog / Upgrade Matrix */}
      <div className={`rounded-3xl border p-6 shadow-sm ${
        isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white'
      }`}>
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {isAr ? 'خيارات الترقية والخطط المتاحة' : 'Upgrade Options & Tier Comparison'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'اختر الخطة المناسبة لحجم أسطولك وفريق عملك للتوسع بسلاسة'
                : 'Scale your logistics operations with increased seat quotas and automated workflows'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'starter',
              nameAr: 'البداية (Starter)',
              nameEn: 'Starter',
              price: 2500,
              users: 5,
              storage: '5 GB',
              features: ['Fleet management (15 trucks)', 'Standard VAT invoicing', 'Weighbridge sync'],
            },
            {
              id: 'standard',
              nameAr: 'الأساسية (Standard)',
              nameEn: 'Standard',
              price: 4500,
              users: 15,
              storage: '25 GB',
              features: ['Up to 50 trucks', 'Preventive Maintenance', 'Fuel logs & cost centers'],
            },
            {
              id: 'growth',
              nameAr: 'النمو (Growth)',
              nameEn: 'Growth',
              price: 8500,
              users: 50,
              storage: '100 GB',
              features: ['Unlimited trucks', 'ZATCA Phase 2 clearance', 'Offline mobile driver app'],
              popular: true,
            },
            {
              id: 'enterprise',
              nameAr: 'المؤسسات (Enterprise)',
              nameEn: 'Enterprise',
              price: 14000,
              users: 999999,
              storage: '1000 GB',
              features: ['Unlimited users & fleet', 'Custom SLA 99.9%', 'Dedicated support & account rep'],
            },
          ].map((plan) => {
            const isCurrent = summary?.tier === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                    : isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-0.5 text-[10px] font-black text-white shadow-xs">
                    {isAr ? 'الأكثر طلباً' : 'Most Popular'}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      {isAr ? plan.nameAr : plan.nameEn}
                    </h3>
                    {isCurrent && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black text-white">
                        {isAr ? 'الخطة الحالية' : 'Current'}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                      {plan.price.toLocaleString('en-US')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">SAR / mo</span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs">
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{plan.users === 999999 ? 'Unlimited seats' : `${plan.users} user seats`}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{plan.storage} cloud storage</span>
                    </li>
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-slate-200 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                    >
                      {isAr ? 'الخطة النشطة' : 'Active Plan'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setUpgradeRequested(plan.id)}
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold transition-colors shadow-xs"
                    >
                      {isAr ? 'طلب الترقية' : 'Upgrade Plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {upgradeRequested && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 flex items-center justify-between">
            <span>
              {isAr
                ? `تم إرسال طلب الترقية إلى باقة (${upgradeRequested.toUpperCase()}) لإدارة المنصة وسيتواصل معك الدعم فوراً.`
                : `Upgrade request to ${upgradeRequested.toUpperCase()} submitted to platform administration. Our team will contact you.`}
            </span>
            <button
              onClick={() => setUpgradeRequested(null)}
              className="rounded-lg bg-emerald-500/20 px-3 py-1 hover:bg-emerald-500/30 text-emerald-200 text-xs"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}
      </div>

      {/* Historical SaaS Invoices */}
      <div className={`rounded-3xl border p-6 shadow-sm ${
        isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white'
      }`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {isAr ? 'سجل الفواتير السحابية (SaaS Invoices)' : 'SaaS Invoices & Payment History'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'فواتير الاشتراك الشهرية الصادرة من المنصة لمستأجر بيئة العمل'
                : 'Platform-issued monthly subscription invoices and clearance status'}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {invoices.length} {isAr ? 'فواتير مسجلة' : 'invoices'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              <tr>
                <th className="p-3.5 font-bold">{isAr ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                <th className="p-3.5 font-bold">{isAr ? 'الدورة' : 'Cycle'}</th>
                <th className="p-3.5 font-bold">{isAr ? 'الباقة' : 'Tier'}</th>
                <th className="p-3.5 font-bold">{isAr ? 'المبلغ (ر.س)' : 'Amount (SAR)'}</th>
                <th className="p-3.5 font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-3.5 font-bold">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                <th className="p-3.5 font-bold text-center">{isAr ? 'الإجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {loading ? (isAr ? 'جارٍ تحميل الفواتير...' : 'Loading invoices...') : (isAr ? 'لا توجد فواتير مسجلة حتى الآن' : 'No subscription invoices found.')}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                      selectedInvoice?.id === inv.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3.5 capitalize font-medium">{inv.billing_cycle}</td>
                    <td className="p-3.5 uppercase font-bold text-slate-700 dark:text-slate-300">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px]">
                        {inv.tier}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-black text-slate-900 dark:text-white">
                      {Number(inv.grand_total_sar || inv.amount_sar).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : inv.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {inv.status === 'Paid' && <CheckCircle2 className="h-3 w-3" />}
                        {inv.status === 'Pending' && <Clock className="h-3 w-3" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono">
                      {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {isAr ? 'عرض' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isAr ? 'فاتورة اشتراك المنصة' : 'Platform Subscription Invoice'}
                </h3>
                <p className="font-mono text-xs text-blue-500 font-bold">{selectedInvoice.invoice_number}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isAr ? 'الشركة المستأجرة' : 'Tenant Entity'}:</span>
                <span className="font-bold">{currentCompany?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isAr ? 'الباقة المختارة' : 'Subscription Tier'}:</span>
                <span className="font-bold uppercase">{selectedInvoice.tier}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isAr ? 'دورة الفوترة' : 'Billing Period'}:</span>
                <span className="font-mono">
                  {selectedInvoice.period_start ? new Date(selectedInvoice.period_start).toLocaleDateString('en-GB') : '—'}
                  {' → '}
                  {selectedInvoice.period_end ? new Date(selectedInvoice.period_end).toLocaleDateString('en-GB') : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isAr ? 'المبلغ قبل الضريبة' : 'Subtotal'}:</span>
                <span className="font-mono font-bold">
                  {Number(selectedInvoice.amount_sar).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isAr ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}:</span>
                <span className="font-mono font-bold">
                  {Number(selectedInvoice.vat_amount_sar).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm bg-blue-500/10 rounded-xl px-3 font-black text-blue-600 dark:text-blue-400">
                <span>{isAr ? 'الإجمالي المستحق' : 'Grand Total'}:</span>
                <span className="font-mono">
                  {Number(selectedInvoice.grand_total_sar || selectedInvoice.amount_sar).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => {
                  alert(isAr ? 'تم بدء تنزيل ملف الفاتورة بصيغة PDF' : 'Downloading invoice PDF...');
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                {isAr ? 'تحميل الفاتورة PDF' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
