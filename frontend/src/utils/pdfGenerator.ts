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

// Helper to convert any modern CSS color functions (like oklch, oklab, color-mix, lab, lch) to standard rgb/hex fallback for html2canvas
function convertCssColorToStandardRgb(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial') {
    return colorStr;
  }
  if (
    !colorStr.includes('oklch') &&
    !colorStr.includes('oklab') &&
    !colorStr.includes('color-mix') &&
    !colorStr.includes('lab(') &&
    !colorStr.includes('lch(')
  ) {
    return colorStr;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      const resolved = ctx.fillStyle;
      if (resolved && !resolved.includes('oklch') && !resolved.includes('oklab')) {
        return resolved;
      }
    }
  } catch {}

  // Fallback map for common palette classes if parser fails
  if (colorStr.includes('orange')) return '#ea580c';
  if (colorStr.includes('emerald')) return '#059669';
  if (colorStr.includes('rose')) return '#e11d48';
  if (colorStr.includes('amber')) return '#d97706';
  if (colorStr.includes('slate-50')) return '#f8fafc';
  if (colorStr.includes('slate-200')) return '#e2e8f0';
  if (colorStr.includes('slate-300')) return '#cbd5e1';
  if (colorStr.includes('slate-500')) return '#64748b';
  if (colorStr.includes('slate-700')) return '#334155';
  if (colorStr.includes('slate-900') || colorStr.includes('neutral-950')) return '#0f172a';
  return '#0f172a';
}

function normalizeElementColorsForHtml2Canvas(clonedDoc: Document) {
  // 1. Inject universal sRGB stylesheet override into clonedDoc head to map Tailwind v4 variables to standard hex
  try {
    const styleEl = clonedDoc.createElement('style');
    styleEl.id = 'html2canvas-srgb-fallback-styles';
    styleEl.textContent = `
      :root, [data-theme], body, #customer-tax-invoice-printable, .printable-ticket-page, #export-print-preview-content {
        --color-slate-50: #f8fafc !important;
        --color-slate-100: #f1f5f9 !important;
        --color-slate-200: #e2e8f0 !important;
        --color-slate-300: #cbd5e1 !important;
        --color-slate-400: #94a3b8 !important;
        --color-slate-500: #64748b !important;
        --color-slate-600: #475569 !important;
        --color-slate-700: #334155 !important;
        --color-slate-800: #1e293b !important;
        --color-slate-900: #0f172a !important;
        --color-slate-950: #020617 !important;

        --color-orange-50: #fff7ed !important;
        --color-orange-100: #ffedd5 !important;
        --color-orange-200: #fed7aa !important;
        --color-orange-300: #fdba74 !important;
        --color-orange-400: #fb923c !important;
        --color-orange-500: #f97316 !important;
        --color-orange-600: #ea580c !important;
        --color-orange-700: #c2410c !important;
        --color-orange-800: #9a3412 !important;
        --color-orange-900: #7c2d12 !important;
        --color-orange-950: #431407 !important;

        --color-emerald-50: #ecfdf5 !important;
        --color-emerald-100: #d1fae5 !important;
        --color-emerald-200: #a7f3d0 !important;
        --color-emerald-300: #6ee7b7 !important;
        --color-emerald-400: #34d399 !important;
        --color-emerald-500: #10b981 !important;
        --color-emerald-600: #059669 !important;
        --color-emerald-700: #047857 !important;
        --color-emerald-800: #065f46 !important;
        --color-emerald-900: #064e3b !important;
        --color-emerald-950: #022c22 !important;

        --color-rose-50: #fff1f2 !important;
        --color-rose-100: #ffe4e6 !important;
        --color-rose-200: #fecdd3 !important;
        --color-rose-300: #fda4af !important;
        --color-rose-400: #fb7185 !important;
        --color-rose-500: #f43f5e !important;
        --color-rose-600: #e11d48 !important;
        --color-rose-700: #be123c !important;
        --color-rose-800: #9f1239 !important;
        --color-rose-900: #881337 !important;
        --color-rose-950: #4c0519 !important;

        --color-amber-50: #fffbeb !important;
        --color-amber-100: #fef3c7 !important;
        --color-amber-200: #fde68a !important;
        --color-amber-300: #fcd34d !important;
        --color-amber-400: #fbbf24 !important;
        --color-amber-500: #f59e0b !important;
        --color-amber-600: #d97706 !important;
        --color-amber-700: #b45309 !important;
        --color-amber-800: #92400e !important;
        --color-amber-900: #78350f !important;
        --color-amber-950: #451a03 !important;

        --color-neutral-50: #fafafa !important;
        --color-neutral-100: #f5f5f5 !important;
        --color-neutral-200: #e5e5e5 !important;
        --color-neutral-300: #d4d4d4 !important;
        --color-neutral-400: #a3a3a3 !important;
        --color-neutral-500: #737373 !important;
        --color-neutral-600: #525252 !important;
        --color-neutral-700: #404040 !important;
        --color-neutral-800: #262626 !important;
        --color-neutral-900: #171717 !important;
        --color-neutral-950: #0a0a0a !important;
      }

      #customer-tax-invoice-printable,
      .printable-ticket-page,
      #export-print-preview-content {
        background-color: #ffffff !important;
        color: #0f172a !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
    `;
    clonedDoc.head?.appendChild(styleEl);
  } catch {}

  // 2. Scan elements in clonedDoc and replace any lingering oklch/color-mix values
  const allElements = clonedDoc.querySelectorAll<HTMLElement>('*');
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

  const win = clonedDoc.defaultView || window;

  allElements.forEach((el) => {
    try {
      const computed = win.getComputedStyle(el);
      colorProperties.forEach((prop) => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const val = computed.getPropertyValue(cssProp);
        if (
          val &&
          (val.includes('oklch') ||
            val.includes('oklab') ||
            val.includes('color-mix') ||
            val.includes('lab(') ||
            val.includes('lch('))
        ) {
          const resolved = convertCssColorToStandardRgb(val);
          el.style.setProperty(cssProp, resolved, 'important');
        }
      });
    } catch {}
  });

  // 3. Ensure primary invoice and printable ticket containers have explicit white background
  const targets = clonedDoc.querySelectorAll<HTMLElement>(
    '#customer-tax-invoice-printable, .printable-ticket-page, #export-print-preview-content'
  );
  targets.forEach((target) => {
    target.style.backgroundColor = '#ffffff';
    target.style.color = '#0f172a';
    target.style.opacity = '1';
    target.style.visibility = 'visible';
  });
}

