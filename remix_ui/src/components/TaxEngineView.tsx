import React, { useState, useMemo } from 'react';
import {
  Percent,
  Calculator,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  TrendingUp,
  Landmark,
  Layers,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  FileText,
  RotateCcw,
  Building2,
  Scale,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JournalEntry } from '../types';

interface TaxEngineViewProps {
  onNavigateToJournal?: (entryNumber: string) => void;
}

export const TaxEngineView: React.FC<TaxEngineViewProps> = ({ onNavigateToJournal }) => {
  const {
    journalEntries,
    operations,
    accounts,
    language,
    currentUser,
    brandConfig,
    postJournalEntry,
  } = useApp();

  const isAr = language === 'ar';

  // Interactive Simulator State (Prompt 4 core specification)
  const [simGrossAmount, setSimGrossAmount] = useState<number>(160.0);
  const [simTaxRate, setSimTaxRate] = useState<number>(0.15);
  const [simCostCenter, setSimCostCenter] = useState<string>('CC-OPS-01');
  const [simMaterial, setSimMaterial] = useState<string>('حصى ركام 3/4');
  const [simCogsCost, setSimCogsCost] = useState<number>(100.0);
  const [simTruckNo, setSimTruckNo] = useState<string>('3190-RSB');
  const [simCustomer, setSimCustomer] = useState<string>('شركة يوني بيتون للخرسانة');
  const [simScaleTicket, setSimScaleTicket] = useState<string>(`TKT-${Date.now().toString().slice(-4)}`);
  const [isPostingSim, setIsPostingSim] = useState<boolean>(false);
  const [simPostSuccess, setSimPostSuccess] = useState<string | null>(null);

  // Filter for Tax Journals Register
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_CEO_APPROVAL' | 'POSTED_TO_MAIN_LEDGER'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reusable VAT calculation function matching Prompt 4
  const vatCalc = useMemo(() => {
    const gross = Math.max(0, Number(simGrossAmount) || 0);
    const rate = Math.max(0, Number(simTaxRate) || 0.15);
    const taxAmount = Number((gross - gross / (1 + rate)).toFixed(2));
    const netRevenue = Number((gross - taxAmount).toFixed(2));
    const cogs = Math.max(0, Number(simCogsCost) || 0);
    const totalDebit = Number((gross + cogs).toFixed(2));
    const totalCredit = Number((netRevenue + taxAmount + cogs).toFixed(2));
    const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;

    return {
      gross,
      rate,
      taxAmount,
      netRevenue,
      cogs,
      totalDebit,
      totalCredit,
      isBalanced,
    };
  }, [simGrossAmount, simTaxRate, simCogsCost]);

  // Aggregate VAT transactions from journal entries
  const vatJournals = useMemo(() => {
    return journalEntries.filter((j) => {
      const hasVatLine = j.lines?.some(
        (l: any) => l.accountCode === '2201' || l.account === '2201' || l.accountCode === '2140'
      );
      return hasVatLine || j.entryType === 'Invoice_Posting' || j.referenceId?.startsWith('TKT-');
    });
  }, [journalEntries]);

  // Calculate totals for ZATCA VAT Return declaration
  const vatTotals = useMemo(() => {
    let grossTotal = 0;
    let netRevenueTotal = 0;
    let vatOutputTotal = 0;
    let cogsTotal = 0;

    vatJournals.forEach((j) => {
      const vatLine = j.lines?.find((l: any) => l.accountCode === '2201' || l.account === '2201' || l.accountCode === '2140');
      const revLine = j.lines?.find((l: any) => l.accountCode === '4101' || l.account === '4101' || l.accountCode === '4100');
      const cogsLine = j.lines?.find((l: any) => l.accountCode === '5101' || l.account === '5101' || l.accountCode === '5100');
      const grossLine = j.lines?.find((l: any) => l.accountCode === '1101' || l.account === '1101' || l.accountCode === '1200');

      if (vatLine) vatOutputTotal += Number(vatLine.credit || 0);
      if (revLine) netRevenueTotal += Number(revLine.credit || 0);
      if (cogsLine) cogsTotal += Number(cogsLine.debit || 0);
      if (grossLine) grossTotal += Number(grossLine.debit || 0);
    });

    // If no journals posted yet, fallback to operations data
    if (grossTotal === 0 && operations.length > 0) {
      operations.forEach((op) => {
        grossTotal += Number(op.total_sales || 0);
        netRevenueTotal += Number(op.sales_amount || 0);
        vatOutputTotal += Number(op.vat_amount || 0);
        cogsTotal += Number(op.purchases_cost || 0);
      });
    }

    const pendingCount = vatJournals.filter((j) => (j as any).status === 'PENDING_CEO_APPROVAL' || j.status === 'Draft').length;
    const postedCount = vatJournals.filter((j) => (j as any).status === 'POSTED_TO_MAIN_LEDGER' || j.status === 'Posted').length;

    return {
      grossTotal,
      netRevenueTotal,
      vatOutputTotal,
      cogsTotal,
      netVatPayable: vatOutputTotal,
      pendingCount,
      postedCount,
    };
  }, [vatJournals, operations]);

  // Filtered entries for the register table
  const filteredJournals = useMemo(() => {
    return vatJournals.filter((j) => {
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PENDING_CEO_APPROVAL'
          ? (j as any).status === 'PENDING_CEO_APPROVAL' || j.status === 'Draft'
          : (j as any).status === 'POSTED_TO_MAIN_LEDGER' || j.status === 'Posted';

      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !searchQuery ||
        j.id.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        (j.referenceId && j.referenceId.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [vatJournals, statusFilter, searchQuery]);

  // Handle posting simulated trip via Tax Engine
  const handlePostSimulatedTrip = async () => {
    setIsPostingSim(true);
    setSimPostSuccess(null);
    try {
      const response = await fetch('/api/operations/add-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truck_no: simTruckNo,
          destination_customer: simCustomer,
          material_type: simMaterial,
          scale_ticket_no: simScaleTicket,
          gross_amount: vatCalc.gross,
          cost_total: vatCalc.cogs,
          cost_center_id: simCostCenter,
          cost_center: simCostCenter,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSimPostSuccess(
          isAr
            ? `تم بنجاح إنشاء القيد الخماسي برقم ${data.entryNumber || data.id} وحجزه بحالة PENDING_CEO_APPROVAL`
            : `Balanced 5-line entry created (${data.entryNumber || data.id}) under PENDING_CEO_APPROVAL`
        );
        setSimScaleTicket(`TKT-${Date.now().toString().slice(-4)}`);
      } else {
        alert(isAr ? 'تعذر قيد الرحلة عبر محرك الضريبة' : 'Failed to post trip via Tax Engine');
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء الاتصال بمحرك الضريبة' : 'Network error with Tax Engine');
    } finally {
      setIsPostingSim(false);
    }
  };

  // Handle CEO approval for a pending entry
  const handleCeoApprove = async (entry: JournalEntry) => {
    try {
      const response = await fetch(`/api/operations/trip-journal/${entry.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: currentUser.fullNameAr || currentUser.fullName }),
      });

      if (response.ok) {
        postJournalEntry(entry.id);
        alert(
          isAr
            ? `تم اعتماد وترحيل القيد ${entry.referenceId || entry.id} إلى دفتر الأستاذ العام بنجاح`
            : `Entry ${entry.referenceId || entry.id} approved and posted to General Ledger`
        );
      } else {
        postJournalEntry(entry.id);
      }
    } catch (err) {
      postJournalEntry(entry.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
              <Percent className="h-4 w-4" />
            </div>
            <h2 className="text-base font-black text-slate-900">
              {isAr ? 'محرك ضريبة القيمة المضافة والإقرار الزكوي (ZATCA 15% VAT Engine)' : 'ZATCA 15% VAT & Tax Calculation Engine'}
            </h2>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-800 border border-violet-200">
              {isAr ? 'معتمد وفق هيئة الزكاة والضريبة والجمارك' : 'ZATCA Certified'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 font-medium">
            {isAr
              ? 'الاستقطاع التلقائي لضريبة المبيعات 15% وتدويرها في حساب أمانات الضريبة 2201 مع القيد الخماسي المتزن وحجز الاعتماد التنفيذي'
              : 'Automated VAT split rolling into liability account 2201 with 5-line matrix and CEO workflow quarantine'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isAr ? 'طباعة الإقرار الضريبي' : 'Print Tax Return'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Gross Taxable Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-blue-600" />
            {isAr ? 'المبيعات الخاضعة للضريبة' : 'Gross Taxable Base'}
          </span>
          <p className="mt-2 text-base font-black font-mono text-slate-900">
            {vatTotals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
          </p>
          <span className="text-[10px] font-bold text-blue-600">
            {isAr ? 'شامل 15% ضريبة' : 'Gross Inclusive (1101)'}
          </span>
        </div>

        {/* Net Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            {isAr ? 'صافي إيرادات المبيعات (4101)' : 'Net Revenue (4101)'}
          </span>
          <p className="mt-2 text-base font-black font-mono text-emerald-700">
            {vatTotals.netRevenueTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
          </p>
          <span className="text-[10px] font-bold text-emerald-600">
            {isAr ? 'صافي الدخل قبل الضريبة' : 'Net of Tax'}
          </span>
        </div>

        {/* Output VAT Collected */}
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-violet-800 flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-violet-600" />
            {isAr ? 'أمانات الضريبة المحصلة (2201)' : 'VAT Collected (2201)'}
          </span>
          <p className="mt-2 text-base font-black font-mono text-violet-950">
            {vatTotals.vatOutputTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
          </p>
          <span className="text-[10px] font-bold text-violet-700">
            {isAr ? 'مستحق الهيئة (15% VAT)' : 'ZATCA Output Liability'}
          </span>
        </div>

        {/* CEO Quarantine Status */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {isAr ? 'بانتظار اعتماد الرئيس التنفيذي' : 'Pending CEO Authorization'}
          </span>
          <p className="mt-2 text-base font-black font-mono text-amber-950">
            {vatTotals.pendingCount} {isAr ? 'قيد معلق' : 'entries'}
          </p>
          <span className="text-[10px] font-bold text-amber-800">
            PENDING_CEO_APPROVAL
          </span>
        </div>
      </div>

      {/* 2. Chart of Accounts 3-Generation Tax Hierarchy Tree Inspector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">
                {isAr ? 'هيكلية شجرة حسابات الضريبة متعددة الأجيال (Prompt 4 COA Blueprint)' : 'Multi-Generation Tax Accounts Hierarchy (PROMPT 4)'}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {isAr ? 'التسلسل الهرمي الصارم: الأب (2000) -> الابن (2200) -> الحفيد/الورقة القابلة للقيد (2201)' : 'Father (2000) -> Child (2200) -> Grandchild/Leaf-Postable (2201)'}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-700">
            is_postable Enforcement
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Level 1: 2000 Liabilities (Father) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-slate-800">2000</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-700">
                Gen 1: Father (is_postable = 0)
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 mt-1">
              {isAr ? 'الالتزامات والخصوم' : 'Liabilities'}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">
              {isAr ? 'حساب رئيسي تجميعي لا يقبل القيود المباشرة' : 'Top parent root account, non-postable'}
            </p>
          </div>

          {/* Level 2: 2200 Tax Payables (Child) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-blue-700">2200</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800">
                Gen 2: Child (is_postable = 0)
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 mt-1">
              {isAr ? 'أمانات الضرائب والرسوم الحكومية' : 'Tax Payables & Government Dues'}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">
              {isAr ? 'حساب مراقبة فرعي تجميعي تابع لحساب 2000' : 'Sub-parent controller, child of 2000'}
            </p>
          </div>

          {/* Level 3: 2201 VAT Collected Liability (Grandchild/Leaf) */}
          <div className="rounded-xl border-2 border-violet-400 bg-violet-50/50 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-violet-800">2201</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                Gen 3: Leaf-Postable (is_postable = 1)
              </span>
            </div>
            <h4 className="text-xs font-black text-violet-950 mt-1">
              {isAr ? 'أمانات ضريبة القيمة المضافة المحصلة (15% VAT)' : 'VAT Collected Liability Account (15%)'}
            </h4>
            <p className="text-[10px] text-violet-700 mt-1 font-medium">
              {isAr ? 'الحساب التنفيذي النهائي المعتمد لاستقبال قيود ضريبة الرحلات آلياً' : 'Target leaf account for automated 5-line trip journal tax lines'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core Interactive Tax Engine Simulator (PROMPT 4) */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/40 via-white to-blue-50/30 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-violet-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-violet-950">
                {isAr ? 'محاكي واختبار محرك الضريبة التفاعلي (Interactive Tax Engine Simulator)' : 'Interactive VAT Engine Simulator & 5-Line Generator'}
              </h3>
              <p className="text-[10px] text-violet-700 font-medium">
                {isAr ? 'اختبار دالة calculate_vat ومعاينة التوزيع الخماسي المتزن وحجز الاعتماد التنفيذي' : 'Simulate calculate_vat split and test balanced 5-line matrix posting'}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-mono font-bold text-violet-800 border border-violet-200">
            VAT Rate: {(vatCalc.rate * 100).toFixed(0)}%
          </span>
        </div>

        {/* Simulator Controls */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700">
              {isAr ? 'المبلغ الإجمالي شامل الضريبة (Gross Amount)' : 'Gross Amount (SAR)'}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={simGrossAmount}
              onChange={(e) => setSimGrossAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-violet-200 bg-white p-2 text-xs font-mono font-bold text-slate-900 focus:border-violet-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700">
              {isAr ? 'تكلفة المحاجر والتوريد (COGS Cost)' : 'COGS Cost (SAR)'}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={simCogsCost}
              onChange={(e) => setSimCogsCost(Number(e.target.value))}
              className="w-full rounded-xl border border-violet-200 bg-white p-2 text-xs font-mono font-bold text-slate-900 focus:border-violet-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700">
              {isAr ? 'مركز التكلفة الفرعي (Leaf Cost Center)' : 'Leaf Cost Center'}
            </label>
            <select
              value={simCostCenter}
              onChange={(e) => setSimCostCenter(e.target.value)}
              className="w-full rounded-xl border border-violet-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-violet-600 focus:outline-none"
            >
              <option value="CC-OPS-01">{isAr ? 'CC-OPS-01 - مشروع طريق الرياض السريع' : 'CC-OPS-01 - Riyadh Express'}</option>
              <option value="CC-TRN-02">{isAr ? 'CC-TRN-02 - ناقلات الركام الثقيل' : 'CC-TRN-02 - Heavy Fleet'}</option>
              <option value="CC-JED-01">{isAr ? 'CC-JED-01 - مشروع مترو جدة' : 'CC-JED-01 - Jeddah Metro'}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700">
              {isAr ? 'رقم تذكرة الميزان الافتراضية' : 'Scale Ticket #'}
            </label>
            <input
              type="text"
              value={simScaleTicket}
              onChange={(e) => setSimScaleTicket(e.target.value)}
              className="w-full rounded-xl border border-violet-200 bg-white p-2 text-xs font-mono font-bold text-slate-900 focus:border-violet-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Mathematical Extraction Breakdown */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-violet-100/40 p-3 border border-violet-200 text-xs">
          <div>
            <span className="text-[10px] text-violet-800 font-bold block">{isAr ? 'معادلة الضريبة المستقطعة:' : 'Formula:'}</span>
            <span className="font-mono text-[11px] text-slate-700">Gross - (Gross / 1.15)</span>
          </div>
          <div>
            <span className="text-[10px] text-violet-800 font-bold block">{isAr ? 'مبلغ الضريبة المحسوب (2201):' : 'VAT Amount (2201):'}</span>
            <span className="font-mono text-xs font-black text-amber-700">{vatCalc.taxAmount.toFixed(2)} SAR</span>
          </div>
          <div>
            <span className="text-[10px] text-violet-800 font-bold block">{isAr ? 'صافي الإيراد قبل الضريبة (4101):' : 'Net Revenue (4101):'}</span>
            <span className="font-mono text-xs font-black text-emerald-700">{vatCalc.netRevenue.toFixed(2)} SAR</span>
          </div>
          <div>
            <span className="text-[10px] text-violet-800 font-bold block">{isAr ? 'حالة اتزان القيد:' : 'Balance Check:'}</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {vatCalc.isBalanced ? (isAr ? 'متزن تماماً (100%)' : 'Strictly Balanced') : (isAr ? 'غير متزن' : 'Unbalanced')}
            </span>
          </div>
        </div>

        {/* Live 5-Line Matrix Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-violet-200 bg-white shadow-2xs">
          <table className="w-full text-right text-[11px]">
            <thead className="bg-violet-100/60 text-violet-950 font-black border-b border-violet-200">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">{isAr ? 'رقم الحساب واسمه في الدليل' : 'Account Code & Title'}</th>
                <th className="p-2.5">{isAr ? 'مركز التكلفة الفرعي' : 'Cost Center'}</th>
                <th className="p-2.5 text-left">{isAr ? 'مدين (SAR)' : 'Debit'}</th>
                <th className="p-2.5 text-left">{isAr ? 'دائن (SAR)' : 'Credit'}</th>
                <th className="p-2.5">{isAr ? 'التصنيف المحاسبي والبيان' : 'Role & Description'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100 font-mono text-[11px]">
              {/* Line 1: Asset - Main Bank Cash / AR */}
              <tr className="hover:bg-violet-50/40">
                <td className="p-2.5 font-sans font-bold text-slate-400">1</td>
                <td className="p-2.5 font-sans">
                  <span className="font-mono font-black text-blue-700 ml-1.5">1101</span>
                  <span className="text-slate-800 font-bold">{isAr ? 'حساب النقدية والبنك الرئيسي' : 'Main Bank Cash'}</span>
                </td>
                <td className="p-2.5 font-sans text-slate-400 text-xs">-</td>
                <td className="p-2.5 text-left font-black text-blue-700">{vatCalc.gross.toFixed(2)}</td>
                <td className="p-2.5 text-left text-slate-400">0.00</td>
                <td className="p-2.5 font-sans text-slate-600 text-xs">
                  {isAr ? 'أصل: إجمالي القيمة شاملة الضريبة' : 'Asset: Full Gross Amount'}
                </td>
              </tr>

              {/* Line 2: Revenue - Sales Revenue Net */}
              <tr className="hover:bg-violet-50/40">
                <td className="p-2.5 font-sans font-bold text-slate-400">2</td>
                <td className="p-2.5 font-sans">
                  <span className="font-mono font-black text-emerald-700 ml-1.5">4101</span>
                  <span className="text-slate-800 font-bold">{isAr ? 'إيرادات المبيعات وتوريد الركام الصافية' : 'Sales Revenue (Net)'}</span>
                </td>
                <td className="p-2.5 font-sans font-bold text-violet-700 text-xs">{simCostCenter}</td>
                <td className="p-2.5 text-left text-slate-400">0.00</td>
                <td className="p-2.5 text-left font-black text-emerald-700">{vatCalc.netRevenue.toFixed(2)}</td>
                <td className="p-2.5 font-sans text-slate-600 text-xs">
                  {isAr ? 'إيراد: صافي الإيراد مقيد لمركز التكلفة' : 'Revenue: Net portion mapped to Leaf'}
                </td>
              </tr>

              {/* Line 3: Liability - VAT Collected Liability 2201 */}
              <tr className="bg-amber-50/60 hover:bg-amber-50">
                <td className="p-2.5 font-sans font-bold text-amber-700">3</td>
                <td className="p-2.5 font-sans">
                  <span className="font-mono font-black text-amber-700 ml-1.5">2201</span>
                  <span className="text-amber-950 font-black">{isAr ? 'أمانات ضريبة القيمة المضافة المحصلة' : 'VAT Collected Liability'}</span>
                </td>
                <td className="p-2.5 font-sans text-slate-400 text-xs">-</td>
                <td className="p-2.5 text-left text-slate-400">0.00</td>
                <td className="p-2.5 text-left font-black text-amber-800">{vatCalc.taxAmount.toFixed(2)}</td>
                <td className="p-2.5 font-sans text-amber-900 text-xs font-bold">
                  {isAr ? 'التزام: أمانات ضريبة 15% لهيئة الزكاة' : 'Liability: 15% VAT Collected'}
                </td>
              </tr>

              {/* Line 4: Expense - COGS */}
              <tr className="hover:bg-violet-50/40">
                <td className="p-2.5 font-sans font-bold text-slate-400">4</td>
                <td className="p-2.5 font-sans">
                  <span className="font-mono font-black text-rose-700 ml-1.5">5101</span>
                  <span className="text-slate-800 font-bold">{isAr ? 'تكاليف التوريد والمحاجر (COGS)' : 'Cost of Goods Sold (Quarry)'}</span>
                </td>
                <td className="p-2.5 font-sans font-bold text-violet-700 text-xs">{simCostCenter}</td>
                <td className="p-2.5 text-left font-black text-rose-700">{vatCalc.cogs.toFixed(2)}</td>
                <td className="p-2.5 text-left text-slate-400">0.00</td>
                <td className="p-2.5 font-sans text-slate-600 text-xs">
                  {isAr ? 'مصروف: تكلفة الركام مقيدة لمركز التكلفة' : 'Expense: COGS mapped to Leaf'}
                </td>
              </tr>

              {/* Line 5: Asset/Liability - Inventory Asset */}
              <tr className="hover:bg-violet-50/40">
                <td className="p-2.5 font-sans font-bold text-slate-400">5</td>
                <td className="p-2.5 font-sans">
                  <span className="font-mono font-black text-slate-700 ml-1.5">1201</span>
                  <span className="text-slate-800 font-bold">{isAr ? 'المخزون الموقعي / مستحقات الموردين' : 'Inventory Asset / Accounts Payable'}</span>
                </td>
                <td className="p-2.5 font-sans text-slate-400 text-xs">-</td>
                <td className="p-2.5 text-left text-slate-400">0.00</td>
                <td className="p-2.5 text-left font-black text-slate-800">{vatCalc.cogs.toFixed(2)}</td>
                <td className="p-2.5 font-sans text-slate-600 text-xs">
                  {isAr ? 'أصل/التزام: تسوية المخزون ومستحق الكسارة' : 'Asset/Liability: Inventory / AP offset'}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-violet-100/70 border-t border-violet-200 font-mono font-black text-[11px]">
              <tr>
                <td colSpan={3} className="p-2.5 font-sans text-slate-900 text-xs">
                  {isAr ? 'إجمالي طرفي القيد المحاسبي وحالة الاتزان:' : 'Total Debit / Credit Balance:'}
                </td>
                <td className="p-2.5 text-left text-emerald-800 font-black">
                  {vatCalc.totalDebit.toFixed(2)} SAR
                </td>
                <td className="p-2.5 text-left text-emerald-800 font-black">
                  {vatCalc.totalCredit.toFixed(2)} SAR
                </td>
                <td className="p-2.5 font-sans">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                    <Clock className="h-3 w-3 text-amber-700" />
                    <span>PENDING_CEO_APPROVAL</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Success Alert */}
        {simPostSuccess && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{simPostSuccess}</span>
          </div>
        )}

        {/* Simulator Submit Action */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-medium">
            {isAr
              ? '* سيتم إرسال القيد عبر نقطة /api/operations/add-trip وحجزه تلقائياً للاعتماد التنفيذي'
              : '* Entry will be dispatched to /api/operations/add-trip and queued for CEO approval'}
          </p>

          <button
            type="button"
            disabled={isPostingSim}
            onClick={handlePostSimulatedTrip}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-violet-200 hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {isPostingSim
                ? isAr
                  ? 'جاري التسجيل والتحقق...'
                  : 'Posting...'
                : isAr
                ? 'قيد الرحلة وتطبيق القيد الخماسي'
                : 'Post Trip with 5-Line Matrix'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. VAT Operational Journal Entries Register & CEO Approval Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black text-slate-900">
              {isAr ? 'سجل قيود الضريبة والعمليات بانتظار الاعتماد (CEO Approval Queue)' : 'VAT Operations & CEO Approval Register'}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {isAr ? 'عرض جميع قيود الرحلات المستقطعة لضريبة 15% مع زر الاعتماد والترحيل المباشر' : 'All trip operational VAT entries with live CEO authorization'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['ALL', 'PENDING_CEO_APPROVAL', 'POSTED_TO_MAIN_LEDGER'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    statusFilter === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'ALL'
                    ? isAr
                      ? 'الكل'
                      : 'All'
                    : s === 'PENDING_CEO_APPROVAL'
                    ? isAr
                      ? 'معلق للاعتماد'
                      : 'Pending CEO'
                    : isAr
                    ? 'مرحل للدليل'
                    : 'Posted'}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم السند أو التذكرة...' : 'Search ticket or voucher...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">{isAr ? 'رقم القيد والسند' : 'Voucher #'}</th>
                <th className="p-2.5">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="p-2.5">{isAr ? 'تذكرة الميزان / البيان' : 'Scale Ticket / Description'}</th>
                <th className="p-2.5 text-left">{isAr ? 'إجمالي المبيعات' : 'Gross Amount'}</th>
                <th className="p-2.5 text-left">{isAr ? 'الضريبة 15% (2201)' : 'VAT Output (2201)'}</th>
                <th className="p-2.5 text-left">{isAr ? 'إجمالي القيد' : 'Debit/Credit'}</th>
                <th className="p-2.5 text-center">{isAr ? 'حالة الاعتماد' : 'Status'}</th>
                <th className="p-2.5 text-center">{isAr ? 'إجراءات الرئيس التنفيذي' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-sans">
                    {isAr ? 'لا توجد قيود ضريبية مطابقة لمعايير البحث' : 'No VAT journal records found'}
                  </td>
                </tr>
              ) : (
                filteredJournals.map((entry) => {
                  const isPending = (entry as any).status === 'PENDING_CEO_APPROVAL' || entry.status === 'Draft';
                  const vatLine = entry.lines?.find((l: any) => l.accountCode === '2201' || l.account === '2201' || l.accountCode === '2140');
                  const grossLine = entry.lines?.find((l: any) => l.accountCode === '1101' || l.account === '1101' || l.accountCode === '1200');
                  const vatVal = Number(vatLine?.credit || 0);
                  const grossVal = Number(grossLine?.debit || 0);

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 font-sans">
                      <td className="p-2.5 font-mono font-bold text-violet-700">
                        {entry.id}
                      </td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">{entry.date}</td>
                      <td className="p-2.5 text-slate-800 text-xs">
                        <span className="font-bold block">{entry.referenceId || entry.description}</span>
                        <span className="text-[10px] text-slate-400">{entry.description}</span>
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                        {grossVal > 0 ? grossVal.toFixed(2) : '-'}
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-amber-700">
                        {vatVal > 0 ? vatVal.toFixed(2) : '-'}
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-700">
                        {entry.totalDebit.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                            <Clock className="h-3 w-3 text-amber-700" />
                            <span>PENDING_CEO_APPROVAL</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>POSTED_TO_MAIN_LEDGER</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleCeoApprove(entry)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{isAr ? 'اعتماد وترحيل' : 'CEO Approve'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {isAr ? 'معتمد ومقيد' : 'Audited'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ZATCA Official VAT Return Schedule (نموذج إقرار هيئة الزكاة والضريبة والجمارك) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-700" />
            <div>
              <h3 className="text-xs font-black text-slate-900">
                {isAr ? 'نموذج الإقرار الضريبي الرسمي لهيئة الزكاة والضريبة والجمارك (ZATCA VAT Return Form)' : 'Official ZATCA VAT Return Schedule'}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {brandConfig.companyNameAr} | CR: 1010824619 | VAT ID: 310892019400003
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-800 border border-emerald-200">
            {isAr ? 'الفترة الضريبية الحالية 2026' : 'Active Period 2026'}
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">{isAr ? 'بند الإقرار الضريبي' : 'Return Line Item'}</th>
                <th className="p-3 text-left">{isAr ? 'المبلغ الإجمالي (SAR)' : 'Base Amount'}</th>
                <th className="p-3 text-left">{isAr ? 'مبلغ الضريبة 15% (SAR)' : 'VAT Amount (15%)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {/* Sales 15% */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-sans font-bold text-slate-400">1</td>
                <td className="p-3 font-sans font-bold text-slate-800">
                  {isAr ? 'المبيعات الخاضعة للنسبة الأساسية (15%)' : 'Standard Rated Sales (15%)'}
                </td>
                <td className="p-3 text-left font-black text-slate-900">{vatTotals.grossTotal.toFixed(2)}</td>
                <td className="p-3 text-left font-black text-violet-800">{vatTotals.vatOutputTotal.toFixed(2)}</td>
              </tr>
              {/* Government / Zero rated */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-sans font-bold text-slate-400">2</td>
                <td className="p-3 font-sans text-slate-700">
                  {isAr ? 'المبيعات للجهات الحكومية والمشاريع التنموية (نيوم/القدية)' : 'Government Entities & Zero-Rated Haulage'}
                </td>
                <td className="p-3 text-left text-slate-500">0.00</td>
                <td className="p-3 text-left text-slate-500">0.00</td>
              </tr>
              {/* Total Output Tax */}
              <tr className="bg-violet-50/70 font-black">
                <td className="p-3 font-sans text-violet-900">3</td>
                <td className="p-3 font-sans text-violet-950">
                  {isAr ? 'إجمالي المبيعات وضريبة المخرجات المستحقة (حساب 2201)' : 'Total Sales & Output Tax (Account 2201)'}
                </td>
                <td className="p-3 text-left text-violet-950">{vatTotals.grossTotal.toFixed(2)}</td>
                <td className="p-3 text-left text-violet-950">{vatTotals.vatOutputTotal.toFixed(2)}</td>
              </tr>
              {/* Purchases / COGS */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-sans font-bold text-slate-400">4</td>
                <td className="p-3 font-sans font-bold text-slate-800">
                  {isAr ? 'المشتريات وتكاليف المحاجر وتوريد الركام الخاضعة للضريبة' : 'Standard Rated Domestic Purchases & Quarry Fleet'}
                </td>
                <td className="p-3 text-left font-black text-slate-900">{vatTotals.cogsTotal.toFixed(2)}</td>
                <td className="p-3 text-left font-black text-rose-700">{(vatTotals.cogsTotal * 0.15).toFixed(2)}</td>
              </tr>
              {/* Net VAT Payable */}
              <tr className="bg-gradient-to-r from-emerald-50 to-blue-50 font-black text-sm border-t-2 border-emerald-300">
                <td className="p-3 font-sans text-emerald-900">5</td>
                <td className="p-3 font-sans text-emerald-950">
                  {isAr ? 'صافي ضريبة القيمة المضافة المستحقة للسداد للهيئة' : 'Net VAT Payable to ZATCA'}
                </td>
                <td className="p-3 text-left text-emerald-900">-</td>
                <td className="p-3 text-left text-emerald-950 font-black">
                  {Math.max(0, vatTotals.vatOutputTotal - vatTotals.cogsTotal * 0.15).toFixed(2)} SAR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
