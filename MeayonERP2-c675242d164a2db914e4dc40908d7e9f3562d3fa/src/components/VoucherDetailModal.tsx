import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FinancialVoucher } from '../types';
import { OfficialVoucherDocument } from './OfficialVoucherDocument';
import {
  X,
  Printer,
  ShieldCheck,
  Trash2,
  Share2,
  CheckCircle,
  FileCheck,
  Download,
} from 'lucide-react';

interface VoucherDetailModalProps {
  voucher: FinancialVoucher | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherDetailModal: React.FC<VoucherDetailModalProps> = ({
  voucher,
  isOpen,
  onClose,
}) => {
  const {
    brandConfig,
    language,
    approveVoucher,
    deleteVoucher,
    isAdmin,
    isCOO,
    canDeleteRecords,
    showToast,
  } = useApp();

  const isAr = language === 'ar';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = () => {
    approveVoucher(voucher.id, 'اعتماد رسمي صادر من لوحة مراجعة السندات المالية');
    showToast(isAr ? 'تم اعتماد السند المالي بنجاح' : 'Voucher approved successfully', 'success');
  };

  const handleDelete = () => {
    if (
      confirm(
        isAr
          ? `هل أنت متأكد من حذف السند المالي رقم (${voucher.voucherNumber})؟`
          : `Are you sure you want to delete voucher ${voucher.voucherNumber}?`
      )
    ) {
      deleteVoucher(voucher.id);
      showToast(isAr ? 'تم حذف السند المالي بنجاح' : 'Voucher deleted successfully', 'info');
      onClose();
    }
  };

  return (
    <div
      id="voucher-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-2 sm:p-6 backdrop-blur-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? `معاينة سند: ${voucher.voucherNumber}` : `Voucher Details: ${voucher.voucherNumber}`}
        className="relative flex max-h-[96vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Top Control Bar (Non-Printable) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-6 py-3.5 text-white no-print">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-xs ${
                voucher.type === 'Payment' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {voucher.type === 'Payment' ? 'صرف' : 'قبض'}
            </div>
            <div>
              <h2 className="text-sm font-black sm:text-base">
                {isAr
                  ? voucher.type === 'Payment'
                    ? `معاينة سند صرف: ${voucher.voucherNumber}`
                    : `معاينة سند قبض: ${voucher.voucherNumber}`
                  : `Voucher Details: ${voucher.voucherNumber}`}
              </h2>
              <p className="text-[11px] text-slate-400">
                {voucher.partyName} • {voucher.amount.toLocaleString()} SAR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* CEO Approval Action */}
            {voucher.status !== 'Approved' && (isAdmin || isCOO) && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs hover:bg-emerald-700"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isAr ? 'اعتماد وختم السند (CEO)' : 'Approve & Stamp'}</span>
              </button>
            )}

            {/* Print Document */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs hover:bg-orange-700"
            >
              <Printer className="h-4 w-4" />
              <span>{isAr ? 'طباعة رسمية (A4)' : 'Print Document'}</span>
            </button>

            {/* Delete button if allowed */}
            {canDeleteRecords && (
              <button
                onClick={handleDelete}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-800/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
                title={isAr ? 'حذف السند' : 'Delete Voucher'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Canvas Container */}
        <div className="flex-1 overflow-y-auto bg-slate-800/60 p-4 sm:p-8">
          <div className="mx-auto max-w-4xl">
            <OfficialVoucherDocument
              voucher={voucher}
              brandConfig={brandConfig}
              isAr={isAr}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