/**
 * Converts a base64 data URL to a Uint8Array in memory without relying on fetch()
 */
export function base64DataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Safely captures an HTML element (including off-screen, hidden, or nested elements)
 * by temporarily cloning the DOM node, mounting it into a fixed viewport container
 * (position: absolute/fixed, z-index: -1, opacity: 1, visible), running html2canvas,
 * and immediately destroying the clone and container.
 */
export async function captureElementWithStaging(
  element: HTMLElement | null,
  scale: number = 2,
  targetWidth: number = 960
): Promise<string> {
  const resolvedEl =
    element ||
    (document.getElementById('export-print-preview-content') as HTMLElement) ||
    (document.querySelector('.print-container') as HTMLElement) ||
    (document.getElementById('customer-tax-invoice-printable') as HTMLElement);

  if (!resolvedEl) {
    throw new Error('Element to capture is null or undefined.');
  }

  // 1. Create a dedicated staging container attached to document.body
  const stagingContainer = document.createElement('div');
  stagingContainer.setAttribute('data-pdf-staging-container', 'true');
  stagingContainer.style.position = 'absolute';
  stagingContainer.style.left = '0px';
  stagingContainer.style.top = '0px';
  stagingContainer.style.width = `${targetWidth}px`;
  stagingContainer.style.zIndex = '-1';
  stagingContainer.style.opacity = '1';
  stagingContainer.style.visibility = 'visible';
  stagingContainer.style.pointerEvents = 'none';
  stagingContainer.style.backgroundColor = '#ffffff';
  stagingContainer.style.transform = 'none';
  stagingContainer.style.overflow = 'visible';
  stagingContainer.style.boxSizing = 'border-box';

  // 2. Clone the element
  const clone = resolvedEl.cloneNode(true) as HTMLElement;
  clone.style.display = 'block';
  clone.style.opacity = '1';
  clone.style.visibility = 'visible';
  clone.style.position = 'relative';
  clone.style.left = '0px';
  clone.style.top = '0px';
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.backgroundColor = '#ffffff';
  clone.style.boxSizing = 'border-box';

  // Remove any conflicting hide/opacity classes from the clone
  clone.classList.remove('opacity-0', 'pointer-events-none', 'hidden');

  stagingContainer.appendChild(clone);
  document.body.appendChild(stagingContainer);

  try {
    // 3. Capture canvas from clone
    const dataUrl = await captureElementToPng(clone, scale);
    return dataUrl;
  } finally {
    // 4. Destroy the staging container and clone
    if (stagingContainer.parentNode) {
      stagingContainer.parentNode.removeChild(stagingContainer);
    }
  }
}

