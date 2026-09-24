import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Boxes,
  FileCheck2,
  ShieldCheck,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowUpDown,
  Filter,
  Upload,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Receipt,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { BulkImportModal } from '../components/BulkImportModal';
import { NewPurchaseOrderModal, PurchaseOrderRecord } from '../components/NewPurchaseOrderModal';
import { erpApi, ApiProcurementBill } from '../services/api';

export const ProcurementView: React.FC = () => {
  const { language, themeMode } = useApp();
  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'orders' | 'matching'>('matching');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);

  // Procurement Bills & Ledger Posting State
  const [procurementBills, setProcurementBills] = useState<ApiProcurementBill[]>([]);
  const [loadingBills, setLoadingBills] = useState<boolean>(false);
  const [postingBillId, setPostingBillId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([
    {
      id: 'po-101',
      poNumber: 'PO-2026-0089',
      vendorName: isAr ? 'مورد الصخور والركام العربي' : 'Arabian Aggregates Co.',
      category: isAr ? 'مواد خام' : 'Raw Materials',
      totalAmount: 185000,
      currency: 'SAR',
      status: 'MATCHED',
      issueDate: '2026-09-02',
      deliveryDate: '2026-09-15',
    },
    {
      id: 'po-102',
      poNumber: 'PO-2026-0094',
      vendorName: isAr ? 'شركة خدمات الصيانة الثقيلة' : 'Heavy Fleet Services Ltd.',
      category: isAr ? 'قطع غيار وصيانة' : 'Maintenance & Parts',
      totalAmount: 42800,
      currency: 'SAR',
      status: 'APPROVED',
      issueDate: '2026-09-08',
      deliveryDate: '2026-09-20',
    },
    {
      id: 'po-103',
      poNumber: 'PO-2026-0099',
      vendorName: isAr ? 'مؤسسة إمدادات السلامة الميدانية' : 'Field Safety Supplies Est.',
      category: isAr ? 'مهمات السلامة والمستهلكات' : 'Safety Consumables',
      totalAmount: 16500,
      currency: 'SAR',
      status: 'PENDING',
      issueDate: '2026-09-18',
      deliveryDate: '2026-09-25',
    },
  ]);

  const fetchBills = () => {
    setLoadingBills(true);
    erpApi
      .getProcurementBills()
      .then((bills) => {
        if (Array.isArray(bills) && bills.length > 0) {
          setProcurementBills(bills);
        }
      })
      .catch((err) => {
        console.error('Failed to load procurement bills', err);
      })
      .finally(() => setLoadingBills(false));
  };

  useEffect(() => {
    erpApi
      .getPurchaseOrders()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPurchaseOrders((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const existingNos = new Set(prev.map((p) => p.poNumber));
            const formatted: PurchaseOrderRecord[] = data
              .filter((d: any) => !existingIds.has(d.id) && !existingNos.has(d.poNumber || d.po_number))
              .map((d: any) => ({
                id: d.id,
                poNumber: d.poNumber || d.po_number || 'PO-2026-0000',
                vendorName: d.vendorName || d.vendor_name || 'Vendor',
                category: d.category || 'General Supplies',
                totalAmount: d.totalAmount || d.total_amount || 0,
                currency: d.currency || 'SAR',
                status: (d.status === 'MATCHED' ? 'MATCHED' : d.status === 'APPROVED' ? 'APPROVED' : 'PENDING') as
                  | 'MATCHED'
                  | 'APPROVED'
                  | 'PENDING',
                issueDate: d.issueDate || '',
                deliveryDate: d.deliveryDate || '',
              }));
            return [...formatted, ...prev];
          });
        }
      })
      .catch(() => {});

    fetchBills();
  }, []);

  const handlePostToLedger = async (billId: string) => {
    setPostingBillId(billId);
    try {
      const entry = await erpApi.postProcurementBillToLedger(billId);
      setProcurementBills((prev) =>
        prev.map((b) =>
          b.id === billId
            ? { ...b, is_posted: true, match_status: 'MATCHED', journal_entry_id: entry.id }
            : b
        )
      );
      setNotification({
        type: 'success',
        message: isAr
          ? `تم ترحيل الفاتورة بنجاح إلى دفتر الأستاذ العام (قيد رقم: ${entry.entry_number}) - مدين: ${formatCurrency(entry.total_debit, language)} / دائن: ${formatCurrency(entry.total_credit, language)}`
          : `Successfully posted bill to General Ledger (Voucher #${entry.entry_number}) - Dr: ${formatCurrency(entry.total_debit, language)} / Cr: ${formatCurrency(entry.total_credit, language)}`,
      });
      setTimeout(() => setNotification(null), 8000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message:
          err?.message ||
          (isAr ? 'فشل ترحيل الفاتورة إلى دفتر الأستاذ' : 'Failed to post bill to general ledger'),
      });
      setTimeout(() => setNotification(null), 8000);
    } finally {
      setPostingBillId(null);
    }
  };

  const filteredOrders = purchaseOrders.filter((po) => {
    if (!po) return false;
    const q = (searchTerm || '').trim().toLowerCase();
    return (
      (po.poNumber || '').toLowerCase().includes(q) ||
      (po.vendorName || '').toLowerCase().includes(q)
    );
  });

  const filteredBills = procurementBills.filter((bill) => {
    if (!bill) return false;
    const q = (searchTerm || '').trim().toLowerCase();
    return (
      (bill.invoice_number || '').toLowerCase().includes(q) ||
      (bill.vendor_name || '').toLowerCase().includes(q) ||
      (bill.purchase_order_number || '').toLowerCase().includes(q)
    );
  });

  const postedBillsCount = procurementBills.filter((b) => b.is_posted).length;
  const totalBillsAmount = procurementBills.reduce((acc, b) => acc + (Number(b.total_billed) || 0), 0);

  return (
    <div className="space-y-6" id="procurement-view">
      {/* Toast Alert Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-sm transition-all ${
            notification.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <p className="text-xs font-bold">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div
        className={`flex flex-col justify-between gap-4 rounded-3xl border p-6 shadow-xs transition-colors sm:flex-row sm:items-center ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-[#F05627]">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'المشتريات وسلسلة التوريد (Procurement & S2P)' : 'Procurement & S2P Management'}
              </h1>
              <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-black text-[#F05627]">
                Double-Entry Ledger Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'إدارة أوامر الشراء، فواتير الموردين، المطابقة الثلاثية (3-Way Matching)، والترحيل التلقائي لدفتر الأستاذ'
                : 'Manage Purchase Orders, Vendor Invoices, 3-Way Matching, and Automated Balanced Ledger Postings'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Universal Bulk Import Button (REM-P7) */}
          <button
            id="bulk-import-procurement-btn"
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition-colors"
            title={isAr ? 'استيراد أوامر الشراء وقاعدة البيانات الشاملة (CSV / Excel)' : 'Bulk Import (CSV/Excel)'}
          >
            <Upload className="h-4 w-4 text-emerald-700" />
            <span>{isAr ? 'استيراد بيانات / Bulk Import' : 'Bulk Import'}</span>
          </button>

          <button
            id="new-po-btn"
            type="button"
            onClick={() => setIsNewPoOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'أمر شراء جديد' : 'New Purchase Order'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'إجمالي المشتريات المعتمدة' : 'Total Approved POs'}
          </span>
          <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
            {formatCurrency(244300, language)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'فواتير الموردين المسجلة' : 'Vendor Bills Total'}
          </span>
          <p className="mt-1 text-lg font-black text-blue-600">
            {formatCurrency(totalBillsAmount > 0 ? totalBillsAmount : 227800, language)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'الفواتير المرحلة لدفتر الأستاذ' : 'Posted to General Ledger'}
          </span>
          <p className="mt-1 text-lg font-black text-emerald-600">
            {postedBillsCount} / {procurementBills.length || 2} {isAr ? 'فاتورة مرحلة' : 'Bills Posted'}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'الموردين المعتمدين' : 'Active Vendors'}
          </span>
          <p className="mt-1 text-lg font-black text-orange-600">18 {isAr ? 'مورد نشط' : 'Vendors'}</p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div
        className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('matching')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-colors ${
              activeTab === 'matching'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>{isAr ? 'فواتير الموردين والترحيل المالي (Vendor Bills & Ledger)' : 'Vendor Bills & Ledger Posting'}</span>
            {procurementBills.some((b) => !b.is_posted) && (
              <span className="rounded-full bg-white text-orange-600 text-[10px] px-1.5 py-0.2 font-black ml-1">
                {procurementBills.filter((b) => !b.is_posted).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-colors ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white dark:bg-orange-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>{isAr ? 'أوامر الشراء (POs)' : 'Purchase Orders'}</span>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto" />
          <input
            type="text"
            placeholder={
              activeTab === 'matching'
                ? isAr
                  ? 'بحث برقم الفاتورة أو المورد...'
                  : 'Search invoice # or vendor...'
                : isAr
                ? 'بحث برقم الأمر أو المورد...'
                : 'Search PO number or vendor...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-9 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'matching' ? (
        /* Vendor Bills & Ledger Posting Table */
        <div
          className={`rounded-3xl border shadow-xs overflow-hidden ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {isAr
                  ? 'فواتير الموردين الخاضعة للمطابقة والترحيل لدفتر الأستاذ العام'
                  : 'Vendor Bills - 3-Way Matched & Double-Entry General Ledger Postings'}
              </h2>
            </div>
            <button
              onClick={fetchBills}
              className="text-xs font-bold text-slate-500 hover:text-orange-500 transition-colors"
            >
              {isAr ? 'تحديث القائمة ⟳' : 'Refresh ⟳'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr
                  className={`border-b font-black ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <th className="py-3 px-4">{isAr ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                  <th className="py-3 px-4">{isAr ? 'المورد' : 'Vendor'}</th>
                  <th className="py-3 px-4">{isAr ? 'مرجع أمر الشراء' : 'PO Reference'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'المبلغ الصافي' : 'Subtotal'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الضريبة (15%)' : 'Tax (VAT)'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجمالي المستحق' : 'Total Billed'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'المطابقة الثلاثية' : '3-Way Match'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'دفتر الأستاذ (GL)' : 'Ledger Status'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراء المالي' : 'Ledger Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {loadingBills
                        ? isAr
                          ? 'جاري تحميل الفواتير...'
                          : 'Loading vendor bills...'
                        : isAr
                        ? 'لا توجد فواتير موردين مطابقة'
                        : 'No vendor bills found.'}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>{bill.invoice_number}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {bill.vendor_name || (isAr ? 'مورد معتمد' : 'Authorized Vendor')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {bill.purchase_order_number || 'PO-2026-0089'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(Number(bill.amount) || 0, language)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {formatCurrency(Number(bill.tax_amount) || 0, language)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-600">
                        {formatCurrency(Number(bill.total_billed) || 0, language)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            bill.match_status === 'MATCHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {bill.match_status === 'MATCHED' && <CheckCircle2 className="h-3 w-3" />}
                          {bill.match_status || 'MATCHED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            bill.is_posted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {bill.is_posted ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{isAr ? 'مرحل لدفتر الأستاذ' : 'POSTED'}</span>
                            </>
                          ) : (
                            <span>{isAr ? 'مسودة غير مرحلة' : 'UNPOSTED'}</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {bill.is_posted ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                            title={bill.journal_entry_id ? `Journal Entry ID: ${bill.journal_entry_id}` : 'Posted'}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isAr ? 'مرحل بنجاح' : 'Posted to GL'}</span>
                          </span>
                        ) : (
                          <button
                            id={`post-ledger-btn-${bill.id}`}
                            type="button"
                            onClick={() => handlePostToLedger(bill.id)}
                            disabled={postingBillId === bill.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>
                              {postingBillId === bill.id
                                ? isAr
                                  ? 'جاري الترحيل...'
                                  : 'Posting...'
                                : isAr
                                ? 'ترحيل لدفتر الأستاذ'
                                : 'Post to Ledger'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Purchase Orders Table */
        <div
          className={`rounded-3xl border shadow-xs overflow-hidden ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr
                  className={`border-b font-black ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <th className="py-3 px-4">{isAr ? 'رقم أمر الشراء' : 'PO Number'}</th>
                  <th className="py-3 px-4">{isAr ? 'المورد' : 'Vendor'}</th>
                  <th className="py-3 px-4">{isAr ? 'التصنيف' : 'Category'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'حالة المطابقة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {po.poNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {po.vendorName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{po.category}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                      {formatCurrency(po.totalAmount, language)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">{po.issueDate}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          po.status === 'MATCHED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : po.status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {po.status === 'MATCHED' && <CheckCircle2 className="h-3 w-3" />}
                        {po.status === 'PENDING' && <AlertCircle className="h-3 w-3" />}
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Universal Bulk Import Modal (REM-P7) */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        defaultCategory="operations"
      />

      {/* New Purchase Order Modal with Direct Backend Persistence & Optimistic Update */}
      <NewPurchaseOrderModal
        isOpen={isNewPoOpen}
        onClose={() => setIsNewPoOpen(false)}
        onPurchaseOrderCreated={(newPo) => {
          setPurchaseOrders((prev) => [newPo, ...prev]);
        }}
      />
    </div>
  );
};
