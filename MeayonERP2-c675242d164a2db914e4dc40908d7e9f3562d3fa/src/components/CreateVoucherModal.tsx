import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FinancialVoucher, VoucherType, VoucherCategory } from '../types';
import { tafqeetArabic, tafqeetEnglish } from '../utils/tafqeet';
import { X, CreditCard, Building, FileText, CheckCircle2, DollarSign, Sparkles } from 'lucide-react';

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: VoucherType;
  initialCategory?: VoucherCategory;
  initialPartyType?: 'Crusher' | 'Transporter' | 'Customer' | 'Other';
  initialPartyId?: string;
  initialPartyName?: string;
  initialAmount?: number;
  initialLinkedRef?: string;
  initialPurpose?: string;
  onSuccess?: (createdVoucher: FinancialVoucher) => void;
}

export const CreateVoucherModal: React.FC<CreateVoucherModalProps> = ({
  isOpen,
  onClose,
  initialType = 'Payment',
  initialCategory = 'Crusher_Settlement',
  initialPartyType = 'Crusher',
  initialPartyId = '',
  initialPartyName = '',
  initialAmount = 0,
  initialLinkedRef = '',
  initialPurpose = '',
  onSuccess,
}) => {
  const {
    language,
    crushers,
    transporters,
    customers,
    currentUser,
    brandConfig,
    addVoucher,
    isAdmin,
    isCOO,
  } = useApp();

  const isAr = language === 'ar';

  const [type, setType] = useState<VoucherType>(initialType);
  const [category, setCategory] = useState<VoucherCategory>(initialCategory);
  const [partyType, setPartyType] = useState<'Crusher' | 'Transporter' | 'Customer' | 'Other'>(initialPartyType);
  const [partyId, setPartyId] = useState<string>(initialPartyId);
  const [partyName, setPartyName] = useState<string>(initialPartyName);
  const [partyTaxNumber, setPartyTaxNumber] = useState<string>('');
  const [amount, setAmount] = useState<number>(initialAmount);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Cheque' | 'Credit Memo'>('Bank Transfer');
  const [bankName, setBankName] = useState<string>(brandConfig.bankNameAr || 'مصرف الراجحي');
  const [transferRefNumber, setTransferRefNumber] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [linkedReferenceNo, setLinkedReferenceNo] = useState<string>(initialLinkedRef);
  const [purpose, setPurpose] = useState<string>(initialPurpose);
  const [notes, setNotes] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(isAdmin);

  // Sync initial props whenever modal opens with new pre-fill
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setCategory(initialCategory);
      setPartyType(initialPartyType);
      setPartyId(initialPartyId);
      setPartyName(initialPartyName);
      setAmount(initialAmount || 0);
      setLinkedReferenceNo(initialLinkedRef);
      setPurpose(initialPurpose);
      setAutoApprove(isAdmin);

      // Auto resolve party tax number if partyId matches
      if (initialPartyType === 'Crusher' && initialPartyId) {
        const found = crushers.find((c) => c.id === initialPartyId);
        if (found) setPartyTaxNumber(found.taxNumber || '');
      } else if (initialPartyType === 'Customer' && initialPartyId) {
        const found = customers.find((c) => c.id === initialPartyId);
        if (found) setPartyTaxNumber(found.taxNumber || '');
      }
    }
  }, [isOpen, initialType, initialCategory, initialPartyType, initialPartyId, initialPartyName, initialAmount, initialLinkedRef, initialPurpose, isAdmin, crushers, customers]);

  // Live Tafqeet
  const amountInWordsAr = useMemo(() => {
    return tafqeetArabic(Number(amount) || 0);
  }, [amount]);

  const amountInWordsEn = useMemo(() => {
    return tafqeetEnglish(Number(amount) || 0);
  }, [amount]);

  if (!isOpen) return null;

  // Handle party selection change
  const handlePartySelect = (selectedId: string) => {
    setPartyId(selectedId);
    if (partyType === 'Crusher') {
      const crush = crushers.find((c) => c.id === selectedId);
      if (crush) {
        setPartyName(crush.name);
        setPartyTaxNumber(crush.taxNumber || '');
        if (!purpose) {
          setPurpose(`سداد مستحقات توريد مواد حصوية لـ (${crush.name})`);
        }
      }
    } else if (partyType === 'Transporter') {
      const trans = transporters.find((t) => t.id === selectedId);
      if (trans) {
        setPartyName(trans.name);
        setPartyTaxNumber(trans.taxNumber || '');
        if (!purpose) {
          setPurpose(`سداد أجور نقل وتوريد لشاحنات أسطول (${trans.name})`);
        }
      }
    } else if (partyType === 'Customer') {
      const cust = customers.find((c) => c.id === selectedId);
      if (cust) {
        setPartyName(cust.customerName);
        setPartyTaxNumber(cust.taxNumber || '');
        if (!purpose) {
          setPurpose(`استلام دفعة سداد فواتير توريد من عميل (${cust.customerName})`);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert(isAr ? 'يرجى إدخال اسم المستفيد / المستلم منه' : 'Please provide party name');
      return;
    }
    if (amount <= 0) {
      alert(isAr ? 'يرجى إدخال مبلغ صحيح أكبر من الصفر' : 'Please enter a valid amount greater than 0');
      return;
    }

    const created = addVoucher({
      voucherNumber: '',
      type,
      category,
      date,
      amount: Number(amount),
      partyType,
      partyId: partyId || undefined,
      partyName: partyName.trim(),
      partyTaxNumber: partyTaxNumber || undefined,
      paymentMethod,
      bankName: paymentMethod === 'Cash' ? undefined : bankName,
      transferRefNumber: paymentMethod === 'Bank Transfer' ? transferRefNumber : undefined,
      checkNumber: paymentMethod === 'Cheque' ? checkNumber : undefined,
      linkedReferenceNo: linkedReferenceNo || undefined,
      purpose: purpose.trim() || (isAr ? `سند ${type === 'Payment' ? 'صرف' : 'قبض'} رسمي` : `Official ${type} Voucher`),
      notes: notes.trim() || undefined,
      month: new Date(date).getMonth() + 1,
      year: new Date(date).getFullYear(),
      preparedBy: currentUser.fullNameAr || currentUser.fullName,
      reviewedBy: 'عبدالمجيد أحمد (المدير المالي والتشغيلي COO)',
      receivedBy: receivedBy.trim() || undefined,
      isApproved: autoApprove && (isAdmin || isCOO),
      status: autoApprove && (isAdmin || isCOO) ? 'Approved' : 'Pending_Approval',
      approvedBy: autoApprove && (isAdmin || isCOO) ? (currentUser.fullNameAr || currentUser.fullName) : undefined,
      approvedAt: autoApprove && (isAdmin || isCOO) ? new Date().toISOString() : undefined,
    });

    if (onSuccess) {
      onSuccess(created);
    }
    onClose();
  };

  return (
    <div
      id="create-voucher-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 via-neutral-950 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm ${type === 'Payment' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
              {type === 'Payment' ? 'صرف' : 'قبض'}
            </div>
            <div>
              <h2 className="text-base font-black sm:text-lg">
                {isAr
                  ? type === 'Payment' ? 'إنشاء سند صـرف مالي جديد' : 'إنشاء سند قـبض مالي جديد'
                  : type === 'Payment' ? 'Create Payment Voucher' : 'Create Receipt Voucher'}
              </h2>
              <p className="text-xs text-slate-300">
                {isAr ? 'توثيق الحركات البنكية والنقدية بتفقيط آلي واعتمادات تنفيذية' : 'Financial documentation with automatic tafqeet'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-6 space-y-5">
          {/* Voucher Type & Category Switchers */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-black text-slate-700">
                {isAr ? 'نوع السند المالي:' : 'Voucher Type:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('Payment');
                    if (category === 'Customer_Collection') setCategory('Crusher_Settlement');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-black transition-all ${
                    type === 'Payment'
                      ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{isAr ? 'سند صرف (دائن)' : 'Payment Voucher'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('Receipt');
                    setCategory('Customer_Collection');
                    setPartyType('Customer');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-black transition-all ${
                    type === 'Receipt'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{isAr ? 'سند قبض (مدين)' : 'Receipt Voucher'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black text-slate-700">
                {isAr ? 'تصنيف المعاملة:' : 'Category:'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VoucherCategory)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-hidden"
              >
                {type === 'Payment' ? (
                  <>
                    <option value="Crusher_Settlement">{isAr ? 'سداد مستحقات كسارة' : 'Crusher Settlement'}</option>
                    <option value="Transporter_Payment">{isAr ? 'مستحقات أسطول ناقل' : 'Transporter Freight'}</option>
                    <option value="Operational_Expense">{isAr ? 'مصروفات تشغيلية وموقع' : 'Operational Expense'}</option>
                    <option value="General">{isAr ? 'دفعة عامة / موردين' : 'General Payment'}</option>
                  </>
                ) : (
                  <>
                    <option value="Customer_Collection">{isAr ? 'تحصيل دفعة عميل' : 'Customer Collection'}</option>
                    <option value="General">{isAr ? 'إيرادات أخرى / استرداد' : 'Other Income'}</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Amount & Real-Time Tafqeet Box */}
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black text-neutral-950">
                  {isAr ? 'المبلغ بالريال السعودي (SAR):' : 'Amount (SAR):'} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-orange-300 bg-white px-3 py-2.5 text-base font-black font-mono text-slate-900 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-hidden"
                  />
                  <span className="absolute left-3 top-2.5 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
                    SAR
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black text-slate-700">
                  {isAr ? 'تاريخ المعاملة:' : 'Posting Date:'} *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Live Tafqeet Banner */}
            <div className="rounded-xl border border-orange-300/80 bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                <span>{isAr ? 'المبلغ كتابة بالحروف (تفقيط آلي فوري):' : 'Amount in Words (Auto-Tafqeet):'}</span>
              </div>
              <p className="text-xs font-black text-neutral-950 font-serif leading-relaxed">
                {amountInWordsAr}
              </p>
              <p className="text-[10px] font-medium text-slate-500 font-mono mt-0.5">
                {amountInWordsEn}
              </p>
            </div>
          </div>

          {/* Beneficiary / Payer Information */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="text-xs font-black text-slate-900">
              {isAr
                ? type === 'Payment' ? 'بيانات المستفيد (Payee)' : 'بيانات الدافع / المستلم منه (Payer)'
                : 'Party Details'}
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">
                  {isAr ? 'نوع الجهة:' : 'Party Type:'}
                </label>
                <select
                  value={partyType}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    setPartyType(p);
                    setPartyId('');
                    setPartyName('');
                    setPartyTaxNumber('');
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Crusher">{isAr ? 'كسارة' : 'Crusher'}</option>
                  <option value="Transporter">{isAr ? 'ناقل' : 'Transporter'}</option>
                  <option value="Customer">{isAr ? 'عميل' : 'Customer'}</option>
                  <option value="Other">{isAr ? 'أخرى / مورد' : 'Other'}</option>
                </select>
              </div>

              {/* Quick Dropdown if Crusher/Transporter/Customer */}
              {partyType !== 'Other' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    {isAr ? 'اختر من السجلات:' : 'Select from Directory:'}
                  </label>
                  <select
                    value={partyId}
                    onChange={(e) => handlePartySelect(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
                    {partyType === 'Crusher' &&
                      crushers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    {partyType === 'Transporter' &&
                      transporters.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    {partyType === 'Customer' &&
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.customerName}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className={partyType === 'Other' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">
                  {isAr ? 'اسم المستفيد / الجهة الصريح:' : 'Beneficiary / Entity Name:'} *
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={isAr ? 'مثال: شركة ركاز للمقاولات' : 'e.g. Rikaz Contracting'}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Payment Method & Bank Coordinates */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="text-xs font-black text-slate-900">
              {isAr ? 'طريقة الدفع والتفاصيل المصرفية' : 'Payment Method & Banking'}
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">
                  {isAr ? 'طريقة السداد:' : 'Payment Method:'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Bank Transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="Cheque">{isAr ? 'شيك مصرفي' : 'Cheque'}</option>
                  <option value="Cash">{isAr ? 'نقداً (صندوق)' : 'Cash'}</option>
                  <option value="Credit Memo">{isAr ? 'تسوية قيد / مقاصة' : 'Credit Memo'}</option>
                </select>
              </div>

              {paymentMethod !== 'Cash' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    {isAr ? 'البنك المنفذ:' : 'Bank Name:'}
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={isAr ? 'مثال: مصرف الراجحي' : 'e.g. Al Rajhi Bank'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              {paymentMethod === 'Bank Transfer' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    {isAr ? 'رقم الحوالة / المرجع البنكي:' : 'Transfer Reference No:'}
                  </label>
                  <input
                    type="text"
                    value={transferRefNumber}
                    onChange={(e) => setTransferRefNumber(e.target.value)}
                    placeholder="TRF-88401923"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              )}

              {paymentMethod === 'Cheque' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    {isAr ? 'رقم الشيك:' : 'Cheque Number:'}
                  </label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="CHQ-001924"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Purpose & References */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-black text-slate-700">
                {isAr ? 'الغرض من الصرف / القبض (Purpose):' : 'Payment Purpose:'} *
              </label>
              <textarea
                rows={2}
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={isAr ? 'وصف تفصيلي للدفعة، نوع المواد، أو رقم الشهر المالي' : 'Detailed description of the transaction'}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 focus:border-orange-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">
                  {isAr ? 'رقم الفاتورة أو العقد المرتبط:' : 'Linked Invoice / Ref No:'}
                </label>
                <input
                  type="text"
                  value={linkedReferenceNo}
                  onChange={(e) => setLinkedReferenceNo(e.target.value)}
                  placeholder="INV-2026-08-1048"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">
                  {isAr ? 'اسم المستلم / الوكيل (Received By):' : 'Received By Name:'}
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder={isAr ? 'اسم المندوب أو أمين الصندوق' : 'Receiver / Agent name'}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">
                {isAr ? 'ملاحظات إضافية للمحاسبة:' : 'Additional Accounting Notes:'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'أي شروط أو ملحوظات تدقيق' : 'Optional internal notes'}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* CEO / Executive Direct Approval Switch if user is Admin or COO */}
          {(isAdmin || isCOO) && (
            <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/70 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-700" />
                <div>
                  <span className="text-xs font-black text-neutral-950">
                    {isAr ? 'اعتماد وختم السند فورياً (صلاحيات المدير العام CEO)' : 'Instant Executive Approval & Stamp'}
                  </span>
                  <p className="text-[10px] text-orange-700">
                    {isAr ? 'تطبيق الختم والتوقيع الإلكتروني دون الحاجة لتمرير السند لقائمة الانتظار' : 'Stamp digital signature immediately'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="h-4 w-4 rounded-sm border-slate-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-orange-600/30 hover:bg-orange-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isAr
                  ? type === 'Payment' ? 'إصدار سند الصرف' : 'إصدار سند القبض'
                  : `Issue ${type} Voucher`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
