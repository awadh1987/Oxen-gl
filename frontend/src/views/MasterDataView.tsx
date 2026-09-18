import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { erpApi, Partner } from '../services/api';
import {
  Database,
  Building2,
  Truck,
  Users,
  Package,
  Plus,
  Edit2,
  Trash2,
  Shield,
  CheckCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Layers,
  FileSpreadsheet,
  Search,
  UserPlus,
  Key,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { EntityCRUDModal, CRUDModalType } from '../components/EntityCRUDModal';
import { CsvImportModal, CsvImportEntityType } from '../components/CsvImportModal';

export const MasterDataView: React.FC = () => {
  const {
    customers,
    crushers,
    transporters,
    materials,
    users,
    refreshUsers,
    currentCompany,
    setCurrentCompany,
    refreshCompanies,
    deleteCustomer,
    deleteCrusher,
    deleteTransporter,
    deleteMaterial,
    deleteUser,
    isAdmin,
    language,
  } = useApp();

  const isAr = language === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<CRUDModalType>('customer');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CRUDModalType>('customer');
  const [selectedEntityData, setSelectedEntityData] = useState<any | null>(null);

  // Invite User Modal State (Task 4.2 & 4.3)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Accountant' | 'Data_Entry' | 'Guest'>('Accountant');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    temporary_password: string;
    role: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // CSV Batch Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvDefaultType, setCsvDefaultType] = useState<CsvImportEntityType>('customers');
  const [backendPartners, setBackendPartners] = useState<Partner[]>([]);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', fiscalCalendar: 'gregorian', fiscalYearStartMonth: 1, taxRegime: 'KSA_VAT', uiPrimaryColor: '#1E3A8A', uiSecondaryColor: '#7C3AED', uiLogoUrl: '' });
  const [partnerForm, setPartnerForm] = useState({ name: '', partner_type: 'customer', email: '', phone: '', tax_number: '', commercial_registration: '', branch_scope_ids: '', warehouse_scope_ids: '', access_control_list: '' });

  useEffect(() => {
    if (!currentCompany) return;
    setCompanyForm({
      name: currentCompany.name,
      fiscalCalendar: currentCompany.fiscalCalendar || 'gregorian',
      fiscalYearStartMonth: currentCompany.fiscalYearStartMonth || 1,
      taxRegime: currentCompany.taxRegime || 'KSA_VAT',
      uiPrimaryColor: currentCompany.uiPrimaryColor || '#1E3A8A',
      uiSecondaryColor: currentCompany.uiSecondaryColor || '#7C3AED',
      uiLogoUrl: currentCompany.uiLogoUrl || '',
    });
    erpApi.getPartners(currentCompany.id).then(setBackendPartners).catch((error) => setBackendStatus(error instanceof Error ? error.message : 'Could not load partners'));
  }, [currentCompany]);

  const saveCompanyProfile = async () => {
    if (!currentCompany) return;
    setBackendStatus(null);
    try {
      const updated = await erpApi.updateCompany(currentCompany.id, {
        name: companyForm.name,
        fiscal_calendar: companyForm.fiscalCalendar,
        fiscal_year_start_month: companyForm.fiscalYearStartMonth,
        tax_regime: companyForm.taxRegime,
        ui_primary_color: companyForm.uiPrimaryColor,
        ui_secondary_color: companyForm.uiSecondaryColor,
        ui_logo_url: companyForm.uiLogoUrl || null,
      });
      await refreshCompanies();
      setCurrentCompany({
        id: updated.id,
        parentId: updated.parent_id,
        name: updated.name,
        slug: updated.slug,
        commercialRegistration: updated.commercial_registration || undefined,
        taxId: updated.tax_id || undefined,
        currency: updated.currency,
        fiscalCalendar: updated.fiscal_calendar,
        fiscalYearStartMonth: updated.fiscal_year_start_month,
        taxRegime: updated.tax_regime,
        subscriptionTier: updated.subscription_tier,
        licenseKey: updated.license_key,
        licenseExpiresAt: updated.license_expires_at,
        maxCostCenters: updated.max_cost_centers,
        themeMode: updated.theme_mode,
        uiPrimaryColor: updated.ui_primary_color,
        uiSecondaryColor: updated.ui_secondary_color,
        uiLogoUrl: updated.ui_logo_url,
      });
      setBackendStatus(isAr ? 'تم تحديث بيانات المنشأة.' : 'Company profile updated.');
    } catch (error) {
      setBackendStatus(error instanceof Error ? error.message : 'Could not update company profile');
    }
  };

  const savePartner = async (partner?: Partner) => {
    if (!currentCompany) return;
    setBackendStatus(null);
    try {
      const payload = {
        name: partner?.name || partnerForm.name,
        partner_type: partner?.partner_type || partnerForm.partner_type,
        email: partner?.email || partnerForm.email || null,
        phone: partner?.phone || partnerForm.phone || null,
        tax_number: partner?.tax_number || partnerForm.tax_number || null,
        commercial_registration: partner?.commercial_registration || partnerForm.commercial_registration || null,
        branch_scope_ids: partner?.branch_scope_ids || partnerForm.branch_scope_ids || null,
        warehouse_scope_ids: partner?.warehouse_scope_ids || partnerForm.warehouse_scope_ids || null,
        access_control_list: partner?.access_control_list || partnerForm.access_control_list || null,
      };
      if (partner?.id) {
        await erpApi.updatePartner(currentCompany.id, partner.id, payload);
      } else {
        await erpApi.createPartner(currentCompany.id, payload);
        setPartnerForm({ name: '', partner_type: 'customer', email: '', phone: '', tax_number: '', commercial_registration: '', branch_scope_ids: '', warehouse_scope_ids: '', access_control_list: '' });
      }
      setBackendPartners(await erpApi.getPartners(currentCompany.id));
      setBackendStatus(isAr ? 'تم حفظ الشريك في قاعدة البيانات.' : 'Partner saved to the backend.');
    } catch (error) {
      setBackendStatus(error instanceof Error ? error.message : 'Could not save partner');
    }
  };

  const archivePartner = async (partnerId: string) => {
    if (!currentCompany) return;
    await erpApi.archivePartner(currentCompany.id, partnerId);
    setBackendPartners((current) => current.filter((partner) => partner.id !== partnerId));
  };

  useEffect(() => {
    if (activeSubTab === 'user') {
      refreshUsers();
    }
  }, [activeSubTab]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const res = await erpApi.inviteUser({
        email: inviteEmail.trim(),
        role: inviteRole,
        full_name: inviteFullName.trim() || undefined,
      });
      setInviteResult({
        email: res.email,
        temporary_password: res.temporary_password,
        role: res.role,
      });
      alert(
        isAr
          ? `تم إنشاء المستخدم بنجاح. يُرجى مشاركة كلمة المرور المؤقتة بأمان: ${res.temporary_password}`
          : `User created. Please share this temporary password securely: ${res.temporary_password}`
      );
      await refreshUsers();
      setInviteEmail('');
      setInviteFullName('');
    } catch (err: any) {
      console.error('Invite user failed:', err);
      alert(err.message || (isAr ? 'فشلت دعوة المستخدم' : 'Failed to invite user'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleOpenCreate = (type: CRUDModalType) => {
    if (type === 'user') {
      setInviteResult(null);
      setIsInviteModalOpen(true);
      return;
    }
    setModalType(type);
    setSelectedEntityData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (type: CRUDModalType, entity: any) => {
    setModalType(type);
    setSelectedEntityData(entity);
    setIsModalOpen(true);
  };

  const handleOpenCsv = () => {
    if (activeSubTab === 'crusher') {
      setCsvDefaultType('crushers');
    } else if (activeSubTab === 'transporter') {
      setCsvDefaultType('transporters');
    } else {
      setCsvDefaultType('customers');
    }
    setIsCsvModalOpen(true);
  };

  // Active records (non-deleted)
  const activeCustomers = customers
    .filter((c) => !c.is_deleted)
    .filter(
      (c) =>
        !searchQuery ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.taxNumber.includes(searchQuery) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const activeCrushers = crushers
    .filter((c) => !c.is_deleted)
    .filter(
      (c) =>
        !searchQuery ||
        c.crusherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const activeTransporters = transporters
    .filter((t) => !t.is_deleted)
    .filter(
      (t) =>
        !searchQuery ||
        t.transporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.driverName && t.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.defaultTruckNo && t.defaultTruckNo.includes(searchQuery))
    );

  const activeMaterials = materials
    .filter((m) => !m.is_deleted)
    .filter(
      (m) =>
        !searchQuery ||
        m.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.nameEn && m.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const activeUsers = users
    .filter((u) => !u.is_deleted)
    .filter(
      (u) =>
        !searchQuery ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.fullNameAr && u.fullNameAr.includes(searchQuery)) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6" id="master-data-view">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">
              {isAr ? 'البيانات المرجعية والصلاحيات (Master Data & RBAC)' : 'Master Data & Access Control'}
            </h1>
            <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-black text-orange-700">
              Live CRUD
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'إدارة متكاملة لقاعدة بيانات العملاء، موردي المواد الخام، مزودي الخدمات، تسعير المواد، والمستخدمين مع خيارات الاستيراد الجماعي والتعديل الفوري'
              : 'Complete directory and catalog management for customers, raw materials suppliers, service suppliers, materials, and users'}
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenCsv}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? 'استيراد جماعي (CSV / Excel)' : 'Batch CSV Import'}</span>
          </button>

          <button
            onClick={() => handleOpenCreate(activeSubTab)}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-100 hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeSubTab === 'customer' && (isAr ? 'إضافة عميل جديد' : 'Add New Client')}
              {activeSubTab === 'crusher' && (isAr ? 'إضافة مورد مواد خام' : 'Add Raw Materials Supplier')}
              {activeSubTab === 'transporter' && (isAr ? 'إضافة مزود خدمات' : 'Add Service Supplier')}
              {activeSubTab === 'material' && (isAr ? 'إضافة صنف مادة' : 'Add Material')}
              {activeSubTab === 'user' && (isAr ? 'إضافة مستخدم جديد' : 'Add User')}
            </span>
          </button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Building2 className="h-4 w-4 text-blue-700" />
            <span>{isAr ? 'ملف المنشأة القانوني والضريبي' : 'Company Legal, Fiscal & Branding Profile'}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={companyForm.name} onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Company name" />
            <input value={companyForm.taxRegime} onChange={(event) => setCompanyForm({ ...companyForm, taxRegime: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Tax regime" />
            <input value={companyForm.fiscalCalendar} onChange={(event) => setCompanyForm({ ...companyForm, fiscalCalendar: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Fiscal calendar" />
            <input type="number" min={1} max={12} value={companyForm.fiscalYearStartMonth} onChange={(event) => setCompanyForm({ ...companyForm, fiscalYearStartMonth: Number(event.target.value) || 1 })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Fiscal start month" />
            <input type="color" value={companyForm.uiPrimaryColor} onChange={(event) => setCompanyForm({ ...companyForm, uiPrimaryColor: event.target.value })} className="h-10 rounded-xl border border-slate-200 p-1" />
            <input type="color" value={companyForm.uiSecondaryColor} onChange={(event) => setCompanyForm({ ...companyForm, uiSecondaryColor: event.target.value })} className="h-10 rounded-xl border border-slate-200 p-1" />
            <input value={companyForm.uiLogoUrl} onChange={(event) => setCompanyForm({ ...companyForm, uiLogoUrl: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:col-span-2" placeholder="Logo URL" />
          </div>
          <button type="button" onClick={saveCompanyProfile} disabled={!currentCompany} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
            {isAr ? 'حفظ بيانات المنشأة' : 'Save Company Profile'}
          </button>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Users className="h-4 w-4 text-emerald-700" />
            <span>{isAr ? 'شركاء قاعدة البيانات المباشرة' : 'Backend Partners Directory'}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={partnerForm.name} onChange={(event) => setPartnerForm({ ...partnerForm, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Partner name" />
            <select value={partnerForm.partner_type} onChange={(event) => setPartnerForm({ ...partnerForm, partner_type: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
              {['customer', 'raw_materials_supplier', 'service_supplier', 'transporter', 'employee', 'other'].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input value={partnerForm.email} onChange={(event) => setPartnerForm({ ...partnerForm, email: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Email" />
            <input value={partnerForm.phone} onChange={(event) => setPartnerForm({ ...partnerForm, phone: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Phone" />
            <input value={partnerForm.tax_number} onChange={(event) => setPartnerForm({ ...partnerForm, tax_number: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Tax number" />
            <input value={partnerForm.access_control_list} onChange={(event) => setPartnerForm({ ...partnerForm, access_control_list: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="ACL JSON or policy keys" />
          </div>
          <button type="button" onClick={() => savePartner()} disabled={!currentCompany || !partnerForm.name.trim()} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
            {isAr ? 'حفظ الشريك' : 'Create Partner'}
          </button>
        </div>
      </section>

      {backendStatus && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">{backendStatus}</div>}

      {backendPartners.length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-black text-slate-900">{isAr ? 'الشركاء من FastAPI' : 'FastAPI Partners'}</h3>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <tbody className="divide-y divide-slate-100">
                {backendPartners.map((partner) => (
                  <tr key={partner.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{partner.name}</td>
                    <td className="px-4 py-3 text-slate-500">{partner.partner_type}</td>
                    <td className="px-4 py-3 text-slate-500">{partner.email || partner.phone || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => savePartner(partner)} className="me-2 rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-700">{isAr ? 'تحديث' : 'Sync'}</button>
                      <button type="button" onClick={() => archivePartner(partner.id)} className="rounded-lg border border-rose-200 px-3 py-1 font-bold text-rose-700">{isAr ? 'أرشفة' : 'Archive'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'customer', labelAr: `العملاء (${customers.filter((c) => !c.is_deleted).length})`, labelEn: `Clients (${customers.filter((c) => !c.is_deleted).length})`, icon: Building2 },
            { id: 'crusher', labelAr: `موردو المواد الخام (${crushers.filter((c) => !c.is_deleted).length})`, labelEn: `Raw Materials Suppliers (${crushers.filter((c) => !c.is_deleted).length})`, icon: Database },
            { id: 'transporter', labelAr: `مزودو الخدمات اللوجستية (${transporters.filter((t) => !t.is_deleted).length})`, labelEn: `Service Suppliers (${transporters.filter((t) => !t.is_deleted).length})`, icon: Truck },
            { id: 'material', labelAr: `المواد وقائمة الأسعار (${materials.filter((m) => !m.is_deleted).length})`, labelEn: `Materials (${materials.filter((m) => !m.is_deleted).length})`, icon: Package },
            { id: 'user', labelAr: `المستخدمين والصلاحيات (${users.filter((u) => !u.is_deleted).length})`, labelEn: `Users (${users.filter((u) => !u.is_deleted).length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث سريع في السجلات...' : 'Quick search...'}
            className="w-full rounded-2xl border border-slate-200 bg-white py-1.5 px-9 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tab 1: Customers */}
      {activeSubTab === 'customer' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'دليل العملاء ومشاريع الخرسانة الجاهزة' : 'Client Directory'}
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono">
              {activeCustomers.length} {isAr ? 'عملاء نشطين' : 'Active Clients'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم العميل / الشركة' : 'Customer Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'الرقم الضريبي (VAT)' : 'Tax Number'}</th>
                  <th className="py-3 px-4">{isAr ? 'مسؤول الاتصال' : 'Contact Person'}</th>
                  <th className="py-3 px-4">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="py-3 px-4">{isAr ? 'العنوان والموقع' : 'Address'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.customerName}
                      {c.customerNameEn && <span className="block text-[11px] font-normal text-slate-400">{c.customerNameEn}</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{c.taxNumber}</td>
                    <td className="py-3.5 px-4 text-slate-700">{c.contactPerson}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3.5 px-4 text-slate-500 truncate max-w-xs">{c.address}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit('customer', c)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                          title={isAr ? 'تعديل البيانات' : 'Edit'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا العميل ونقله لسلة المحذوفات؟' : 'Delete customer?')) {
                              deleteCustomer(c.id);
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
                          title={isAr ? 'أرشفة وحذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Crushers */}
      {activeSubTab === 'crusher' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'دليل الكسارات والمقالع المعتمدة' : 'Crushers & Quarries'}
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono">
              {activeCrushers.length} {isAr ? 'كسارات مسجلة' : 'Registered Crushers'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم الكسارة' : 'Crusher Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'الموقع الجغرافي' : 'Location'}</th>
                  <th className="py-3 px-4">{isAr ? 'المادة الموردة' : 'Material'}</th>
                  <th className="py-3 px-4">{isAr ? 'الحساب البنكي / الآيبان' : 'Bank Account'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCrushers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.crusherName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.location}</td>
                    <td className="py-3.5 px-4 text-orange-800 font-bold">{c.materialProduced}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{c.bankDetails}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit('crusher', c)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                          title={isAr ? 'تعديل البيانات' : 'Edit'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الكسارة؟' : 'Delete crusher?')) {
                              deleteCrusher(c.id);
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
                          title={isAr ? 'أرشفة وحذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Transporters */}
      {activeSubTab === 'transporter' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'دليل مقاولي النقل وأسطول الشاحنات' : 'Transporters & Subcontractors'}
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono">
              {activeTransporters.length} {isAr ? 'ناقلين' : 'Transporters'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم الناقل / المؤسسة' : 'Transporter Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم السائق' : 'Driver'}</th>
                  <th className="py-3 px-4">{isAr ? 'رقم الشاحنة' : 'Truck #'}</th>
                  <th className="py-3 px-4">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'سعة الحمولة' : 'Capacity'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'أجرة النقل/طن' : 'Rate/Ton'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTransporters.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{t.transporterName}</td>
                    <td className="py-3.5 px-4 text-slate-800">{t.driverName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-950">{t.defaultTruckNo}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{t.phone}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">{t.capacityTons || 44} طن</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                      {formatCurrency(t.ratePerTon || 18, language)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit('transporter', t)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                          title={isAr ? 'تعديل البيانات' : 'Edit'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الناقل؟' : 'Delete transporter?')) {
                              deleteTransporter(t.id);
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
                          title={isAr ? 'أرشفة وحذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Materials */}
      {activeSubTab === 'material' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'قائمة المواد وتعرفات أسعار الشراء والبيع القياسية' : 'Materials & Price Catalog'}
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono">
              {activeMaterials.length} {isAr ? 'أصناف ركام ورمل' : 'Materials'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم صنف المادة' : 'Material Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'التصنيف' : 'Category'}</th>
                  <th className="py-3 px-4">{isAr ? 'سعر الشراء الافتراضي (ر.س/طن)' : 'Buy Price / Ton'}</th>
                  <th className="py-3 px-4">{isAr ? 'سعر البيع الافتراضي (ر.س/طن)' : 'Sell Price / Ton'}</th>
                  <th className="py-3 px-4">{isAr ? 'هامش الربح المتوقع' : 'Expected Margin'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMaterials.map((m) => {
                  const margin = m.defaultSellingPrice - m.defaultPurchasePrice;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {m.nameAr}
                        {m.nameEn && <span className="block text-[11px] font-normal text-slate-400">{m.nameEn}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {formatCurrency(m.defaultPurchasePrice, language)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-orange-950">
                        {formatCurrency(m.defaultSellingPrice, language)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-700">
                        +{formatCurrency(margin, language)}/طن
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit('material', m)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                            title={isAr ? 'تعديل البيانات' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذه المادة؟' : 'Delete material?')) {
                                deleteMaterial(m.id);
                              }
                            }}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
                            title={isAr ? 'أرشفة وحذف' : 'Delete'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Users & RBAC */}
      {activeSubTab === 'user' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isAr ? 'إدارة المستخدمين ومصفوفة صلاحيات الوصول (RBAC)' : 'User Management & Permissions Matrix'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr
                  ? 'حسابات المستخدمين المعتمدة لمساحة عمل المنشأة الحالية مع العزل الكامل'
                  : 'Authorized tenant workspace user accounts with strict multi-tenant isolation'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                id="btn-refresh-users"
                onClick={() => refreshUsers()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title={isAr ? 'تحديث قائمة المستخدمين' : 'Refresh Users'}
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
              <button
                id="btn-invite-user"
                onClick={() => {
                  setInviteResult(null);
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{isAr ? 'دعوة مستخدم جديد' : 'Invite New User'}</span>
              </button>
              <span className="text-xs font-bold text-orange-700 font-mono bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                {activeUsers.length} {isAr ? 'مستخدمين' : 'Users'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'الاسم الكامل' : 'Full Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم المستخدم / البريد' : 'Username / Email'}</th>
                  <th className="py-3 px-4">{isAr ? 'الدور الوظيفي' : 'Role'}</th>
                  <th className="py-3 px-4">{isAr ? 'الصلاحيات المتاحة' : 'Permissions'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{isAr ? u.fullNameAr : u.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {u.email}
                      <span className="block text-[11px] text-slate-400">@{u.username}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          u.role === 'Admin'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : u.role === 'COO'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : u.role === 'Accountant'
                            ? 'bg-amber-50 text-purple-700 border border-amber-200'
                            : u.role === 'Data_Entry'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600">
                      {u.role === 'Admin' && (isAr ? 'كافة الصلاحيات (إدارة كاملة للمنظومة CEO)' : 'Full Executive Authority (CEO)')}
                      {u.role === 'COO' && (isAr ? 'المدير التنفيذي للعمليات (اعتمادات تشغيلية ورقابة)' : 'Chief Operating Officer (COO Approvals)')}
                      {u.role === 'Accountant' && (isAr ? 'الفواتير، الأرباح، الكسارات، والتقارير المالية' : 'Invoices, Profits, Crushers, Reports')}
                      {u.role === 'Data_Entry' && (isAr ? 'إدخال وتعديل تذاكر الميزان والرحلات اليومية' : 'Daily Operations & Scale Tickets Input')}
                      {u.role === 'Guest' && (isAr ? 'قراءة ومراجعة فقط (حجب الأسعار والأرباح)' : 'Read-Only (Prices Hidden)')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit('user', u)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                          title={isAr ? 'تعديل الصلاحيات' : 'Edit'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المستخدم نهائياً؟' : 'Permanently delete this user?')) {
                              await deleteUser(u.id);
                              await refreshUsers();
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
                          title={isAr ? 'أرشفة وحذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite New User Modal (Task 4.2 & 4.3) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isAr ? 'دعوة مستخدم جديد للمنظومة' : 'Invite New Workspace User'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'إنشاء حساب موظف ضمن مساحة عمل المنشأة الحالية' : 'Create an employee account under current tenant'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteResult(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {inviteResult ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>{isAr ? 'تم إنشاء حساب المستخدم بنجاح!' : 'User created successfully!'}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-800">
                    {isAr
                      ? `تم ربط المستخدم (${inviteResult.email}) بدور (${inviteResult.role}). يُرجى مشاركة كلمة المرور المؤقتة التالية بأمان مع الموظف:`
                      : `User (${inviteResult.email}) created with role (${inviteResult.role}). Please share this temporary password securely:`}
                  </p>
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300 bg-white px-3 py-2">
                    <code className="font-mono text-sm font-black text-emerald-950">
                      {inviteResult.temporary_password}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteResult.temporary_password);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
                    >
                      {copiedPassword ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedPassword ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteResult(null);
                    }}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    {isAr ? 'إغلاق ومتابعة' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'البريد الإلكتروني المهني للمستخدم *' : 'Corporate Email Address *'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@corporate.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'الاسم الكامل (اختياري)' : 'Full Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'}
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'الدور ومستوى الصلاحيات (RBAC Role) *' : 'Assigned Role & Permissions *'}
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  >
                    <option value="Admin">{isAr ? 'Admin - مدير عام (كامل الصلاحيات)' : 'Admin - Full Administrator'}</option>
                    <option value="Accountant">{isAr ? 'Accountant - محاسب مالي (الفواتير والتقارير)' : 'Accountant - Invoices & Financial Reports'}</option>
                    <option value="Data_Entry">{isAr ? 'Data_Entry - مدخل بيانات (العمليات والموازين)' : 'Data_Entry - Operations & Tickets'}</option>
                    <option value="Guest">{isAr ? 'Guest - زائر (قراءة فقط بدون أسعار)' : 'Guest - Read-Only Access'}</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {inviteLoading ? (
                      <span>{isAr ? 'جارِ الإرسال...' : 'Inviting...'}</span>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>{isAr ? 'إنشاء ودعوة المستخدم' : 'Create & Invite'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CRUD Modal Instance */}
      <EntityCRUDModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entityType={modalType}
        initialData={selectedEntityData}
      />

      {/* CSV Batch Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        defaultEntityType={csvDefaultType}
      />
    </div>
  );
};
