import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { CustomerInvoice, OperationRecord, BrandConfig, DocumentAttachment } from '../types';
import { formatCurrency, formatDate } from './formatters';

export interface MergedPdfProgressCallback {
  (progress: number, message: string): void;
}

/**
 * Downloads a binary Blob with the given filename in the browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (!blob.size) {
    throw new Error('The generated download is empty.');
  }
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

function resolveCssColor(value: string): string {
  if (!value || !/(oklch|oklab|color-mix|\b(?:lab|lch)\()/i.test(value)) return value;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 'rgb(15 23 42)';
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${pixel[0]} ${pixel[1]} ${pixel[2]} / ${pixel[3] / 255})`;
}

/**
 * Capture an HTML element as high-resolution PNG image data URL
 */
export async function captureElementToPng(element: HTMLElement, scale: number = 2): Promise<string> {
  const bounds = element.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) {
    throw new Error('The document to export is not visible or has no size.');
  }

  // Wait for document fonts and all nested images to load
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore
  }

  const images = Array.from(element.querySelectorAll('img'));
  if (images.length > 0) {
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          // Timeout fallback in 1.5s
          setTimeout(resolve, 1500);
        });
      })
    );
  }

  const captureFrame = document.createElement('iframe');
  captureFrame.setAttribute('aria-hidden', 'true');
  captureFrame.style.position = 'fixed';
  captureFrame.style.left = '-100000px';
  captureFrame.style.top = '0';
  captureFrame.style.width = `${Math.max(element.scrollWidth, 794)}px`;
  captureFrame.style.height = `${Math.max(element.scrollHeight, 1123)}px`;
  captureFrame.style.border = '0';
  captureFrame.style.visibility = 'visible';
  document.body.appendChild(captureFrame);

  const captureDocument = captureFrame.contentDocument;
  if (!captureDocument) throw new Error('Could not create an isolated PDF document.');
  captureDocument.open();
  captureDocument.write('<!doctype html><html><head></head><body></body></html>');
  captureDocument.close();

  const captureRoot = element.cloneNode(true) as HTMLElement;
  captureRoot.removeAttribute('id');
  captureRoot.style.visibility = 'visible';
  captureRoot.style.pointerEvents = 'none';
  captureDocument.body.appendChild(captureRoot);

  const originalElements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  const captureElements = [captureRoot, ...Array.from(captureRoot.querySelectorAll<HTMLElement>('*'))];
  const styleProperties = ['color', 'background-color', 'border-color', 'border-width', 'border-style', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'padding', 'margin', 'display', 'flex-direction', 'align-items', 'justify-content', 'gap', 'width', 'height', 'min-height', 'max-width', 'position', 'top', 'right', 'bottom', 'left', 'opacity', 'visibility', 'white-space', 'border-radius', 'box-sizing'];

  captureElements.forEach((node, index) => {
    const original = originalElements[index];
    if (!original) return;
    node.removeAttribute('class');
    styleProperties.forEach((property) => {
      const value = window.getComputedStyle(original).getPropertyValue(property);
      node.style.setProperty(property, property.includes('color') ? resolveCssColor(value) : value);
    });
    node.style.animation = 'none';
    node.style.transition = 'none';
  });
  captureRoot.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    try {
      if (new URL(image.src, window.location.href).origin !== window.location.origin) {
        image.remove();
      }
    } catch {
      image.remove();
    }
  });

  try {
    const bounds = captureRoot.getBoundingClientRect();
    const width = Math.max(Math.ceil(bounds.width), 794);
    const height = Math.max(Math.ceil(captureRoot.scrollHeight), 1123);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%" xmlns="http://www.w3.org/1999/xhtml">${captureRoot.outerHTML}</foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not rasterize the isolated invoice preview.'));
      image.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create the PDF image canvas.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(svgUrl);
    return canvas.toDataURL('image/png', 0.95);
  } catch (error) {
    throw new Error('PDF capture was blocked by an external image. Use a same-origin logo or remove the image and try again.', { cause: error });
  } finally {
    captureFrame.remove();
  }
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
  ticketElements: HTMLElement[],
  invoice: CustomerInvoice,
  onProgress?: MergedPdfProgressCallback
): Promise<Blob> {
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
  const totalTickets = ticketElements.length;
  for (let i = 0; i < totalTickets; i++) {
    const progressPercent = Math.round(30 + ((i + 1) / totalTickets) * 60);
    onProgress?.(
      progressPercent,
      `جاري دمج تذكرة الميزان والإثبات الداعم (${i + 1} من ${totalTickets})...`
    );

    const ticketEl = ticketElements[i];
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
  ticketElements: { element: HTMLElement; trip: OperationRecord }[],
  invoice: CustomerInvoice,
  onProgress?: MergedPdfProgressCallback
): Promise<Blob> {
  onProgress?.(10, 'جاري إنشاء حزمة الأرشيف المضغوط (ZIP)...');
  const zip = new JSZip();

  // 1. Add Main Tax Invoice PDF
  onProgress?.(25, 'جاري توليد ملف الفاتورة الضريبية المنفصل...');
  const invoicePdfBytes = await generateInvoicePdfFromElement(
    invoiceElement,
    invoice.invoiceNumber
  );
  zip.file(`${invoice.invoiceNumber}_Official_Tax_Invoice.pdf`, invoicePdfBytes);

  // 2. Add Supporting Scale Tickets in a sub-folder
  const supportingFolder = zip.folder('Supporting_Scale_Tickets_and_Waybills');
  const total = ticketElements.length;

  for (let i = 0; i < total; i++) {
    const progressPercent = Math.round(30 + ((i + 1) / total) * 60);
    const item = ticketElements[i];
    onProgress?.(
      progressPercent,
      `جاري توليد ملف PDF لتذكرة الميزان ${item.trip.scale_ticket_no} (${i + 1}/${total})...`
    );

    try {
      const ticketPdfBytes = await generateScaleTicketPdfFromElement(item.element);
      const cleanTicketNo = item.trip.scale_ticket_no.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanTruck = item.trip.truck_no.replace(/[^a-zA-Z0-9_-]/g, '_');
      supportingFolder?.file(
        `${cleanTicketNo}_Truck_${cleanTruck}_${item.trip.loading_date}.pdf`,
        ticketPdfBytes
      );
    } catch (err) {
      console.warn(`Failed to add ticket ${item.trip.scale_ticket_no} to zip:`, err);
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
