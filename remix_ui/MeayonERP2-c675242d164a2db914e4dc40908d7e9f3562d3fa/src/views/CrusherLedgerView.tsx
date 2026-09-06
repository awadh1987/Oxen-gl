import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CrusherEntity, CrusherPayment, OperationRecord, FinancialVoucher } from '../types';
import {
  Building2,
  Plus,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  Search,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTonnage, getMonthName } from '../utils/formatters';
import { CrusherPaymentModal } from '../components/CrusherPaymentModal';
import { VoucherDetailModal } from '../components/VoucherDetailModal';
import { ExportPrintModal } from '../components/ExportPrintModal';

export const CrusherLedgerView: React.FC = () => {
  const {
    crushers,
    accessibleOperations,
    crusherPayments,
    vouchers,
    autoGenerateVoucherFromPayment,
    language,
    canAccessFinancials,
  } = useApp();
  const isAr = language === 'ar';

  const [selectedCrusherId, setSelectedCrusherId] = useState<string>(crushers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStatementPrintModalOpen, setIsStatementPrintModalOpen] = useState(false);
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<FinancialVoucher | null>(null);

  const selectedCrusher = useMemo(() => {
    return crushers.find((c) => c.id === selectedCrusherId) || crushers[0];
  }, [crushers, selectedCrusherId]);

  // Crusher specific operations
  const crusherOps = useMemo(() => {
    if (!selectedCrusher) return [];
    return accessibleOperations.filter((op) => {
      const matchCrusher = op.loading_source.includes(selectedCrusher.crusherName);
      const matchMonth = selectedMonth === 'ALL' || op.operation_month === Number(selectedMonth);
      return matchCrusher && matchMonth;
    });
  }, [accessibleOperations, selectedCrusher, selectedMonth]);

  // Crusher specific payments made
  const currentPayments = useMemo(() => {
    if (!selectedCrusher) return [];
    return crusherPayments.filter((p) => {
      const matchCrusher = p.crusher_id === selectedCrusher.id || p.crusher_name.includes(selectedCrusher.crusherName);
      const matchMonth = selectedMonth === 'ALL' || p.month === Number(selectedMonth);
      return matchCrusher && matchMonth;
    });
  }, [crusherPayments, selectedCrusher, selectedMonth]);

  // Crusher related vouchers
  const relatedVouchers = useMemo(() => {
    if (!selectedCrusher) return [];
    return vouchers.filter(
      (v) =>
        v.type === 'Payment' &&
        (v.partyId === selectedCrusher.id || v.partyName.includes(selectedCrusher.crusherName))
    );
  }, [vouchers, selectedCrusher]);

  // Totals calculations
  const totalPurchasesCredit = crusherOps.reduce((acc, c) => acc + c.purchases_cost, 0);
  const totalPaymentsDebit = currentPayments.reduce((acc, c) => acc + c.amount, 0) + crusherOps.reduce((acc, c) => acc + c.crusher_payment, 0);
  const outstandingBalance = totalPurchasesCredit - totalPaymentsDebit;
  const totalLoadedTons = crusherOps.reduce((acc, c) => acc + c.qty_loaded, 0);

  return (
    <div className="space-y-6" id="crusher-ledger-view">
      {/* Top Header & Action */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            {isAr ? 'حسابات الكسارات وميزان المدفوعات (دائن / مدين)' : 'Crusher Payables & Accounts Ledger'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAr
              ? 'متابعة مشتريات المواد الخام، سندات الصرف المسددة، وتصفية الأرصدة المستحقة للمقالع'
              : 'Track raw material purchases, supplier debit vouchers, and outstanding crusher balances'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsStatementPrintModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            title={isAr ? 'معاينة وطباعة كشف حساب الكسارة' : 'Print Crusher Statement'}
          >
            <Printer className="h-4 w-4 text-orange-600" />
            <span>{isAr ? 'طباعة كشف الحساب' : 'Print Statement'}</span>
          </button>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-200 hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'تسجيل سند سداد جديد' : 'New Payment Voucher'}</span>
          </button>
        </div>
      </div>

      {/* Crusher Selection Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {crushers.map((c) => {
          const isSelected = c.id === selectedCrusherId;
          const relatedOps = accessibleOperations.filter((op) => op.loading_source.includes(c.crusherName));
          const purchases = relatedOps.reduce((acc, op) => acc + op.purchases_cost, 0);
          const payments = relatedOps.reduce((acc, op) => acc + op.crusher_payment, 0);
          const balance = purchases - payments;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCrusherId(c.id)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-orange-600 bg-orange-50/40 shadow-md ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                      isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">{c.crusherName}</h3>
                    <p className="text-[10px] text-slate-500">{c.location}</p>
                  </div>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {c.materialProduced}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px]">
                <div>
                  <span className="text-slate-500">{isAr ? 'إجمالي المشتريات:' : 'Purchases:'}</span>
                  <p className="font-bold text-slate-800">{formatCurrency(purchases, language)}</p>
                </div>
                <div>
                  <span className="text-slate-500">{isAr ? 'الرصيد المستحق:' : 'Outstanding:'}</span>
                  <p className="font-black text-rose-600">{formatCurrency(balance, language)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Crusher Statement Details */}
      {selectedCrusher && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-5">
          {/* Crusher Header & Summary Numbers */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {isAr ? 'كشف حساب مورد معتمد' : 'Verified Supplier Statement'}
                </span>
                <h2 className="text-base font-black text-slate-900">{selectedCrusher.crusherName}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? 'السجل الضريبي:' : 'Tax No:'} {selectedCrusher.taxNumber} | {selectedCrusher.bankDetails}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">{isAr ? 'كافة الشهور' : 'All Months'}</option>
                {[8, 7, 6, 5, 4, 3].map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m, language)} 2026
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Ledger Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[11px] font-semibold text-slate-500">
                {isAr ? 'إجمالي المشتريات (دائن)' : 'Total Purchases (Credit)'}
              </span>
              <p className="text-base font-black text-slate-900">{formatCurrency(totalPurchasesCredit, language)}</p>
              <span className="text-[10px] text-slate-500">{formatTonnage(totalLoadedTons, language)}</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[11px] font-semibold text-slate-500">
                {isAr ? 'إجمالي المسدد (مدين)' : 'Total Payments (Debit)'}
              </span>
              <p className="text-base font-black text-emerald-700">{formatCurrency(totalPaymentsDebit, language)}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">{isAr ? 'تحويلات وشيكات' : 'Bank vouchers'}</span>
            </div>

            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <span className="text-[11px] font-semibold text-rose-800">
                {isAr ? 'صافي الرصيد المستحق للكسارة' : 'Net Outstanding Balance'}
              </span>
              <p className="text-base font-black text-rose-700">{formatCurrency(outstandingBalance, language)}</p>
              <span className="text-[10px] text-rose-600 font-semibold">{isAr ? 'مستحق السداد' : 'Payable to Crusher'}</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[11px] font-semibold text-slate-500">
                {isAr ? 'عدد الحمولات المنفذة' : 'Executed Trips'}
              </span>
              <p className="text-base font-black text-slate-900">{crusherOps.length} {isAr ? 'رحلة' : 'trips'}</p>
              <span className="text-[10px] text-slate-500">{selectedCrusher.contactPerson} ({selectedCrusher.phone})</span>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div>
            <h3 className="mb-3 text-xs font-bold text-slate-900">
              {isAr ? 'سجل الحركات والتوريدات المفصلة (Statement Transactions)' : 'Detailed Supply Transactions'}
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-800">
                    <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'رقم فاتورة التحميل' : 'Invoice #'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'رقم الشاحنة' : 'Truck #'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الناقل' : 'Transporter'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المادة' : 'Material'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الوزن المحمل (طن)' : 'Loaded (Tons)'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'قيمة الشراء (دائن)' : 'Purchases (Credit)'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المسدد (مدين)' : 'Paid (Debit)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crusherOps.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{formatDate(op.loading_date, language)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{op.loading_invoice_no}</td>
                      <td className="py-2.5 px-3 font-bold text-orange-950">{op.truck_no}</td>
                      <td className="py-2.5 px-3 text-slate-600">{op.transporter_name}</td>
                      <td className="py-2.5 px-3 text-slate-800">{op.material_type}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{op.qty_loaded}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(op.purchases_cost, language)}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{formatCurrency(op.crusher_payment, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recorded Payments & Official Vouchers Table */}
          <div className="pt-3 border-t border-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-orange-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? 'سندات الصرف والمدفوعات المسجلة للكسارة (Vouchers & Disbursed Payments)' : 'Disbursed Payments & Vouchers'}
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {currentPayments.length} {isAr ? 'حركات سداد' : 'payments'}
              </span>
            </div>

            {currentPayments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                {isAr ? 'لا توجد دفعات مسجلة لهذه الكسارة خلال الفترة المحددة' : 'No recorded payments for this period'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-800">
                      <th className="py-2.5 px-3">{isAr ? 'تاريخ السداد' : 'Payment Date'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'طريقة السداد' : 'Method'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'رقم المرجع / الشيك' : 'Ref / Cheque #'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'البيان والملاحظات' : 'Notes'}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? 'سند الصرف الرسمي' : 'Official Voucher'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPayments.map((p) => {
                      const linkedVoucher = vouchers.find(
                        (v) =>
                          v.type === 'Payment' &&
                          (v.transferRefNumber === p.reference_no || v.linkedReferenceNo === p.reference_no || (v.partyId === p.crusher_id && v.date === p.payment_date))
                      );

                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{formatDate(p.payment_date, language)}</td>
                          <td className="py-2.5 px-3 font-black text-rose-700 font-mono">
                            {formatCurrency(p.amount, language)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{p.payment_method}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{p.reference_no}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.notes || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            {linkedVoucher ? (
                              <button
                                onClick={() => setSelectedVoucherForView(linkedVoucher)}
                                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-950 shadow-2xs hover:bg-orange-100"
                              >
                                <Printer className="h-3.5 w-3.5 text-orange-700" />
                                <span>{linkedVoucher.voucherNumber}</span>
                                {linkedVoucher.status === 'Approved' && (
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const newVch = autoGenerateVoucherFromPayment(p);
                                  setSelectedVoucherForView(newVch);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-orange-700"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>{isAr ? 'توليد سند صرف' : 'Generate Voucher'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crusher Payment Modal */}
      <CrusherPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultCrusherName={selectedCrusher?.crusherName}
        onVoucherCreated={(vch) => {
          setSelectedVoucherForView(vch);
        }}
      />

      {/* Official Voucher Detail / Print Modal */}
      <VoucherDetailModal
        voucher={selectedVoucherForView}
        isOpen={!!selectedVoucherForView}
        onClose={() => setSelectedVoucherForView(null)}
      />

      {/* Live Print Preview & Export Studio Modal for Crusher Statement */}
      <ExportPrintModal
        isOpen={isStatementPrintModalOpen}
        onClose={() => setIsStatementPrintModalOpen(false)}
        initialDocType="crusher-statement"
        initialCrusherId={selectedCrusherId}
      />
    </div>
  );
};
