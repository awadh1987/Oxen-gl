import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  Truck,
  Building2,
  AlertTriangle,
  Scale,
  DollarSign,
  PieChart as PieIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
  FileSpreadsheet,
  Receipt,
  Landmark,
  PlusCircle,
  Zap,
  ArrowRight,
  ChevronLeft,
  Coins,
  Wallet,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency, formatNumber, formatTonnage, getMonthName } from '../utils/formatters';

const CHART_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#8B5CF6'];
const EXPENSE_PALETTE = ['#F05627', '#10B981', '#6366F1', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EC4899', '#14B8A6'];

export const DashboardView: React.FC<{ onNavigateToTab?: (tab: any) => void }> = ({ onNavigateToTab }) => {
  const { accessibleOperations, kpis, language, currentUser, canAccessFinancials, accounts, journalEntries } = useApp();
  const isAr = language === 'ar';

  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<'ALL' | 'DIRECT' | 'ADMIN'>('ALL');

  // Filter operations based on selected month
  const filteredOps = useMemo(() => {
    if (selectedMonth === 'ALL') return accessibleOperations;
    return accessibleOperations.filter((op) => op.operation_month === Number(selectedMonth));
  }, [accessibleOperations, selectedMonth]);

  // 1. Monthly Revenue vs Expenses Trends (Recharts Line Chart)
  const monthlyFinancialTrends = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const totalAdminExpenses = accounts
      .filter((a) => a.type === 'Expense' && a.code.startsWith('6'))
      .reduce((sum, a) => sum + (a.balance || 0), 0);
    const monthlyAdminAlloc = totalAdminExpenses > 0 ? totalAdminExpenses / 12 : 5000;

    return months.map((m) => {
      const monthOps = accessibleOperations.filter((op) => op.operation_month === m);
      const revenue = monthOps.reduce((acc, curr) => acc + (curr.sales_amount || 0), 0);
      const directCost = monthOps.reduce((acc, curr) => acc + (curr.purchases_cost || 0), 0);
      const adminCost = revenue > 0 ? monthlyAdminAlloc : monthlyAdminAlloc * 0.4;
      const totalExpenses = Number((directCost + adminCost).toFixed(2));
      const netProfit = Number((revenue - totalExpenses).toFixed(2));
      const margin = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0;

      return {
        month: m,
        monthName: getMonthName(m, language),
        revenue,
        directCost,
        adminCost: Number(adminCost.toFixed(2)),
        totalExpenses,
        netProfit,
        margin,
      };
    });
  }, [accessibleOperations, accounts, language]);

  // 2. Expense Distribution by Category based on Chart of Accounts (Recharts Pie Chart)
  const expenseDistributionPieData = useMemo(() => {
    const leafExpenses = accounts.filter(
      (a) =>
        a.type === 'Expense' &&
        (a.code.startsWith('5') || a.code.startsWith('6')) &&
        !accounts.some((child) => child.parentId === a.id)
    );

    const rawItems = leafExpenses.map((acc, index) => {
      let val = acc.balance || 0;
      if (acc.code === '5100') {
        const opsCost = accessibleOperations.reduce((s, o) => s + (o.purchases_cost || 0), 0);
        val = Math.max(val, opsCost);
      }
      return {
        id: acc.id,
        code: acc.code,
        name: isAr ? acc.nameAr : acc.nameEn,
        typeGroup: acc.code.startsWith('5') ? 'DIRECT' : 'ADMIN',
        categoryLabel: acc.code.startsWith('5')
          ? isAr
            ? 'تكاليف تشغيل ومشتريات مباشرة (COGS)'
            : 'Direct Operating Costs (COGS)'
          : isAr
          ? 'مصروفات عمومية وإدارية'
          : 'General & Administrative',
        value: Number(val.toFixed(2)),
        color: EXPENSE_PALETTE[index % EXPENSE_PALETTE.length],
      };
    });

    const filtered = rawItems.filter((item) => {
      if (expenseFilterCategory === 'DIRECT') return item.typeGroup === 'DIRECT';
      if (expenseFilterCategory === 'ADMIN') return item.typeGroup === 'ADMIN';
      return true;
    });

    const totalSum = filtered.reduce((s, i) => s + i.value, 0);

    return filtered.map((item) => ({
      ...item,
      percentage: totalSum > 0 ? Number(((item.value / totalSum) * 100).toFixed(1)) : 0,
      totalSum,
    }));
  }, [accounts, accessibleOperations, expenseFilterCategory, isAr]);

  const totalFilteredExpenseSum = useMemo(() => {
    return expenseDistributionPieData.reduce((s, i) => s + i.value, 0);
  }, [expenseDistributionPieData]);

  // 3. Sales by Customer Data
  const salesByCustomerData = useMemo(() => {
    const map: Record<string, { name: string; sales: number; tonnage: number }> = {};
    filteredOps.forEach((op) => {
      const shortName = op.destination_customer.split(' ')[1] || op.destination_customer.slice(0, 12);
      if (!map[shortName]) {
        map[shortName] = { name: shortName, sales: 0, tonnage: 0 };
      }
      map[shortName].sales += op.sales_amount;
      map[shortName].tonnage += op.qty_delivered;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [filteredOps]);

  // 4. Purchases by Crusher Data
  const purchasesByCrusherData = useMemo(() => {
    const map: Record<string, { name: string; cost: number; tonnage: number }> = {};
    filteredOps.forEach((op) => {
      const shortName = op.loading_source.replace('كسارة ', '').replace(' Crusher', '');
      if (!map[shortName]) {
        map[shortName] = { name: shortName, cost: 0, tonnage: 0 };
      }
      map[shortName].cost += op.purchases_cost;
      map[shortName].tonnage += op.qty_loaded;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [filteredOps]);

  // 5. Transporter Wastage Risk Ranking (Drivers with highest tonnage loss)
  const transporterWastageData = useMemo(() => {
    const map: Record<string, { name: string; wastageTons: number; trips: number; totalLoaded: number }> = {};
    filteredOps.forEach((op) => {
      const shortName = op.transporter_name.split(' ')[0] + ' ' + (op.transporter_name.split(' ')[1] || '');
      if (!map[shortName]) {
        map[shortName] = { name: shortName, wastageTons: 0, trips: 0, totalLoaded: 0 };
      }
      map[shortName].wastageTons += op.qty_wastage;
      map[shortName].trips += 1;
      map[shortName].totalLoaded += op.qty_loaded;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        wastagePercent: item.totalLoaded > 0 ? Number(((item.wastageTons / item.totalLoaded) * 100).toFixed(2)) : 0,
        wastageTons: Number(item.wastageTons.toFixed(2)),
      }))
      .sort((a, b) => b.wastageTons - a.wastageTons);
  }, [filteredOps]);

  // 6. Customer Delivered Volume Distribution (Pie Chart)
  const customerVolumePieData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOps.forEach((op) => {
      const name = op.destination_customer.split(' ')[1] || op.destination_customer.slice(0, 10);
      map[name] = (map[name] || 0) + op.qty_delivered;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(1)),
    }));
  }, [filteredOps]);

  // 7. 12-Month Revenue & Tonnage Matrix (Dynamic Pivot Matrix)
  const monthlyMatrix = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return months.map((m) => {
      const monthOps = accessibleOperations.filter((op) => op.operation_month === m);
      const sales = monthOps.reduce((acc, curr) => acc + curr.sales_amount, 0);
      const purchases = monthOps.reduce((acc, curr) => acc + curr.purchases_cost, 0);
      const profit = monthOps.reduce((acc, curr) => acc + curr.net_profit, 0);
      const deliveredTonnage = monthOps.reduce((acc, curr) => acc + curr.qty_delivered, 0);
      const wastage = monthOps.reduce((acc, curr) => acc + curr.qty_wastage, 0);
      const trips = monthOps.length;

      return {
        month: m,
        monthName: getMonthName(m, language),
        sales,
        purchases,
        profit,
        deliveredTonnage,
        wastage,
        trips,
      };
    });
  }, [accessibleOperations, language]);

  return (
    <div className="space-y-6" id="executive-dashboard-view">
      {/* Top Filter & Welcome Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            {isAr ? 'لوحة القيادة التنفيذية والمؤشرات المالية' : 'Executive Operations & Financial Dashboard'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAr
              ? 'متابعة حية لتوريدات الكسارات، فاقد النقل، والمطالبات الشهرية لشركة ميون'
              : 'Live quarry haulage metrics, material loss risk, and monthly revenue ledgers'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="h-4 w-4 text-orange-600" />
            <span className="font-semibold">{isAr ? 'الفترة:' : 'Filter Month:'}</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-transparent font-bold text-orange-950 focus:outline-none"
            >
              <option value="ALL">{isAr ? 'كافة الشهور (2026)' : 'All Months (2026)'}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m, language)} 2026
                </option>
              ))}
            </select>
          </div>

          {onNavigateToTab && currentUser.role !== 'Guest' && (
            <button
              onClick={() => onNavigateToTab('ai-insights')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isAr ? 'التقرير الذكي' : 'AI Analysis'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Access Hub (Bento-box Grid for Key ERP Workflows) */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-5 shadow-xs">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F05627] text-white shadow-xs">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {isAr ? 'مركز الوصول السريع للعمليات والفواتير' : 'Quick Access Command Hub'}
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {isAr ? 'روابط التشغيل والإدخال المباشر' : 'Instant ERP Shortcuts'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Action 1: Operations Entry */}
          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('operations')}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F05627]/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#F05627] transition-colors group-hover:bg-[#F05627] group-hover:text-white">
                <Truck className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#F05627]">
                {kpis.totalTrips} {isAr ? 'نقلة' : 'trips'}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs font-black text-slate-900 group-hover:text-[#F05627] transition-colors">
                <span>{isAr ? 'تسجيل نقلة جديدة' : 'New Log Entry'}</span>
                <PlusCircle className="h-3.5 w-3.5 text-[#F05627] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="mt-0.5 text-[10px] text-slate-600 font-medium">
                {isAr ? 'إدخال وزن ومستندات الحمولة' : 'Record truck haulage & scale slip'}
              </p>
            </div>
          </button>

          {/* Action 2: Invoicing */}
          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('invoicing')}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <FileSpreadsheet className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                ZATCA
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                <span>{isAr ? 'إصدار فاتورة ضريبية' : 'Create Tax Invoice'}</span>
                <PlusCircle className="h-3.5 w-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="mt-0.5 text-[10px] text-slate-600 font-medium">
                {isAr ? 'إصدار وتصدير فواتير العملاء' : 'Generate & export customer billing'}
              </p>
            </div>
          </button>

          {/* Action 3: Vouchers */}
          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('vouchers')}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                {isAr ? 'سندات' : 'Vouchers'}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                <span>{isAr ? 'تحرير سند قبض / صرف' : 'New Financial Voucher'}</span>
                <PlusCircle className="h-3.5 w-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="mt-0.5 text-[10px] text-slate-600 font-medium">
                {isAr ? 'سندات الصرف والقبض المالي' : 'Payment and receipt vouchers'}
              </p>
            </div>
          </button>

          {/* Action 4: Chart of Accounts & GL */}
          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('accounting')}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <Landmark className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                CoA & GL
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                <span>{isAr ? 'دليل الحسابات والقيود' : 'Chart of Accounts & GL'}</span>
                <PlusCircle className="h-3.5 w-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="mt-0.5 text-[10px] text-slate-600 font-medium">
                {isAr ? 'ميزان المراجعة وقائمة الدخل' : 'Trial balance, ledger & statements'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isAr ? 'إجمالي المبيعات (بدون ضريبة)' : 'Gross Sales (Excl. VAT)'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {canAccessFinancials
              ? formatCurrency(kpis.totalSales, language)
              : isAr
              ? '*** محمي'
              : '*** Protected'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>{isAr ? '+14.2% مقارنة بالشهر السابق' : '+14.2% MoM Growth'}</span>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isAr ? 'صافي هامش الربح التشغيلي' : 'Net Operating Profit'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700">
            {canAccessFinancials
              ? formatCurrency(kpis.netOperatingProfit, language)
              : isAr
              ? '*** محمي'
              : '*** Protected'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            {canAccessFinancials && (
              <span>
                {isAr ? 'نسبة الهامش:' : 'Margin:'}{' '}
                <strong className="text-emerald-800">{kpis.profitMarginPercent.toFixed(1)}%</strong>
              </span>
            )}
          </div>
        </div>

        {/* Total Delivered Tonnage */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isAr ? 'إجمالي الحمولات المستلمة' : 'Delivered Tonnage'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {formatTonnage(kpis.totalDeliveredTonnage, language)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>
              {isAr ? 'إجمالي الرحلات:' : 'Total Trips:'} <strong>{kpis.totalTrips}</strong> {isAr ? 'رحلة' : 'trips'}
            </span>
          </div>
        </div>

        {/* Total Wastage Loss */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isAr ? 'إجمالي فاقد النقل (Wastage)' : 'Cumulative Haulage Loss'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-600">
            {formatTonnage(kpis.totalWastageTonnage, language)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">
              {kpis.overallWastagePercent.toFixed(2)}% {isAr ? 'من المحمل' : 'of loaded'}
            </span>
            <span>{isAr ? 'متوسط الفاقد' : 'avg loss'}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FINANCIAL DASHBOARD WIDGET: REVENUE VS EXPENSES & PIE    */}
      {/* ======================================================== */}
      {canAccessFinancials && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
          {/* Widget Header & Filters */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-[#F05627] border border-orange-500/20">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">
                    {isAr
                      ? 'لوحة المؤشرات المالية وتوزيع المصروفات (Financial Dashboard)'
                      : 'Executive Financial Trends & Expense Distribution'}
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                    {isAr ? 'دليل الحسابات المعتمد' : 'Chart of Accounts Live'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'تحليل بياني لحركة الإيرادات الشهرية مقابل إجمالي تكاليف ومصروفات التشغيل، مع توزيع الأوزان النسبية للمصروفات'
                    : 'Monthly revenue growth vs total operating expenses & category breakdown from CoA'}
                </p>
              </div>
            </div>

            {/* Expense Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => setExpenseFilterCategory('ALL')}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  expenseFilterCategory === 'ALL'
                    ? 'bg-white text-[#F05627] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'كافة المصروفات' : 'All Expenses'}
              </button>
              <button
                type="button"
                onClick={() => setExpenseFilterCategory('DIRECT')}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  expenseFilterCategory === 'DIRECT'
                    ? 'bg-white text-[#F05627] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'تكاليف النشاط (5000)' : 'Direct COGS (5000)'}
              </button>
              <button
                type="button"
                onClick={() => setExpenseFilterCategory('ADMIN')}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  expenseFilterCategory === 'ADMIN'
                    ? 'bg-white text-[#F05627] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'إدارية وعمومية (6000)' : 'Admin & Ops (6000)'}
              </button>
            </div>
          </div>

          {/* Charts Dual Column Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Chart A: Monthly Revenue vs Expenses Line Chart (7 Cols) */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      {isAr ? 'منحنى الإيرادات الشهرية مقابل المصروفات' : 'Monthly Revenue vs Total Expenses Trends'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isAr
                        ? 'مقارنة سنوية 2026 لحجم تدفق المبيعات والتكاليف وهامش الربح'
                        : '12-Month timeline comparing revenue inflows against costs'}
                    </p>
                  </div>
                  <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {isAr ? 'ر.س / شهرياً' : 'SAR / Monthly'}
                  </span>
                </div>

                <div className="h-72 w-full mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyFinancialTrends}
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="monthName" tick={{ fontSize: 10 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          formatCurrency(Number(val), language),
                          name === 'revenue'
                            ? isAr
                              ? 'الإيرادات'
                              : 'Revenue'
                            : name === 'totalExpenses'
                            ? isAr
                              ? 'إجمالي المصروفات'
                              : 'Total Expenses'
                            : isAr
                            ? 'صافي الربح'
                            : 'Net Profit',
                        ]}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(val) => (
                          <span className="text-[11px] font-bold text-slate-700">
                            {val === 'revenue'
                              ? isAr
                                ? 'الإيرادات (Revenue)'
                                : 'Revenue'
                              : val === 'totalExpenses'
                              ? isAr
                                ? 'إجمالي التكاليف والمصروفات'
                                : 'Total Expenses'
                              : isAr
                              ? 'صافي الأرباح (Net Profit)'
                              : 'Net Profit'}
                          </span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 3.5, fill: '#10B981', strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        name="revenue"
                      />
                      <Line
                        type="monotone"
                        dataKey="totalExpenses"
                        stroke="#F43F5E"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#F43F5E', strokeWidth: 1 }}
                        name="totalExpenses"
                      />
                      <Line
                        type="monotone"
                        dataKey="netProfit"
                        stroke="#F05627"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#F05627', strokeWidth: 1 }}
                        name="netProfit"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart Mini-KPIs */}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/80 pt-3 text-center">
                <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                  <span className="text-[10px] text-slate-500 font-bold block">
                    {isAr ? 'متوسط الإيراد الشهري' : 'Avg Monthly Revenue'}
                  </span>
                  <span className="text-xs font-black text-emerald-700 mt-0.5 block">
                    {formatCurrency(kpis.totalSales / 12, language)}
                  </span>
                </div>
                <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                  <span className="text-[10px] text-slate-500 font-bold block">
                    {isAr ? 'متوسط التكلفة الشهرية' : 'Avg Monthly Cost'}
                  </span>
                  <span className="text-xs font-black text-rose-600 mt-0.5 block">
                    {formatCurrency(kpis.totalPurchasesCost / 12, language)}
                  </span>
                </div>
                <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                  <span className="text-[10px] text-slate-500 font-bold block">
                    {isAr ? 'متوسط هامش الربح' : 'Avg Net Margin'}
                  </span>
                  <span className="text-xs font-black text-[#F05627] mt-0.5 block">
                    {kpis.profitMarginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Chart B: Distribution of Expenses by Category Pie Chart (5 Cols) */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <PieIcon className="h-4 w-4 text-[#F05627]" />
                      {isAr ? 'توزيع المصروفات حسب الدليل المحاسبي' : 'Distribution of Expenses (CoA)'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isAr ? 'تحليل هيكل تكلفة النشاط والمصروفات' : 'Expense breakdown by accounts tree'}
                    </p>
                  </div>
                  <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#F05627]">
                    {expenseDistributionPieData.length} {isAr ? 'بنود' : 'Items'}
                  </span>
                </div>

                {/* Donut Chart with Center Amount */}
                <div className="relative h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseDistributionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseDistributionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${formatCurrency(Number(val), language)} (${item?.payload?.percentage || 0}%)`,
                          item?.payload?.name || name,
                        ]}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label inside Donut */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isAr ? 'إجمالي المصروفات' : 'Total Expenses'}
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {formatCurrency(totalFilteredExpenseSum, language)}
                    </span>
                  </div>
                </div>

                {/* Legend & Categories List */}
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {expenseDistributionPieData.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between pt-1.5 text-xs first:pt-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1">
                          {item.code}
                        </span>
                        <span className="truncate text-slate-700 font-medium text-[11px]" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-slate-900 text-[11px]">
                          {formatCurrency(item.value, language)}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-[11px]">
                <span className="text-slate-500 font-bold">
                  {isAr ? 'المجموع للمحدد:' : 'Filtered Sum:'}
                </span>
                <span className="font-black text-[#F05627]">
                  {formatCurrency(totalFilteredExpenseSum, language)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Sales by Customer */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'حجم المبيعات حسب العميل (ر.س)' : 'Sales Revenue by Customer (SAR)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'أعلى العملاء إيراداً واستلاماً للمواد' : 'Top revenue generating clients'}
              </p>
            </div>
            <span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
              {isAr ? 'رسم بياني شريطي' : 'Bar Chart'}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCustomerData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val), language), isAr ? 'المبيعات' : 'Sales']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="sales" fill="#4F46E5" radius={[6, 6, 0, 0]} name={isAr ? 'المبيعات' : 'Sales'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Purchases by Crusher */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'مشتريات الكسارات ومصادر التحميل (ر.س)' : 'Crusher Purchases Cost (SAR)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'توزيع التكلفة التوريدية على المقالع' : 'Supply procurement breakdown per quarry'}
              </p>
            </div>
            <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-purple-700">
              {isAr ? 'أعمدة توريد' : 'Column Chart'}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchasesByCrusherData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val), language), isAr ? 'التكلفة' : 'Cost']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="cost" fill="#7C3AED" radius={[6, 6, 0, 0]} name={isAr ? 'المشتريات' : 'Cost'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 3: Transporter Wastage Risk Ranking (Horizontal Bar Chart) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'تصنيف مخاطر فاقد الناقلين (Wastage Risk Ranking)' : 'Transporter Loss & Risk Ranking'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'ترتيب المقاولين والسائقين حسب إجمالي أطنان الفاقد المفقودة' : 'Ranking transporters by missing tonnage'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-rose-600">
              <ShieldAlert className="h-4 w-4" />
              <span>{isAr ? 'مراقبة الاحتيال' : 'Loss Audit'}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={transporterWastageData}
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  formatter={(val: any) => [`${val} ${isAr ? 'طن مفقود' : 'Tons Loss'}`, isAr ? 'إجمالي الفاقد' : 'Wastage']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="wastageTons" fill="#EF4444" radius={[0, 6, 6, 0]} name={isAr ? 'الفاقد (طن)' : 'Loss (Tons)'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Customer Delivered Volume Distribution (Pie/Donut) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              {isAr ? 'توزيع حمولات العملاء' : 'Customer Volume Share'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'نسبة التوريدات الصافية' : 'Delivered tonnage share'}
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerVolumePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {customerVolumePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} ${isAr ? 'طن' : 'Tons'}`, isAr ? 'الكمية' : 'Volume']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-[10px]">
            {customerVolumePieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. 12-Month Revenue & Tonnage Dynamic Matrix Pivot Grid */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isAr ? 'مصفوفة الإيرادات والحمولات السنوية (12-Month Performance Matrix)' : '12-Month Financial & Volume Matrix'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'جدول بياني محوري لتحليل تدفقات المبيعات، تكاليف الكسارات، وصافي الأرباح شهرياً'
                : 'Dynamic pivot breakdown of monthly sales, crusher costs, and margins'}
            </p>
          </div>
          <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
            {isAr ? 'سنة 2026 المالية' : 'Fiscal Year 2026'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-700">
                <th className="py-3 px-3">{isAr ? 'الشهر' : 'Month'}</th>
                <th className="py-3 px-3">{isAr ? 'عدد الرحلات' : 'Trips'}</th>
                <th className="py-3 px-3">{isAr ? 'الحمولة المستلمة (طن)' : 'Delivered Tonnage'}</th>
                <th className="py-3 px-3">{isAr ? 'الفاقد (طن)' : 'Wastage (Tons)'}</th>
                <th className="py-3 px-3">{isAr ? 'إجمالي المبيعات' : 'Total Sales'}</th>
                <th className="py-3 px-3">{isAr ? 'مشتريات الكسارات' : 'Crusher Costs'}</th>
                <th className="py-3 px-3">{isAr ? 'صافي الربح' : 'Net Margin'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyMatrix.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{row.monthName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{row.trips}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {row.deliveredTonnage > 0 ? formatTonnage(row.deliveredTonnage, language) : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    {row.wastage > 0 ? (
                      <span className="font-semibold text-rose-600">
                        {formatTonnage(row.wastage, language)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {canAccessFinancials && row.sales > 0 ? formatCurrency(row.sales, language) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {canAccessFinancials && row.purchases > 0 ? formatCurrency(row.purchases, language) : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {canAccessFinancials && row.profit > 0 ? formatCurrency(row.profit, language) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
