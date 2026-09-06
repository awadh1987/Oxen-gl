import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TransporterSettlement, FinancialVoucher } from '../types';
import {
  Truck,
  AlertTriangle,
  TrendingDown,
  FileSpreadsheet,
  Award,
  DollarSign,
  ShieldAlert,
  Search,
  CheckCircle2,
  Calendar,
  Receipt,
  Printer,
  Plus,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatTonnage, getMonthName } from '../utils/formatters';
import { exportTransporterSettlementsToExcel } from '../utils/excelExporter';
import { CreateVoucherModal } from '../components/CreateVoucherModal';
import { VoucherDetailModal } from '../components/VoucherDetailModal';

export const TransporterPerformanceView: React.FC = () => {
  const { transporters, accessibleOperations, vouchers, language, canAccessFinancials } = useApp();
  const isAr = language === 'ar';

  const [selectedMonth, setSelectedMonth] = useState<number>(8);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [penaltyThreshold, setPenaltyThreshold] = useState<number>(2.0); // Penalty if wastage > 2.0%

  // Voucher Modals
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherModalProps, setVoucherModalProps] = useState<{
    partyId?: string;
    partyName?: string;
    amount?: number;
    linkedRef?: string;
    purpose?: string;
  }>({});
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<FinancialVoucher | null>(null);

  // Compute Transporter Settlements & Loss Performance Metrics
  const settlements: TransporterSettlement[] = useMemo(() => {
    return transporters.map((t) => {
      const monthOps = accessibleOperations.filter(
        (op) =>
          op.transporter_name.includes(t.transporterName) &&
          op.operation_month === selectedMonth &&
          op.operation_year === selectedYear
      );

      const tripsCount = monthOps.length;
      const totalLoaded = monthOps.reduce((acc, op) => acc + op.qty_loaded, 0);
      const totalDelivered = monthOps.reduce((acc, op) => acc + op.qty_delivered, 0);
      const totalWastage = monthOps.reduce((acc, op) => acc + op.qty_wastage, 0);
      const wastagePercentage = totalLoaded > 0 ? (totalWastage / totalLoaded) * 100 : 0;

      // Freight payment rate (e.g. standard 18 SAR per delivered ton)
      const freightRatePerTon = 18;
      const totalFreightFee = totalDelivered * freightRatePerTon;

      // Penalty logic: if wastage > threshold, deduct excess lost tons * material selling price (44 SAR)
      let penaltyDeductions = 0;
      if (wastagePercentage > penaltyThreshold) {
        const allowedLossTons = totalLoaded * (penaltyThreshold / 100);
        const excessLossTons = Math.max(0, totalWastage - allowedLossTons);
        penaltyDeductions = excessLossTons * 44; // Deduct at selling material rate
      }

      const netPayable = Math.max(0, totalFreightFee - penaltyDeductions);

      let status: 'Excellent' | 'Warning' | 'Penalty' = 'Excellent';
      if (wastagePercentage > 3.0) status = 'Penalty';
      else if (wastagePercentage > 1.8) status = 'Warning';

      return {
        transporterId: t.id,
        transporterName: t.transporterName,
        tripsCount,
        totalLoaded: Number(totalLoaded.toFixed(2)),
        totalDelivered: Number(totalDelivered.toFixed(2)),
        totalWastage: Number(totalWastage.toFixed(2)),
        wastagePercentage: Number(wastagePercentage.toFixed(2)),
        totalFreightFee: Number(totalFreightFee.toFixed(2)),
        penaltyDeductions: Number(penaltyDeductions.toFixed(2)),
        netPayable: Number(netPayable.toFixed(2)),
        status,
      };
    });
  }, [transporters, accessibleOperations, selectedMonth, selectedYear, penaltyThreshold]);

  const totalLossTons = settlements.reduce((acc, s) => acc + s.totalWastage, 0);
  const totalTrips = settlements.reduce((acc, s) => acc + s.tripsCount, 0);
  const totalNetPayable = settlements.reduce((acc, s) => acc + s.netPayable, 0);
  const totalPenalties = settlements.reduce((acc, s) => acc + s.penaltyDeductions, 0);

  const handleExport = () => {
    exportTransporterSettlementsToExcel(settlements, selectedMonth, selectedYear);
  };

  return (
    <div className="space-y-6" id="transporter-performance-view">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            {isAr ? 'تقييم أداء الناقلين ورصد فاقد النقل والخصومات' : 'Transporter Loss & Freight Settlements'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAr
              ? 'مراقبة هدر المواد في الطريق، كشف حالات التلاعب بالأوزان، واحتساب مستحقات أجور النقل'
              : 'Audit transit material losses, flag abnormal weighbridge variance, and settle freight fees'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-orange-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 focus:outline-none"
            >
              {[8, 7, 6, 5, 4, 3].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m, language)} {selectedYear}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? 'تصدير كشف التصفية' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isAr ? 'إجمالي فاقد الطريق' : 'Total Route Loss'}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-600">{formatTonnage(totalLossTons, language)}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>{isAr ? 'عبر' : 'Across'} <strong>{totalTrips}</strong> {isAr ? 'رحلة توريد' : 'trips'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isAr ? 'أجور النقل المستحقة' : 'Gross Freight Fees'}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {formatCurrency(totalNetPayable + totalPenalties, language)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>{isAr ? 'بمعدل 18 ر.س / طن' : 'At 18 SAR / Ton'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isAr ? 'خصومات الفاقد والجزاءات' : 'Wastage Deductions'}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-amber-700">{formatCurrency(totalPenalties, language)}</div>
          <div className="mt-1 text-[11px] text-amber-800">
            <span>{isAr ? 'تخصم من مستحقات المقاول' : 'Deducted from payable'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isAr ? 'صافي المستحق للصرف' : 'Net Freight Payable'}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700">{formatCurrency(totalNetPayable, language)}</div>
          <div className="mt-1 text-[11px] text-emerald-800 font-semibold">
            <span>{isAr ? 'جاهز لإعداد أوامر الصرف' : 'Ready for payout'}</span>
          </div>
        </div>
      </div>

      {/* Transporter Audit Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">
            {isAr ? 'جدول تصفية أجور الناقلين ومؤشر الالتزام التشغيلي' : 'Subcontractor Freight Settlement & Compliance'}
          </h3>
          <span className="text-[11px] text-slate-500">
            {isAr ? 'حد الفاقد المسموح: 2.0% كحد أقصى' : 'Allowed Loss Threshold: 2.0% max'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">{isAr ? 'اسم الناقل (المقاول الفرعي)' : 'Transporter Name'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الرحلات' : 'Trips'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'المحمل (طن)' : 'Loaded'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'المستلم (طن)' : 'Delivered'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الفاقد (طن)' : 'Wastage'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'نسبة الفاقد %' : 'Loss %'}</th>
                <th className="py-3 px-3">{isAr ? 'أجور النقل (ر.س)' : 'Freight Fee'}</th>
                <th className="py-3 px-3">{isAr ? 'خصم الجزاءات' : 'Penalties'}</th>
                <th className="py-3 px-3">{isAr ? 'صافي المستحق' : 'Net Payout'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'تقييم الأداء' : 'Compliance'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'سند الصرف' : 'Payment Voucher'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settlements.map((s, idx) => {
                const isHighPenalty = s.status === 'Penalty';
                const isWarning = s.status === 'Warning';
                const linkedVoucher = vouchers.find(
                  (v) =>
                    v.type === 'Payment' &&
                    v.partyId === s.transporterId &&
                    v.status !== 'Cancelled'
                );

                return (
                  <tr key={s.transporterId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{s.transporterName}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800">{s.tripsCount}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{s.totalLoaded}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{s.totalDelivered}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${s.totalWastage > 2 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {s.totalWastage} طن
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          isHighPenalty
                            ? 'bg-rose-100 text-rose-800'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {s.wastagePercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{formatCurrency(s.totalFreightFee, language)}</td>
                    <td className="py-3 px-3 font-bold text-rose-600">
                      {s.penaltyDeductions > 0 ? `-${formatCurrency(s.penaltyDeductions, language)}` : '0.00 ر.س'}
                    </td>
                    <td className="py-3 px-3 font-black text-neutral-950">{formatCurrency(s.netPayable, language)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isHighPenalty
                            ? 'bg-rose-100 text-rose-700'
                            : isWarning
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isHighPenalty
                          ? isAr
                            ? '🚨 حسم جزاءات'
                            : 'Penalty'
                          : isWarning
                          ? isAr
                            ? '⚠️ تحت الملاحظة'
                            : 'Warning'
                          : isAr
                          ? '✓ متميز'
                          : 'Excellent'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {linkedVoucher ? (
                        <button
                          onClick={() => setSelectedVoucherForView(linkedVoucher)}
                          className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-950 hover:bg-orange-100 shadow-2xs"
                        >
                          <Printer className="h-3 w-3 text-orange-700" />
                          <span>{linkedVoucher.voucherNumber}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setVoucherModalProps({
                              partyId: s.transporterId,
                              partyName: s.transporterName,
                              amount: s.netPayable,
                              linkedRef: `TRN-STTL-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
                              purpose: `سداد مستحقات وأجور نقل شهر ${getMonthName(selectedMonth, language)} ${selectedYear} بعد خصم الفاقد والجزاءات`,
                            });
                            setIsVoucherModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-orange-700"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isAr ? 'إصدار سند صرف' : 'Issue Voucher'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Voucher Modal */}
      <CreateVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        initialType="Payment"
        initialCategory="Transporter_Payment"
        initialPartyId={voucherModalProps.partyId}
        initialPartyName={voucherModalProps.partyName}
        initialAmount={voucherModalProps.amount}
        initialLinkedRef={voucherModalProps.linkedRef}
        initialPurpose={voucherModalProps.purpose}
        onSuccess={(createdVoucher) => {
          setSelectedVoucherForView(createdVoucher);
        }}
      />

      {/* Voucher Detail / Print Modal */}
      <VoucherDetailModal
        voucher={selectedVoucherForView}
        isOpen={!!selectedVoucherForView}
        onClose={() => setSelectedVoucherForView(null)}
      />
    </div>
  );
};
