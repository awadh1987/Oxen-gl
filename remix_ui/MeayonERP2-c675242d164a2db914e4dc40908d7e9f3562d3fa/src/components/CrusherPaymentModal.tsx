import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { X, CreditCard, Building2, Calendar, FileText, CheckCircle2, Sparkles, Printer } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { tafqeetArabic } from '../utils/tafqeet';
import { FinancialVoucher } from '../types';

interface CrusherPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCrusherName?: string;
  onVoucherCreated?: (voucher: FinancialVoucher) => void;
}

export const CrusherPaymentModal: React.FC<CrusherPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultCrusherName,
  onVoucherCreated,
}) => {
  const { crushers, addCrusherPayment, autoGenerateVoucherFromPayment, language } = useApp();
  const isAr = language === 'ar';

  const [selectedCrusherId, setSelectedCrusherId] = useState<string>(() => {
    if (defaultCrusherName) {
      const found = crushers.find((c) => c.crusherName === defaultCrusherName);
      if (found) return found.id;
    }
    return crushers[0]?.id || '';
  });

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number | ''>(25000);
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cheque' | 'Cash' | 'Credit Memo'>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState(`TR-SA-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');

  const amountInWordsAr = useMemo(() => {
    return tafqeetArabic(Number(amount) || 0);
  }, [amount]);

  if (!isOpen) return null;

  const currentCrusher = crushers.find((c) => c.id === selectedCrusherId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0 || !currentCrusher) {
      alert(isAr ? 'يرجى إدخال مبلغ صحيح واختيار الكسارة' : 'Please enter valid amount and crusher');
      return;
    }

    const d = new Date(paymentDate);
    const paymentEntry = {
      crusher_id: currentCrusher.id,
      crusher_name: currentCrusher.crusherName,
      payment_date: paymentDate,
      amount: Number(amount),
      payment_method: paymentMethod,
      reference_no: referenceNo,
      notes: notes,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };

    addCrusherPayment(paymentEntry);

    // Auto generate the official financial voucher
    const voucher = autoGenerateVoucherFromPayment(paymentEntry as any);

    if (onVoucherCreated) {
      onVoucherCreated(voucher);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        id="crusher-payment-modal"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'تسجيل سند صرف / سداد دفعة للكسارة' : 'Record Crusher Payment Voucher'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'إدراج قيد مدين لتسوية رصيد المورد' : 'Debit entry to reconcile supplier ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              {isAr ? 'الكسارة المستفيدة *' : 'Beneficiary Crusher *'}
            </label>
            <select
              value={selectedCrusherId}
              onChange={(e) => setSelectedCrusherId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            >
              {crushers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.crusherName}
                </option>
              ))}
            </select>
            {currentCrusher && (
              <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">
                {currentCrusher.bankDetails}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                {isAr ? 'تاريخ السداد *' : 'Payment Date *'}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                {isAr ? 'المبلغ المسدد (ر.س) *' : 'Amount (SAR) *'}
              </label>
              <input
                type="number"
                step="100"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-blue-900"
              />
            </div>
          </div>

          {/* Tafqeet Preview */}
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-950">
              <Sparkles className="h-3 w-3 text-orange-600" />
              <span>{isAr ? 'التفقيط الآلي لسند الصرف:' : 'Auto Tafqeet:'}</span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-neutral-950 font-serif">
              {amountInWordsAr}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                {isAr ? 'طريقة السداد *' : 'Payment Method *'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
              >
                <option value="Bank Transfer">{isAr ? 'تحويل بنكي (Bank Transfer)' : 'Bank Transfer'}</option>
                <option value="Cheque">{isAr ? 'شيك مصدق (Cheque)' : 'Cheque'}</option>
                <option value="Cash">{isAr ? 'نقداً (Cash)' : 'Cash'}</option>
                <option value="Credit Memo">{isAr ? 'إشعار دائن (Credit Memo)' : 'Credit Memo'}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                {isAr ? 'رقم المرجع / الشيك' : 'Reference / Cheque #'}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              {isAr ? 'ملاحظات وبيان السند' : 'Voucher Remarks'}
            </label>
            <textarea
              rows={2}
              value={notes}
              placeholder={isAr ? 'سداد دفعة مقابل توريدات رمل وحصى...' : 'Payment for supplies...'}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isAr ? 'اعتماد سند الصرف' : 'Confirm Voucher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
