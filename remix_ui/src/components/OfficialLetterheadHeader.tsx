import React from 'react';
import { BrandConfig } from '../types';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../context/AppContext';

interface OfficialLetterheadHeaderProps {
  brandConfig?: BrandConfig;
  documentTypeAr?: string;
  documentTypeEn?: string;
  documentNumber?: string;
  issueDate?: string;
  isAr?: boolean;
}

export const OfficialLetterheadHeader: React.FC<OfficialLetterheadHeaderProps> = ({
  brandConfig: propBrandConfig,
  documentTypeAr = 'فاتورة ضريبية معتمدة',
  documentTypeEn = 'TAX INVOICE',
  documentNumber,
  issueDate,
  isAr = true,
}) => {
  let contextBrand: BrandConfig | undefined;
  let activeTenant: any;
  try {
    const ctx = useApp();
    contextBrand = ctx?.brandConfig;
    activeTenant = ctx?.activeTenantLicense;
  } catch {
    // Outside AppProvider fallback
  }

  const safeBrandConfig: BrandConfig = propBrandConfig || contextBrand || {
    companyNameAr: activeTenant?.companyName || 'المنشأة التجارية',
    companyNameEn: activeTenant?.companyNameEn || 'Enterprise Logistics Co.',
    crNumber: activeTenant?.crNumber || activeTenant?.commercialRegister || '—',
    taxNumber: activeTenant?.taxNumber || '—',
    phone: activeTenant?.contactPhone || '—',
    email: activeTenant?.contactEmail || '—',
    addressAr: activeTenant?.address || '—',
    addressEn: activeTenant?.addressEn || '—',
    bankNameAr: activeTenant?.bankName || '—',
    bankNameEn: '—',
    iban: activeTenant?.bankIban || '—',
    primaryColor: activeTenant?.uiPrimaryColor || '#1E3A8A',
    secondaryColor: activeTenant?.uiSecondaryColor || '#7C3AED',
    ceoNameAr: 'الإدارة العامة',
    ceoNameEn: 'Executive Management',
    ceoTitleAr: 'المدير العام',
    ceoTitleEn: 'General Manager',
  };

  return (
    <div
      id="official-letterhead-header"
      dir="rtl"
      style={{ fontFamily: "'Tajawal', 'Noto Kufi Arabic', sans-serif" }}
      className="official-letterhead-print bg-white border-b-2 border-neutral-900 pb-5 text-neutral-900"
    >
      {/* Top Banner Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {/* Right side in RTL (Company Logo & Bilingual Name) */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-900/20 bg-slate-950 p-2 shadow-xs">
            <BrandLogo size="md" showText={false} customLogoUrl={safeBrandConfig.customLogoUrl} companyNameAr={safeBrandConfig.companyNameAr} />
          </div>

          <div>
            <h1 className="text-base font-black text-neutral-950 sm:text-lg">
              {safeBrandConfig.companyNameAr}
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
              {safeBrandConfig.companyNameEn}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-600">
              <span>
                س.ت (CR): <strong className="font-mono text-neutral-900">{safeBrandConfig.crNumber}</strong>
              </span>
              <span className="text-neutral-300">•</span>
              <span>
                الرقم الضريبي (VAT): <strong className="font-mono text-neutral-900">{safeBrandConfig.taxNumber}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Left side in RTL (Document Badge & Identification) */}
        <div className="flex flex-col items-start text-right sm:items-end">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-4 py-1.5 text-white shadow-xs">
            <span className="text-xs font-black tracking-wide text-orange-400">
              {isAr ? documentTypeAr : documentTypeEn}
            </span>
          </div>

          {documentNumber && (
            <div className="mt-2 text-xs space-y-0.5">
              <p className="text-neutral-500 font-medium">
                {isAr ? 'الرقم المرجعي:' : 'Ref Number:'}{' '}
                <strong className="font-mono text-neutral-950 font-bold">{documentNumber}</strong>
              </p>
              {issueDate && (
                <p className="text-neutral-500 text-[11px]">
                  {isAr ? 'تاريخ التوثيق:' : 'Issue Date:'}{' '}
                  <strong className="text-neutral-800">{issueDate}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
