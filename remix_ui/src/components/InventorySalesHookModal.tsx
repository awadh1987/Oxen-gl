import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Building,
  User,
  Hash,
  Calculator,
  CheckCircle2,
  X,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { BrandLogo } from './BrandLogo';

interface InventorySalesHookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const DEFAULT_COST_CENTERS = [
  { id: 'cc-1', code: 'CC-OPS-01', nameAr: 'عمليات النقل والترحيل', nameEn: 'Fleet & Haulage Operations' },
  { id: 'cc-2', code: 'CC-QUR-01', nameAr: 'محاجر وكسارات الصمان', nameEn: 'Suman Quarries' },
  { id: 'cc-3', code: 'CC-ADM-01', nameAr: 'الإدارة العامة والمبيعات', nameEn: 'Headquarters & Sales' },
];

export const InventorySalesHookModal: React.FC<InventorySalesHookModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { customers, materials, language, currentUser, logAuditAction } = useApp();
  const costCenters = DEFAULT_COST_CENTERS;
  const isAr = language === 'ar';

  // Form State - 1-to-1 Mapping with /api/inventory/sales-hook schema
  const [itemId, setItemId] = useState<string>('RAW-AGG-001');
  const [customItemName, setCustomItemName] = useState<string>('بحص مدرج 3/4 بوصة (Aggregates 3/4)');
  const [warehouseId, setWarehouseId] = useState<string>('WH-MAIN-01');
  const [quantity, setQuantity] = useState<number>(50);
  const [unitPrice, setUnitPrice] = useState<number>(42);
  const [costPrice, setCostPrice] = useState<number>(28);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || 'CUST-01');
  const [referenceDoc, setReferenceDoc] = useState<string>(
    `WH-OUT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [costCenter, setCostCenter] = useState<string>('CC-OPS-01');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Read-only computed fields with strict mathematical precision
  const revenue = useMemo(() => {
    const q = Math.max(0, Number(quantity) || 0);
    const p = Math.max(0, Number(unitPrice) || 0);
    return Number((q * p).toFixed(2));
  }, [quantity, unitPrice]);

  const cogs = useMemo(() => {
    const q = Math.max(0, Number(quantity) || 0);
    const c = Math.max(0, Number(costPrice) || 0);
    return Number((q * c).toFixed(2));
  }, [quantity, costPrice]);

  const grossProfit = useMemo(() => {
    return Number((revenue - cogs).toFixed(2));
  }, [revenue, cogs]);

  const profitMargin = useMemo(() => {
    if (revenue <= 0) return 0;
    return Number(((grossProfit / revenue) * 100).toFixed(1));
  }, [revenue, grossProfit]);

  const totalBalanced = useMemo(() => {
    return Number((revenue + cogs).toFixed(2));
  }, [revenue, cogs]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setErrorMessage(isAr ? 'الكمية يجب أن تكون أكبر من الصفر' : 'Quantity must be greater than zero');
      return;
    }
    if (unitPrice <= 0) {
      setErrorMessage(isAr ? 'سعر البيع يجب أن يكون أكبر من الصفر' : 'Unit sales price must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        item_id: itemId,
        warehouse_id: warehouseId,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        cost_price: Number(costPrice),
        customer_id: selectedCustomer?.id || 'CUST-GENERAL',
        customer_name: selectedCustomer?.customerName || 'عميل نقدي عام',
        reference_doc: referenceDoc,
        cost_center: costCenter,
        createdBy: currentUser.fullNameAr || currentUser.fullName,
      };

      const result = await apiService.triggerInventorySalesHook(payload);

      logAuditAction({
        userId: currentUser.id,
        userName: currentUser.fullNameAr || currentUser.fullName,
        userRole: currentUser.role,
        action: 'CREATE',
        entityType: 'JournalEntry',
        entityId: result.journal_entry_id,
        summary: `تسجيل قيد صرف وبيع مخزني رباعي برقم ${result.journal_entry_id} لصالح ${payload.customer_name} بإجمالي مبيعات ${revenue.toLocaleString()} ر.س (بانتظار اعتماد الرئيس التنفيذي)`,
        newData: result,
      });

      setSuccessResult(result);
      if (onSuccess) onSuccess(result);
    } catch (err: any) {
      console.error('Inventory sales hook failed:', err);
      setErrorMessage(err.message || (isAr ? 'فشل تنفيذ قيد المبيعات المخزنية في الخادم' : 'Failed to execute inventory sales hook'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs" dir="rtl">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header with Deep Blue to Violet Gradient */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-900/10 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  {isAr ? 'خطاف صرف ومبيعات المخزون والقيد الرباعي الآلي' : 'Automated Inventory Sales Hook & 4-Line Matrix'}
                </h3>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  {isAr ? 'يتطلب اعتماد الرئيس التنفيذي CEO' : 'Pending CEO Approval'}
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                {isAr
                  ? 'تسجيل خروج مواد من المحجر أو المستودع وتوليد قيد الإيراد والتكلفة والمخزون والعملاء لحظياً'
                  : 'Direct dispatch generating 4-line double entry: AR, Revenue, COGS & Raw Inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successResult ? (
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {isAr ? 'تم تسجيل الصرف المخزني وتوليد القيد الرباعي بنجاح!' : 'Inventory Dispatch & Journal Matrix Created!'}
                </h4>
                <p className="mt-1 text-sm text-slate-600 font-mono">
                  {isAr ? 'رقم القيد المنشأ:' : 'Generated Journal Entry ID:'}{' '}
                  <span className="font-bold text-blue-700">{successResult.journal_entry_id}</span>
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    {isAr
                      ? 'القيد الآن بحالة (PENDING_CEO_APPROVAL) بانتظار ترحيل الرئيس التنفيذي في لوحة القيادة العليا'
                      : 'Status is PENDING_CEO_APPROVAL. Postable via Executive Admin Approvals.'}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-right">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-bold text-slate-500 block">{isAr ? 'قيمة المبيعات' : 'Revenue'}</span>
                  <span className="text-base font-black text-emerald-700 font-mono">{revenue.toLocaleString()} SAR</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-bold text-slate-500 block">{isAr ? 'تكلفة البضاعة المباعة' : 'COGS'}</span>
                  <span className="text-base font-black text-slate-800 font-mono">{cogs.toLocaleString()} SAR</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-bold text-slate-500 block">{isAr ? 'إجمالي أطراف القيد' : 'Balanced Total'}</span>
                  <span className="text-base font-black text-blue-700 font-mono">{totalBalanced.toLocaleString()} SAR</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-bold text-slate-500 block">{isAr ? 'هامش الربح' : 'Gross Margin'}</span>
                  <span className="text-base font-black text-indigo-700 font-mono">{profitMargin}%</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessResult(null);
                    onClose();
                  }}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800"
                >
                  {isAr ? 'إغلاق ومتابعة العمليات' : 'Close & Return'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Section 1: Item & Dispatch Origin */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span>{isAr ? '1. بيانات الصنف والمستودع المنصرف منه' : '1. Material & Dispatch Source'}</span>
                </h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'كود صنف المخزون *' : 'Item SKU / ID *'}
                    </label>
                    <select
                      value={itemId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemId(val);
                        const mat = materials.find((m) => m.id === val || m.nameAr === val);
                        if (mat) {
                          setCustomItemName(mat.nameAr);
                          setUnitPrice(mat.defaultSellingPrice || 40);
                          setCostPrice(mat.defaultPurchasePrice || 25);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    >
                      <option value="RAW-AGG-001">RAW-AGG-001 - بحص مدرج 3/4</option>
                      <option value="RAW-SND-002">RAW-SND-002 - رمل أحمر مغسول</option>
                      <option value="RAW-SUB-003">RAW-SUB-003 - صبيز خلطات أساس</option>
                      <option value="RAW-BLM-004">RAW-BLM-004 - بحص زيرو 3/8</option>
                      <option value="RAW-DUST-05">RAW-DUST-05 - بودرة حجر جيري</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nameAr} - {m.defaultSellingPrice} ر.س
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'المستودع / موقع المحجر *' : 'Warehouse / Quarry Source *'}
                    </label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    >
                      <option value="WH-MAIN-01">WH-MAIN-01 - الكسارة المركزية (طريق خريص)</option>
                      <option value="WH-SUMAN-02">WH-SUMAN-02 - محجر الصمان الميداني</option>
                      <option value="WH-EAST-03">WH-EAST-03 - مستودع المنطقة الشرقية</option>
                      <option value="WH-NEOM-04">WH-NEOM-04 - تشوينات مشروع نيوم</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'رقم إذن الصرف المخزني *' : 'Store Issue Voucher # *'}
                    </label>
                    <input
                      type="text"
                      value={referenceDoc}
                      onChange={(e) => setReferenceDoc(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Customer & Quantities */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>{isAr ? '2. العميل والكميات وأسعار الصرف' : '2. Customer, Quantity & Pricing'}</span>
                </h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'العميل المستلم *' : 'Target Customer *'}
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.customerName} ({c.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'مركز التكلفة *' : 'Cost Center *'}
                    </label>
                    <select
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    >
                      {costCenters.map((cc) => (
                        <option key={cc.id} value={cc.code}>
                          [{cc.code}] {cc.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'الكمية المنصرفة (طن) *' : 'Dispatched Qty (Tons) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'سعر بيع الطن للعميل (ر.س) *' : 'Sales Price / Ton (SAR) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'سعر تكلفة الطن (ر.س) *' : 'Cost Price / Ton (SAR) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'ملاحظات وتفاصيل أمر الصرف' : 'Dispatch Notes'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isAr ? 'مثال: صرف مباشر مع سيارات نقل موقع العميل' : 'Direct aggregate dispatch'}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Strictly Locked Computed Fields (Read-Only) */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    {isAr ? 'الحقول المحسوبة آلياً (مقفلة - للقراءة فقط وفق المعايير)' : 'System Locked Computed Calculations (Read-Only)'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-700">Strictly Enforced Read-Only</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isAr ? 'إجمالي قيمة المبيعات (ر.س)' : 'Total Revenue (SAR)'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${revenue.toLocaleString()} ر.س`}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-mono font-black text-emerald-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isAr ? 'إجمالي التكلفة COGS (ر.س)' : 'Total COGS (SAR)'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${cogs.toLocaleString()} ر.س`}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-mono font-black text-slate-800 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isAr ? 'صافي الربح الإجمالي (ر.س)' : 'Gross Profit (SAR)'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${grossProfit.toLocaleString()} ر.س (${profitMargin}%)`}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-mono font-black text-indigo-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isAr ? 'إجمالي القيد الرباعي المتزن' : 'Balanced Total (SAR)'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${totalBalanced.toLocaleString()} ر.س`}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-mono font-black text-blue-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Live 4-Line Double Entry Matrix Preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    {isAr ? 'معاينة القيد المحاسبي الرباعي الآلي (Double-Entry Matrix)' : '4-Line Matrix Preview'}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {isAr ? 'متزن محاسبياً 100%' : 'Balanced 100%'}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">{isAr ? 'رقم الحساب' : 'Account'}</th>
                        <th className="p-2.5">{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                        <th className="p-2.5 text-center">{isAr ? 'المدين (Debit)' : 'Debit'}</th>
                        <th className="p-2.5 text-center">{isAr ? 'الدائن (Credit)' : 'Credit'}</th>
                        <th className="p-2.5">{isAr ? 'مركز التكلفة' : 'Cost Center'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* Line 1: Accounts Receivable */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400">1</td>
                        <td className="p-2.5 font-bold text-blue-800">1200</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900">
                          {isAr ? 'العملاء والذمم المدينة (Accounts Receivable)' : 'Accounts Receivable'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-emerald-700">{revenue.toLocaleString()}</td>
                        <td className="p-2.5 text-center text-slate-300">0.00</td>
                        <td className="p-2.5 text-slate-600 font-sans">{costCenter}</td>
                      </tr>
                      {/* Line 2: Sales Revenue */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400">2</td>
                        <td className="p-2.5 font-bold text-blue-800">4100</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900">
                          {isAr ? 'إيرادات مبيعات المواد والمحاجر (Sales Revenue)' : 'Sales Revenue'}
                        </td>
                        <td className="p-2.5 text-center text-slate-300">0.00</td>
                        <td className="p-2.5 text-center font-bold text-indigo-700">{revenue.toLocaleString()}</td>
                        <td className="p-2.5 text-slate-600 font-sans">{costCenter}</td>
                      </tr>
                      {/* Line 3: Cost of Goods Sold */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400">3</td>
                        <td className="p-2.5 font-bold text-blue-800">5100</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900">
                          {isAr ? 'تكلفة البضاعة المباعة (Cost of Goods Sold)' : 'Cost of Goods Sold (COGS)'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-emerald-700">{cogs.toLocaleString()}</td>
                        <td className="p-2.5 text-center text-slate-300">0.00</td>
                        <td className="p-2.5 text-slate-600 font-sans">{costCenter}</td>
                      </tr>
                      {/* Line 4: Raw Materials Inventory */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400">4</td>
                        <td className="p-2.5 font-bold text-blue-800">1300</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900">
                          {isAr ? 'مخزون المواد الخام والمستودعات (Raw Materials Inventory)' : 'Raw Materials Inventory'}
                        </td>
                        <td className="p-2.5 text-center text-slate-300">0.00</td>
                        <td className="p-2.5 text-center font-bold text-indigo-700">{cogs.toLocaleString()}</td>
                        <td className="p-2.5 text-slate-600 font-sans">{costCenter}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-100/80 font-mono font-bold text-slate-900">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right font-sans">
                          {isAr ? 'المجموع المتزن للقيد:' : 'Total Balanced Matrix:'}
                        </td>
                        <td className="p-2.5 text-center text-emerald-700">{totalBalanced.toLocaleString()} SAR</td>
                        <td className="p-2.5 text-center text-indigo-700">{totalBalanced.toLocaleString()} SAR</td>
                        <td className="p-2.5 text-center text-emerald-600 font-sans">{isAr ? 'متزن' : 'Balanced'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-800 hover:to-indigo-900 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{isAr ? 'جارٍ الحفظ والترحيل...' : 'Processing Hook...'}</span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{isAr ? 'تنفيذ خطاف المبيعات وتوليد القيد الرباعي' : 'Execute Hook & Post Matrix'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
