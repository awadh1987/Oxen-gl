import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  X,
  Lock,
  Mail,
  Phone,
  MapPin,
  Truck,
  Hash,
  FileText,
  User,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface CompanyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReturnToLogin?: (email: string, companyName: string) => void;
  defaultTenantName?: string;
}

export const CompanyRegistrationModal: React.FC<CompanyRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccessReturnToLogin,
  defaultTenantName,
}) => {
  const { language, brandConfig, logAuditAction } = useApp();
  const isAr = language === 'ar';

  // Form fields state
  const [formData, setFormData] = useState({
    companyName: defaultTenantName || '',
    companyNameEn: '',
    crNumber: '',
    taxNumber: '',
    businessSector: 'crushers',
    adminFullName: '',
    adminJobTitle: 'المدير العام / الرئيس التنفيذي',
    adminEmail: '',
    adminPhone: '+966 ',
    city: 'الرياض',
    fleetSize: '10 - 25 شاحنة',
    initialPassword: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Basic Validation
    if (!formData.companyName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم المنشأة / الشركة.' : 'Please enter company name.');
      return;
    }
    if (!formData.adminFullName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم ممثل المنشأة.' : 'Please enter administrator full name.');
      return;
    }
    if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
      setErrorMsg(isAr ? 'يرجى إدخال بريد إلكتروني مهني صحيح.' : 'Please enter a valid corporate email.');
      return;
    }
    if (!formData.adminPhone.trim() || formData.adminPhone.trim().length < 8) {
      setErrorMsg(isAr ? 'يرجى إدخال رقم جوال صحيح للتواصل.' : 'Please enter a valid phone number.');
      return;
    }

    setIsSubmitting(true);

    const generatedRef = `REQ-ORG-${Date.now().toString().slice(-6)}`;
    setReferenceNumber(generatedRef);

    const usernameDerived = formData.adminEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    // Prepare Approval Request
    const approvalRequest = {
      id: `req-org-${Date.now()}`,
      fullName: formData.adminFullName,
      fullNameAr: formData.adminFullName,
      username: usernameDerived,
      email: formData.adminEmail.trim().toLowerCase(),
      phone: formData.adminPhone,
      requestedRole: 'Admin' as const,
      requestedAt: new Date().toISOString(),
      status: 'Pending' as const,
      notes: `[طلب تسجيل منشأة جديدة: ${formData.companyName}] مرجع: ${generatedRef} | س.ت: ${formData.crNumber || '—'} | رقم ضريبي: ${formData.taxNumber || '—'} | قطاع: ${formData.businessSector} | مدينة: ${formData.city} | أسطول: ${formData.fleetSize} | ممثل المنشأة: ${formData.adminFullName} (${formData.adminJobTitle}) | ملاحظات: ${formData.notes || '—'}`,
    };

    // 1. Try server API registration
    try {
      await fetch('/api/user-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.adminFullName,
          username: usernameDerived,
          email: formData.adminEmail.trim().toLowerCase(),
          password: formData.initialPassword || 'ChangeMe123!',
          phone: formData.adminPhone,
          organization: formData.companyName,
          requested_role: 'Admin',
          notes: approvalRequest.notes,
        }),
      });
    } catch {
      // Graceful fallback for offline / dev preview
    }

    // 2. Persist in local storage for instant visibility in Executive Admin & Tenant queues
    try {
      const existingUserRequests = JSON.parse(localStorage.getItem('meayon_user_requests') || '[]');
      localStorage.setItem('meayon_user_requests', JSON.stringify([approvalRequest, ...existingUserRequests]));

      const existingTenantRequests = JSON.parse(localStorage.getItem('meayon_tenant_registration_requests') || '[]');
      const tenantRecord = {
        referenceNumber: generatedRef,
        ...formData,
        submittedAt: new Date().toISOString(),
        status: 'Pending_Verification',
      };
      localStorage.setItem('meayon_tenant_registration_requests', JSON.stringify([tenantRecord, ...existingTenantRequests]));
    } catch {
      // Storage fallback
    }

    // 3. Log Audit Action
    try {
      logAuditAction({
        userId: 'portal-guest',
        userName: formData.adminFullName,
        userRole: 'Guest',
        action: 'CREATE',
        entityType: 'Tenant',
        entityId: generatedRef,
        summary: `تقديم طلب تسجيل منشأة جديدة (${formData.companyName}) برقم مرجعي: ${generatedRef}`,
        newData: {
          referenceNumber: generatedRef,
          companyName: formData.companyName,
          crNumber: formData.crNumber,
          taxNumber: formData.taxNumber,
          adminEmail: formData.adminEmail,
        },
      });
    } catch {
      // Safe logger
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleCopyRef = () => {
    if (!referenceNumber) return;
    navigator.clipboard.writeText(referenceNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      id="company-registration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        id="company-registration-modal"
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/90 my-auto text-slate-100"
      >
        {/* Modal Top Bar */}
        <div className="relative border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 p-5 sm:p-6">
          <button
            type="button"
            id="close-registration-modal-btn"
            onClick={onClose}
            className="absolute top-5 end-5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer border border-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-white/20">
              <Building2 className="h-6 w-6 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  {isAr ? 'بوابة الشركات والمنشآت' : 'Enterprise Portal'}
                </span>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  {isAr ? 'خدمة فورية' : 'Instant Verification'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                {isAr ? 'طلب تسجيل حساب جديد للمنشأة' : 'Company Account Registration Request'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'تقديم طلب اعتماد وتفعيل حساب منشأة جديدة في بيئة ميون السحابية المعزولة'
                  : 'Submit verification details to provision an isolated enterprise workspace'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto">
          {isSubmitted ? (
            /* --- Submission Success Confirmation View --- */
            <div className="py-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-950">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  {isAr ? 'تم استلام طلب تسجيل منشأتكم بنجاح!' : 'Application Submitted Successfully!'}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-300 font-semibold max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? `تم تسجيل طلب شركة (${formData.companyName}) وإدراجه في قائمة التدقيق والاعتماد الإداري.`
                    : `Registration for (${formData.companyName}) is queued for executive compliance verification.`}
                </p>
              </div>

              {/* Reference Card */}
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 max-w-md mx-auto text-right">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-2.5">
                  <span className="font-bold">{isAr ? 'الرقم المرجعي للطلب:' : 'Reference Number:'}</span>
                  <div className="flex items-center gap-1.5 font-mono font-black text-indigo-300">
                    <span>{referenceNumber}</span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                      title={isAr ? 'نسخ الرقم المرجعي' : 'Copy reference'}
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'البريد المسجل:' : 'Registered Email:'}</span>
                    <span className="font-mono font-medium">{formData.adminEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'ممثل المنشأة:' : 'Representative:'}</span>
                    <span className="font-medium">{formData.adminFullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'الحالة الحالية:' : 'Status:'}</span>
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                      <Clock className="h-3 w-3" />
                      <span>{isAr ? 'قيد المراجعة الإدارية والتحقق' : 'Under Review'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-3.5 text-xs text-indigo-200/90 leading-relaxed max-w-md mx-auto text-right">
                <p>
                  {isAr
                    ? '💡 سيقوم فريق إدارة المنصة بالتحقق من صحة السجل التجاري والبيانات الضريبية، وسيتم تفعيل حساب المدير المسؤول وإشعاركم فورياً عبر البريد الإلكتروني.'
                    : '💡 Our verification team will review your commercial registry. Account access will be activated upon compliance approval.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button
                  type="button"
                  id="return-to-login-after-reg-btn"
                  onClick={() => {
                    onClose();
                    if (onSuccessReturnToLogin) {
                      onSuccessReturnToLogin(formData.adminEmail, formData.companyName);
                    }
                  }}
                  className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  {isAr ? 'العودة إلى شاشة تسجيل الدخول' : 'Back to Login Portal'}
                </button>
              </div>
            </div>
          ) : (
            /* --- Registration Form --- */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-3.5 text-xs font-bold text-rose-300 flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Section 1: Enterprise Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <Building2 className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {isAr ? '1. بيانات المنشأة والسجل التجاري' : '1. Organization & Legal Identifiers'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'اسم المنشأة / الشركة (بالعربية) *' : 'Company Name (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'مثال: شركة نقليات الخليج المحدودة' : 'e.g. Gulf Transport Ltd'}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'اسم المنشأة (بالإنجليزية)' : 'Company Name (English)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gulf Transport Company Ltd"
                      value={formData.companyNameEn}
                      onChange={(e) => setFormData({ ...formData, companyNameEn: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'رقم السجل التجاري (CR)' : 'Commercial Registry (CR)'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="1010XXXXXX"
                        value={formData.crNumber}
                        onChange={(e) => setFormData({ ...formData, crNumber: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono"
                      />
                      <Hash className="absolute end-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'الرقم الضريبي (15 رقم)' : 'VAT Number (15 digits)'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="300XXXXXXXXXXXX"
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono"
                      />
                      <FileText className="absolute end-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'نشاط المنشأة الرئيسي' : 'Industry Sector'}
                    </label>
                    <select
                      value={formData.businessSector}
                      onChange={(e) => setFormData({ ...formData, businessSector: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                    >
                      <option value="crushers">{isAr ? 'كسارات ومقالع مواد البناء' : 'Crushers & Quarries'}</option>
                      <option value="transport">{isAr ? 'أساطيل النقل الثقيل واللوجستيات' : 'Heavy Haulage Fleet'}</option>
                      <option value="contracting">{isAr ? 'مقاولات عامة وتوريد' : 'General Contracting'}</option>
                      <option value="concrete">{isAr ? 'خرسانة جاهزة وبلوك' : 'Ready-Mix & Concrete'}</option>
                      <option value="trading">{isAr ? 'تجارة وتوريد مواد خام' : 'Trading & Raw Materials'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Authorized Representative Info */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {isAr ? '2. بيانات ممثل المنشأة والمسؤول الإداري' : '2. Authorized Admin & Contact'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'الاسم الكامل للمسؤول *' : 'Admin Full Name *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder={isAr ? 'مثال: عبد العزيز بن صالح الغامدي' : 'e.g. Abdulaziz Al-Ghamdi'}
                        value={formData.adminFullName}
                        onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                      />
                      <User className="absolute end-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'المسمى الوظيفي' : 'Job Title / Position'}
                    </label>
                    <input
                      type="text"
                      placeholder={isAr ? 'المدير العام / المدير التنفيذي' : 'Managing Director / CEO'}
                      value={formData.adminJobTitle}
                      onChange={(e) => setFormData({ ...formData, adminJobTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'البريد الإلكتروني المهني *' : 'Corporate Email Address *'}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="admin@company.com.sa"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium font-sans"
                      />
                      <Mail className="absolute end-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'رقم الجوال للتواصل والتحقق *' : 'Contact Phone Number *'}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="+966 50 123 4567"
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono"
                      />
                      <Phone className="absolute end-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Operating Scope */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <Truck className="h-4 w-4 text-orange-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {isAr ? '3. نطاق العمل والتشغيل الميداني' : '3. Operations & Workspace Setup'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'المدينة / المقر الرئيسي' : 'City / Head Office'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isAr ? 'الرياض / الخرج' : 'Riyadh / Al-Kharj'}
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                      />
                      <MapPin className="absolute end-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAr ? 'حجم الأسطول / النقلات التقديري' : 'Estimated Fleet / Trip Volume'}
                    </label>
                    <select
                      value={formData.fleetSize}
                      onChange={(e) => setFormData({ ...formData, fleetSize: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                    >
                      <option value="1 - 5 شاحنات">{isAr ? '1 - 5 شاحنات (بداية التشغيل)' : '1 - 5 Trucks'}</option>
                      <option value="10 - 25 شاحنة">{isAr ? '10 - 25 شاحنة (متوسط)' : '10 - 25 Trucks'}</option>
                      <option value="25 - 50 شاحنة">{isAr ? '25 - 50 شاحنة (كبير)' : '25 - 50 Trucks'}</option>
                      <option value="أكثر من 50 شاحنة">{isAr ? 'أكثر من 50 شاحنة (أسطول ضخم)' : '50+ Trucks Fleet'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isAr ? 'ملاحظات أو متطلبات ربط خاصة' : 'Special Notes / Requirements'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={isAr ? 'اذكر أي تفاصيل إضافية عن الكسارات أو مشاريع النقل المتعاقد معها...' : 'Any details regarding crushers or contractual projects...'}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{isAr ? 'يتم التحقق والمصادقة خلال ساعات العمل الرسمية' : 'Verified during standard business hours'}</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="submit-registration-request-btn"
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition hover:scale-[1.01] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                      </div>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{isAr ? 'إرسال طلب التسجيل' : 'Submit Application'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
