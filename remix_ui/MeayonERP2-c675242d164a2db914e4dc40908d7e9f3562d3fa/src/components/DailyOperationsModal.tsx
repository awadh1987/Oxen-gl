import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { OperationRecord, DocumentAttachment } from '../types';
import {
  X,
  Plus,
  Scale,
  Calendar,
  Truck,
  Building,
  UserCheck,
  Package,
  Receipt,
  FileText,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Paperclip,
  Calculator,
  Hash,
  Coins,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatTonnage, getMonthName } from '../utils/formatters';
import { QuickAddEntityModal, QuickAddEntityType } from './QuickAddEntityModal';
import { MultiAttachmentModal } from './MultiAttachmentModal';
import { apiService } from '../services/api';

interface DailyOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: OperationRecord | null;
}

export const DailyOperationsModal: React.FC<DailyOperationsModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const {
    operations,
    customers,
    crushers,
    transporters,
    materials,
    addOperation,
    updateOperation,
    language,
    currentUser,
    canAccessFinancials,
  } = useApp();

  const isAr = language === 'ar';

  // 1. User Input Fields State
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [truckNo, setTruckNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [loadingSource, setLoadingSource] = useState('');
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState('');
  const [destinationCustomer, setDestinationCustomer] = useState('');
  const [receiptInvoiceNo, setReceiptInvoiceNo] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [qtyLoaded, setQtyLoaded] = useState<number | ''>(42.5);
  const [qtyDelivered, setQtyDelivered] = useState<number | ''>(42.0);
  const [scaleTicketNo, setScaleTicketNo] = useState('');
  const [salesAmountInput, setSalesAmountInput] = useState<number | ''>(1848.0);
  const [crusherPurchaseCostInput, setCrusherPurchaseCostInput] = useState<number | ''>(1062.5);
  const [crusherPaymentInput, setCrusherPaymentInput] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [scaleTicketAttachment, setScaleTicketAttachment] = useState('');

  // Unit prices helpers for smart auto-filling
  const [sellingUnitPrice, setSellingUnitPrice] = useState<number>(44);
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<number>(25);

  // Quick Add Modal State
  const [quickAddType, setQuickAddType] = useState<QuickAddEntityType | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // Trip ID (Auto-incremented unique reference)
  const tripId = useMemo(() => {
    if (initialData) return initialData.id;
    const nextSeq = 1001 + operations.length;
    return `TRP-${nextSeq}`;
  }, [initialData, operations.length]);

  // Pre-fill defaults or edit data
  useEffect(() => {
    if (initialData) {
      setLoadingDate(initialData.loading_date);
      setTruckNo(initialData.truck_no);
      setTransporterName(initialData.transporter_name);
      setLoadingSource(initialData.loading_source);
      setLoadingInvoiceNo(initialData.loading_invoice_no);
      setDestinationCustomer(initialData.destination_customer);
      setReceiptInvoiceNo(initialData.receipt_invoice_no);
      setMaterialType(initialData.material_type);
      setQtyLoaded(initialData.qty_loaded);
      setQtyDelivered(initialData.qty_delivered);
      setScaleTicketNo(initialData.scale_ticket_no);
      setSalesAmountInput(initialData.sales_amount);
      setCrusherPurchaseCostInput(initialData.purchases_cost);
      setCrusherPaymentInput(initialData.crusher_payment ?? 0);
      setNotes(initialData.notes || '');
      setScaleTicketAttachment(initialData.scale_ticket_attachment || '');
      setAttachments(initialData.attachments || []);
    } else {
      // Set sensible initial defaults
      if (customers.length > 0) setDestinationCustomer(customers[0].customerName);
      if (crushers.length > 0) setLoadingSource(crushers[0].crusherName);
      if (transporters.length > 0) {
        setTransporterName(transporters[0].transporterName);
        if (transporters[0].defaultTruckNo) setTruckNo(transporters[0].defaultTruckNo);
      }
      if (materials.length > 0) {
        setMaterialType(materials[0].nameAr);
        setSellingUnitPrice(materials[0].defaultSellingPrice);
        setPurchaseUnitPrice(materials[0].defaultPurchasePrice);
        const initLoaded = 42.5;
        const initDelivered = 42.0;
        setQtyLoaded(initLoaded);
        setQtyDelivered(initDelivered);
        setSalesAmountInput(Number((initDelivered * materials[0].defaultSellingPrice).toFixed(2)));
        setCrusherPurchaseCostInput(Number((initLoaded * materials[0].defaultPurchasePrice).toFixed(2)));
      }
      const randomTicket = `ST-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const randomCR = `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const randomREC = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setScaleTicketNo(randomTicket);
      setLoadingInvoiceNo(randomCR);
      setReceiptInvoiceNo(randomREC);
      setCrusherPaymentInput(0);
      setScaleTicketAttachment('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80');
      setAttachments([
        {
          id: 'att-init-1',
          fileName: 'Scale_Ticket_Scan.pdf',
          fileSize: '1.2 MB',
          fileType: 'application/pdf',
          docCategory: 'Scale Ticket',
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.fullName || 'Admin',
          fileData: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
        },
      ]);
    }
  }, [initialData, isOpen, customers, crushers, transporters, materials, currentUser]);

  // Sync unit prices and auto-calculate default amounts when material changes
  const handleMaterialChange = (matName: string) => {
    setMaterialType(matName);
    const found = materials.find((m) => m.nameAr === matName || m.nameEn === matName);
    if (found) {
      setSellingUnitPrice(found.defaultSellingPrice);
      setPurchaseUnitPrice(found.defaultPurchasePrice);
      const del = Number(qtyDelivered) || 0;
      const load = Number(qtyLoaded) || 0;
      setSalesAmountInput(Number((del * found.defaultSellingPrice).toFixed(2)));
      setCrusherPurchaseCostInput(Number((load * found.defaultPurchasePrice).toFixed(2)));
    }
  };

  // Sync default truck when transporter changes
  const handleTransporterChange = (tName: string) => {
    setTransporterName(tName);
    const found = transporters.find((t) => t.transporterName === tName);
    if (found && found.defaultTruckNo) {
      setTruckNo(found.defaultTruckNo);
    }
  };

  // Handle Quick Add Success
  const handleQuickAddSuccess = (createdName: string, id: string) => {
    if (quickAddType === 'Customer') {
      setDestinationCustomer(createdName);
    } else if (quickAddType === 'Crusher') {
      setLoadingSource(createdName);
    } else if (quickAddType === 'Transporter') {
      setTransporterName(createdName);
    } else if (quickAddType === 'Material') {
      handleMaterialChange(createdName);
    }
  };

  // 2. Real-Time Dynamic Auto-Calculated Fields
  const numLoaded = Number(qtyLoaded) || 0;
  const numDelivered = Number(qtyDelivered) || 0;

  // الفاقد - طن = Loaded Weight - Received Weight (if > 0, else 0)
  const qtyWastage = Number(Math.max(0, numLoaded - numDelivered).toFixed(2));

  // نسبة الفاقد % = (Wastage Tonnage / Loaded Weight) * 100
  const wastagePercentage = numLoaded > 0 ? Number(((qtyWastage / numLoaded) * 100).toFixed(2)) : 0;

  // قيمة المبيعات بدون ضريبة
  const salesAmount = Number(salesAmountInput) || 0;

  // ضريبة القيمة المضافة 15% = Sales Amount * 0.15
  const vatAmount = Number((salesAmount * 0.15).toFixed(2));

  // إجمالي المبيعات = Sales Amount + VAT
  const totalSales = Number((salesAmount + vatAmount).toFixed(2));

  // تكلفة الشراء من الكسارة
  const purchasesCost = Number(crusherPurchaseCostInput) || 0;

  // صافي الربح التشغيلي = Sales Amount - Crusher Purchase Cost
  const netProfit = Number((salesAmount - purchasesCost).toFixed(2));

  // المسدد للكسارة
  const paidToCrusher = Number(crusherPaymentInput) || 0;

  // الشهر: Extracted automatically from Loading Date
  const dateObj = useMemo(() => new Date(loadingDate || new Date().toISOString().slice(0, 10)), [loadingDate]);
  const opMonth = dateObj.getMonth() + 1;
  const opYear = dateObj.getFullYear();
  const monthLabel = getMonthName(opMonth, language);

  const isExcessLoss = wastagePercentage > 2.0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!truckNo || !transporterName || !destinationCustomer || !loadingSource) {
      alert(isAr ? 'يرجى تعبئة كافة الحقول الإلزامية المطلوبة' : 'Please fill all required fields');
      return;
    }

    const payload = {
      loading_date: loadingDate,
      truck_no: truckNo,
      transporter_name: transporterName,
      loading_source: loadingSource,
      loading_invoice_no: loadingInvoiceNo || `CR-${opYear}-${Math.floor(1000 + Math.random() * 9000)}`,
      destination_customer: destinationCustomer,
      receipt_invoice_no: receiptInvoiceNo || `REC-${opYear}-${Math.floor(1000 + Math.random() * 9000)}`,
      material_type: materialType,
      qty_loaded: numLoaded,
      qty_delivered: numDelivered,
      qty_wastage: qtyWastage,
      wastage_percentage: wastagePercentage,
      scale_ticket_no: scaleTicketNo || `ST-${Math.floor(100000 + Math.random() * 900000)}`,
      sales_amount: salesAmount,
      vat_amount: vatAmount,
      total_sales: totalSales,
      purchases_cost: purchasesCost,
      crusher_payment: paidToCrusher,
      net_profit: netProfit,
      operation_month: opMonth,
      operation_year: opYear,
      notes: notes,
      scale_ticket_attachment: scaleTicketAttachment,
      attachments: attachments,
    };

    if (initialData) {
      updateOperation(initialData.id, payload);
    } else {
      const customer = customers.find((item) => item.customerName === destinationCustomer || item.customerNameEn === destinationCustomer);
      const transporter = transporters.find((item) => item.transporterName === transporterName || item.transporterNameEn === transporterName);
      const invoiceNumber = receiptInvoiceNo || `INV-${opYear}-${String(Date.now()).slice(-8)}`;
      const voucherNumber = `PV-${opYear}-${String(opMonth).padStart(2, '0')}-${String(Date.now()).slice(-6)}`;

      try {
        await apiService.createOperationToJournal({
          transporter_id: transporter?.id || transporterName,
          route: `${loadingSource} -> ${destinationCustomer}`,
          amount: totalSales,
          client_name: destinationCustomer,
          customer_id: customer?.id || destinationCustomer,
          customer_name: destinationCustomer,
          invoice_number: invoiceNumber,
          voucher_type: 'Payment',
          beneficiary: loadingSource,
          voucher_number: voucherNumber,
          description: notes || `Operation ${tripId} for ${materialType}`,
        });
      } catch (error) {
        alert(error instanceof Error ? error.message : (isAr ? 'تعذر حفظ العملية في الخادم.' : 'Could not save the operation on the server.'));
        return;
      }
      addOperation(payload);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div
        id="daily-operations-modal"
        className="relative my-6 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-200">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {initialData
                    ? isAr
                      ? 'تعديل قيد عملية تشغيلية'
                      : 'Edit Daily Operation Entry'
                    : isAr
                    ? 'تسجيل رحلة جديدة (قيد العمليات اليومية)'
                    : 'Add New Trip (Daily Operations Entry)'}
                </h2>
                <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[11px] font-black text-orange-700">
                  {tripId}
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {isAr ? `شهر ${opMonth} (${monthLabel})` : `Month: ${monthLabel}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'بوابة إدخال ومطابقة بيانات النقل اليومية، أوزان البسكول، واحتساب الفاقد وهوامش الربح آلياً'
                  : 'Daily haulage data entry portal mirroring official operations log with live calculations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Auto-Calculated Metrics Bar (Real-Time Summary) */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-slate-50 p-3 sm:grid-cols-5">
          <div className="rounded-xl border border-white/80 bg-white/90 p-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block">
              {isAr ? 'الفاقد (طن)' : 'Wastage (Tons)'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xs font-black ${qtyWastage > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {qtyWastage.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">{isAr ? 'طن' : 't'}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/90 p-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block">
              {isAr ? 'نسبة الفاقد %' : 'Wastage %'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xs font-black ${isExcessLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                {wastagePercentage}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/90 p-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block">
              {isAr ? 'ضريبة القيمة المضافة 15%' : 'VAT 15%'}
            </span>
            <div className="text-xs font-black text-orange-950 font-mono mt-0.5">
              {formatCurrency(vatAmount, language)}
            </div>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/90 p-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block">
              {isAr ? 'إجمالي المبيعات' : 'Total Sales'}
            </span>
            <div className="text-xs font-black text-neutral-950 font-mono mt-0.5">
              {formatCurrency(totalSales, language)}
            </div>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/90 p-2 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 block">
              {isAr ? 'صافي الربح التشغيلي' : 'Operating Profit'}
            </span>
            <div className={`text-xs font-black font-mono mt-0.5 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(netProfit, language)}
            </div>
          </div>
        </div>

        {/* Main Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Group 1: Logistics & Identification */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5 space-y-3">
            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-orange-600" />
              <span>{isAr ? 'بيانات الشاحنة والناقل وتاريخ التحميل' : 'Logistics, Transporter & Date'}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. تاريخ التحميل */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'تاريخ التحميل *' : 'Loading Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={loadingDate}
                  onChange={(e) => setLoadingDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 2. رقم الشاحنة */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'رقم الشاحنة *' : 'Truck Number *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 7842-ق أ د"
                  value={truckNo}
                  onChange={(e) => setTruckNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 3. اسم الناقل - المقاول */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isAr ? 'اسم الناقل - المقاول *' : 'Transporter Name *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('Transporter')}
                    title={isAr ? 'إضافة ناقل جديد سريعاً' : 'Quick add transporter'}
                    className="flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>{isAr ? 'جديد' : 'New'}</span>
                  </button>
                </div>
                <select
                  required
                  value={transporterName}
                  onChange={(e) => handleTransporterChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
                >
                  {transporters.map((t) => (
                    <option key={t.id} value={t.transporterName}>
                      {t.transporterName} ({t.driverName})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. رقم تذكرة الميزان */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'رقم تذكرة الميزان *' : 'Scale Ticket Number *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ST-2026-XXXXXX"
                  value={scaleTicketNo}
                  onChange={(e) => setScaleTicketNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Crusher Source, Invoices & Customer Destination */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5 space-y-3">
            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-orange-600" />
              <span>{isAr ? 'أطراف العملية وفواتير التحميل والاستلام' : 'Parties & Commercial Invoices'}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* 5. مصدر التحميل - الكسارة */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isAr ? 'مصدر التحميل - الكسارة *' : 'Crusher/Loading Source *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('Crusher')}
                    title={isAr ? 'إضافة كسارة جديدة سريعاً' : 'Quick add crusher'}
                    className="flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>{isAr ? 'جديد' : 'New'}</span>
                  </button>
                </div>
                <select
                  required
                  value={loadingSource}
                  onChange={(e) => setLoadingSource(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
                >
                  {crushers.map((c) => (
                    <option key={c.id} value={c.crusherName}>
                      {c.crusherName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. رقم فاتورة التحميل */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'رقم فاتورة التحميل' : 'Loading Invoice Number'}
                </label>
                <input
                  type="text"
                  placeholder="CR-2026-XXXX"
                  value={loadingInvoiceNo}
                  onChange={(e) => setLoadingInvoiceNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 7. العميل المستلم */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isAr ? 'العميل المستلم *' : 'Receiving Customer *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('Customer')}
                    title={isAr ? 'إضافة عميل جديد سريعاً' : 'Quick add client'}
                    className="flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>{isAr ? 'جديد' : 'New'}</span>
                  </button>
                </div>
                <select
                  required
                  value={destinationCustomer}
                  onChange={(e) => setDestinationCustomer(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
                >
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.customerName}>
                      {cust.customerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8. رقم فاتورة الاستلام */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'رقم فاتورة الاستلام' : 'Receipt Invoice Number'}
                </label>
                <input
                  type="text"
                  placeholder="REC-2026-XXXX"
                  value={receiptInvoiceNo}
                  onChange={(e) => setReceiptInvoiceNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group 3: Material & Scale Weights */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3.5 space-y-3">
            <div className="text-xs font-black text-orange-950 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-orange-600" />
                <span>{isAr ? 'نوع المادة وأوزان الميزان (بسكول طن)' : 'Material & Weighbridge Weights'}</span>
              </div>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                {isAr ? 'حساب الفاقد ونسبته آلياً' : 'Auto Wastage Calculation'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* 9. نوع المادة */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isAr ? 'نوع المادة *' : 'Material Type *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('Material')}
                    title={isAr ? 'إضافة مادة جديدة' : 'Quick add material'}
                    className="flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800 hover:bg-orange-200 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>{isAr ? 'جديد' : 'New'}</span>
                  </button>
                </div>
                <select
                  required
                  value={materialType}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.nameAr}>
                      {m.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 10. الوزن المحمل - طن */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'الوزن المحمل - طن *' : 'Loaded Weight (Tons) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={qtyLoaded}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setQtyLoaded(val);
                    if (val !== '' && purchaseUnitPrice > 0) {
                      setCrusherPurchaseCostInput(Number((val * purchaseUnitPrice).toFixed(2)));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 11. الوزن المستلم - طن */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'الوزن المستلم - طن *' : 'Received Weight (Tons) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={qtyDelivered}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setQtyDelivered(val);
                    if (val !== '' && sellingUnitPrice > 0) {
                      setSalesAmountInput(Number((val * sellingUnitPrice).toFixed(2)));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group 4: Financial Valuation (Sales, Purchase Cost & Paid to Crusher) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5 space-y-3">
            <div className="text-xs font-black text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-orange-600" />
                <span>{isAr ? 'القيم المالية، التكاليف والمبيعات' : 'Financial Values & Costs'}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                {isAr ? 'سعر الطن الافتراضي بيع/شراء: ' : 'Rates: '}
                <span className="font-bold text-slate-700">{sellingUnitPrice} / {purchaseUnitPrice} ر.س</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* 12. قيمة المبيعات بدون ضريبة */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'قيمة المبيعات بدون ضريبة (ر.س) *' : 'Sales Amount Excl. VAT (SAR) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={salesAmountInput}
                  onChange={(e) => setSalesAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-orange-950 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 13. تكلفة الشراء من الكسارة */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'تكلفة الشراء من الكسارة (ر.س) *' : 'Crusher Purchase Cost (SAR) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={crusherPurchaseCostInput}
                  onChange={(e) => setCrusherPurchaseCostInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 14. المسدد للكسارة */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'المسدد للكسارة (ر.س)' : 'Paid to Crusher (SAR)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={crusherPaymentInput}
                  onChange={(e) => setCrusherPaymentInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group 5: 15. ملاحظات (Notes) & Attachments */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {isAr ? 'ملاحظات وتفاصيل إضافية' : 'Notes & Additional Remarks'}
              </label>
              <textarea
                rows={3}
                placeholder={isAr ? 'أدخل أي ملاحظات خاصة بالسائق أو جودة المادة أو موقع التفريغ...' : 'Enter any notes about driver, material quality, or site conditions...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {isAr ? 'المستندات والمرفقات الثبوتية' : 'Supporting Attachments'}
                </span>
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                  {attachments.length} {isAr ? 'مرفق' : 'files'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isAr
                  ? 'إرفاق صورة تذكرة الميزان، بوليصة الشحن، أو إشعار الاستلام المعتمد'
                  : 'Attach weighbridge scale slip, bill of lading, or receipt stamp'}
              </p>
              <button
                type="button"
                onClick={() => setIsAttachmentModalOpen(true)}
                className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 shadow-2xs hover:bg-orange-50 transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>{isAr ? 'إدارة المرفقات والمسح الضوئي' : 'Manage Attachments'}</span>
              </button>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-2 text-xs font-black text-white shadow-md shadow-orange-200 hover:opacity-95 transition-opacity"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {initialData
                  ? isAr
                    ? 'حفظ التعديلات'
                    : 'Save Changes'
                  : isAr
                  ? 'تسجيل وقيد الرحلة'
                  : 'Register Trip Entry'}
              </span>
            </button>
          </div>
        </form>

        {/* Quick Add Sub-Modal */}
        <QuickAddEntityModal
          isOpen={!!quickAddType}
          onClose={() => setQuickAddType(null)}
          entityType={quickAddType}
          onSuccess={handleQuickAddSuccess}
        />

        {/* Multi-Attachment Sub-Modal */}
        <MultiAttachmentModal
          isOpen={isAttachmentModalOpen}
          onClose={() => setIsAttachmentModalOpen(false)}
          title={isAr ? 'تذكرة ميزان وقيد عمليات' : 'Scale & Haulage Record'}
          recordType="Operation"
          recordId={initialData?.id || 'new-operation'}
          existingAttachments={attachments}
          onAddAttachment={(newAtt) => {
            const enriched = {
              ...newAtt,
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              uploadedAt: new Date().toISOString(),
              uploadedBy: currentUser.fullNameAr || currentUser.fullName,
            } as DocumentAttachment;
            setAttachments((prev) => [...prev, enriched]);
          }}
          onDeleteAttachment={(attId) => setAttachments((prev) => prev.filter((a) => a.id !== attId))}
        />
      </div>
    </div>
  );
};
