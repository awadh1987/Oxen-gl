import React from 'react';
import { OperationRecord } from '../types';
import { X, Printer, Download, CheckCircle, Scale, Building, Truck, FileText } from 'lucide-react';
import { formatCurrency, formatDate, formatTonnage } from '../utils/formatters';
import { BrandLogo } from './BrandLogo';

interface ScaleTicketViewerModalProps {
  operation: OperationRecord | null;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const ScaleTicketViewerModal: React.FC<ScaleTicketViewerModalProps> = ({
  operation,
  onClose,
  lang,
}) => {
  if (!operation) return null;
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        id="scale-ticket-viewer"
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-orange-950">
            {isAr ? 'معاينة تذكرة ميزان البسكول الرسمية' : 'Official Weighbridge Scale Ticket'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Realistic Saudi Scale Ticket Design */}
        <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50/50 p-5 font-mono text-xs text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 text-center">
            <BrandLogo size="sm" showText={false} />
            <div>
              <p className="font-bold text-slate-900 text-sm">
                شركة ميون للمقاولات المحدودة
              </p>
              <p className="text-[10px] text-slate-600">
                MYON ECONOMIC CONTRACTING CO. LTD.
              </p>
              <p className="text-[9px] text-orange-700 font-sans mt-0.5">
                تذكرة وزن ميزان شاحنات معتمد (Weighbridge Scale Ticket)
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <p>رقم السجل: 1010XXXXXX</p>
              <p>الرقم الضريبي: 300189452300003</p>
            </div>
          </div>

          {/* Ticket Metadata */}
          <div className="my-3 grid grid-cols-2 gap-2 border-b border-slate-200 pb-3 text-[11px]">
            <div>
              <span className="text-slate-500">{isAr ? 'رقم التذكرة:' : 'Ticket #:'}</span>{' '}
              <span className="font-bold text-orange-950">{operation.scale_ticket_no}</span>
            </div>
            <div>
              <span className="text-slate-500">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>{' '}
              <span className="font-bold">{formatDate(operation.loading_date, lang)}</span>
            </div>
            <div>
              <span className="text-slate-500">{isAr ? 'رقم الشاحنة:' : 'Truck No:'}</span>{' '}
              <span className="font-bold text-slate-900">{operation.truck_no}</span>
            </div>
            <div>
              <span className="text-slate-500">{isAr ? 'مزود الخدمة / السائق:' : 'Service Supplier:'}</span>{' '}
              <span className="font-bold">{operation.transporter_name}</span>
            </div>
            <div>
              <span className="text-slate-500">{isAr ? 'منشأة الإرسال:' : 'Origin / Dispatch Facility:'}</span>{' '}
              <span className="font-bold">{operation.loading_source}</span>
            </div>
            <div>
              <span className="text-slate-500">{isAr ? 'العميل / الوجهة:' : 'Customer:'}</span>{' '}
              <span className="font-bold text-slate-900">{operation.destination_customer}</span>
            </div>
          </div>

          {/* Scale Weight Measurements */}
          <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-1 font-semibold">
              <span>{isAr ? 'نوع المادة المنقولة:' : 'Material:'}</span>
              <span className="text-orange-800 font-bold">{operation.material_type}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>{isAr ? 'الوزن القائم المحمل (Gross Loaded):' : 'Loaded Weight:'}</span>
              <span className="font-bold">{formatTonnage(operation.qty_loaded, lang)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>{isAr ? 'الوزن الصافي المستلم (Net Delivered):' : 'Delivered Weight:'}</span>
              <span className="font-bold">{formatTonnage(operation.qty_delivered, lang)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-900 font-bold">
              <span>{isAr ? 'فرق الوزن المحسوب (Wastage Loss):' : 'Wastage Loss:'}</span>
              <span className={operation.qty_wastage > 1 ? 'text-rose-600' : 'text-slate-900'}>
                {formatTonnage(operation.qty_wastage, lang)} ({operation.wastage_percentage}%)
              </span>
            </div>
          </div>

          {/* Ticket Barcode Simulation */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-3 text-[10px] text-slate-500">
            <div>
              <p>{isAr ? 'توقيع مشغل الميزان' : 'Scale Operator Sign'}</p>
              <div className="h-6 w-24 border-b border-slate-400 mt-1" />
            </div>
            <div className="text-center font-mono">
              ||| | |||| | ||||| |||| ||| | |||
              <p className="text-[9px]">{operation.scale_ticket_no}</p>
            </div>
            <div className="text-right">
              <p>{isAr ? 'توقيع المستلم' : 'Receiver Sign'}</p>
              <div className="h-6 w-24 border-b border-slate-400 mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
