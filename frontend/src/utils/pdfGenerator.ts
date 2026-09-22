import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { CustomerInvoice, OperationRecord, BrandConfig, DocumentAttachment } from '../types';
import { formatCurrency, formatDate } from './formatters';

export interface MergedPdfProgressCallback {
  (progress: number, message: string): void;
}

/**
 * Downloads a binary Blob with the given filename in the browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Helper to convert any modern CSS color functions (like oklch, oklab, color-mix) to rgb/hex fallback for html2canvas
function normalizeElementColorsForHtml2Canvas(clonedDoc: Document) {
  // Find all elements in cloned document and ensure computed styles are readable by html2canvas
  const allElements = clonedDoc.querySelectorAll<HTMLElement>('*');
  const tempEl = document.createElement('div');
  tempEl.style.display = 'none';
  document.body.appendChild(tempEl);

  const colorProperties = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
    'outlineColor',
    'textDecorationColor',
  ];

  try {
    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      colorProperties.forEach((prop) => {
        const val = computed.getPropertyValue(
          prop.replace(/([A-Z])/g, '-$1').toLowerCase()
        );
        if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix') || val.includes('lab') || val.includes('lch'))) {
          // Resolve to standard rgb via browser's native canvas / style resolver
          try {
            tempEl.style.color = val;
            const resolvedRgb = window.getComputedStyle(tempEl).color;
            if (resolvedRgb && !resolvedRgb.includes('oklch') && !resolvedRgb.includes('oklab')) {
              el.style.setProperty(
                prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
                resolvedRgb,
                'important'
              );
            }
          } catch {
            // fallback
          }
        }
      });
    });
  } finally {
    if (tempEl.parentNode) {
      tempEl.parentNode.removeChild(tempEl);
    }
  }
}

/**
 * Capture an HTML element as high-resolution PNG image data URL
 */
export async function captureElementToPng(element: HTMLElement, scale: number = 2): Promise<string> {
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 1024,
    onclone: (clonedDoc) => {
      normalizeElementColorsForHtml2Canvas(clonedDoc);
    },
  });
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Generate a standalone PDF for the official Tax Invoice from its DOM element
 */
export async function generateInvoicePdfFromElement(
  element: HTMLElement,
  invoiceNumber: string
): Promise<Uint8Array> {
  const pngDataUrl = await captureElementToPng(element, 2);
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in points: 595.28 x 841.89
  const a4Width = 595.28;
  const a4Height = 841.89;

  const imageBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());
  const pngImage = await pdfDoc.embedPng(imageBytes);

  const imgDims = pngImage.scaleToFit(a4Width - 40, a4Height - 40);
  const page = pdfDoc.addPage([a4Width, a4Height]);

  // Center on A4
  const x = (a4Width - imgDims.width) / 2;
  const y = a4Height - imgDims.height - 20;

  page.drawImage(pngImage, {
    x,
    y,
    width: imgDims.width,
    height: imgDims.height,
  });

  return await pdfDoc.save();
}

/**
 * Generate a single-page PDF for an individual Scale Ticket / Waybill from a hidden rendered DOM or constructed canvas
 */
export async function generateScaleTicketPdfFromElement(
  element: HTMLElement
): Promise<Uint8Array> {
  const pngDataUrl = await captureElementToPng(element, 2);
  const pdfDoc = await PDFDocument.create();

  const a4Width = 595.28;
  const a4Height = 841.89;

  const imageBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());
  const pngImage = await pdfDoc.embedPng(imageBytes);

  const imgDims = pngImage.scaleToFit(a4Width - 40, a4Height - 40);
  const page = pdfDoc.addPage([a4Width, a4Height]);

  const x = (a4Width - imgDims.width) / 2;
  const y = a4Height - imgDims.height - 20;

  page.drawImage(pngImage, {
    x,
    y,
    width: imgDims.width,
    height: imgDims.height,
  });

  return await pdfDoc.save();
}

/**
 * Generate a Single Merged Multi-Page PDF:
 * - Page 1: Approved Tax Invoice with Official Letterhead, Signatures, Stamps, QR Code
 * - Pages 2..N: Supporting Documents & Scale Tickets for each trip included in the invoice
 */
