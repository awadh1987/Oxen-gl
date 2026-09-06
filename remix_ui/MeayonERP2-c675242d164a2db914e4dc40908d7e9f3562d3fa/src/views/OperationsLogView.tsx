import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { OperationRecord } from '../types';
import {
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  Trash2,
  Edit,
  Eye,
  Truck,
  AlertTriangle,
  Printer,
  Paperclip,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTonnage } from '../utils/formatters';
import { exportOperationsToExcel } from '../utils/excelExporter';
import { DailyOperationsModal } from '../components/DailyOperationsModal';
import { ScaleTicketViewerModal } from '../components/ScaleTicketViewerModal';
import { MultiAttachmentModal } from '../components/MultiAttachmentModal';
import { ExportPrintModal } from '../components/ExportPrintModal';

export const OperationsLogView: React.FC = () => {
  const {
    accessibleOperations,
    deleteOperation,
    language,
    canEditOperations,
    canDeleteRecords,
    canAccessFinancials,
    customers,
    crushers,
    transporters,
    materials,
    isDriverMode,
    exportDailyOperationsSnapshotJSON,
  } = useApp();

  const isAr = language === 'ar';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCrusher, setSelectedCrusher] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [filterExcessLoss, setFilterExcessLoss] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<OperationRecord | null>(null);
  const [previewTicketOperation, setPreviewTicketOperation] = useState<OperationRecord | null>(null);
  const [attachmentViewingOp, setAttachmentViewingOp] = useState<OperationRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filtered dataset
  const filteredOperations = useMemo(() => {
    return accessibleOperations.filter((op) => {
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          op.truck_no.toLowerCase().includes(q) ||
          op.scale_ticket_no.toLowerCase().includes(q) ||
          op.loading_invoice_no.toLowerCase().includes(q) ||
          op.receipt_invoice_no.toLowerCase().includes(q) ||
          op.destination_customer.toLowerCase().includes(q) ||
          op.transporter_name.toLowerCase().includes(q) ||
          op.loading_source.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedCustomer && !op.destination_customer.includes(selectedCustomer)) return false;
      if (selectedCrusher && !op.loading_source.includes(selectedCrusher)) return false;
      if (selectedTransporter && !op.transporter_name.includes(selectedTransporter)) return false;
      if (selectedMaterial && op.material_type !== selectedMaterial) return false;
      if (selectedMonth !== 'ALL' && op.operation_month !== Number(selectedMonth)) return false;
      if (filterExcessLoss && op.wastage_percentage <= 2.0) return false;

      return true;
    });
  }, [
    accessibleOperations,
    searchTerm,
    selectedCustomer,
    selectedCrusher,
    selectedTransporter,
    selectedMaterial,
    selectedMonth,
    filterExcessLoss,
  ]);

  // إعادة الصفحة إلى الأولى تلقائياً عند تغيير أي فلتر
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCustomer,
    selectedCrusher,
    selectedTransporter,
    selectedMaterial,
    selectedMonth,
    filterExcessLoss,
  ]);

  const totalPages = Math.ceil(filteredOperations.length / pageSize) || 1;
  const paginatedOperations = filteredOperations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Aggregate statistics for current view
  const currentTotalLoaded = filteredOperations.reduce((acc, c) => acc + c.qty_loaded, 0);
  const currentTotalDelivered = filteredOperations.reduce((acc, c) => acc + c.qty_delivered, 0);
  const currentTotalWastage = filteredOperations.reduce((acc, c) => acc + c.qty_wastage, 0);

  const handleDelete = (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف هذا السجل التشغيلي؟' : 'Delete this haulage record?')) {
      deleteOperation(id);
    }
  };

  const handleExportExcel = () => {
    exportOperationsToExcel(filteredOperations, `Meayon_Operations_Log_${selectedMonth}`);
  };

  const handleExportJSONSnapshot = () => {
    exportDailyOperationsSnapshotJSON();
  };

  return (
    <div className="space-y-5" id="operations-log-view" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-neutral-900">
              {isAr ? 'قيد العمليات اليومية' : 'Daily Operations Entry Portal'}
            </h1>
            <span className="rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-bold text-[#F05627]">
              {filteredOperations.length} {isAr ? 'رحلة مسجلة' : 'trips'}
            </span>
            {isDriverMode && (
              <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-black text-amber-900 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-amber-700" />
                <span>{isAr ? 'وضع السائقين نشط' : 'Driver View Active'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {isAr
              ? 'بوابة تسجيل ومطابقة الحمولات اليومية، أوزان تذاكر الميزان (بسكول)، وحساب الفاقد وهوامش الربحية آلياً'
              : 'Official daily operations log mirroring Excel dispatch sheets, weighbridge verification, and live margin calculation'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* JSON Data Snapshot Export Button */}
          <button
            id="export-json-snapshot-btn"
            onClick={handleExportJSONSnapshot}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 transition-colors"
            title={isAr ? 'تصدير لقطة بيانات JSON لعمليات اليوم للتدقيق والمطابقة' : 'Export Today JSON Snapshot for Local Audit'}
          >
            <Download className="h-4 w-4 text-amber-700" />
            <span>{isAr ? 'لقطة بيانات JSON' : 'JSON Snapshot'}</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-2 text-xs font-bold text-orange-950 shadow-xs hover:bg-orange-100 hover:border-orange-300 transition-colors"
            title={isAr ? 'معاينة وطباعة سجل العمليات اليومية' : 'Live Print Preview & Export'}
          >
            <Printer className="h-4 w-4 text-[#F05627]" />
            <span>{isAr ? 'معاينة وطباعة (Print)' : 'Export & Print'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 transition-colors"
            title={isAr ? 'تصدير جدول العمليات إلى Excel' : 'Export to Excel'}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>

          {canEditOperations && (
            <button
              id="new-operation-btn"
              onClick={() => {
                setEditingOperation(null);
                setIsNewModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل رحلة جديدة' : 'Add New Trip'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Mini-Banner */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/50 via-amber-50/30 to-neutral-50 p-4 sm:grid-cols-4">
        <div>
          <span className="text-[11px] font-semibold text-neutral-500">{isAr ? 'عدد الرحلات المفلترة' : 'Filtered Trips'}</span>
          <p className="text-lg font-black text-neutral-900">{filteredOperations.length} {isAr ? 'رحلة' : 'trips'}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-neutral-500">{isAr ? 'إجمالي المحمل' : 'Loaded Tonnage'}</span>
          <p className="text-lg font-black text-neutral-900">{formatTonnage(currentTotalLoaded, language)}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-neutral-500">{isAr ? 'إجمالي المستلم الصافي' : 'Delivered Tonnage'}</span>
          <p className="text-lg font-black text-[#F05627]">{formatTonnage(currentTotalDelivered, language)}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-neutral-500">{isAr ? 'إجمالي الفاقد' : 'Total Wastage Loss'}</span>
          <p className="text-lg font-black text-rose-600">{formatTonnage(currentTotalWastage, language)}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 h-4 w-4 text-slate-400`} />
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم الشاحنة، التذكرة، العميل، الكسارة...' : 'Search truck, ticket, client...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none`}
            />
          </div>

          {/* Customer filter */}
          <div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            >
              <option value="">{isAr ? 'كافة العملاء' : 'All Customers'}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.customerName}>
                  {c.customerName}
                </option>
              ))}
            </select>
          </div>

          {/* Crusher filter */}
          <div>
            <select
              value={selectedCrusher}
              onChange={(e) => setSelectedCrusher(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            >
              <option value="">{isAr ? 'كافة الكسارات' : 'All Crushers'}</option>
              {crushers.map((c) => (
                <option key={c.id} value={c.crusherName}>
                  {c.crusherName}
                </option>
              ))}
            </select>
          </div>

          {/* Transporter filter */}
          <div>
            <select
              value={selectedTransporter}
              onChange={(e) => setSelectedTransporter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            >
              <option value="">{isAr ? 'كافة الناقلين' : 'All Transporters'}</option>
              {transporters.map((t) => (
                <option key={t.id} value={t.transporterName}>
                  {t.transporterName}
                </option>
              ))}
            </select>
          </div>

          {/* Material filter */}
          <div>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
            >
              <option value="">{isAr ? 'كافة المواد' : 'All Materials'}</option>
              {materials.map((m) => (
                <option key={m.id} value={m.nameAr}>
                  {m.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second row filters: Month & Excess Wastage Toggle */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">{isAr ? 'الشهر المالي:' : 'Month:'}</span>
            <div className="flex flex-wrap gap-1">
              {['ALL', '8', '7', '6', '5', '4', '3'].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    selectedMonth === m
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m === 'ALL' ? (isAr ? 'الكل' : 'All') : `${m}/2026`}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-bold text-rose-800">
            <input
              type="checkbox"
              checked={filterExcessLoss}
              onChange={(e) => setFilterExcessLoss(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            <span>{isAr ? 'عرض فاقد الوزن المرتفع فقط (>2%)' : 'High Loss Only (>2%)'}</span>
          </label>
        </div>
      </div>

      {/* Main Operations Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${isAr ? 'text-right' : 'text-left'} text-xs`}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'رقم الرحلة' : 'Trip ID'}</th>
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'تاريخ التحميل' : 'Date'}</th>
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'رقم الشاحنة' : 'Truck #'}</th>
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'اسم الناقل - المقاول' : 'Transporter'}</th>
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'مصدر التحميل - الكسارة' : 'Quarry Source'}</th>
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'العميل المستلم' : 'Destination Client'}</th>
                <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'نوع المادة' : 'Material'}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{isAr ? 'الوزن المحمل (طن)' : 'Loaded (t)'}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{isAr ? 'الوزن المستلم (طن)' : 'Delivered (t)'}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{isAr ? 'الفاقد (طن / %)' : 'Wastage'}</th>
                {canAccessFinancials && (
                  <>
                    <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'المبيعات بدون ضريبة' : 'Sales Excl. VAT'}</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'تكلفة الشراء' : 'Purchase Cost'}</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'المسدد للكسارة' : 'Paid to Crusher'}</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">{isAr ? 'صافي الربح' : 'Net Profit'}</th>
                  </>
                )}
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{isAr ? 'تذكرة الميزان' : 'Scale Ticket'}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOperations.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400">
                    {isAr ? 'لا توجد سجلات مطابقة لمعايير البحث الحالية' : 'No records found matching filters'}
                  </td>
                </tr>
              ) : (
                paginatedOperations.map((op) => {
                  const isHighLoss = op.wastage_percentage > 2.0;
                  const displayTripId = op.id.startsWith('TRP-')
                    ? op.id
                    : `TRP-${op.id.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;

                  return (
                    <tr key={op.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-orange-700 whitespace-nowrap">
                        <span className="rounded-md bg-orange-50 px-1.5 py-0.5 border border-orange-100">
                          {displayTripId}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {formatDate(op.loading_date, language)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap font-mono">
                        {op.truck_no}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {op.transporter_name}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <div>{op.loading_source}</div>
                        {op.loading_invoice_no && (
                          <div className="text-[10px] text-slate-400 font-mono">{op.loading_invoice_no}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                        <div>{op.destination_customer}</div>
                        {op.receipt_invoice_no && (
                          <div className="text-[10px] text-slate-400 font-mono">{op.receipt_invoice_no}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                          {op.material_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800">
                        {op.qty_loaded}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {op.qty_delivered}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isHighLoss ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {op.qty_wastage} طن ({op.wastage_percentage}%)
                        </span>
                      </td>
                      {canAccessFinancials && (
                        <>
                          <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap font-mono">
                            {formatCurrency(op.sales_amount, language)}
                          </td>
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-mono">
                            {formatCurrency(op.purchases_cost, language)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-mono">
                            {formatCurrency(op.crusher_payment ?? 0, language)}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap font-mono">
                            {formatCurrency(op.net_profit, language)}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[11px] text-slate-600 font-semibold">{op.scale_ticket_no}</span>
                          <button
                            onClick={() => setPreviewTicketOperation(op)}
                            className="rounded-lg p-1 text-orange-600 hover:bg-orange-50"
                            title={isAr ? 'عرض تذكرة الميزان الرسمية' : 'View scale ticket'}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setAttachmentViewingOp(op)}
                            className="relative rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-orange-600"
                            title={isAr ? 'إدارة المرفقات والمستندات' : 'Manage attachments'}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {op.attachments && op.attachments.length > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-600 text-[9px] font-bold text-white">
                                {op.attachments.length}
                              </span>
                            )}
                          </button>
                          {canEditOperations && (
                            <button
                              onClick={() => {
                                setEditingOperation(op);
                                setIsNewModalOpen(true);
                              }}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-orange-600"
                              title={isAr ? 'تعديل' : 'Edit'}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDeleteRecords && (
                            <button
                              onClick={() => handleDelete(op.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title={isAr ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500">
          <div>
            {isAr
              ? `عرض ${paginatedOperations.length} من أصل ${filteredOperations.length} سجل`
              : `Showing ${paginatedOperations.length} of ${filteredOperations.length} records`}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
            >
              {isAr ? 'السابق' : 'Previous'}
            </button>
            <span className="font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
            >
              {isAr ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialogs */}
      <DailyOperationsModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingOperation(null);
        }}
        initialData={editingOperation}
      />

      <ScaleTicketViewerModal
        operation={previewTicketOperation}
        onClose={() => setPreviewTicketOperation(null)}
        lang={language}
      />

      {attachmentViewingOp && (
        <MultiAttachmentModal
          isOpen={!!attachmentViewingOp}
          onClose={() => setAttachmentViewingOp(null)}
          title={`${attachmentViewingOp.scale_ticket_no} - ${attachmentViewingOp.truck_no}`}
          recordType="Operation"
          recordId={attachmentViewingOp.id}
          existingAttachments={attachmentViewingOp.attachments || []}
        />
      )}

      {/* Live Print Preview & Export Studio Modal */}
      <ExportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        initialDocType="daily-operations"
        initialOrientation="landscape"
      />
    </div>
  );
};
