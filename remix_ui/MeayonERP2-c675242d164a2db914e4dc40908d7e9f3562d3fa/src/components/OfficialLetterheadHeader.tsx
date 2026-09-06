import React from 'react';
import { BrandConfig } from '../types';
import { BrandLogo } from './BrandLogo';

interface OfficialLetterheadHeaderProps {
  brandConfig?: BrandConfig;
  documentTypeAr?: string;
  documentTypeEn?: string;
  documentNumber?: string;
  issueDate?: string;
  isAr?: boolean;
}

export const OfficialLetterheadHeader: React.FC<OfficialLetterheadHeaderProps> = ({
  brandConfig,
  documentTypeAr = 'فاتورة ضريبية معتمدة',
  documentTypeEn = 'TAX INVOICE',
  documentNumber,
  issueDate,
  isAr = true,
}) => {
  const safeBrandConfig: BrandConfig = brandConfig || {
    companyNameAr: 'ميون مقاولات ولوجستيات',
    companyNameEn: 'MYON Contracting & Logistics',
    crNumber: '1010894520',
    taxNumber: '300189452300003',
    phone: '+966 11 482 9900',
    email: 'info@meayon.com',
    addressAr: 'الرياض - طريق الملك عبد العزيز',
    addressEn: 'Riyadh - King Abdulaziz Road',
    bankNameAr: 'بنك الرياض',
    bankNameEn: 'Al Rajhi Bank',
    iban: 'SA1234567890123456789012',
    primaryColor: '#F05627',
    secondaryColor: '#1F2937',
    ceoNameAr: 'إدارة ميون',
    ceoNameEn: 'MYON Management',
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-orange-500/30 bg-neutral-950 p-2 shadow-xs">
            <BrandLogo size="md" showText={false} />
          </div>

          <div>
            <h1 className="text-base font-black text-neutral-950 sm:text-lg">
              {safeBrandConfig.companyNameAr || 'ميون مقاولات ولوجستيات'}
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F05627]">
              {safeBrandConfig.companyNameEn || 'MYON Contracting & Logistics'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-600">
              <span>
                س.ت (CR): <strong className="font-mono text-neutral-900">{safeBrandConfig.crNumber || '1010894520'}</strong>
              </span>
              <span className="text-neutral-300">•</span>
              <span>
                الرقم الضريبي (VAT): <strong className="font-mono text-neutral-900">{safeBrandConfig.taxNumber || '300189452300003'}</strong>
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