/**
 * Capture an HTML element as high-resolution PNG image data URL
 */
export async function captureElementToPng(element: HTMLElement, scale: number = 2): Promise<string> {
  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth || 1024,
      onclone: (clonedDoc) => {
        normalizeElementColorsForHtml2Canvas(clonedDoc);
      },
    });
    return canvas.toDataURL('image/png', 0.95);
  } catch (err) {
    console.warn('Standard html2canvas capture failed, attempting resilient fallback mode:', err);
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
    });
    return canvas.toDataURL('image/png', 0.95);
  }
}

/**
 * Generate a standalone PDF for the official Tax Invoice from its DOM element
 */
export async function generateInvoicePdfFromElement(
  element: HTMLElement,
  invoiceNumber: string
): Promise<Uint8Array> {
  const pngDataUrl = await captureElementWithStaging(element, 2, 960);
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in points: 595.28 x 841.89
  const a4Width = 595.28;
  const a4Height = 841.89;

  const imageBytes = base64DataUrlToUint8Array(pngDataUrl);
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
  const pngDataUrl = await captureElementWithStaging(element, 2, 960);
  const pdfDoc = await PDFDocument.create();

  const a4Width = 595.28;
  const a4Height = 841.89;

  const imageBytes = base64DataUrlToUint8Array(pngDataUrl);
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
  const resolvedInvoiceEl =
    invoiceElement ||
    (document.getElementById('customer-tax-invoice-printable') as HTMLElement) ||
    (document.querySelector('.print-container') as HTMLElement) ||
    (document.getElementById('export-print-preview-content') as HTMLElement);

  if (!resolvedInvoiceEl) {
    throw new Error('Invoice container element is null or undefined.');
  }

  onProgress?.(10, 'جاري تهيئة محرك دمج المستندات الرسمي...');
  const mergedPdfDoc = await PDFDocument.create();

  // Set PDF Metadata
  mergedPdfDoc.setTitle(`Tax Invoice ${invoice.invoiceNumber} - Official Merged Document`);
  mergedPdfDoc.setAuthor('OxenGL Enterprise Cloud');
  mergedPdfDoc.setSubject(`Approved Tax Invoice and Supporting Scale Tickets for ${invoice.customerName}`);
  mergedPdfDoc.setKeywords(['Tax Invoice', 'ZATCA', 'Scale Tickets', 'OxenGL', invoice.invoiceNumber]);
  mergedPdfDoc.setCreationDate(new Date());

  const a4Width = 595.28;
  const a4Height = 841.89;

  // Step 1: Render Page 1 (Main Tax Invoice)
  onProgress?.(25, 'جاري معالجة وتضمين الفاتورة الضريبية المعتمدة (الصفحة 1)...');
  const invoicePng = await captureElementWithStaging(resolvedInvoiceEl, 2, 960);
  const invoiceImageBytes = base64DataUrlToUint8Array(invoicePng);
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
        const ticketPng = await captureElementWithStaging(ticketEl, 2, 960);
        const ticketBytes = base64DataUrlToUint8Array(ticketPng);
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
