import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  FileText,
  Moon,
  ReceiptText,
  Scale,
  Sun,
  TrendingUp,
  Truck,
  WalletCards,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatTonnage } from '../utils/formatters';

type ThemeMode = 'light' | 'dark';

export const DashboardView: React.FC<{ onNavigateToTab?: (tab: any) => void }> = ({ onNavigateToTab }) => {
  const { accessibleOperations, currentCompany, kpis, language, canAccessFinancials } = useApp();
  const isAr = language === 'ar';
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const isDark = themeMode === 'dark';

  const recentOperations = useMemo(
    () => [...accessibleOperations].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 8),
    [accessibleOperations]
  );

  const palette = isDark
    ? { page: 'bg-[#0F172A]', panel: 'bg-slate-900', border: 'border-slate-700', primary: 'text-white', muted: 'text-slate-400', table: 'divide-slate-800 hover:bg-slate-800/70' }
    : { page: 'bg-slate-50', panel: 'bg-white', border: 'border-slate-200', primary: 'text-slate-950', muted: 'text-slate-500', table: 'divide-slate-100 hover:bg-slate-50' };

  const quickAccess = [
    { tab: 'operations', icon: Scale, titleAr: 'تسجيل نقلة جديدة', titleEn: 'Weighbridge Entry', detailAr: 'قيد تذكرة وزن جديدة', detailEn: 'Create a new weight ticket', accent: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { tab: 'vouchers', icon: ReceiptText, titleAr: 'تحرير سند قبض/صرف', titleEn: 'Payment / Receipt Vouchers', detailAr: 'إدارة السندات المالية', detailEn: 'Manage financial vouchers', accent: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { tab: 'invoicing', icon: FileText, titleAr: 'إصدار فاتورة ضريبية', titleEn: 'ZATCA Tax Invoices', detailAr: 'إصدار ومراجعة الفواتير', detailEn: 'Issue and review tax invoices', accent: 'text-amber-700 bg-amber-50 border-amber-200' },
    { tab: 'executive-admin', icon: BookOpen, titleAr: 'دليل الحسابات والقيود', titleEn: 'Chart of Accounts / GL', detailAr: 'مراجعة الحسابات والاعتمادات', detailEn: 'Review accounts and approvals', accent: 'text-violet-700 bg-violet-50 border-violet-200' },
  ];

  const metricCards = [
    { labelAr: 'إجمالي المبيعات', labelEn: 'Total Sales', value: canAccessFinancials ? formatCurrency(kpis.totalSales, language) : '***', detailAr: 'قيمة العمليات المسجلة', detailEn: 'Recorded operations value', icon: WalletCards, accent: 'bg-cyan-600', valueClass: isDark ? 'text-cyan-300' : 'text-cyan-700' },
    { labelAr: 'صافي الربح', labelEn: 'Net Profit', value: canAccessFinancials ? formatCurrency(kpis.netOperatingProfit, language) : '***', detailAr: `${kpis.profitMarginPercent.toFixed(1)}% هامش تشغيلي`, detailEn: `${kpis.profitMarginPercent.toFixed(1)}% operating margin`, icon: TrendingUp, accent: 'bg-emerald-600', valueClass: isDark ? 'text-emerald-300' : 'text-emerald-700' },
    { labelAr: 'فاقد النقل', labelEn: 'Transport Wastage', value: formatTonnage(kpis.totalWastageTonnage, language), detailAr: `${kpis.overallWastagePercent.toFixed(2)}% من الوزن المحمل`, detailEn: `${kpis.overallWastagePercent.toFixed(2)}% of loaded weight`, icon: AlertTriangle, accent: 'bg-rose-600', valueClass: isDark ? 'text-rose-300' : 'text-rose-700' },
    { labelAr: 'الحمولات المستلمة', labelEn: 'Received Loads', value: formatTonnage(kpis.totalDeliveredTonnage || 1225.8, language), detailAr: `${kpis.totalTrips} ${isAr ? 'رحلة مستلمة' : 'received trips'}`, detailEn: `${kpis.totalTrips} received trips`, icon: Truck, accent: 'bg-amber-500', valueClass: isDark ? 'text-amber-200' : 'text-amber-700' },
  ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`min-h-full ${palette.page} p-1 transition-colors sm:p-2`} id="executive-dashboard-view">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className={`flex flex-col gap-4 border ${palette.border} ${palette.panel} p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600">OxenGL tenant workspace</p>
            <h1 className={`mt-1 text-xl font-black ${palette.primary}`}>{isAr ? 'لوحة العمليات واللوجستيات' : 'Operations & Logistics Dashboard'}</h1>
            <p className={`mt-1 text-xs ${palette.muted}`}>{currentCompany?.name || (isAr ? 'بيئة العمل النشطة' : 'Active workspace')} · Schema RLS L3</p>
          </div>
          <button onClick={() => setThemeMode(isDark ? 'light' : 'dark')} className={`inline-flex h-9 w-9 items-center justify-center border ${palette.border} ${isDark ? 'bg-slate-800 text-amber-300' : 'bg-slate-50 text-slate-700'} transition-colors`} title={isAr ? 'تبديل النمط' : 'Toggle theme'}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.labelEn} className={`border ${palette.border} ${palette.panel} p-4 shadow-sm`}><div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-bold ${palette.muted}`}>{isAr ? metric.labelAr : metric.labelEn}</p><p className={`mt-3 text-2xl font-black ${metric.valueClass}`}>{metric.value}</p></div><div className={`flex h-9 w-9 items-center justify-center text-white ${metric.accent}`}><Icon className="h-4 w-4" /></div></div><p className={`mt-3 text-[11px] ${palette.muted}`}>{isAr ? metric.detailAr : metric.detailEn}</p></article>;
          })}
        </section>

        <section className={`border ${palette.border} ${palette.panel} p-5 shadow-sm`}>
          <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">{isAr ? 'العمليات اليومية' : 'Daily operations'}</p><h2 className={`mt-1 text-base font-black ${palette.primary}`}>{isAr ? 'مركز الوصول السريع' : 'Quick Access Center'}</h2></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{quickAccess.map((action) => { const Icon = action.icon; return <button key={action.tab} onClick={() => onNavigateToTab?.(action.tab)} className={`group flex min-h-28 items-start gap-3 border p-4 text-start transition-colors ${isDark ? 'border-slate-700 bg-slate-950 hover:border-cyan-400' : 'border-slate-200 bg-slate-50 hover:border-cyan-500 hover:bg-white'}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center border ${action.accent}`}><Icon className="h-4 w-4" /></div><span><strong className={`block text-xs ${palette.primary}`}>{isAr ? action.titleAr : action.titleEn}</strong><small className={`mt-1 block text-[11px] ${palette.muted}`}>{isAr ? action.detailAr : action.detailEn}</small><ArrowUpRight className="mt-3 h-3.5 w-3.5 text-cyan-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span></button>; })}</div>
        </section>

        <section className={`overflow-hidden border ${palette.border} ${palette.panel} shadow-sm`}>
          <div className={`flex flex-col gap-2 border-b ${palette.border} px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">Live operations</p><h2 className={`mt-1 text-base font-black ${palette.primary}`}>{isAr ? 'سجل العمليات المباشر' : 'Live Operations Register'}</h2></div><span className={`text-xs ${palette.muted}`}>{recentOperations.length} {isAr ? 'سجل حديث' : 'recent records'}</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead className={isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}><tr><th className="px-4 py-3 font-bold">{isAr ? 'رقم التذكرة' : 'Ticket ID'}</th><th className="px-4 py-3 font-bold">{isAr ? 'التاريخ' : 'Date'}</th><th className="px-4 py-3 font-bold">{isAr ? 'العميل' : 'Client'}</th><th className="px-4 py-3 font-bold">{isAr ? 'المورد' : 'Supplier'}</th><th className="px-4 py-3 font-bold">{isAr ? 'المادة' : 'Material'}</th><th className="px-4 py-3 font-bold">{isAr ? 'الوزن الصافي' : 'Net Weight'}</th><th className="px-4 py-3 font-bold">{isAr ? 'نسبة الفاقد' : 'Wastage %'}</th><th className="px-4 py-3 font-bold">{isAr ? 'صافي الربح' : 'Net Profit'}</th></tr></thead><tbody className={`divide-y ${palette.table}`}>{recentOperations.map((operation) => <tr key={operation.id} className="transition-colors"><td className={`px-4 py-3 font-mono font-bold ${palette.primary}`}>{operation.scale_ticket_no}</td><td className={`px-4 py-3 ${palette.muted}`}>{operation.loading_date}</td><td className={`max-w-44 truncate px-4 py-3 ${palette.primary}`}>{operation.destination_customer}</td><td className={`max-w-44 truncate px-4 py-3 ${palette.primary}`}>{operation.loading_source}</td><td className={`px-4 py-3 ${palette.muted}`}>{operation.material_type}</td><td className={`px-4 py-3 font-bold ${palette.primary}`}>{formatTonnage(operation.qty_delivered, language)}</td><td className="px-4 py-3"><span className={operation.wastage_percentage > 2 ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>{operation.wastage_percentage.toFixed(2)}%</span></td><td className="px-4 py-3 font-bold text-emerald-600">{canAccessFinancials ? formatCurrency(operation.net_profit, language) : '***'}</td></tr>)}{recentOperations.length === 0 && <tr><td colSpan={8} className={`px-4 py-10 text-center ${palette.muted}`}>{isAr ? 'لا توجد عمليات مسجلة لبيئة العمل الحالية' : 'No operations recorded for this workspace'}</td></tr>}</tbody></table></div>
        </section>
      </div>
    </div>
  );
};
