import React from 'react';
import { BrandConfig } from '../types';
import { useApp } from '../context/AppContext';

interface OfficialLetterheadFooterProps {
  brandConfig?: BrandConfig;
  isAr?: boolean;
  pageNumberText?: string;
}

export const OfficialLetterheadFooter: React.FC<OfficialLetterheadFooterProps> = ({
  brandConfig: propBrandConfig,
  isAr = true,
  pageNumberText,
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
    addressAr: activeTenant?.address || 'المملكة العربية السعودية',
    addressEn: activeTenant?.addressEn || 'Kingdom of Saudi Arabia',
    bankNameAr: activeTenant?.bankName || 'مصرف معتمد',
    bankNameEn: 'Approved Bank',
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
      id="official-letterhead-footer"
      dir="rtl"
      style={{ fontFamily: "'Tajawal', 'Noto Kufi Arabic', sans-serif" }}
      className="official-footer-print mt-8 border-t border-neutral-300 pt-4 text-center text-[10px] text-neutral-600 bg-white"
    >
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="text-right">
          <p className="font-semibold text-neutral-800">
            {safeBrandConfig.addressAr}
          </p>
          <p className="text-neutral-500">
            هاتف: <span className="font-mono">{safeBrandConfig.phone}</span> | البريد:{' '}
            <span className="font-mono">{safeBrandConfig.email}</span>
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