export async function generateSingleMergedInvoicePdf(
  invoiceElement: HTMLElement,
  ticketElements: HTMLElement[] = [],
  invoice: CustomerInvoice,
  onProgress?: MergedPdfProgressCallback
): Promise<Blob> {
  if (!invoiceElement) {
    throw new Error('Invoice container element is null or undefined.');
  }

  onProgress?.(10, 'جاري تهيئة محرك دمج المستندات الرسمي...');
  const mergedPdfDoc = await PDFDocument.create();

  // Set PDF Metadata
  mergedPdfDoc.setTitle(`Tax Invoice ${invoice.invoiceNumber} - Official Merged Document`);
  mergedPdfDoc.setAuthor('Meayon Economic Contracting Co. Ltd.');
  mergedPdfDoc.setSubject(`Approved Tax Invoice and Supporting Scale Tickets for ${invoice.customerName}`);
  mergedPdfDoc.setKeywords(['Tax Invoice', 'ZATCA', 'Scale Tickets', 'Meayon', invoice.invoiceNumber]);
  mergedPdfDoc.setCreationDate(new Date());

  const a4Width = 595.28;
  const a4Height = 841.89;

  // Step 1: Render Page 1 (Main Tax Invoice)
  onProgress?.(25, 'جاري معالجة وتضمين الفاتورة الضريبية المعتمدة (الصفحة 1)...');
  const invoicePng = await captureElementToPng(invoiceElement, 2);
  const invoiceImageBytes = await fetch(invoicePng).then((res) => res.arrayBuffer());
  const embeddedInvoiceImg = await mergedPdfDoc.embedPng(invoiceImageBytes);

  const invDims = embeddedInvoiceImg.scaleToFit(a4Width - 40, a4Height - 40);
  const page1 = mergedPdfDoc.addPage([a4Width, a4Height]);
  page1.drawImage(embeddedInvoiceImg, {
    x: (a4Width - invDims.width) / 2,
    y: a4Height - invDims.height - 20,
    width: invDims.width,
    height: invDims.height,
  });

  // Step 2: Render Supporting Documents & Scale Tickets as subsequent pages
  const validTicketElements = Array.isArray(ticketElements) ? ticketElements.filter(Boolean) : [];
  const totalTickets = validTicketElements.length;

  if (totalTickets === 0) {
    onProgress?.(85, 'لا توجد مرفقات إضافية محددة للدمج. جاري إنهاء ملف الفاتورة...');
  } else {
    for (let i = 0; i < totalTickets; i++) {
      const progressPercent = Math.round(30 + ((i + 1) / totalTickets) * 60);
      onProgress?.(
        progressPercent,
        `جاري دمج تذكرة الميزان والإثبات الداعم (${i + 1} من ${totalTickets})...`
      );

      const ticketEl = validTicketElements[i];
      if (!ticketEl) continue;

      try {
        const ticketPng = await captureElementToPng(ticketEl, 2);
        const ticketBytes = await fetch(ticketPng).then((res) => res.arrayBuffer());
        const embeddedTicketImg = await mergedPdfDoc.embedPng(ticketBytes);

        const ticketDims = embeddedTicketImg.scaleToFit(a4Width - 40, a4Height - 40);
        const ticketPage = mergedPdfDoc.addPage([a4Width, a4Height]);
        ticketPage.drawImage(embeddedTicketImg, {
          x: (a4Width - ticketDims.width) / 2,
          y: a4Height - ticketDims.height - 20,
          width: ticketDims.width,
          height: ticketDims.height,
        });
      } catch (err) {
        console.warn(`Could not render ticket page ${i + 1}:`, err);
      }
    }
  }

  onProgress?.(95, 'جاري حفظ وتوقيع ملف PDF النهائي المدمج...');
  const mergedPdfBytes = await mergedPdfDoc.save();
  onProgress?.(100, 'تم إنشاء ملف PDF المدمج بنجاح!');

  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
}

/**
 * Generate a ZIP archive containing:
 * 1. Main Official Tax Invoice PDF
 * 2. Supporting_Documents/ folder containing separate Scale Ticket PDFs
 */
export async function generateInvoiceZipArchive(
  invoiceElement: HTMLElement,
  ticketElements: { element: HTMLElement; trip: OperationRecord }[] = [],
  invoice: CustomerInvoice,
  onProgress?: MergedPdfProgressCallback
): Promise<Blob> {
  if (!invoiceElement) {
    throw new Error('Invoice container element is null or undefined.');
  }

  onProgress?.(10, 'جاري إنشاء حزمة الأرشيف المضغوط (ZIP)...');
  const zip = new JSZip();

  // 1. Add Main Tax Invoice PDF
  onProgress?.(25, 'جاري توليد ملف الفاتورة الضريبية المنفصل...');
  const invoicePdfBytes = await generateInvoicePdfFromElement(
    invoiceElement,
    invoice.invoiceNumber
  );
  zip.file(`${invoice.invoiceNumber}_Official_Tax_Invoice.pdf`, invoicePdfBytes);

  // 2. Add Supporting Scale Tickets in a sub-folder if any
  const validItems = Array.isArray(ticketElements)
    ? ticketElements.filter((item) => item && item.element && item.trip)
    : [];
  const total = validItems.length;

  if (total > 0) {
    const supportingFolder = zip.folder('Supporting_Scale_Tickets_and_Waybills');

    for (let i = 0; i < total; i++) {
      const progressPercent = Math.round(30 + ((i + 1) / total) * 60);
      const item = validItems[i];
      onProgress?.(
        progressPercent,
        `جاري توليد ملف PDF لتذكرة الميزان ${item.trip.scale_ticket_no} (${i + 1}/${total})...`
      );

      try {
        const ticketPdfBytes = await generateScaleTicketPdfFromElement(item.element);
        const cleanTicketNo = (item.trip.scale_ticket_no || `ticket_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanTruck = (item.trip.truck_no || 'truck').replace(/[^a-zA-Z0-9_-]/g, '_');
        supportingFolder?.file(
          `${cleanTicketNo}_Truck_${cleanTruck}_${item.trip.loading_date || 'date'}.pdf`,
          ticketPdfBytes
        );
      } catch (err) {
        console.warn(`Failed to add ticket ${item.trip?.scale_ticket_no} to zip:`, err);
      }
    }
  }

  onProgress?.(95, 'جاري ضغط الحزمة وإنشاء ملف ZIP النهائي...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, 'تم تجهيز أرشيف ZIP بنجاح!');
  return zipBlob;
}
