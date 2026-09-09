import React, { useState } from 'react';
import { CustomerInvoice } from '../types';
import { Mail, Send, CheckCircle2, ExternalLink, Globe, Copy, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface DynamicEmailLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: CustomerInvoice;
  customerEmail: string;
  customerName: string;
  language: 'ar' | 'en';
}

export const DynamicEmailLauncherModal: React.FC<DynamicEmailLauncherModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customerEmail,
  customerName,
  language,
}) => {
  const isAr = language === 'ar';
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const subject = isAr
    ? `مطالبة وفاتورة ضريبية معتمدة رقم ${invoice.invoiceNumber} - شركة ميون للمقاولات المحدودة`
    : `Approved Tax Invoice #${invoice.invoiceNumber} - Myon Economic Contracting Co. Ltd.`;

  const emailBodyAr = `السادة / ${customerName} المحترمين،
تحية طيبة وبعد،

نرفق لكم تفاصيل الفاتورة الضريبية الشهرية المعتمدة رقم (${invoice.invoiceNumber}) الخاصة بتوريدات المواد الإنشائية وأعمال النقل الثقيل لشهر ${invoice.billingMonth}/${invoice.billingYear}.

ملخص الفاتورة:
- رقم الفاتورة: ${invoice.invoiceNumber}
- إجمالي عدد الرحلات: ${invoice.totalTrips} رحلة
- إجمالي الوزن الصافي المستلم: ${invoice.totalDeliveredWeight.toLocaleString()} طن
- المبلغ الإجمالي قبل الضريبة: ${formatCurrency(invoice.subtotal, 'ar')}
- ضريبة القيمة المضافة (15%): ${formatCurrency(invoice.vatAmount, 'ar')}
- إجمالي المبلغ المستحق النهائي: ${formatCurrency(invoice.grandTotal, 'ar')}
- حالة الاعتماد: معتمدة وموقعة إلكترونياً من الإدارة العامة

يرجى مراجعة التفاصيل وإجراء التحويل البنكي على حساب الشركة المعتمد في مصرف الراجحي:
IBAN: SA4280000123608010123456

شاكرين لكم حسن تعاونكم الدائم معنا.
شركة ميون للمقاولات المحدودة (قسم الإدارة المالية والمطالبات)
هاتف: +966 11 482 9900 | info@meayon.sa`;

  const emailBodyEn = `Dear ${customerName},

Greetings,

Please find the details for the approved monthly Tax Invoice #${invoice.invoiceNumber} for building material supply and heavy haulage operations for period ${invoice.billingMonth}/${invoice.billingYear}.

Invoice Summary:
- Invoice No: ${invoice.invoiceNumber}
- Total Trips: ${invoice.totalTrips}
- Delivered Weight: ${invoice.totalDeliveredWeight.toLocaleString()} Tons
- Subtotal (Excl. VAT): ${formatCurrency(invoice.subtotal, 'en')}
- VAT (15%): ${formatCurrency(invoice.vatAmount, 'en')}
- Grand Total Due: ${formatCurrency(invoice.grandTotal, 'en')}
- Approval Status: Officially Approved & Digitally Signed by CEO

Approved Bank Account:
Al Rajhi Bank | IBAN: SA4280000123608010123456

Best regards,
Myon Economic Contracting Co. Ltd. (Finance & Invoicing Dept.)
Phone: +966 11 482 9900 | info@meayon.sa`;

  const finalBody = isAr ? emailBodyAr : emailBodyEn;

  // Handlers for dynamic deep links
  const handleDefaultMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(finalBody)}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  const handleGmailWeb = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      customerEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleOutlookWeb = () => {
    const outlookUrl = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${encodeURIComponent(
      customerEmail
    )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(finalBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        id="dynamic-email-launcher-modal"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black">
                {isAr ? 'إرسال الفاتورة عبر البريد الإلكتروني' : 'Launch Email Client for Invoice'}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                {invoice.invoiceNumber} → {customerEmail || 'customer@company.sa'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600">
            {isAr
              ? 'اختر تطبيق أو بوابة البريد الإلكتروني المفضلة لديك لفتح نافذة إرسال مجهزة تلقائياً بالبيانات الرسمية والمبالغ المعتمدة:'
              : 'Choose your preferred email client to launch a pre-populated message with official amounts and bank details:'}
          </p>

          {/* Email Clients Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Option 1: Default Mail Client (Desktop Outlook / Apple Mail) */}
            <button
              onClick={handleDefaultMailClient}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-right transition-all hover:border-orange-500 hover:bg-orange-50/50 hover:shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white group-hover:bg-orange-600">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-neutral-950">
                    {isAr ? 'تطبيق البريد الافتراضي (Outlook / Apple Mail)' : 'Default Email Client (Desktop)'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'يفتح برنامج الأوتلوك المكتبي أو بريد النظام ببروتوكول mailto' : 'Launches Outlook desktop application via mailto protocol'}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-orange-600" />
            </button>

            {/* Option 2: Gmail Web */}
            <button
              onClick={handleGmailWeb}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-right transition-all hover:border-red-500 hover:bg-red-50/40 hover:shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-950">
                    {isAr ? 'بريد جوجل ويب (Gmail Web)' : 'Google Gmail (Web Browser)'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'يفتح تبويب إنشاء رسالة جديدة مباشرة في Gmail' : 'Opens compose window directly in Google Workspace / Gmail'}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-red-600" />
            </button>

            {/* Option 3: Outlook Web */}
            <button
              onClick={handleOutlookWeb}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-right transition-all hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                    {isAr ? 'أوتلوك ويب (Outlook / Office 365 Web)' : 'Outlook / Office 365 (Web)'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'يفتح نافذة إرسال سحابية في Outlook.com / O365' : 'Opens compose tab in Microsoft Outlook 365 Web'}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
            </button>
          </div>

          {/* Quick Copy Text fallback */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                {isAr ? 'أو نسخ نص الرسالة يدوياً:' : 'Or copy message text manually:'}
              </span>
              <button
                onClick={handleCopyBody}
                className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-800"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{isAr ? 'تم النسخ للحافظة!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{isAr ? 'نسخ النص' : 'Copy Text'}</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 line-clamp-2 font-mono">
              {finalBody}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
