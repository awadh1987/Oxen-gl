import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  FileText,
  ReceiptText,
  Scale,
  TrendingUp,
  Truck,
  WalletCards,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatTonnage } from '../utils/formatters';
import { IsolationTelemetryBadge } from '../components/design-system/IsolationTelemetryBadge';
import { ThemeDensityToolbar } from '../components/design-system/ThemeDensityToolbar';
import { DENSITY_STYLES } from '../theme/designTokens';

export const DashboardView: React.FC<{ onNavigateToTab?: (tab: any) => void }> = ({ onNavigateToTab }) => {
  const {
    accessibleOperations,
    currentCompany,
    kpis,
    language,
    canAccessFinancials,
    themeMode,
    densityMode,
  } = useApp();

  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';
  const density = DENSITY_STYLES[densityMode];

  const recentOperations = useMemo(
    () => [...accessibleOperations].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 10),
    [accessibleOperations]
  );

  const quickAccess = [
    { tab: 'operations', icon: Scale, titleAr: 'تسجيل نقلة جديدة', titleEn: 'Weighbridge Entry', detailAr: 'قيد تذكرة وزن جديدة', detailEn: 'Create a new weight ticket', accent: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { tab: 'vouchers', icon: ReceiptText, titleAr: 'تحرير سند قبض/صرف', titleEn: 'Payment / Receipt Vouchers', detailAr: 'إدارة السندات المالية', detailEn: 'Manage financial vouchers', accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { tab: 'invoicing', icon: FileText, titleAr: 'إصدار فاتورة ضريبية', titleEn: 'ZATCA Tax Invoices', detailAr: 'إصدار ومراجعة الفواتير', detailEn: 'Issue and review tax invoices', accent: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { tab: 'executive-admin', icon: BookOpen, titleAr: 'دليل الحسابات والقيود', titleEn: 'Chart of Accounts / GL', detailAr: 'مراجعة الحسابات والاعتمادات', detailEn: 'Review accounts and approvals', accent: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  ];

  const metricCards = [
    { labelAr: 'إجمالي المبيعات', labelEn: 'Total Sales', value: canAccessFinancials ? formatCurrency(kpis.totalSales, language) : '***', detailAr: 'قيمة العمليات المسجلة', detailEn: 'Recorded operations value', icon: WalletCards, accent: 'bg-orange-500 text-white', valueClass: isDark ? 'text-yellow-300' : 'text-orange-600' },
    { labelAr: 'صافي الربح', labelEn: 'Net Profit', value: canAccessFinancials ? formatCurrency(kpis.netOperatingProfit, language) : '***', detailAr: `${kpis.profitMarginPercent.toFixed(1)}% هامش تشغيلي`, detailEn: `${kpis.profitMarginPercent.toFixed(1)}% operating margin`, icon: TrendingUp, accent: 'bg-emerald-500 text-white', valueClass: isDark ? 'text-emerald-400' : 'text-emerald-700' },
    { labelAr: 'فاقد النقل', labelEn: 'Transport Wastage', value: formatTonnage(kpis.totalWastageTonnage, language), detailAr: `${kpis.overallWastagePercent.toFixed(2)}% من الوزن المحمل`, detailEn: `${kpis.overallWastagePercent.toFixed(2)}% of loaded weight`, icon: AlertTriangle, accent: 'bg-rose-500 text-white', valueClass: isDark ? 'text-rose-400' : 'text-rose-700' },
    { labelAr: 'الحمولات المستلمة', labelEn: 'Received Loads', value: formatTonnage(kpis.totalDeliveredTonnage || 1225.8, language), detailAr: `${kpis.totalTrips} ${isAr ? 'رحلة مستلمة' : 'received trips'}`, detailEn: `${kpis.totalTrips} received trips`, icon: Truck, accent: 'bg-amber-500 text-white', valueClass: isDark ? 'text-amber-300' : 'text-amber-700' },
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-full p-2 transition-colors sm:p-4 ${
        isDark ? 'bg-[#0b0d19] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      id="executive-dashboard-view"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header with Title and Global Theme/Density Toolbar */}
        <header
          className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between ${
            isDark
              ? 'border-slate-800 bg-[#141726]/90 backdrop-blur-xl'
              : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">
                OxenGL Tenant Workspace
              </span>
              <IsolationTelemetryBadge variant="pill" />
            </div>
            <h1 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {isAr ? 'لوحة العمليات واللوجستيات التنفيذية' : 'Executive Operations & Logistics Dashboard'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {currentCompany?.name || (isAr ? 'بيئة العمل النشطة' : 'Active Workspace')} · Schema RLS L3
            </p>
          </div>

          <ThemeDensityToolbar />
        </header>

        {/* Telemetry HUD Banner */}
        <IsolationTelemetryBadge variant="banner" />

        {/* 4 Metric Bento Cards */}
        <section className={`grid grid-cols-1 ${density.gridGap} sm:grid-cols-2 xl:grid-cols-4`}>
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.labelEn}
                className={`rounded-2xl border transition-all hover:scale-[1.01] ${
                  isDark
                    ? 'border-slate-800 bg-[#141726]/90 shadow-xl'
                    : 'border-slate-200 bg-white shadow-xs'
                } ${density.cardPadding}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      {isAr ? metric.labelAr : metric.labelEn}
                    </p>
                    <p className={`mt-2 font-mono text-2xl font-black ${metric.valueClass}`}>
                      {metric.value}
                    </p>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${metric.accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  {isAr ? metric.detailAr : metric.detailEn}
                </p>
              </article>
            );
          })}
        </section>

        {/* Quick Access Center */}
        <section
          className={`rounded-2xl border p-5 shadow-xl ${
            isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">
              {isAr ? 'العمليات اليومية' : 'Daily Operations'}
            </span>
            <h2 className="mt-1 text-base font-black text-white">
              {isAr ? 'مركز الوصول السريع' : 'Quick Access Center'}
            </h2>
          </div>
          <div className={`grid ${density.gridGap} md:grid-cols-2 xl:grid-cols-4`}>
            {quickAccess.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.tab}
                  onClick={() => onNavigateToTab?.(action.tab)}
                  className={`group flex min-h-24 items-start gap-3.5 rounded-2xl border p-4 text-start transition-all ${
                    isDark
                      ? 'border-slate-800 bg-[#0e1222] hover:border-orange-500/60 hover:bg-[#12172c]'
                      : 'border-slate-200 bg-slate-50 hover:border-orange-500 hover:bg-white'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm ${action.accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <strong className="block truncate text-xs font-bold text-white group-hover:text-orange-400">
                      {isAr ? action.titleAr : action.titleEn}
                    </strong>
                    <small className="mt-1 block truncate text-[11px] text-slate-400">
                      {isAr ? action.detailAr : action.detailEn}
                    </small>
                    <ArrowUpRight className="mt-2.5 h-3.5 w-3.5 text-orange-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Live Operations Data Grid */}
        <section
          className={`overflow-hidden rounded-2xl border shadow-xl ${
            isDark ? 'border-slate-800 bg-[#141726]/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div
            className={`flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
              isDark ? 'border-slate-800 bg-[#0e1222]' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">
                Live Dispatch
              </span>
              <h2 className="mt-0.5 text-base font-black text-white">
                {isAr ? 'سجل العمليات المباشر' : 'Live Operations Register'}
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {recentOperations.length} {isAr ? 'سجل حديث' : 'recent records'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-xs">
              <thead
                className={`border-b ${
                  isDark ? 'border-slate-800 bg-[#0a0d18] text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                <tr>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'رقم التذكرة' : 'Ticket ID'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'العميل' : 'Client'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'المورد' : 'Supplier'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'المادة' : 'Material'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'الوزن الصافي' : 'Net Weight'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'نسبة الفاقد' : 'Wastage %'}</th>
                  <th className={`font-bold ${density.tableCellPadding}`}>{isAr ? 'صافي الربح' : 'Net Profit'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {recentOperations.map((operation, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={operation.id}
                      className={`transition-colors ${
                        isEven
                          ? isDark ? 'bg-slate-900/30 hover:bg-slate-800/50' : 'bg-white hover:bg-slate-50'
                          : isDark ? 'bg-slate-900/60 hover:bg-slate-800/50' : 'bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <td className={`font-mono font-bold text-amber-400 ${density.tableCellPadding}`}>
                        {operation.scale_ticket_no}
                      </td>
                      <td className={`text-slate-400 ${density.tableCellPadding}`}>{operation.loading_date}</td>
                      <td className={`max-w-44 truncate font-bold text-white ${density.tableCellPadding}`}>
                        {operation.destination_customer}
                      </td>
                      <td className={`max-w-44 truncate text-slate-300 ${density.tableCellPadding}`}>
                        {operation.loading_source}
                      </td>
                      <td className={`text-slate-400 ${density.tableCellPadding}`}>{operation.material_type}</td>
                      <td className={`font-mono font-bold text-white ${density.tableCellPadding}`}>
                        {formatTonnage(operation.qty_delivered, language)}
                      </td>
                      <td className={density.tableCellPadding}>
                        <span
                          className={`font-mono font-bold ${
                            operation.wastage_percentage > 2 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {operation.wastage_percentage.toFixed(2)}%
                        </span>
                      </td>
                      <td className={`font-mono font-bold text-emerald-400 ${density.tableCellPadding}`}>
                        {canAccessFinancials ? formatCurrency(operation.net_profit, language) : '***'}
                      </td>
                    </tr>
                  );
                })}
                {recentOperations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {isAr ? 'لا توجد عمليات مسجلة لبيئة العمل الحالية' : 'No operations recorded for this workspace'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
