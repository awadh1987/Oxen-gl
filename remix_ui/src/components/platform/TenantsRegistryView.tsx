import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  ExternalLink,
  Edit,
  Power,
  Copy,
  Check,
  ShieldCheck,
  Users,
  Layers,
  MapPin,
  Phone,
  Mail,
  FileText,
  Sparkles,
  AlertCircle,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const TenantsRegistryView: React.FC = () => {
  const { language, activeTenantId, switchTenant } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New Tenant Form
  const [newTenantForm, setNewTenantForm] = useState({
    company_name: '',
    company_name_en: '',
    commercial_register: '',
    tax_number: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    logo_url: '',
    subscription_tier: 'PROFESSIONAL',
    plan_type: 'PRO',
    max_allowed_cost_centers: 15,
    max_allowed_users: 15,
    max_allowed_branches: 3,
    ui_primary_color: '#1E3A8A',
    ui_secondary_color: '#7C3AED',
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTenants();
      if (Array.isArray(data)) {
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSwitchToTenant = async (tenantId: string) => {
    await switchTenant(tenantId);
    navigate('/workspace');
  };

  const handleToggleActive = async (tenant: any) => {
    try {
      const newStatus = !(tenant.isActive ?? tenant.is_active ?? true);
      await apiService.updateTenant(tenant.tenantId, { is_active: newStatus });
      setTenants((prev) =>
        prev.map((t) => (t.tenantId === tenant.tenantId ? { ...t, isActive: newStatus, is_active: newStatus } : t))
      );
      setActionSuccessMessage(
        newStatus
          ? isAr ? 'تم إعادة تفعيل المنشأة بنجاح' : 'Tenant activated successfully'
          : isAr ? 'تم إيقاف المنشأة بنجاح' : 'Tenant suspended successfully'
      );
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to toggle tenant status:', err);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await apiService.createTenant(newTenantForm);
      setTenants((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewTenantForm({
        company_name: '',
        company_name_en: '',
        commercial_register: '',
        tax_number: '',
        address: '',
        contact_phone: '',
        contact_email: '',
        logo_url: '',
        subscription_tier: 'PROFESSIONAL',
        plan_type: 'PRO',
        max_allowed_cost_centers: 15,
        max_allowed_users: 15,
        max_allowed_branches: 3,
        ui_primary_color: '#1E3A8A',
        ui_secondary_color: '#7C3AED',
      });
      setActionSuccessMessage(isAr ? 'تم تسجيل المنشأة وإصدار الترخيص بنجاح' : 'Tenant registered successfully');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to create tenant:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSubmitting(true);
    try {
      const updated = await apiService.updateTenant(editingTenant.tenantId, editingTenant);
      setTenants((prev) =>
        prev.map((t) => (t.tenantId === editingTenant.tenantId ? { ...t, ...updated } : t))
      );
      setIsEditModalOpen(false);
      setEditingTenant(null);
      setActionSuccessMessage(isAr ? 'تم تحديث بيانات المنشأة بنجاح' : 'Tenant updated successfully');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update tenant:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const name = (t.companyName || t.company_name || '').toLowerCase();
    const nameEn = (t.companyNameEn || t.company_name_en || '').toLowerCase();
    const cr = (t.crNumber || t.commercialRegister || t.commercial_register || '').toLowerCase();
    const vat = (t.taxNumber || t.tax_number || '').toLowerCase();
    const key = (t.licenseKey || t.license_key || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      name.includes(search) ||
      nameEn.includes(search) ||
      cr.includes(search) ||
      vat.includes(search) ||
      key.includes(search);

    const tier = (t.subscriptionTier || t.subscription_tier || '').toUpperCase();
    const matchesTier = tierFilter === 'ALL' || tier === tierFilter;

    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6" id="tenants-registry-view">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-inner">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">
                {isAr ? 'سجل المنشآت والشركات المشتركة' : 'Enterprise Tenants Registry'}
              </h1>
              <span className="rounded-full bg-blue-500/30 px-3 py-0.5 text-xs font-bold text-blue-200 border border-blue-400/30">
                {tenants.length} {isAr ? 'منشأة مسجلة' : 'Tenants'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'إدارة حسابات الشركات والمستأجرين في السحابة، ضبط الحدود التشغيلية ومفاتيح التراخيص، وإمكانية الدخول المباشر لمعاينة بيئة أي منشأة.'
                : 'Manage cloud tenant entities, quotas, licensing keys, and direct switch-in to inspect workspaces.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTenants}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:brightness-110 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'تسجيل منشأة جديدة' : 'Register New Tenant'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 shadow-xs">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث باسم المنشأة، السجل التجاري، الرقم الضريبي، أو مفتاح الترخيص...' : 'Search by company, CR, VAT, or key...'}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-10 pl-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{isAr ? 'الباقة:' : 'Tier:'}</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">{isAr ? 'كافة الباقات' : 'All Tiers'}</option>
            <option value="BASIC">{isAr ? 'الأساسية (Basic)' : 'Basic'}</option>
            <option value="PROFESSIONAL">{isAr ? 'الاحترافية (Professional)' : 'Professional'}</option>
            <option value="ENTERPRISE">{isAr ? 'المؤسسية (Enterprise)' : 'Enterprise'}</option>
          </select>
        </div>
      </div>

      {/* Tenants Table Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="p-4">{isAr ? 'المنشأة والهوية' : 'Tenant & Identity'}</th>
                <th className="p-4">{isAr ? 'السجل والضريبة' : 'CR & VAT'}</th>
                <th className="p-4">{isAr ? 'الباقة والحدود' : 'Plan & Quotas'}</th>
                <th className="p-4">{isAr ? 'مفتاح الترخيص' : 'License Key'}</th>
                <th className="p-4">{isAr ? 'الاتصال والمقر' : 'Contact & Location'}</th>
                <th className="p-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-4 text-center">{isAr ? 'إجراءات التحكم' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2" />
                    <span>{isAr ? 'جارٍ تحميل سجل المنشآت...' : 'Loading tenants registry...'}</span>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <span>{isAr ? 'لا توجد منشآت مطابقة للبحث' : 'No tenants found'}</span>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const isActive = tenant.isActive ?? tenant.is_active ?? true;
                  const isCurrent = tenant.tenantId === activeTenantId;
                  const tier = (tenant.subscriptionTier || tenant.subscription_tier || 'PROFESSIONAL').toUpperCase();
                  const key = tenant.licenseKey || tenant.license_key || '—';

                  const tierStyles: Record<string, string> = {
                    BASIC: 'bg-amber-50 text-amber-700 border-amber-200',
                    PROFESSIONAL: 'bg-blue-50 text-blue-700 border-blue-200',
                    ENTERPRISE: 'bg-purple-50 text-purple-700 border-purple-200',
                  };

                  return (
                    <tr
                      key={tenant.tenantId}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isCurrent ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Company Name & Logo */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              backgroundColor: tenant.uiPrimaryColor || '#1E3A8A',
                            }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-xs overflow-hidden"
                          >
                            {tenant.logoUrl || tenant.uiLogoUrl ? (
                              <img
                                src={tenant.logoUrl || tenant.uiLogoUrl}
                                alt="logo"
                                className="h-full w-full object-contain bg-white"
                              />
                            ) : (
                              (tenant.companyName || tenant.company_name || 'M').charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {tenant.companyName || tenant.company_name}
                              </span>
                              {isCurrent && (
                                <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {isAr ? 'النشط حالياً' : 'Active'}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {tenant.companyNameEn || tenant.company_name_en || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* CR & Tax Number */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[10px]">CR:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {tenant.crNumber || tenant.commercialRegister || tenant.commercial_register || '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[10px]">VAT:</span>
                            <span className="font-mono text-slate-600">
                              {tenant.taxNumber || tenant.tax_number || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Quotas */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                              tierStyles[tier] || tierStyles.PROFESSIONAL
                            }`}
                          >
                            {tier}
                          </span>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span title="مراكز التكلفة المسموحة">
                              {tenant.maxAllowedCostCenters || 10} {isAr ? 'مراكز' : 'CC'}
                            </span>
                            <span>•</span>
                            <span title="المستخدمين المسموحين">
                              {tenant.maxAllowedUsers || 15} {isAr ? 'مستخدم' : 'Users'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* License Key */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 max-w-[140px] truncate">
                            {key}
                          </code>
                          <button
                            onClick={() => handleCopy(key, tenant.tenantId)}
                            title={isAr ? 'نسخ المفتاح' : 'Copy Key'}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            {copiedKey === tenant.tenantId ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="p-4">
                        <div className="space-y-0.5 text-[11px] text-slate-600">
                          <p className="truncate max-w-[150px]">
                            {tenant.address || '—'}
                          </p>
                          <p className="text-slate-400 font-mono text-[10px]">
                            {tenant.contactPhone || tenant.contactEmail || '—'}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {isActive ? (isAr ? 'نشط ومفعّل' : 'Active') : isAr ? 'معلّق / موقوف' : 'Suspended'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Switch to Tenant Workspace Button */}
                          <button
                            onClick={() => handleSwitchToTenant(tenant.tenantId)}
                            title={isAr ? 'الدخول إلى بيئة عمل المنشأة' : 'Switch to Tenant Workspace'}
                            className="flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>{isAr ? 'دخول البيئة' : 'Open'}</span>
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => {
                              setEditingTenant({ ...tenant });
                              setIsEditModalOpen(true);
                            }}
                            title={isAr ? 'تعديل البيانات' : 'Edit details'}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => handleToggleActive(tenant)}
                            title={isActive ? (isAr ? 'إيقاف المنشأة' : 'Suspend') : isAr ? 'إعادة التفعيل' : 'Activate'}
                            className={`rounded-xl border p-1.5 transition ${
                              isActive
                                ? 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New Tenant */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  {isAr ? 'تسجيل منشأة جديدة وإصدار ترخيص سحابي' : 'Register New Enterprise Tenant'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنشأة بالعربية *' : 'Company Name (Ar) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantForm.company_name}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, company_name: e.target.value })
                    }
                    placeholder="مثال: شركة الروابي للمقاولات"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنشأة بالإنجليزية' : 'Company Name (En)'}
                  </label>
                  <input
                    type="text"
                    value={newTenantForm.company_name_en}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, company_name_en: e.target.value })
                    }
                    placeholder="e.g. Al-Rawabi Contracting Co."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'رقم السجل التجاري (CR) *' : 'Commercial Register (CR) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantForm.commercial_register}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, commercial_register: e.target.value })
                    }
                    placeholder="1010XXXXXX"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'الرقم الضريبي (VAT) *' : 'Tax Number (VAT) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantForm.tax_number}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, tax_number: e.target.value })
                    }
                    placeholder="300XXXXXXXX0003"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'باقة الاشتراك *' : 'Subscription Tier *'}
                  </label>
                  <select
                    value={newTenantForm.subscription_tier}
                    onChange={(e) =>
                      setNewTenantForm({
                        ...newTenantForm,
                        subscription_tier: e.target.value,
                        max_allowed_cost_centers:
                          e.target.value === 'BASIC' ? 5 : e.target.value === 'PROFESSIONAL' ? 15 : 50,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="BASIC">{isAr ? 'الأساسية (Basic - 5 مراكز تكلفة)' : 'Basic (5 CC)'}</option>
                    <option value="PROFESSIONAL">{isAr ? 'الاحترافية (Professional - 15 مركز تكلفة)' : 'Professional (15 CC)'}</option>
                    <option value="ENTERPRISE">{isAr ? 'المؤسسية (Enterprise - 50 مركز تكلفة)' : 'Enterprise (50 CC)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'رقم الهاتف / الجوال' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={newTenantForm.contact_phone}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, contact_phone: e.target.value })
                    }
                    placeholder="+966 50 123 4567"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'البريد الإلكتروني الرسمي' : 'Official Email'}
                  </label>
                  <input
                    type="email"
                    value={newTenantForm.contact_email}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, contact_email: e.target.value })
                    }
                    placeholder="info@company.sa"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'رابط الشعار المخصص (Logo URL)' : 'Logo URL'}
                  </label>
                  <input
                    type="text"
                    value={newTenantForm.logo_url}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, logo_url: e.target.value })
                    }
                    placeholder="https://... أو /logo.png"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'العنوان والمقر الرئيسي' : 'Office Address'}
                  </label>
                  <input
                    type="text"
                    value={newTenantForm.address}
                    onChange={(e) =>
                      setNewTenantForm({ ...newTenantForm, address: e.target.value })
                    }
                    placeholder="الرياض - طريق الملك عبد العزيز"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isAr ? 'تأكيد التسجيل وإصدار المفتاح' : 'Register & Issue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Tenant */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  {isAr ? 'تعديل بيانات المنشأة والترخيص' : 'Edit Tenant Details'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTenant(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنشأة بالعربية' : 'Company Name (Ar)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTenant.companyName || editingTenant.company_name || ''}
                    onChange={(e) =>
                      setEditingTenant({
                        ...editingTenant,
                        companyName: e.target.value,
                        company_name: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنشأة بالإنجليزية' : 'Company Name (En)'}
                  </label>
                  <input
                    type="text"
                    value={editingTenant.companyNameEn || editingTenant.company_name_en || ''}
                    onChange={(e) =>
                      setEditingTenant({
                        ...editingTenant,
                        companyNameEn: e.target.value,
                        company_name_en: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'السجل التجاري (CR)' : 'Commercial Register (CR)'}
                  </label>
                  <input
                    type="text"
                    value={editingTenant.crNumber || editingTenant.commercialRegister || ''}
                    onChange={(e) =>
                      setEditingTenant({
                        ...editingTenant,
                        crNumber: e.target.value,
                        commercialRegister: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'الرقم الضريبي (VAT)' : 'Tax Number (VAT)'}
                  </label>
                  <input
                    type="text"
                    value={editingTenant.taxNumber || editingTenant.tax_number || ''}
                    onChange={(e) =>
                      setEditingTenant({
                        ...editingTenant,
                        taxNumber: e.target.value,
                        tax_number: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'باقة الاشتراك' : 'Subscription Tier'}
                  </label>
                  <select
                    value={editingTenant.subscriptionTier || editingTenant.subscription_tier || 'PROFESSIONAL'}
                    onChange={(e) =>
                      setEditingTenant({
                        ...editingTenant,
                        subscriptionTier: e.target.value,
                        subscription_tier: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'الحد الأقصى لمراكز التكلفة' : 'Max Allowed Cost Centers'}
                  </label>
                  <input
                    type="number"
                    value={editingTenant.maxAllowedCostCenters || 10}
                    onChange={(e) =>
                      setEditingTenant({
                        ...editingTenant,
                        maxAllowedCostCenters: Number(e.target.value),
                        max_allowed_cost_centers: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={editingTenant.contactPhone || ''}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, contactPhone: e.target.value, contact_phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={editingTenant.contactEmail || ''}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, contactEmail: e.target.value, contact_email: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'العنوان' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={editingTenant.address || ''}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, address: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTenant(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
