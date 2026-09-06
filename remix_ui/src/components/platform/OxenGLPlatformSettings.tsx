import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Palette,
  Globe,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Sliders,
  DollarSign,
  Lock,
  Upload,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export const OxenGLPlatformSettings: React.FC = () => {
  const { language, brandConfig, updateBrandConfig, isPlatformSuperAdmin } = useApp();
  const isAr = language === 'ar';

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Platform Master Brand & Dynamic Settings
  const [platformNameAr, setPlatformNameAr] = useState(() => {
    return localStorage.getItem('oxengl_platform_name_ar') || 'منصة أوكسن جي إل السحابية';
  });
  const [platformNameEn, setPlatformNameEn] = useState(() => {
    return localStorage.getItem('oxengl_platform_name_en') || 'OxenGL Cloud ERP Platform';
  });
  const [platformSloganAr, setPlatformSloganAr] = useState(() => {
    return localStorage.getItem('oxengl_platform_slogan_ar') || 'المنظومة السحابية الموحدة لإدارة النقليات، الكسارات، والمقاولات العامة';
  });
  const [platformSloganEn, setPlatformSloganEn] = useState(() => {
    return localStorage.getItem('oxengl_platform_slogan_en') || 'Unified Multi-Tenant Cloud ERP for Transport, Quarries & Logistics';
  });
  const [platformLogoUrl, setPlatformLogoUrl] = useState(() => {
    return localStorage.getItem('oxengl_platform_logo_url') || brandConfig.customLogoUrl || '/logo.png';
  });
  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('oxengl_primary_color') || '#1E3A8A';
  });
  const [secondaryColor, setSecondaryColor] = useState(() => {
    return localStorage.getItem('oxengl_secondary_color') || '#4338CA';
  });
  const [supportEmail, setSupportEmail] = useState(() => {
    return localStorage.getItem('oxengl_support_email') || 'awadh.a.1987@gmail.com';
  });
  const [supportPhone, setSupportPhone] = useState(() => {
    return localStorage.getItem('oxengl_support_phone') || '+966 50 123 4567';
  });
  const [operatorCrNumber, setOperatorCrNumber] = useState(() => {
    return localStorage.getItem('oxengl_operator_cr') || '1010789012';
  });
  const [operatorTaxNumber, setOperatorTaxNumber] = useState(() => {
    return localStorage.getItem('oxengl_operator_vat') || '310987654300003';
  });
  const [announcementText, setAnnouncementText] = useState(() => {
    return localStorage.getItem('oxengl_announcement') || 'مرحباً بكم في منصة OxenGL السحابية - التحديث v2.0 معتمد ومتوافق مع هيئة الزكاة والضريبة (ZATCA).';
  });
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(() => {
    return localStorage.getItem('oxengl_announcement_active') === 'true';
  });
  const [vatRate, setVatRate] = useState<number>(() => {
    return Number(localStorage.getItem('oxengl_default_vat_rate')) || 15;
  });
  const [currencyCode, setCurrencyCode] = useState(() => {
    return localStorage.getItem('oxengl_currency_code') || 'SAR';
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPlatformLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('oxengl_platform_name_ar', platformNameAr);
    localStorage.setItem('oxengl_platform_name_en', platformNameEn);
    localStorage.setItem('oxengl_platform_slogan_ar', platformSloganAr);
    localStorage.setItem('oxengl_platform_slogan_en', platformSloganEn);
    localStorage.setItem('oxengl_platform_logo_url', platformLogoUrl);
    localStorage.setItem('oxengl_primary_color', primaryColor);
    localStorage.setItem('oxengl_secondary_color', secondaryColor);
    localStorage.setItem('oxengl_support_email', supportEmail);
    localStorage.setItem('oxengl_support_phone', supportPhone);
    localStorage.setItem('oxengl_operator_cr', operatorCrNumber);
    localStorage.setItem('oxengl_operator_vat', operatorTaxNumber);
    localStorage.setItem('oxengl_announcement', announcementText);
    localStorage.setItem('oxengl_announcement_active', String(isAnnouncementActive));
    localStorage.setItem('oxengl_default_vat_rate', String(vatRate));
    localStorage.setItem('oxengl_currency_code', currencyCode);

    // Sync with AppContext brandConfig if needed
    updateBrandConfig({
      companyNameAr: platformNameAr,
      companyNameEn: platformNameEn,
      customLogoUrl: platformLogoUrl,
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
      phone: supportPhone,
      email: supportEmail,
      crNumber: operatorCrNumber,
      taxNumber: operatorTaxNumber,
      sloganAr: platformSloganAr,
      sloganEn: platformSloganEn,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetDefaults = () => {
    if (confirm(isAr ? 'هل تريد استعادة الإعدادات الافتراضية لمنصة OxenGL؟' : 'Reset OxenGL platform settings to defaults?')) {
      setPlatformNameAr('منصة أوكسن جي إل السحابية');
      setPlatformNameEn('OxenGL Cloud ERP Platform');
      setPlatformSloganAr('المنظومة السحابية الموحدة لإدارة النقليات، الكسارات، والمقاولات العامة');
      setPlatformSloganEn('Unified Multi-Tenant Cloud ERP for Transport, Quarries & Logistics');
      setPlatformLogoUrl('/logo.png');
      setPrimaryColor('#1E3A8A');
      setSecondaryColor('#4338CA');
      setSupportEmail('awadh.a.1987@gmail.com');
      setSupportPhone('+966 50 123 4567');
      setVatRate(15);
      setCurrencyCode('SAR');
      setIsAnnouncementActive(true);
      setAnnouncementText('مرحباً بكم في منصة OxenGL السحابية - التحديث v2.0 معتمد ومتوافق مع هيئة الزكاة والضريبة (ZATCA).');
    }
  };

  return (
    <div id="oxengl-platform-settings-container" className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-400 shadow-inner shrink-0">
              <Crown className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300 border border-amber-400/30">
                  {isAr ? 'إعدادات مالك المنصة' : 'Platform Owner Console'}
                </span>
                <span className="text-xs text-indigo-200 font-mono">v2.0 OxenGL Master</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                {isAr ? 'إعدادات منصة OxenGL والهوية البصرية' : 'OxenGL Platform Settings & Master Branding'}
              </h1>
              <p className="text-xs text-indigo-100/80 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'التحكم المركزي في العلامة التجارية لمنصة OxenGL، الهوية البصرية، الإعلانات الموجهة للشركات، ومعايير الامتثال المالي السحابي.'
                  : 'Master control center for OxenGL platform identity, white-label defaults, system-wide announcements, and multi-tenant compliance.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-200 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-5 py-2.5 text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isAr ? 'حفظ كافة الإعدادات' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">
              {isAr ? 'تم حفظ وتطبيق إعدادات منصة OxenGL بنجاح!' : 'OxenGL platform settings saved successfully!'}
            </span>
            <span className="mr-2 text-emerald-700">
              {isAr
                ? 'تم تحديث الهوية البصرية والبيانات الديناميكية لكافة المنظومة.'
                : 'Master branding and platform variables are synchronized across the system.'}
            </span>
          </div>
        </div>
      )}

      {/* Main Settings Grid Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Identity & Brand Logo */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Platform Visual Branding */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Palette className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'الهوية البصرية والعلامة التجارية (OxenGL Master Branding)' : 'Visual Branding & Logo'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'الاسم الرسمي للمنصة، الشعار الرئيسي، وألوان الترويسة'
                    : 'Master platform name, primary logo, and header color palette'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنصة بالعربية' : 'Platform Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={platformNameAr}
                    onChange={(e) => setPlatformNameAr(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden font-medium"
                    placeholder="منصة أوكسن جي إل السحابية"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنصة بالإنجليزية (Master Brand)' : 'Platform Name (English)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={platformNameEn}
                    onChange={(e) => setPlatformNameEn(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden font-medium"
                    placeholder="OxenGL Cloud ERP Platform"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'شعار المنصة (Slogan / Tagline)' : 'Platform Tagline'}
                </label>
                <input
                  type="text"
                  value={platformSloganAr}
                  onChange={(e) => setPlatformSloganAr(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden"
                  placeholder="المنظومة السحابية الموحدة لإدارة النقليات، الكسارات، والمقاولات العامة"
                />
              </div>

              {/* Logo Selection & Preview */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  {isAr ? 'شعار المنصة الرئيسي (Platform Logo)' : 'Master Platform Logo'}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 p-2 shadow-xs">
                    <img
                      src={platformLogoUrl}
                      alt="OxenGL Logo Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={platformLogoUrl}
                        onChange={(e) => setPlatformLogoUrl(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono"
                        placeholder="/logo.png or https://..."
                      />
                      <label className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs shrink-0">
                        <Upload className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{isAr ? 'رفع شعار' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      {isAr
                        ? 'يدعم صيغ PNG و SVG و JPG بدقة عالية وخلفية شفافة.'
                        : 'Supports high-res PNG, SVG, or JPG with transparent background.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand Palette Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اللون الأساسي الرئيسي (Primary Brand Color)' : 'Primary Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-12 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'لون التدرج الثانوي (Secondary Accent Color)' : 'Secondary Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-9 w-12 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: System Broadcast Announcements & Dynamic Messages */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isAr ? 'شريط الإعلانات والرسائل اللحظية للشركات' : 'System-Wide Broadcast Announcement'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr
                      ? 'رسالة تنبيهية تظهر في أعلى شاشة كافة المنشآت والمستخدمين في النظام'
                      : 'Live broadcast notice displayed to all tenant users in the system'}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-600">
                  {isAnnouncementActive ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                </span>
                <input
                  type="checkbox"
                  checked={isAnnouncementActive}
                  onChange={(e) => setIsAnnouncementActive(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden leading-relaxed"
                placeholder="أدخل رسالة الإعلان للمستأجرين..."
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isAr ? 'تظهر في واجهة المنصة وبيئات الشركات' : 'Broadcasts to OxenGL & Tenant Workspaces'}</span>
                <span>{announcementText.length} حرف</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Operator Details & Compliance Defaults */}
        <div className="space-y-6">
          {/* Card 3: Platform Operator Legal Details */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'بيانات مشغل المنصة القانونية' : 'Platform Operator Info'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'السجل والضريبة لشركة تشغيل OxenGL' : 'Legal registration and tax identity'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'السجل التجاري لمشغل المنصة' : 'Operator CR Number'}
                </label>
                <input
                  type="text"
                  value={operatorCrNumber}
                  onChange={(e) => setOperatorCrNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  placeholder="1010789012"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'الرقم الضريبي المعتمد (15 رقم)' : 'Operator VAT Number'}
                </label>
                <input
                  type="text"
                  value={operatorTaxNumber}
                  onChange={(e) => setOperatorTaxNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  placeholder="310987654300003"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'البريد الإلكتروني للدعم المركزي' : 'Support Email'}
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  placeholder="support@oxengl.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'هاتف وواتساب الدعم السحابي' : 'Support Phone / WhatsApp'}
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  placeholder="+966 50 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Global Accounting & ZATCA Standards */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'معايير الامتثال المالي (ZATCA Engine)' : 'Compliance & VAT Standards'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'نسبة الضريبة والعملة الافتراضية' : 'Default VAT rate & base currency'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'نسبة ضريبة القيمة المضافة الافتراضية' : 'Default VAT Rate (%)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900"
                  />
                  <span className="absolute top-2 left-3 rtl:left-auto rtl:right-auto rtl:left-3 text-xs font-black text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr ? 'المعيار المعتمد في المملكة العربية السعودية (15%)' : 'Standard Saudi ZATCA rate is 15%'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'العملة الرسمية للنظام' : 'System Base Currency'}
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="SAR">{isAr ? 'ريال سعودي (SAR)' : 'Saudi Riyal (SAR)'}</option>
                  <option value="USD">{isAr ? 'دولار أمريكي (USD)' : 'US Dollar (USD)'}</option>
                  <option value="AED">{isAr ? 'درهم إماراتي (AED)' : 'UAE Dirham (AED)'}</option>
                  <option value="QAR">{isAr ? 'ريال قطري (QAR)' : 'Qatari Riyal (QAR)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-violet-900 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs shadow-lg shadow-indigo-950/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4 text-amber-400" />
            <span>{isAr ? 'اعتماد وحفظ إعدادات منصة OxenGL' : 'Commit & Save Platform Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
