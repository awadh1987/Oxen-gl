import React, { useEffect, useState, useMemo } from 'react';
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
  Filter,
  X,
  SlidersHorizontal,
  PlusCircle,
  Clock,
  Briefcase,
  AlertCircle,
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
    refreshCompanies,
    deleteCustomer,
    deleteCrusher,
    deleteTransporter,
    deleteMaterial,
    deleteUser,
    language,
  } = useApp();

  const isAr = language === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<CRUDModalType>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CRUDModalType>('customer');
  const [selectedEntityData, setSelectedEntityData] = useState<any | null>(null);

  // Invite User Modal State
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

  // Slide-over Drawer State for Direct Backend Partners
  const [isPartnerDrawerOpen, setIsPartnerDrawerOpen] = useState(false);
  const [backendPartners, setBackendPartners] = useState<Partner[]>([]);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    partner_type: 'customer',
    email: '',
    phone: '',
    tax_number: '',
    commercial_registration: '',
    branch_scope_ids: '',
    warehouse_scope_ids: '',
    access_control_list: '',
  });

  useEffect(() => {
    if (!currentCompany) return;
    erpApi
      .getPartners(currentCompany.id)
      .then(setBackendPartners)
      .catch((error) => setBackendStatus(error instanceof Error ? error.message : 'Could not load partners'));
  }, [currentCompany]);

  useEffect(() => {
    if (activeSubTab === 'user') {
      refreshUsers();
    }
  }, [activeSubTab]);

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
        setPartnerForm({
          name: '',
          partner_type: 'customer',
          email: '',
          phone: '',
          tax_number: '',
          commercial_registration: '',
          branch_scope_ids: '',
          warehouse_scope_ids: '',
          access_control_list: '',
        });
      }
      setBackendPartners(await erpApi.getPartners(currentCompany.id));
      setIsPartnerDrawerOpen(false);
      setBackendStatus(isAr ? 'تم حفظ الشريك بنجاح في قاعدة البيانات.' : 'Partner saved successfully.');
      setTimeout(() => setBackendStatus(null), 4000);
    } catch (error) {
      setBackendStatus(error instanceof Error ? error.message : 'Could not save partner');
    }
  };

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

  const handleRefreshRecords = async () => {
    setIsRefreshing(true);
    try {
      if (activeSubTab === 'user') {
        await refreshUsers();
      } else {
        await refreshCompanies();
        if (currentCompany) {
          const p = await erpApi.getPartners(currentCompany.id);
          setBackendPartners(p);
        }
      }
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Filtered Datasets with Strict ID Deduplication
  const activeCustomers = useMemo(() => {
    const list = customers
      .filter((c) => !c.is_deleted)
      .filter((c) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.customerName.toLowerCase().includes(q) ||
          (c.customerNameEn && c.customerNameEn.toLowerCase().includes(q)) ||
          c.taxNumber.includes(q) ||
          (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
        );
      })
      .filter((c) => {
        if (quickFilter === 'with-vat') return Boolean(c.taxNumber && c.taxNumber.trim() !== '');
        if (quickFilter === 'with-credit') return Boolean(c.creditLimit && c.creditLimit > 0);
        return true;
      });
    return Array.from(new Map(list.map((c) => [c.id, c])).values());
  }, [customers, searchQuery, quickFilter]);

  const activeCrushers = useMemo(() => {
    const list = crushers
      .filter((c) => !c.is_deleted)
      .filter((c) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.crusherName.toLowerCase().includes(q) ||
          (c.location && c.location.toLowerCase().includes(q)) ||
          (c.materialProduced && c.materialProduced.toLowerCase().includes(q))
        );
      })
      .filter((c) => {
        if (quickFilter === 'all') return true;
        return c.location && c.location.includes(quickFilter);
      });
    return Array.from(new Map(list.map((c) => [c.id, c])).values());
  }, [crushers, searchQuery, quickFilter]);

  const activeTransporters = useMemo(() => {
    const list = transporters
      .filter((t) => !t.is_deleted)
      .filter((t) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.transporterName.toLowerCase().includes(q) ||
          (t.driverName && t.driverName.toLowerCase().includes(q)) ||
          (t.defaultTruckNo && t.defaultTruckNo.includes(q)) ||
          (t.phone && t.phone.includes(q))
        );
      })
      .filter((t) => {
        if (quickFilter === 'heavy') return (t.capacityTons || 44) >= 40;
        if (quickFilter === 'medium') return (t.capacityTons || 44) < 40;
        return true;
      });
    return Array.from(new Map(list.map((t) => [t.id, t])).values());
  }, [transporters, searchQuery, quickFilter]);

  const activeMaterials = useMemo(() => {
    const list = materials
      .filter((m) => !m.is_deleted)
      .filter((m) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.nameAr.toLowerCase().includes(q) ||
          (m.nameEn && m.nameEn.toLowerCase().includes(q)) ||
          m.category.toLowerCase().includes(q)
        );
      })
      .filter((m) => {
        if (quickFilter === 'all') return true;
        return m.category.toLowerCase() === quickFilter.toLowerCase();
      });
    return Array.from(new Map(list.map((m) => [m.id, m])).values());
  }, [materials, searchQuery, quickFilter]);

  const activeUsers = useMemo(() => {
    const list = users
      .filter((u) => !u.is_deleted)
      .filter((u) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          (u.fullNameAr && u.fullNameAr.includes(q)) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      })
      .filter((u) => {
        if (quickFilter === 'all') return true;
        return u.role === quickFilter;
      });
    return Array.from(new Map(list.map((u) => [u.id, u])).values());
  }, [users, searchQuery, quickFilter]);

  // Dynamic Action Button text & icon
  const dynamicActionConfig = useMemo(() => {
    switch (activeSubTab) {
      case 'customer':
        return {
          labelAr: '+ إضافة عميل جديد',
          labelEn: '+ Add New Client',
          icon: Building2,
        };
      case 'crusher':
        return {
          labelAr: '+ إضافة مورد مواد',
          labelEn: '+ Add Material Supplier',
          icon: Database,
        };
      case 'transporter':
        return {
          labelAr: '+ إضافة مورد خدمات',
          labelEn: '+ Add Service Supplier',
          icon: Truck,
        };
      case 'material':
        return {
          labelAr: '+ إضافة مادة وتسعير',
          labelEn: '+ Add Material & Price',
          icon: Package,
        };
      case 'user':
        return {
          labelAr: '+ دعوة مستخدم جديد',
          labelEn: '+ Invite New User',
          icon: UserPlus,
        };
      default:
        return {
          labelAr: '+ إضافة سجل جديد',
          labelEn: '+ Add Record',
          icon: Plus,
        };
    }
  }, [activeSubTab]);

  const DynamicActionIcon = dynamicActionConfig.icon;

  return (
    <div className="space-y-6" id="master-data-view">
      {/* 1. Primary Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">
                  {isAr ? 'البيانات الرئيسية ومصفوفة الصلاحيات (Master Data & RBAC)' : 'Master Data & Permissions Matrix'}
                </h1>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                  Live Registries
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'إدارة مركزية لسجلات العملاء، موردي المواد، موردي الخدمات، تسعير المواد، وحسابات المستخدمين'
                  : 'Centralized enterprise directory for clients, material suppliers, service suppliers, material catalogs, and RBAC users'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Record Status */}
        {backendStatus && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{backendStatus}</span>
          </div>
        )}
      </div>

      {/* 2. Elevated Primary Entity Tabs Directly Beneath Header */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            id: 'customer',
            labelAr: 'العملاء',
            labelEn: 'Customers',
            count: customers.filter((c) => !c.is_deleted).length,
            icon: Building2,
            accent: 'from-blue-600 to-indigo-600',
          },
          {
            id: 'crusher',
            labelAr: 'موردي المواد',
            labelEn: 'Material Suppliers',
            count: crushers.filter((c) => !c.is_deleted).length,
            icon: Database,
            accent: 'from-amber-600 to-orange-600',
          },
          {
            id: 'transporter',
            labelAr: 'موردي الخدمات',
            labelEn: 'Service Suppliers',
            count: transporters.filter((t) => !t.is_deleted).length,
            icon: Truck,
            accent: 'from-emerald-600 to-teal-600',
          },
          {
            id: 'material',
            labelAr: 'المواد وقائمة الأسعار',
            labelEn: 'Materials & Price Catalog',
            count: materials.filter((m) => !m.is_deleted).length,
            icon: Package,
            accent: 'from-purple-600 to-violet-600',
          },
          {
            id: 'user',
            labelAr: 'المستخدمين والصلاحيات',
            labelEn: 'Users & RBAC',
            count: users.filter((u) => !u.is_deleted).length,
            icon: Users,
            accent: 'from-rose-600 to-red-600',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-master-${tab.id}`}
              type="button"
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setSearchQuery('');
                setQuickFilter('all');
              }}
              className={`flex flex-col justify-between p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/10'
                  : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </div>
              <div className="mt-3">
                <span className="block text-xs font-black tracking-tight truncate">
                  {isAr ? tab.labelAr : tab.labelEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Unified Single-Row Dynamic Action Bar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Right Side (in RTL): Search & Quick Filter */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSubTab === 'customer'
                  ? (isAr ? 'بحث بالاسم، الرقم الضريبي، أو موقع العميل...' : 'Search customers, VAT, or location...')
                  : activeSubTab === 'crusher'
                  ? (isAr ? 'بحث بالكسارة، الموقع، أو نوع المادة...' : 'Search crushers, location, or materials...')
                  : activeSubTab === 'transporter'
                  ? (isAr ? 'بحث باسم الناقل، السائق، أو رقم الشاحنة...' : 'Search transporters, drivers, or trucks...')
                  : activeSubTab === 'material'
                  ? (isAr ? 'بحث باسم المادة أو التصنيف...' : 'Search materials or categories...')
                  : (isAr ? 'بحث بالاسم، البريد، أو الدور الوظيفي...' : 'Search users, email, or role...')
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-10 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Dropdown based on active tab */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 focus:border-orange-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {activeSubTab === 'customer' && (
                <>
                  <option value="all">{isAr ? 'كافة العملاء' : 'All Customers'}</option>
                  <option value="with-vat">{isAr ? 'مع رقم ضريبي مسجل' : 'Registered VAT Only'}</option>
                  <option value="with-credit">{isAr ? 'حد ائتماني نشط' : 'Active Credit Limit'}</option>
                </>
              )}
              {activeSubTab === 'crusher' && (
                <>
                  <option value="all">{isAr ? 'كافة المواقع' : 'All Locations'}</option>
                  <option value="الحاير">{isAr ? 'كسارات الحاير' : 'Al-Ha\'ir'}</option>
                  <option value="الخرج">{isAr ? 'طريق الخرج' : 'Al-Kharj'}</option>
                  <option value="الدمام">{isAr ? 'طريق الدمام (بوابة الشرق)' : 'Dammam Road'}</option>
                </>
              )}
              {activeSubTab === 'transporter' && (
                <>
                  <option value="all">{isAr ? 'كافة الشاحنات' : 'All Haulers'}</option>
                  <option value="heavy">{isAr ? 'شاحنات ثقيلة (≥ 40 طن)' : 'Heavy Haulers (≥40T)'}</option>
                  <option value="medium">{isAr ? 'شاحنات متوسطة (&lt; 40 طن)' : 'Medium Haulers (<40T)'}</option>
                </>
              )}
              {activeSubTab === 'material' && (
                <>
                  <option value="all">{isAr ? 'كافة التصنيفات' : 'All Categories'}</option>
                  <option value="Aggregates">{isAr ? 'حصى وركام (Aggregates)' : 'Aggregates'}</option>
                  <option value="Sand">{isAr ? 'رمل مغسول (Sand)' : 'Sand'}</option>
                  <option value="Base Course">{isAr ? 'دفان وطبقات أساس (Base Course)' : 'Base Course'}</option>
                </>
              )}
              {activeSubTab === 'user' && (
                <>
                  <option value="all">{isAr ? 'كافة الأدوار والصلاحيات' : 'All Roles'}</option>
                  <option value="Admin">{isAr ? 'مدير عام (Admin)' : 'Admin'}</option>
                  <option value="COO">{isAr ? 'مدير تشغيل (COO)' : 'COO'}</option>
                  <option value="Accountant">{isAr ? 'محاسب مالي (Accountant)' : 'Accountant'}</option>
                  <option value="Data_Entry">{isAr ? 'مدخل بيانات (Data_Entry)' : 'Data Entry'}</option>
                  <option value="Guest">{isAr ? 'زائر قراءة فقط (Guest)' : 'Guest'}</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Left Side (in RTL): Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={handleRefreshRecords}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            title={isAr ? 'تحديث السجلات' : 'Refresh Records'}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          {/* Batch CSV Import */}
          <button
            type="button"
            onClick={handleOpenCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? 'استيراد جماعي (CSV / Excel)' : 'Batch CSV Import'}</span>
          </button>

          {/* Direct Backend Partner Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsPartnerDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title={isAr ? 'إدارة شريك مباشر في قاعدة البيانات' : 'Direct Backend Partner Entry'}
          >
            <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
            <span>{isAr ? 'شركاء قاعدة البيانات' : 'Backend Partners'}</span>
          </button>

          {/* Dynamic Entity Creation Button */}
          <button
            id="btn-dynamic-create-master"
            type="button"
            onClick={() => handleOpenCreate(activeSubTab)}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-100 hover:bg-orange-700 transition-colors"
          >
            <DynamicActionIcon className="h-4 w-4" />
            <span>{isAr ? dynamicActionConfig.labelAr : dynamicActionConfig.labelEn}</span>
          </button>
        </div>
      </div>

      {/* 4. Full-Width Maximized Table Viewport (Tab 1 to 5) */}

      {/* TAB 1: Customers Table */}
      {activeSubTab === 'customer' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-orange-600" />
              <span>{isAr ? 'دليل العملاء' : 'Clients Registry'}</span>
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
              {activeCustomers.length} {isAr ? 'عملاء مسجلين' : 'Registered Clients'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم العميل / المنشأة' : 'Customer Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'الرقم الضريبي (VAT)' : 'Tax Number'}</th>
                  <th className="py-3 px-4">{isAr ? 'مسؤول الاتصال' : 'Contact Person'}</th>
                  <th className="py-3 px-4">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="py-3 px-4">{isAr ? 'العنوان والموقع' : 'Address'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الحد الائتماني' : 'Credit Limit'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      {isAr ? 'لا توجد سجلات مطابقة للبحث أو التصفية.' : 'No customers match the active query.'}
                    </td>
                  </tr>
                ) : (
                  activeCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.customerName}
                        {c.customerNameEn && <span className="block text-[11px] font-normal text-slate-400">{c.customerNameEn}</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{c.taxNumber || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-700">{c.contactPerson || '-'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{c.phone || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-500 truncate max-w-xs">{c.address || '-'}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {c.creditLimit ? formatCurrency(c.creditLimit, language) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit('customer', c)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                            title={isAr ? 'تعديل البيانات' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Crushers Table */}
      {activeSubTab === 'crusher' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-orange-600" />
              <span>{isAr ? 'دليل موردي المواد' : 'Material Suppliers'}</span>
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
              {activeCrushers.length} {isAr ? 'موردي مواد مسجلين' : 'Registered Material Suppliers'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم مورد المواد' : 'Supplier Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'الموقع الجغرافي' : 'Location'}</th>
                  <th className="py-3 px-4">{isAr ? 'المادة الموردة' : 'Material'}</th>
                  <th className="py-3 px-4">{isAr ? 'الحساب البنكي / الآيبان' : 'Bank Account'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الرصيد الافتتاحي' : 'Opening Balance'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCrushers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      {isAr ? 'لا يوجد موردي مواد مطابقين للبحث أو التصفية.' : 'No material suppliers match the active query.'}
                    </td>
                  </tr>
                ) : (
                  activeCrushers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{c.crusherName}</td>
                      <td className="py-3.5 px-4 text-slate-600">{c.location}</td>
                      <td className="py-3.5 px-4 text-orange-800 font-bold">{c.materialProduced}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{c.bankDetails || '-'}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {formatCurrency(c.openingBalance || 0, language)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit('crusher', c)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                            title={isAr ? 'تعديل البيانات' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Transporters Table */}
      {activeSubTab === 'transporter' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-600" />
              <span>{isAr ? 'دليل موردي الخدمات والأسطول' : 'Service Suppliers & Fleet'}</span>
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
              {activeTransporters.length} {isAr ? 'موردي خدمات مسجلين' : 'Registered Service Suppliers'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم مورد الخدمة / المؤسسة' : 'Service Supplier Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم السائق' : 'Driver'}</th>
                  <th className="py-3 px-4">{isAr ? 'رقم الشاحنة الافتراضية' : 'Default Truck #'}</th>
                  <th className="py-3 px-4">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'سعة الحمولة' : 'Capacity'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'أجرة النقل / MT طن' : 'Rate / MT'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTransporters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      {isAr ? 'لا يوجد ناقلون مطابقون للبحث أو التصفية.' : 'No transporters match the active query.'}
                    </td>
                  </tr>
                ) : (
                  activeTransporters.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.transporterName}</td>
                      <td className="py-3.5 px-4 text-slate-800">{t.driverName || '-'}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-orange-950">{t.defaultTruckNo || '-'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{t.phone || '-'}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">{t.capacityTons || 44} MT طن</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                        {formatCurrency(t.ratePerTon || 18, language)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit('transporter', t)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                            title={isAr ? 'تعديل البيانات' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Materials Table */}
      {activeSubTab === 'material' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <span>{isAr ? 'قائمة المواد وتعرفات أسعار الشراء والبيع القياسية' : 'Materials & Price Catalog'}</span>
            </h3>
            <span className="text-xs font-bold text-orange-700 font-mono bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
              {activeMaterials.length} {isAr ? 'أصناف مسجلة' : 'Catalog Items'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-black text-slate-700">
                  <th className="py-3 px-4">{isAr ? 'اسم صنف المادة' : 'Material Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'التصنيف' : 'Category'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'وحدة القياس (UOM)' : 'UOM'}</th>
                  <th className="py-3 px-4">{isAr ? 'سعر الشراء الافتراضي' : 'Buy Price'}</th>
                  <th className="py-3 px-4">{isAr ? 'سعر البيع الافتراضي' : 'Sell Price'}</th>
                  <th className="py-3 px-4">{isAr ? 'هامش الربح المتوقع' : 'Expected Margin'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      {isAr ? 'لا توجد مواد مطابقة للبحث أو التصفية.' : 'No materials match the active query.'}
                    </td>
                  </tr>
                ) : (
                  activeMaterials.map((m) => {
                    const margin = m.defaultSellingPrice - m.defaultPurchasePrice;
                    const uomDisplay = m.unit || 'MT طن';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {m.nameAr}
                          {m.nameEn && <span className="block text-[11px] font-normal text-slate-400">{m.nameEn}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                            {m.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900 border border-orange-200">
                            {uomDisplay}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {formatCurrency(m.defaultPurchasePrice, language)} / {uomDisplay}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-orange-950">
                          {formatCurrency(m.defaultSellingPrice, language)} / {uomDisplay}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-700">
                          +{formatCurrency(margin, language)} / {uomDisplay}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit('material', m)}
                              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                              title={isAr ? 'تعديل البيانات' : 'Edit'}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Users & RBAC Table */}
      {activeSubTab === 'user' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span>{isAr ? 'إدارة المستخدمين ومصفوفة صلاحيات الوصول (RBAC)' : 'User Management & Permissions Matrix'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr
                  ? 'حسابات المستخدمين المعتمدة لمساحة عمل المنشأة الحالية مع العزل الكامل'
                  : 'Authorized tenant workspace user accounts with strict multi-tenant isolation'}
              </p>
            </div>
            <span className="text-xs font-bold text-orange-700 font-mono bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
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
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      {isAr ? 'لا يوجد مستخدمون مطابقون للبحث أو التصفية.' : 'No users match the active query.'}
                    </td>
                  </tr>
                ) : (
                  activeUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{isAr ? u.fullNameAr : u.fullName}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {u.email}
                        <span className="block text-[11px] text-slate-400">@{u.username}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${
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
                            type="button"
                            onClick={() => handleOpenEdit('user', u)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-2xs"
                            title={isAr ? 'تعديل الصلاحيات' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Slide-Over Drawer: Direct Backend Partners (Converted from Static Pinned Card) */}
      {isPartnerDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPartnerDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 end-0 max-w-full flex pl-10 rtl:pl-0 rtl:pr-10">
            <div
              dir={isAr ? 'rtl' : 'ltr'}
              className="w-screen max-w-md bg-white border-s border-slate-200 p-6 shadow-2xl overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {isAr ? 'إضافة شريك في قاعدة البيانات المباشرة' : 'Direct Backend Partner Registry'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? 'ربط وإدراج شريك مباشرة عبر FastAPI' : 'Sync partner payload directly to backend schema'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPartnerDrawerOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  id="form-partner-drawer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    savePartner();
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'اسم الشريك / الكيان *' : 'Partner Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerForm.name}
                      onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                      placeholder={isAr ? 'مثال: شركة الإنشاءات الحديثة' : 'e.g. Modern Construction Co.'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'نوع الشريك (Partner Type) *' : 'Partner Type *'}
                    </label>
                    <select
                      value={partnerForm.partner_type}
                      onChange={(e) => setPartnerForm({ ...partnerForm, partner_type: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-none"
                    >
                      <option value="customer">{isAr ? 'عميل (Customer)' : 'Customer'}</option>
                      <option value="raw_materials_supplier">{isAr ? 'مورد مواد خام (Quarry)' : 'Raw Materials Supplier'}</option>
                      <option value="service_supplier">{isAr ? 'مزود خدمات (Transporter)' : 'Service Supplier'}</option>
                      <option value="transporter">{isAr ? 'ناقل أسطول (Fleet)' : 'Transporter'}</option>
                      <option value="employee">{isAr ? 'موظف (Employee)' : 'Employee'}</option>
                      <option value="other">{isAr ? 'أخرى (Other)' : 'Other'}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isAr ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      <input
                        type="email"
                        value={partnerForm.email}
                        onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                        placeholder="contact@entity.sa"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isAr ? 'رقم الهاتف' : 'Phone'}
                      </label>
                      <input
                        type="text"
                        value={partnerForm.phone}
                        onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                        placeholder="05XXXXXXXX"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isAr ? 'الرقم الضريبي (VAT)' : 'Tax Number'}
                      </label>
                      <input
                        type="text"
                        value={partnerForm.tax_number}
                        onChange={(e) => setPartnerForm({ ...partnerForm, tax_number: e.target.value })}
                        placeholder="300XXXXXXXXXXX3"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isAr ? 'السجل التجاري (CR)' : 'CR Number'}
                      </label>
                      <input
                        type="text"
                        value={partnerForm.commercial_registration}
                        onChange={(e) => setPartnerForm({ ...partnerForm, commercial_registration: e.target.value })}
                        placeholder="1010XXXXXX"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'نطاق الفروع والمستودعات (Scope IDs)' : 'Branch & Warehouse Scope'}
                    </label>
                    <input
                      type="text"
                      value={partnerForm.branch_scope_ids}
                      onChange={(e) => setPartnerForm({ ...partnerForm, branch_scope_ids: e.target.value })}
                      placeholder="branch-01, warehouse-south"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'قائمة الصلاحيات والتحكم (ACL / Policies)' : 'Access Control List (ACL)'}
                    </label>
                    <input
                      type="text"
                      value={partnerForm.access_control_list}
                      onChange={(e) => setPartnerForm({ ...partnerForm, access_control_list: e.target.value })}
                      placeholder='["read:invoices", "write:scale"]'
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-[11px] focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </form>

                {/* Existing Backend Partners List inside Drawer */}
                {backendPartners.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">
                      {isAr ? 'الشركاء المسجلون في قاعدة البيانات:' : 'Backend Partners Directory:'}
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {backendPartners.map((bp) => (
                        <div
                          key={bp.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/70 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{bp.name}</span>
                            <span className="text-[10px] text-slate-500">{bp.partner_type}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{bp.phone || bp.email || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPartnerDrawerOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  form="form-partner-drawer"
                  disabled={!currentCompany || !partnerForm.name.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAr ? 'حفظ الشريك' : 'Save Partner'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
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
                    {isAr ? 'إنشاء حساب موظف ضمن مساحة عمل المنشأة الحالية' : 'Create employee account under current tenant'}
                  </p>
                </div>
              </div>
              <button
                type="button"
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
                      type="button"
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
                    type="button"
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

      {/* 7. CRUD Modal Instance */}
      <EntityCRUDModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entityType={modalType}
        initialData={selectedEntityData}
      />

      {/* 8. CSV Batch Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        defaultEntityType={csvDefaultType}
      />
    </div>
  );
};

export default MasterDataView;
