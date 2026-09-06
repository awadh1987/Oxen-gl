import React from 'react';
import { BrandConfig } from '../types';

interface OfficialLetterheadFooterProps {
  brandConfig?: BrandConfig;
  isAr?: boolean;
  pageNumberText?: string;
}

export const OfficialLetterheadFooter: React.FC<OfficialLetterheadFooterProps> = ({
  brandConfig,
  isAr = true,
  pageNumberText,
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
      id="official-letterhead-footer"
      dir="rtl"
      style={{ fontFamily: "'Tajawal', 'Noto Kufi Arabic', sans-serif" }}
      className="official-footer-print mt-8 border-t border-neutral-300 pt-4 text-center text-[10px] text-neutral-600 bg-white"
    >
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="text-right">
          <p className="font-semibold text-neutral-800">
            {safeBrandConfig.addressAr || 'الرياض - طريق الملك عبد العزيز - برج الأعمال'}
          </p>
          <p className="text-neutral-500">
            هاتف: <span className="font-mono">{safeBrandConfig.phone || '+966 11 482 9900'}</span> | البريد:{' '}
            <span className="font-mono">{safeBrandConfig.email || 'info@meayon.com'}</span>
          </p>
        </div>

        <div className="text-center sm:text-left">
          <p className="font-mono text-neutral-900 font-bold">
            {safeBrandConfig.bankNameAr} | IBAN: {safeBrandConfig.iban}
          </p>
          {pageNumberText && (
            <p className="text-[9px] text-neutral-400 font-medium">{pageNumberText}</p>
          )}
        </div>
      </div>

      <div className="mt-2 text-[9px] text-neutral-400 border-t border-neutral-100 pt-1">
        {isAr
          ? 'وثيقة رسمية معتمدة إلكترونياً صادرة من نظام ميون مقاولات ولوجستيات (MYON ERP) • خاضعة لأنظمة هيئة الزكاة والضريبة والجمارك (ZATCA)'
          : 'Official verified electronic document issued by MYON Contracting & Logistics ERP • Compliant with ZATCA regulations'}
      </div>
    </div>
  );
};
