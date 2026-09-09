import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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

  // CSV Batch Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvDefaultType, setCsvDefaultType] = useState<CsvImportEntityType>('customers');

  const handleOpenCreate = (type: CRUDModalType) => {
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
              ? 'إدارة متكاملة لقاعدة بيانات العملاء، الكسارات، الناقلين، تسعير المواد، والمستخدمين مع خيارات الاستيراد الجماعي والتعديل الفوري'
              : 'Complete directory and catalog management for clients, crushers, transporters, materials, and users'}
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
              {activeSubTab === 'crusher' && (isAr ? 'إضافة كسارة / مقلع' : 'Add Crusher')}
              {activeSubTab === 'transporter' && (isAr ? 'إضافة مقاول نقل' : 'Add Transporter')}
              {activeSubTab === 'material' && (isAr ? 'إضافة صنف مادة' : 'Add Material')}
              {activeSubTab === 'user' && (isAr ? 'إضافة مستخدم جديد' : 'Add User')}
            </span>
          </button>
        </div>
      </div>

      {/* Sub Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'customer', labelAr: `العملاء (${customers.filter((c) => !c.is_deleted).length})`, labelEn: `Clients (${customers.filter((c) => !c.is_deleted).length})`, icon: Building2 },
            { id: 'crusher', labelAr: `الكسارات والمقالع (${crushers.filter((c) => !c.is_deleted).length})`, labelEn: `Crushers (${crushers.filter((c) => !c.is_deleted).length})`, icon: Database },
            { id: 'transporter', labelAr: `الناقلين والأسطول (${transporters.filter((t) => !t.is_deleted).length})`, labelEn: `Transporters (${transporters.filter((t) => !t.is_deleted).length})`, icon: Truck },
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'إدارة المستخدمين ومصفوفة صلاحيات الوصول (RBAC)' : 'User Management & Permissions Matrix'}
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono">
              {activeUsers.length} {isAr ? 'مستخدمين' : 'Users'}
            </span>
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
                          onClick={() => {
                            if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Delete user?')) {
                              deleteUser(u.id);
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
