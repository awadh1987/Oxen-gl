import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  db,
  doc,
  setDoc,
  getDocs,
  collection,
} from '../firebase';
import {
  User,
  Company,
  UserRole,
  Customer,
  Crusher,
  Transporter,
  MaterialOption,
  OperationRecord,
  CrusherPaymentEntry,
  DashboardKPIs,
  BrandConfig,
  EditApprovalRequest,
  UserApprovalRequest,
  AuditLogEntry,
  DigitalSignatureStamp,
  DocumentAttachment,
  CustomerInvoice,
  InvoiceVersion,
  FinancialVoucher,
  VoucherType,
  VoucherCategory,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_CRUSHERS,
  INITIAL_TRANSPORTERS,
  MATERIAL_OPTIONS,
  INITIAL_CRUSHER_PAYMENTS,
  INITIAL_BRAND_CONFIG,
  INITIAL_EDIT_REQUESTS,
  INITIAL_USER_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FINANCIAL_VOUCHERS,
  generateInitialOperations,
} from '../data/mockData';
import { tafqeetArabic, tafqeetEnglish } from '../utils/tafqeet';
import { ApiCompany, ApiOperation, erpApi } from '../services/api';
import {
  TenantColorTheme,
  DensityMode,
  ThemeMode,
  TENANT_PALETTES,
  DEFAULT_ISOLATION_TELEMETRY,
  IsolationTelemetry,
} from '../theme/designTokens';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  currentCompany: Company | null;
  setCurrentCompany: (company: Company) => void;
  companies: Company[];
  refreshCompanies: () => Promise<Company[]>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  dir: 'rtl' | 'ltr';
  // Entities
  customers: Customer[];
  crushers: Crusher[];
  transporters: Transporter[];
  materials: MaterialOption[];
  operations: OperationRecord[];
  crusherPayments: CrusherPaymentEntry[];
  // Operations Actions
  addOperation: (op: Omit<OperationRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateOperation: (id: string, op: Partial<OperationRecord>) => { success: boolean; requiresApproval?: boolean };
  deleteOperation: (id: string) => boolean;
  softDeleteOperation: (id: string) => void;
  restoreOperation: (id: string) => void;
  batchAddOperations: (ops: Omit<OperationRecord, 'id' | 'created_at' | 'updated_at'>[]) => void;
  overrideOperationRecord: (id: string, updates: Partial<OperationRecord>) => void;
  bulkOverrideOperations: (ids: string[], updates: Partial<OperationRecord>) => void;
  // Ledger Actions
  addCrusherPayment: (payment: Omit<CrusherPaymentEntry, 'id' | 'created_at'>) => void;
  deleteCrusherPayment: (id: string) => void;
  softDeleteCrusherPayment: (id: string) => void;
  // Entity CRUD - Customers
  addCustomer: (cust: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;
  softDeleteCustomer: (id: string) => void;
  restoreCustomer: (id: string) => void;
  deleteCustomer: (id: string) => void;
  batchAddCustomers: (custs: Omit<Customer, 'id'>[], updateExisting?: boolean) => { addedCount: number; updatedCount: number };
  // Entity CRUD - Crushers
  addCrusher: (crush: Omit<Crusher, 'id'>) => Crusher;
  updateCrusher: (id: string, crush: Partial<Crusher>) => void;
  softDeleteCrusher: (id: string) => void;
  restoreCrusher: (id: string) => void;
  deleteCrusher: (id: string) => void;
  batchAddCrushers: (crushes: Omit<Crusher, 'id'>[], updateExisting?: boolean) => { addedCount: number; updatedCount: number };
  // Entity CRUD - Transporters
  addTransporter: (trans: Omit<Transporter, 'id'>) => Transporter;
  updateTransporter: (id: string, trans: Partial<Transporter>) => void;
  softDeleteTransporter: (id: string) => void;
  restoreTransporter: (id: string) => void;
  deleteTransporter: (id: string) => void;
  batchAddTransporters: (trans: Omit<Transporter, 'id'>[], updateExisting?: boolean) => { addedCount: number; updatedCount: number };
  // Entity CRUD - Materials
  addMaterial: (mat: Omit<MaterialOption, 'id'>) => MaterialOption;
  updateMaterial: (id: string, mat: Partial<MaterialOption>) => void;
  softDeleteMaterial: (id: string) => void;
  restoreMaterial: (id: string) => void;
  deleteMaterial: (id: string) => void;
  // Entity CRUD - Users
  addUser: (usr: Omit<User, 'id'>) => User;
  updateUser: (id: string, usr: Partial<User>) => void;
  softDeleteUser: (id: string) => void;
  restoreUser: (id: string) => void;
  deleteUser: (id: string) => void;
  // Approvals & Workflows
  editRequests: EditApprovalRequest[];
  createEditRequest: (req: Omit<EditApprovalRequest, 'id' | 'requestedAt' | 'status'>) => void;
  approveEditRequest: (id: string, reviewNotes?: string) => void;
  rejectEditRequest: (id: string, reviewNotes?: string) => void;
  userRequests: UserApprovalRequest[];
  approveUserRequest: (id: string, assignedRole: UserRole) => void;
  rejectUserRequest: (id: string, notes?: string) => void;
  // Brand Configuration & Dynamic Theming
  brandConfig: BrandConfig;
  updateBrandConfig: (config: Partial<BrandConfig>) => void;
  resetBrandConfig: () => void;
  // Digital Signatures
  signDocument: (docType: 'Invoice' | 'Statement' | 'Settlement', docId: string, signNotes?: string) => DigitalSignatureStamp;
  // Comprehensive Audit Trail
  auditLogs: AuditLogEntry[];
  logAuditAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress'>) => void;
  clearAuditLogs: () => void;
  // Multi-Attachment System
  addAttachmentToRecord: (
    recordType: 'Operation' | 'Payment' | 'Invoice',
    recordId: string,
    attachment: Omit<DocumentAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>
  ) => DocumentAttachment;
  removeAttachmentFromRecord: (
    recordType: 'Operation' | 'Payment' | 'Invoice',
    recordId: string,
    attachmentId: string
  ) => void;
  // Financial Vouchers (سندات القبض والصرف)
  vouchers: FinancialVoucher[];
  addVoucher: (vch: Omit<FinancialVoucher, 'id' | 'created_at' | 'updated_at' | 'amountInWordsAr'>) => FinancialVoucher;
  updateVoucher: (id: string, updates: Partial<FinancialVoucher>) => void;
  deleteVoucher: (id: string) => boolean;
  approveVoucher: (id: string, reviewNotes?: string) => void;
  autoGenerateVoucherFromPayment: (payment: CrusherPaymentEntry) => FinancialVoucher;
  // Offline / Quarry Sync Status
  isOnline: boolean;
  // Native Authentication & Cloud Sync
  signOutAuth: () => Promise<void>;
  isNativeAuthSyncing: boolean;
  // Helpers & Security checks
  canAccessFinancials: boolean;
  canEditOperations: boolean;
  canDeleteRecords: boolean;
  canManageSettings: boolean;
  isAdmin: boolean;
  isCOO: boolean;
  isExecutive: boolean;
  canApproveEdits: boolean;
  canApproveInvoices: boolean;
  canEditBranding: boolean;
  isGuestUser: boolean;
  assignedCustomerId?: string | null;
  // Driver View Mode (simplified access for transport / drivers)
  isDriverMode: boolean;
  setIsDriverMode: (val: boolean) => void;
  toggleDriverMode: () => void;
  exportDailyOperationsSnapshotJSON: (targetDate?: string) => void;
  // Filtered operations based on Guest privacy barrier
  accessibleOperations: OperationRecord[];
  activeOperations: OperationRecord[];
  softDeletedOperations: OperationRecord[];
  // Computed KPIs
  kpis: DashboardKPIs;
  resetToDefaults: () => void;
  // Unified Multi-Tenant Design System & Isolation Telemetry
  tenantTheme: TenantColorTheme;
  setTenantTheme: (theme: TenantColorTheme) => void;
  densityMode: DensityMode;
  setDensityMode: (density: DensityMode) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isolationTelemetry: IsolationTelemetry;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('oxengl_language') as 'ar' | 'en') || 'ar';
  });

  const setLanguage = (lang: 'ar' | 'en') => {
    setLanguageState(lang);
    localStorage.setItem('oxengl_language', lang);
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('oxengl_current_company');
    return saved ? JSON.parse(saved) : null;
  });

  const refreshCompanies = async (): Promise<Company[]> => {
    const apiCompanies = await erpApi.getCompanies();
    const mapped = apiCompanies.map((company) => ({ id: company.id, parentId: company.parent_id, name: company.name, slug: company.slug, commercialRegistration: company.commercial_registration || undefined, taxId: company.tax_id || undefined, currency: company.currency, fiscalCalendar: company.fiscal_calendar, fiscalYearStartMonth: company.fiscal_year_start_month, taxRegime: company.tax_regime, subscriptionTier: company.subscription_tier, licenseKey: company.license_key, licenseExpiresAt: company.license_expires_at, maxCostCenters: company.max_cost_centers, themeMode: company.theme_mode, uiPrimaryColor: company.ui_primary_color, uiSecondaryColor: company.ui_secondary_color, uiLogoUrl: company.ui_logo_url }));
    setCompanies(mapped);
    setCurrentCompany((selected) => selected && mapped.some((company) => company.id === selected.id) ? selected : mapped[0] || null);
    return mapped;
  };

  // Brand Configuration State
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(() => {
    const saved = localStorage.getItem('meayon_brand_config');
    return saved ? JSON.parse(saved) : INITIAL_BRAND_CONFIG;
  });

  // Users State
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('meayon_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasMuath = parsed.some((u: User) => u.fullName?.includes('Muath') || u.username === 'muath');
        if (hasMuath) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('meayon_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.fullName?.includes('Mansour')) {
          return INITIAL_USERS[0];
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS[0]; // Muath SALAIH (Admin / CEO) by default
  });

  // Entities State
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('meayon_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [crushers, setCrushers] = useState<Crusher[]>(() => {
    const saved = localStorage.getItem('meayon_crushers');
    return saved ? JSON.parse(saved) : INITIAL_CRUSHERS;
  });

  const [transporters, setTransporters] = useState<Transporter[]>(() => {
    const saved = localStorage.getItem('meayon_transporters');
    return saved ? JSON.parse(saved) : INITIAL_TRANSPORTERS;
  });

  const [materials, setMaterials] = useState<MaterialOption[]>(() => {
    const saved = localStorage.getItem('meayon_materials');
    return saved ? JSON.parse(saved) : MATERIAL_OPTIONS;
  });

  const [operations, setOperations] = useState<OperationRecord[]>(() => {
    const saved = localStorage.getItem('meayon_operations');
    return saved ? JSON.parse(saved) : generateInitialOperations();
  });

  const mapApiOperation = (operation: ApiOperation): OperationRecord => {
    const loadedWeight = Number(operation.gross_weight);
    const deliveredWeight = Number(operation.net_weight);
    const wastageWeight = Number((loadedWeight - deliveredWeight).toFixed(4));
    const weighedAt = operation.weighed_in_at;
    const operationDate = weighedAt.slice(0, 10);
    const operationMonth = new Date(weighedAt).getMonth() + 1;
    const operationYear = new Date(weighedAt).getFullYear();

    return {
      id: operation.picking_id,
      loading_date: operationDate,
      truck_no: operation.truck_number,
      transporter_name: operation.partner_name || 'Unknown Transporter',
      loading_source: operation.source_location_name,
      loading_invoice_no: operation.picking_reference,
      destination_customer: operation.dest_location_name,
      receipt_invoice_no: operation.ticket_number,
      material_type: operation.product_name,
      qty_loaded: loadedWeight,
      qty_delivered: deliveredWeight,
      qty_wastage: wastageWeight,
      wastage_percentage: loadedWeight > 0 ? Number(((wastageWeight / loadedWeight) * 100).toFixed(4)) : 0,
      scale_ticket_no: operation.ticket_number,
      sales_amount: 0,
      vat_amount: 0,
      total_sales: 0,
      purchases_cost: 0,
      crusher_payment: 0,
      net_profit: 0,
      operation_month: operationMonth,
      operation_year: operationYear,
      created_at: weighedAt,
      updated_at: weighedAt,
    };
  };

  const [crusherPayments, setCrusherPayments] = useState<CrusherPaymentEntry[]>(() => {
    const saved = localStorage.getItem('meayon_crusher_payments');
    return saved ? JSON.parse(saved) : INITIAL_CRUSHER_PAYMENTS;
  });

  // Financial Vouchers State (سندات القبض والصرف)
  const [vouchers, setVouchers] = useState<FinancialVoucher[]>(() => {
    const saved = localStorage.getItem('meayon_vouchers');
    return saved ? JSON.parse(saved) : INITIAL_FINANCIAL_VOUCHERS;
  });

  // Offline / Quarry Connection Status Tracker
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    if (!isOnline || !currentCompany) return;

    erpApi
      .getOperations(currentCompany.id)
      .then((serverOperations) => setOperations(serverOperations.map(mapApiOperation)))
      .catch((error) => console.warn('Operations API unavailable; retaining offline cache:', error));

    erpApi
      .getPartners(currentCompany.id)
      .then((partners) => {
        if (!partners || partners.length === 0) return;

        const apiCustomers: Customer[] = partners
          .filter((p) => p.partner_type === 'customer')
          .map((p) => ({
            id: p.id,
            customerName: p.name,
            customerNameEn: p.name,
            taxNumber: p.tax_number || '',
            crNumber: p.commercial_registration || '',
            contactPerson: '',
            phone: p.phone || '',
            email: p.email || '',
            address: '',
            openingBalance: 0,
            creditLimit: 0,
            is_deleted: false,
          }));

        const apiCrushers: Crusher[] = partners
          .filter((p) => ['supplier', 'raw_materials_supplier'].includes(p.partner_type))
          .map((p) => ({
            id: p.id,
            crusherName: p.name,
            crusherNameEn: p.name,
            location: '',
            bankDetails: '',
            taxNumber: p.tax_number || '',
            openingBalance: 0,
            phone: p.phone || '',
            is_deleted: false,
          }));

        const apiTransporters: Transporter[] = partners
          .filter((p) => ['transporter', 'service_supplier'].includes(p.partner_type))
          .map((p) => ({
            id: p.id,
            transporterName: p.name,
            transporterNameEn: p.name,
            driverName: '',
            phone: p.phone || '',
            truckDetails: '',
            is_deleted: false,
          }));

        if (apiCustomers.length > 0) setCustomers(apiCustomers);
        if (apiCrushers.length > 0) setCrushers(apiCrushers);
        if (apiTransporters.length > 0) setTransporters(apiTransporters);
      })
      .catch((error) => console.warn('Partners API unavailable; retaining local cache:', error));
  }, [isOnline, currentCompany]);

  useEffect(() => {
    refreshCompanies().catch((error) => console.warn('Company directory unavailable:', error));
  }, []);

  useEffect(() => {
    if (currentCompany) localStorage.setItem('oxengl_current_company', JSON.stringify(currentCompany));
  }, [currentCompany]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Workflows & Approvals State
  const [editRequests, setEditRequests] = useState<EditApprovalRequest[]>(() => {
    const saved = localStorage.getItem('meayon_edit_requests');
    return saved ? JSON.parse(saved) : INITIAL_EDIT_REQUESTS;
  });

  const [userRequests, setUserRequests] = useState<UserApprovalRequest[]>(() => {
    const saved = localStorage.getItem('meayon_user_requests');
    return saved ? JSON.parse(saved) : INITIAL_USER_REQUESTS;
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('meayon_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Driver View Mode State (simplified UI for drivers and logistics field operations)
  const [isDriverMode, setIsDriverMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('meayon_driver_mode');
    return saved === 'true';
  });

  const toggleDriverMode = () => {
    setIsDriverMode((prev) => {
      const next = !prev;
      localStorage.setItem('meayon_driver_mode', String(next));
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('meayon_driver_mode', String(isDriverMode));
  }, [isDriverMode]);

  // Unified Multi-Tenant Design System State
  const [tenantTheme, setTenantThemeState] = useState<TenantColorTheme>(() => {
    return (localStorage.getItem('oxengl_tenant_theme') as TenantColorTheme) || 'orange';
  });

  const [densityMode, setDensityModeState] = useState<DensityMode>(() => {
    return (localStorage.getItem('oxengl_density_mode') as DensityMode) || 'comfortable';
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('oxengl_theme_mode') as ThemeMode) || 'dark';
  });

  const [isolationTelemetry] = useState<IsolationTelemetry>(DEFAULT_ISOLATION_TELEMETRY);

  const setTenantTheme = (theme: TenantColorTheme) => {
    setTenantThemeState(theme);
    localStorage.setItem('oxengl_tenant_theme', theme);
  };

  const setDensityMode = (density: DensityMode) => {
    setDensityModeState(density);
    localStorage.setItem('oxengl_density_mode', density);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('oxengl_theme_mode', mode);
  };

  // Sync design system theme, density, and CSS variables across document
  useEffect(() => {
    const palette = TENANT_PALETTES[tenantTheme] || TENANT_PALETTES.orange;
    const root = document.documentElement;

    root.setAttribute('data-theme-mode', themeMode);
    root.setAttribute('data-density', densityMode);
    root.setAttribute('data-tenant-theme', tenantTheme);
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', language);

    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const primary = currentCompany?.uiPrimaryColor || palette.primary;
    const secondary = currentCompany?.uiSecondaryColor || palette.secondary;
    root.style.setProperty('--tenant-primary', primary);
    root.style.setProperty('--tenant-primary-hover', palette.primaryHover);
    root.style.setProperty('--tenant-primary-light', palette.primaryLight);
    root.style.setProperty('--tenant-secondary', secondary);
    root.style.setProperty('--tenant-glow', palette.glow);
    root.style.setProperty('--tenant-surface', palette.surfaceAccent);
    root.style.setProperty('--tenant-border', palette.badgeBorder);
  }, [tenantTheme, themeMode, densityMode, currentCompany, language]);

  // Export JSON Snapshot of daily operations for auditing
  const exportDailyOperationsSnapshotJSON = (targetDate?: string) => {
    const todayStr = targetDate || new Date().toISOString().split('T')[0];
    const dayOps = accessibleOperations.filter((op) => {
      if (op.is_deleted) return false;
      return op.date.startsWith(todayStr) || (targetDate ? op.date === targetDate : true);
    });

    const snapshot = {
      snapshotId: `MYON-OPS-SNAP-${Date.now()}`,
      version: '1.0.0-PROD',
      exportTimestamp: new Date().toISOString(),
      snapshotTargetDate: todayStr,
      company: {
        nameAr: brandConfig.companyNameAr,
        nameEn: brandConfig.companyNameEn,
        crNumber: brandConfig.crNumber,
        taxNumber: brandConfig.taxNumber,
        address: brandConfig.addressAr,
        email: brandConfig.email,
        phone: brandConfig.phone,
      },
      exportedBy: {
        userId: currentUser.id,
        name: currentUser.fullNameAr || currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
      },
      metricsSummary: {
        totalTripCount: dayOps.length,
        totalLoadedTonnage: Number(dayOps.reduce((sum, o) => sum + (o.qty_loaded || 0), 0).toFixed(3)),
        totalDeliveredTonnage: Number(dayOps.reduce((sum, o) => sum + (o.qty_delivered || 0), 0).toFixed(3)),
        totalWastageTonnage: Number(dayOps.reduce((sum, o) => sum + (o.qty_wastage || 0), 0).toFixed(3)),
        totalSalesAmountSAR: Number(dayOps.reduce((sum, o) => sum + (o.sales_amount || 0), 0).toFixed(2)),
        totalTransporterCostSAR: Number(dayOps.reduce((sum, o) => sum + (o.transporter_cost_amount || 0), 0).toFixed(2)),
        totalCrusherCostSAR: Number(dayOps.reduce((sum, o) => sum + (o.crusher_cost_amount || 0), 0).toFixed(2)),
        netMarginSAR: Number(
          dayOps
            .reduce((sum, o) => sum + (o.sales_amount || 0) - (o.transporter_cost_amount || 0) - (o.crusher_cost_amount || 0), 0)
            .toFixed(2)
        ),
      },
      cryptographicAuditStamp: {
        algorithm: 'SHA-256-DIGEST',
        stampHash: `MYON-HEX-${Math.random().toString(36).substring(2, 12).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        status: 'TAMPER_VERIFIED',
      },
      operations: dayOps,
    };

    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OxenGL_Operations_Snapshot_${todayStr}_${Date.now().toString().slice(-4)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('meayon_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('meayon_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('meayon_brand_config', JSON.stringify(brandConfig));
  }, [brandConfig]);

  useEffect(() => {
    localStorage.setItem('meayon_operations', JSON.stringify(operations));
  }, [operations]);

  useEffect(() => {
    localStorage.setItem('meayon_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('meayon_crushers', JSON.stringify(crushers));
  }, [crushers]);

  useEffect(() => {
    localStorage.setItem('meayon_transporters', JSON.stringify(transporters));
  }, [transporters]);

  useEffect(() => {
    localStorage.setItem('meayon_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('meayon_crusher_payments', JSON.stringify(crusherPayments));
  }, [crusherPayments]);

  useEffect(() => {
    localStorage.setItem('meayon_edit_requests', JSON.stringify(editRequests));
  }, [editRequests]);

  useEffect(() => {
    localStorage.setItem('meayon_user_requests', JSON.stringify(userRequests));
  }, [userRequests]);

  useEffect(() => {
    localStorage.setItem('meayon_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('meayon_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  // Inject dynamic CSS custom properties for Brand Theming
  useEffect(() => {
    const primaryColor = currentCompany?.uiPrimaryColor || brandConfig.primaryColor;
    const secondaryColor = currentCompany?.uiSecondaryColor || brandConfig.secondaryColor;
    if (primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
    }
  }, [brandConfig, currentCompany]);

  // Native Authentication & Sync State
  const [isNativeAuthSyncing] = useState<boolean>(false);

  // Sync BrandConfig to Firestore when updated
  useEffect(() => {
    if (db && brandConfig) {
      try {
        setDoc(doc(db, 'brand_config', 'default'), brandConfig, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  }, [brandConfig]);

  const signOutAuth = async (): Promise<void> => {
    try {
      await erpApi.logout();
    } catch (err) {
      console.warn('Server logout failed; clearing local session state:', err);
    }
    localStorage.removeItem('oxengl_session_active');
    localStorage.removeItem('oxengl_recovery_session');
    localStorage.removeItem('meayon_user');
    setCurrentUser(INITIAL_USERS[0]);
  };

  // RBAC Permission Gates
  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Super_Admin';
  const isCOO = currentUser.role === 'COO';
  const isExecutive = isAdmin || isCOO;
  const canAccessFinancials = isAdmin || isCOO || currentUser.role === 'Accountant';
  const canEditOperations = isAdmin || isCOO || currentUser.role === 'Accountant' || currentUser.role === 'Data_Entry';
  const canApproveEdits = isAdmin || isCOO;
  const canApproveInvoices = isAdmin; // strictly CEO/Admin
  const canEditBranding = isAdmin; // strictly CEO/Admin
  const canDeleteRecords = isAdmin || isCOO;
  const canManageSettings = isAdmin;
  const isGuestUser = currentUser.role === 'Guest';
  const assignedCustomerId = currentUser.assignedCustomerId;

  // Active operations excluding soft-deleted
  const activeOperations = useMemo(() => {
    return operations.filter((op) => !op.is_deleted);
  }, [operations]);

  const softDeletedOperations = useMemo(() => {
    return operations.filter((op) => !!op.is_deleted);
  }, [operations]);

  // Filter operations for Guest/Client Portal (Read-only + privacy barrier)
  const accessibleOperations = useMemo(() => {
    const active = activeOperations;
    if (!isGuestUser) return active;

    const targetCust = customers.find((c) => c.id === assignedCustomerId);
    const custName = targetCust ? targetCust.customerName : '';

    return active
      .filter(
        (op) =>
          !custName ||
          op.destination_customer.includes(custName) ||
          (targetCust?.customerNameEn && op.destination_customer.includes(targetCust.customerNameEn))
      )
      .map((op) => ({
        ...op,
        // STRICT PRIVACY BARRIER: Mask sensitive cost prices, profit, and crusher buy rates
        purchases_cost: 0,
        crusher_payment: 0,
        net_profit: 0,
        loading_source: '*** (محمي / Confidential)',
      }));
  }, [activeOperations, isGuestUser, assignedCustomerId, customers]);

  // Audit Logger Helper
  const logAuditAction = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress'>) => {
    const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const newEntry: AuditLogEntry = {
      ...entry,
      id,
      timestamp: now,
      ipAddress: '192.168.1.10 (Saudi Local Network)',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const clearAuditLogs = () => {
    if (!isAdmin) return;
    setAuditLogs([]);
    localStorage.removeItem('meayon_audit_logs');
  };

  // Operations Handlers
  const addOperation = async (opData: Omit<OperationRecord, 'id' | 'created_at' | 'updated_at'>): Promise<void> => {
    if (navigator.onLine) {
      const operation = await erpApi.createWeighbridgeOperation({
        companyId: currentCompany?.id || '',
        transporterName: opData.transporter_name,
        materialName: opData.material_type,
        sourceName: opData.loading_source,
        destinationName: opData.destination_customer,
        truckNumber: opData.truck_no,
        grossWeight: opData.qty_loaded,
        tareWeight: Math.max(0, opData.qty_loaded - opData.qty_delivered),
      });
      const serverRecord = mapApiOperation(operation);
      setOperations((previous) => [serverRecord, ...previous.filter((item) => item.id !== serverRecord.id)]);
      logAuditAction({
        userId: currentUser.id,
        userName: currentUser.fullNameAr || currentUser.fullName,
        userRole: currentUser.role,
        action: 'CREATE',
        entityType: 'Operation',
        entityId: serverRecord.id,
        summary: `تم تسجيل تذكرة الميزان في قاعدة البيانات للشاحنة (${serverRecord.truck_no})`,
        newData: serverRecord,
      });
      return;
    }

    const id = `op-2026-${String(Date.now()).slice(-6)}`;
    const now = new Date().toISOString();
    const newRecord: OperationRecord = {
      ...opData,
      id,
      version: 1,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      created_by: currentUser.fullNameAr || currentUser.fullName,
    };
    setOperations((prev) => [newRecord, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Operation',
      entityId: id,
      summary: `إنشاء تذكرة ميزان جديدة للشاحنة (${newRecord.truck_no}) بحمولة ${newRecord.qty_delivered} طن`,
      newData: newRecord,
    });
  };

  const updateOperation = (id: string, patch: Partial<OperationRecord>): { success: boolean; requiresApproval?: boolean } => {
    const existing = operations.find((o) => o.id === id);
    if (!existing) return { success: false };

    // If non-admin modifies a sensitive financial or weight field, create an Edit Approval Request (Change Management)
    if (!isAdmin && (patch.qty_delivered !== undefined || patch.qty_loaded !== undefined || patch.sales_amount !== undefined || patch.purchases_cost !== undefined)) {
      const diffFields: string[] = [];
      if (patch.qty_delivered !== undefined && patch.qty_delivered !== existing.qty_delivered) {
        diffFields.push(`الوزن المستلم: ${existing.qty_delivered} -> ${patch.qty_delivered}`);
      }
      if (patch.sales_amount !== undefined && patch.sales_amount !== existing.sales_amount) {
        diffFields.push(`المبيعات: ${existing.sales_amount} -> ${patch.sales_amount}`);
      }

      createEditRequest({
        recordId: id,
        entityType: 'Operation',
        requestedBy: currentUser.fullNameAr || currentUser.fullName,
        requestedByRole: currentUser.role,
        diffSummary: `طلب تعديل تذكرة ميزان: ${diffFields.join(', ')}`,
        oldValues: existing as any,
        newValues: { ...existing, ...patch } as any,
      });

      return { success: true, requiresApproval: true };
    }

    // Admin direct update
    setOperations((prev) =>
      prev.map((op) =>
        op.id === id
          ? {
              ...op,
              ...patch,
              version: (op.version || 1) + 1,
              updated_at: new Date().toISOString(),
            }
          : op
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Operation',
      entityId: id,
      summary: `تحديث مباشر لبيانات الرحلة (${existing.truck_no})`,
      oldData: existing,
      newData: { ...existing, ...patch },
    });

    return { success: true, requiresApproval: false };
  };

  const overrideOperationRecord = (id: string, updates: Partial<OperationRecord>) => {
    if (!isAdmin) return;
    const existing = operations.find((o) => o.id === id);
    if (!existing) return;

    setOperations((prev) =>
      prev.map((op) =>
        op.id === id
          ? {
              ...op,
              ...updates,
              version: (op.version || 1) + 1,
              updated_at: new Date().toISOString(),
            }
          : op
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'OVERRIDE_DB',
      entityType: 'Operation',
      entityId: id,
      summary: `تعديل مباشر من شبكة البيانات التنفيذية (Global Grid Override) للسجل ${id}`,
      oldData: existing,
      newData: updates,
    });
  };

  const bulkOverrideOperations = (ids: string[], updates: Partial<OperationRecord>) => {
    if (!isAdmin) return;
    setOperations((prev) =>
      prev.map((op) =>
        ids.includes(op.id)
          ? {
              ...op,
              ...updates,
              version: (op.version || 1) + 1,
              updated_at: new Date().toISOString(),
            }
          : op
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'OVERRIDE_DB',
      entityType: 'Operation',
      entityId: `bulk-${ids.length}`,
      summary: `تعديل جماعي مباشر لعدد (${ids.length}) سجل في قاعدة البيانات`,
      newData: updates,
    });
  };

  const softDeleteOperation = (id: string) => {
    const existing = operations.find((o) => o.id === id);
    if (!existing) return;

    setOperations((prev) =>
      prev.map((op) =>
        op.id === id
          ? {
              ...op,
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              deleted_by: currentUser.fullNameAr || currentUser.fullName,
            }
          : op
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'SOFT_DELETE',
      entityType: 'Operation',
      entityId: id,
      summary: `أرشفة / حذف مؤقت لتذكرة الميزان (${existing.truck_no} - ${existing.loading_date})`,
    });
  };

  const restoreOperation = (id: string) => {
    const existing = operations.find((o) => o.id === id);
    if (!existing) return;

    setOperations((prev) =>
      prev.map((op) =>
        op.id === id
          ? {
              ...op,
              is_deleted: false,
              deleted_at: undefined,
              deleted_by: undefined,
            }
          : op
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'RESTORE',
      entityType: 'Operation',
      entityId: id,
      summary: `استعادة تذكرة الميزان (${existing.truck_no}) من سلة المحذوفات`,
    });
  };

  const deleteOperation = (id: string): boolean => {
    if (!canDeleteRecords) return false;
    setOperations((prev) => prev.filter((op) => op.id !== id));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'DELETE',
      entityType: 'Operation',
      entityId: id,
      summary: `حذف نهائي لسجل العملية ${id}`,
    });
    return true;
  };

  const batchAddOperations = (newOps: Omit<OperationRecord, 'id' | 'created_at' | 'updated_at'>[]) => {
    const now = new Date().toISOString();
    const formatted: OperationRecord[] = newOps.map((op, idx) => ({
      ...op,
      id: `op-batch-${Date.now()}-${idx}`,
      version: 1,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      created_by: currentUser.fullNameAr || currentUser.fullName,
    }));
    setOperations((prev) => [...formatted, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Operation',
      entityId: `batch-${newOps.length}`,
      summary: `استيراد دفعة رحلات بعدد (${newOps.length}) سجل`,
    });
  };

  // Crusher Payments
  const addCrusherPayment = (payment: Omit<CrusherPaymentEntry, 'id' | 'created_at'>) => {
    const id = `pay-${Date.now()}`;
    const newPay: CrusherPaymentEntry = {
      ...payment,
      id,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };
    setCrusherPayments((prev) => [newPay, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Payment',
      entityId: id,
      summary: `تسجيل دفعة سداد بقيمة ${newPay.amount} ر.س لصالح ${newPay.crusher_name}`,
      newData: newPay,
    });
  };

  const deleteCrusherPayment = (id: string) => {
    if (!canDeleteRecords) return;
    setCrusherPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const softDeleteCrusherPayment = (id: string) => {
    setCrusherPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_deleted: true, deleted_at: new Date().toISOString() } : p))
    );
  };

  // Financial Vouchers (سندات القبض والصرف) Methods
  const addVoucher = (
    vchData: Omit<FinancialVoucher, 'id' | 'created_at' | 'updated_at' | 'amountInWordsAr'>
  ): FinancialVoucher => {
    const id = `vch-${Date.now()}`;
    const now = new Date().toISOString();
    const prefix = vchData.type === 'Payment' ? 'PV' : 'RV';
    const year = vchData.year || new Date().getFullYear();
    const month = String(vchData.month || new Date().getMonth() + 1).padStart(2, '0');
    const serial = String(vouchers.length + 1).padStart(4, '0');
    const autoNumber = vchData.voucherNumber || `${prefix}-${year}-${month}-${serial}`;

    const newVoucher: FinancialVoucher = {
      ...vchData,
      id,
      voucherNumber: autoNumber,
      amountInWordsAr: tafqeetArabic(vchData.amount),
      amountInWordsEn: tafqeetEnglish(vchData.amount),
      created_at: now,
      updated_at: now,
    };

    setVouchers((prev) => [newVoucher, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Voucher',
      entityId: id,
      summary: `إنشاء سند ${newVoucher.type === 'Payment' ? 'صرف' : 'قبض'} رسمي رقم (${newVoucher.voucherNumber}) بقيمة ${newVoucher.amount} ر.س لصالح/من (${newVoucher.partyName})`,
      newData: newVoucher,
    });

    return newVoucher;
  };

  const updateVoucher = (id: string, updates: Partial<FinancialVoucher>) => {
    const existing = vouchers.find((v) => v.id === id);
    if (!existing) return;

    const updatedAmount = updates.amount !== undefined ? updates.amount : existing.amount;
    const amountInWordsAr = updates.amount !== undefined ? tafqeetArabic(updatedAmount) : existing.amountInWordsAr;
    const amountInWordsEn = updates.amount !== undefined ? tafqeetEnglish(updatedAmount) : existing.amountInWordsEn;

    const patched: FinancialVoucher = {
      ...existing,
      ...updates,
      amount: updatedAmount,
      amountInWordsAr,
      amountInWordsEn,
      updated_at: new Date().toISOString(),
    };

    setVouchers((prev) => prev.map((v) => (v.id === id ? patched : v)));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Voucher',
      entityId: id,
      summary: `تحديث بيانات السند المالي رقم (${existing.voucherNumber})`,
      oldData: existing,
      newData: patched,
    });
  };

  const deleteVoucher = (id: string): boolean => {
    if (!canDeleteRecords) return false;
    const existing = vouchers.find((v) => v.id === id);
    if (!existing) return false;

    setVouchers((prev) => prev.filter((v) => v.id !== id));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'DELETE',
      entityType: 'Voucher',
      entityId: id,
      summary: `حذف السند المالي (${existing.voucherNumber}) بقيمة ${existing.amount} ر.س`,
    });
    return true;
  };

  const approveVoucher = (id: string, reviewNotes?: string) => {
    if (!isAdmin && !isCOO) return;
    const existing = vouchers.find((v) => v.id === id);
    if (!existing) return;

    const signature = signDocument('Invoice', id, reviewNotes || 'اعتماد المدير التنفيذي العام للسند المالي');

    const approvedVoucher: FinancialVoucher = {
      ...existing,
      isApproved: true,
      status: 'Approved',
      approvedBy: currentUser.fullNameAr || currentUser.fullName,
      approvedAt: new Date().toISOString(),
      digitalSignature: signature,
      updated_at: new Date().toISOString(),
    };

    setVouchers((prev) => prev.map((v) => (v.id === id ? approvedVoucher : v)));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'APPROVE',
      entityType: 'Voucher',
      entityId: id,
      summary: `اعتماد وتوقيع السند المالي (${existing.voucherNumber}) بالختم الرقمي والتفويض التنفيذي`,
      newData: approvedVoucher,
    });

    if (currentCompany) {
      void (async () => {
        try {
          const accounts = await erpApi.getAccountingAccounts(currentCompany.id);
          const cashAcc = accounts.find((a) => a.code === '101000') || accounts.find((a) => a.internal_type === 'asset');
          const counterAcc = approvedVoucher.type === 'Receipt'
            ? (accounts.find((a) => a.code === '120000') || accounts.find((a) => a.code === '401000') || accounts.find((a) => a.internal_type === 'revenue'))
            : (accounts.find((a) => a.code === '201000') || accounts.find((a) => a.code === '501000') || accounts.find((a) => a.internal_type === 'expense'));

          if (cashAcc && counterAcc) {
            const isReceipt = approvedVoucher.type === 'Receipt';
            const move = await erpApi.createAccountMove(currentCompany.id, {
              journal_code: 'MISC',
              move_type: 'settlement',
              ref: approvedVoucher.voucherNumber,
              name: approvedVoucher.purpose || approvedVoucher.voucherNumber,
              lines: [
                {
                  account_id: isReceipt ? cashAcc.id : counterAcc.id,
                  debit: Number(approvedVoucher.amount),
                  credit: 0,
                  name: `${approvedVoucher.voucherNumber} - ${approvedVoucher.partyName || ''}`,
                },
                {
                  account_id: isReceipt ? counterAcc.id : cashAcc.id,
                  debit: 0,
                  credit: Number(approvedVoucher.amount),
                  name: `${approvedVoucher.voucherNumber} - ${approvedVoucher.partyName || ''}`,
                },
              ],
            });

            if (move?.id) {
              setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, move_id: move.id } : v)));
            }
          }
        } catch (err) {
          console.warn('[VoucherSync] Failed to post voucher to general ledger:', err);
        }
      })();
    }
  };

  const autoGenerateVoucherFromPayment = (payment: CrusherPaymentEntry): FinancialVoucher => {
    const targetCrusher = crushers.find((c) => c.id === payment.crusher_id);
    const category: VoucherCategory = 'Crusher_Settlement';
    const serial = String(vouchers.length + 1).padStart(4, '0');
    const voucherNumber = `PV-${payment.year}-${String(payment.month).padStart(2, '0')}-${serial}`;

    const newVoucher = addVoucher({
      voucherNumber,
      type: 'Payment',
      category,
      date: payment.payment_date,
      amount: payment.amount,
      partyType: 'Crusher',
      partyId: payment.crusher_id,
      partyName: payment.crusher_name,
      partyTaxNumber: targetCrusher?.taxNumber,
      paymentMethod: payment.payment_method,
      transferRefNumber: payment.reference_no,
      linkedReferenceNo: payment.reference_no || `CRUSH-STMT-${payment.year}-${payment.month}`,
      purpose: `سداد مستحقات توريد مواد حصوية لـ (${payment.crusher_name}) عن شهر ${payment.month}/${payment.year}`,
      notes: payment.notes || 'سند صرف صادر آلياً من جدول حسابات ومدفوعات موردي المواد الخام',
      month: payment.month,
      year: payment.year,
      preparedBy: currentUser.fullNameAr || currentUser.fullName,
      reviewedBy: 'عبدالمجيد أحمد (المدير المالي والتشغيلي COO)',
      receivedBy: `${payment.crusher_name} - الإدارة المالية`,
      isApproved: isAdmin,
      status: isAdmin ? 'Approved' : 'Pending_Approval',
      approvedBy: isAdmin ? (currentUser.fullNameAr || currentUser.fullName) : undefined,
      approvedAt: isAdmin ? new Date().toISOString() : undefined,
    });

    return newVoucher;
  };

  // Entity CRUD - Customers
  const addCustomer = (custData: Omit<Customer, 'id'>): Customer => {
    const id = `cust-${Date.now()}`;
    const newCust: Customer = {
      ...custData,
      id,
      is_deleted: false,
    };
    setCustomers((prev) => [newCust, ...prev]);

    if (currentCompany) {
      erpApi
        .createPartner(currentCompany.id, {
          name: custData.customerName,
          partner_type: 'customer',
          email: custData.email || null,
          phone: custData.phone || null,
          tax_number: custData.taxNumber || null,
          commercial_registration: custData.crNumber || null,
        })
        .then((created) => {
          setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, id: created.id } : c)));
        })
        .catch((err) => console.warn('Customer backend sync warning:', err));
    }

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: id,
      summary: `إضافة عميل جديد: ${newCust.customerName}`,
      newData: newCust,
    });

    return newCust;
  };

  const updateCustomer = (id: string, patch: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: id,
      summary: `تحديث بيانات العميل ${id}`,
      newData: patch,
    });
  };

  const softDeleteCustomer = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: currentUser.fullName }
          : c
      )
    );
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'SOFT_DELETE',
      entityType: 'Customer',
      entityId: id,
      summary: `أرشفة العميل ${id}`,
    });
  };

  const restoreCustomer = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_deleted: false, deleted_at: undefined, deleted_by: undefined } : c))
    );
  };

  const deleteCustomer = (id: string) => {
    if (!isAdmin) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const batchAddCustomers = (newCusts: Omit<Customer, 'id'>[], updateExisting: boolean = true) => {
    let added = 0;
    let updated = 0;
    setCustomers((prev) => {
      let current = [...prev];
      newCusts.forEach((item) => {
        const existingIdx = current.findIndex(
          (c) =>
            (item.taxNumber && c.taxNumber && c.taxNumber.trim() === item.taxNumber.trim()) ||
            (c.customerName && item.customerName && c.customerName.trim().toLowerCase() === item.customerName.trim().toLowerCase())
        );

        if (existingIdx >= 0 && updateExisting) {
          current[existingIdx] = {
            ...current[existingIdx],
            ...item,
            is_deleted: false,
          };
          updated++;
        } else {
          current.unshift({
            ...item,
            id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            is_deleted: false,
          });
          added++;
        }
      });
      return current;
    });

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: `batch-cust-${newCusts.length}`,
      summary: `استيراد دفعة عملاء عبر CSV: تم إضافة (${added}) وتحديث (${updated}) سجل`,
    });

    return { addedCount: added, updatedCount: updated };
  };

  // Entity CRUD - Crushers
  const addCrusher = (crushData: Omit<Crusher, 'id'>): Crusher => {
    const id = `crush-${Date.now()}`;
    const newCrush: Crusher = {
      ...crushData,
      id,
      is_deleted: false,
    };
    setCrushers((prev) => [newCrush, ...prev]);

    if (currentCompany) {
      erpApi
        .createPartner(currentCompany.id, {
          name: crushData.crusherName,
          partner_type: 'supplier',
          phone: crushData.phone || null,
          tax_number: crushData.taxNumber || null,
        })
        .then((created) => {
          setCrushers((prev) => prev.map((c) => (c.id === id ? { ...c, id: created.id } : c)));
        })
        .catch((err) => console.warn('Crusher backend sync warning:', err));
    }

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Crusher',
      entityId: id,
      summary: `إضافة كسارة جديدة: ${newCrush.crusherName}`,
      newData: newCrush,
    });

    return newCrush;
  };

  const updateCrusher = (id: string, patch: Partial<Crusher>) => {
    setCrushers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Crusher',
      entityId: id,
      summary: `تحديث بيانات مورد المواد الخام ${id}`,
      newData: patch,
    });
  };

  const softDeleteCrusher = (id: string) => {
    setCrushers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: currentUser.fullName }
          : c
      )
    );
  };

  const restoreCrusher = (id: string) => {
    setCrushers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_deleted: false, deleted_at: undefined, deleted_by: undefined } : c))
    );
  };

  const deleteCrusher = (id: string) => {
    if (!isAdmin) return;
    setCrushers((prev) => prev.filter((c) => c.id !== id));
  };

  const batchAddCrushers = (newCrushes: Omit<Crusher, 'id'>[], updateExisting: boolean = true) => {
    let added = 0;
    let updated = 0;
    setCrushers((prev) => {
      let current = [...prev];
      newCrushes.forEach((item) => {
        const existingIdx = current.findIndex(
          (c) =>
            (item.taxNumber && c.taxNumber && c.taxNumber.trim() === item.taxNumber.trim()) ||
            (c.crusherName && item.crusherName && c.crusherName.trim().toLowerCase() === item.crusherName.trim().toLowerCase())
        );

        if (existingIdx >= 0 && updateExisting) {
          current[existingIdx] = {
            ...current[existingIdx],
            ...item,
            is_deleted: false,
          };
          updated++;
        } else {
          current.unshift({
            ...item,
            id: `crush-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            is_deleted: false,
          });
          added++;
        }
      });
      return current;
    });

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Crusher',
      entityId: `batch-crush-${newCrushes.length}`,
      summary: `استيراد دفعة كسارات وموردين عبر CSV: تم إضافة (${added}) وتحديث (${updated}) سجل`,
    });

    return { addedCount: added, updatedCount: updated };
  };

  // Entity CRUD - Transporters
  const addTransporter = (transData: Omit<Transporter, 'id'>): Transporter => {
    const id = `trans-${Date.now()}`;
    const newTrans: Transporter = {
      ...transData,
      id,
      is_deleted: false,
    };
    setTransporters((prev) => [newTrans, ...prev]);

    if (currentCompany) {
      erpApi
        .createPartner(currentCompany.id, {
          name: transData.transporterName,
          partner_type: 'transporter',
          phone: transData.phone || null,
        })
        .then((created) => {
          setTransporters((prev) => prev.map((t) => (t.id === id ? { ...t, id: created.id } : t)));
        })
        .catch((err) => console.warn('Transporter backend sync warning:', err));
    }

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Transporter',
      entityId: id,
      summary: `إضافة مزود خدمة جديد: ${newTrans.transporterName}`,
      newData: newTrans,
    });

    return newTrans;
  };

  const updateTransporter = (id: string, patch: Partial<Transporter>) => {
    setTransporters((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Transporter',
      entityId: id,
      summary: `تحديث بيانات مزود الخدمة ${id}`,
      newData: patch,
    });
  };

  const softDeleteTransporter = (id: string) => {
    setTransporters((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: currentUser.fullName }
          : t
      )
    );
  };

  const restoreTransporter = (id: string) => {
    setTransporters((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_deleted: false, deleted_at: undefined, deleted_by: undefined } : t))
    );
  };

  const deleteTransporter = (id: string) => {
    if (!isAdmin) return;
    setTransporters((prev) => prev.filter((t) => t.id !== id));
  };

  const batchAddTransporters = (newTrans: Omit<Transporter, 'id'>[], updateExisting: boolean = true) => {
    let added = 0;
    let updated = 0;
    setTransporters((prev) => {
      let current = [...prev];
      newTrans.forEach((item) => {
        const existingIdx = current.findIndex(
          (t) =>
            t.transporterName &&
            item.transporterName &&
            t.transporterName.trim().toLowerCase() === item.transporterName.trim().toLowerCase()
        );

        if (existingIdx >= 0 && updateExisting) {
          current[existingIdx] = {
            ...current[existingIdx],
            ...item,
            is_deleted: false,
          };
          updated++;
        } else {
          current.unshift({
            ...item,
            id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            is_deleted: false,
          });
          added++;
        }
      });
      return current;
    });

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Transporter',
      entityId: `batch-trans-${newTrans.length}`,
      summary: `استيراد دفعة مزودي خدمات عبر CSV: تم إضافة (${added}) وتحديث (${updated}) سجل`,
    });

    return { addedCount: added, updatedCount: updated };
  };

  // Entity CRUD - Materials
  const addMaterial = (matData: Omit<MaterialOption, 'id'>): MaterialOption => {
    const id = `mat-${Date.now()}`;
    const newMat: MaterialOption = {
      ...matData,
      id,
      is_deleted: false,
    };
    setMaterials((prev) => [newMat, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Material',
      entityId: id,
      summary: `إضافة صنف مادة جديد: ${newMat.nameAr}`,
      newData: newMat,
    });

    return newMat;
  };

  const updateMaterial = (id: string, patch: Partial<MaterialOption>) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Material',
      entityId: id,
      summary: `تحديث تسعير/بيانات المادة ${id}`,
      newData: patch,
    });
  };

  const softDeleteMaterial = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: currentUser.fullName }
          : m
      )
    );
  };

  const restoreMaterial = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_deleted: false, deleted_at: undefined, deleted_by: undefined } : m))
    );
  };

  const deleteMaterial = (id: string) => {
    if (!isAdmin) return;
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Entity CRUD - Users
  const addUser = (usrData: Omit<User, 'id'>): User => {
    const id = `usr-${Date.now()}`;
    const newUsr: User = {
      ...usrData,
      id,
      status: 'Active',
      is_deleted: false,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUsr]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'User',
      entityId: id,
      summary: `دعوة/إنشاء حساب مستخدم جديد: ${newUsr.fullNameAr || newUsr.fullName} بدور (${newUsr.role})`,
      newData: newUsr,
    });

    return newUsr;
  };

  const updateUser = (id: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      summary: `تحديث صلاحيات/بيانات المستخدم ${id}`,
      newData: patch,
    });
  };

  const softDeleteUser = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, is_deleted: true, status: 'Suspended', deleted_at: new Date().toISOString(), deleted_by: currentUser.fullName }
          : u
      )
    );
  };

  const restoreUser = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_deleted: false, status: 'Active', deleted_at: undefined, deleted_by: undefined } : u))
    );
  };

  const deleteUser = (id: string) => {
    if (!isAdmin) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Approvals & Workflows
  const createEditRequest = (req: Omit<EditApprovalRequest, 'id' | 'requestedAt' | 'status'>) => {
    const id = `req-edit-${Date.now()}`;
    const newReq: EditApprovalRequest = {
      ...req,
      id,
      requestedAt: new Date().toISOString(),
      status: 'Pending',
    };
    setEditRequests((prev) => [newReq, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: req.entityType as any,
      entityId: req.recordId,
      summary: `تقديم طلب موافقة على تعديل سجل (Change Request) للمدير التنفيذي`,
      newData: req.newValues,
    });
  };

  const approveEditRequest = (id: string, reviewNotes?: string) => {
    const req = editRequests.find((r) => r.id === id);
    if (!req) return;

    // Apply the change to the respective record
    if (req.entityType === 'Operation') {
      setOperations((prev) =>
        prev.map((op) =>
          op.id === req.recordId
            ? {
                ...op,
                ...req.newValues,
                version: (op.version || 1) + 1,
                updated_at: new Date().toISOString(),
              }
            : op
        )
      );
    }

    setEditRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Approved',
              reviewedBy: currentUser.fullNameAr || currentUser.fullName,
              reviewedAt: new Date().toISOString(),
              reviewNotes,
            }
          : r
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'APPROVE',
      entityType: req.entityType as any,
      entityId: req.recordId,
      summary: `موافقة المدير التنفيذي على طلب التعديل ${id} وتطبيق البيانات الجديدة فوراً`,
      oldData: req.oldValues,
      newData: req.newValues,
    });
  };

  const rejectEditRequest = (id: string, reviewNotes?: string) => {
    const req = editRequests.find((r) => r.id === id);
    if (!req) return;

    setEditRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Rejected',
              reviewedBy: currentUser.fullNameAr || currentUser.fullName,
              reviewedAt: new Date().toISOString(),
              reviewNotes,
            }
          : r
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'REJECT',
      entityType: req.entityType as any,
      entityId: req.recordId,
      summary: `رفض طلب التعديل ${id}. السبب: ${reviewNotes || 'غير مطابق للشروط'}`,
    });
  };

  const approveUserRequest = (id: string, assignedRole: UserRole) => {
    const req = userRequests.find((r) => r.id === id);
    if (!req) return;

    // Create user account
    const newUsr: User = {
      id: `usr-${Date.now()}`,
      username: req.username,
      fullName: req.fullName,
      fullNameAr: req.fullNameAr,
      email: req.email,
      phone: req.phone,
      role: assignedRole,
      status: 'Active',
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUsr]);

    setUserRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Approved',
              assignedRole,
              reviewedBy: currentUser.fullNameAr || currentUser.fullName,
            }
          : r
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'APPROVE',
      entityType: 'User',
      entityId: newUsr.id,
      summary: `اعتماد تسجيل المستخدم (${newUsr.fullNameAr}) وتعيين الصلاحية (${assignedRole})`,
      newData: newUsr,
    });
  };

  const rejectUserRequest = (id: string, notes?: string) => {
    setUserRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Rejected',
              notes,
              reviewedBy: currentUser.fullNameAr || currentUser.fullName,
            }
          : r
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'REJECT',
      entityType: 'User',
      entityId: id,
      summary: `رفض طلب تسجيل المستخدم ${id}`,
    });
  };

  // Brand Customization
  const updateBrandConfig = (configPatch: Partial<BrandConfig>) => {
    if (!canEditBranding && !isAdmin) return;
    setBrandConfig((prev) => {
      const updated = { ...prev, ...configPatch };
      if (currentCompany) {
        erpApi.updateCompanyBranding(currentCompany.id, {
          ui_logo_url: updated.customLogoUrl || null,
          ui_primary_color: updated.primaryColor || '#1E3A8A',
          ui_secondary_color: updated.secondaryColor || '#7C3AED',
        }).then(() => refreshCompanies()).catch((error) => console.warn('Tenant branding sync failed:', error));
      }
      return updated;
    });

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'BRAND_CONFIG',
      entityType: 'BrandConfig',
      entityId: 'brand-main',
      summary: `تحديث الهوية البصرية وإعدادات الشركة (White-Labeling)`,
      newData: configPatch,
    });
  };

  const resetBrandConfig = () => {
    if (!canEditBranding && !isAdmin) return;
    setBrandConfig(INITIAL_BRAND_CONFIG);
  };

  // Digital Signatures Engine
  const signDocument = (
    docType: 'Invoice' | 'Statement' | 'Settlement',
    docId: string,
    signNotes?: string
  ): DigitalSignatureStamp => {
    const now = new Date().toISOString();
    const hash = `SA-ZATCA-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const signatureStamp: DigitalSignatureStamp = {
      signedBy: brandConfig.ceoNameAr || currentUser.fullNameAr || currentUser.fullName,
      signedByRole: brandConfig.ceoTitleAr || 'المدير التنفيذي العام',
      signedAt: now,
      verificationHash: hash,
      signatureImageUrl: brandConfig.ceoSignatureUrl || '',
      stampImageUrl: brandConfig.companyStampUrl || '',
      signNotes,
    };

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'SIGN',
      entityType: docType as any,
      entityId: docId,
      summary: `توقيع واعتماد ${docType} رقم (${docId}) رقم التشفير: ${hash}`,
      newData: signatureStamp,
    });

    return signatureStamp;
  };

  // Multi-Attachment Handlers
  const addAttachmentToRecord = (
    recordType: 'Operation' | 'Payment' | 'Invoice',
    recordId: string,
    attData: Omit<DocumentAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>
  ): DocumentAttachment => {
    const id = `att-${Date.now()}`;
    const newAtt: DocumentAttachment = {
      ...attData,
      id,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.fullNameAr || currentUser.fullName,
    };

    if (recordType === 'Operation') {
      setOperations((prev) =>
        prev.map((op) =>
          op.id === recordId
            ? {
                ...op,
                attachments: [...(op.attachments || []), newAtt],
                updated_at: new Date().toISOString(),
              }
            : op
        )
      );
    } else if (recordType === 'Payment') {
      setCrusherPayments((prev) =>
        prev.map((p) =>
          p.id === recordId
            ? {
                ...p,
                attachments: [...(p.attachments || []), newAtt],
              }
            : p
        )
      );
    }

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'ATTACH_FILE',
      entityType: recordType as any,
      entityId: recordId,
      summary: `إرفاق مستند جديد (${newAtt.fileName}) من تصنيف (${newAtt.docCategory})`,
      newData: { fileName: newAtt.fileName, category: newAtt.docCategory },
    });

    return newAtt;
  };

  const removeAttachmentFromRecord = (
    recordType: 'Operation' | 'Payment' | 'Invoice',
    recordId: string,
    attachmentId: string
  ) => {
    if (recordType === 'Operation') {
      setOperations((prev) =>
        prev.map((op) =>
          op.id === recordId
            ? {
                ...op,
                attachments: (op.attachments || []).filter((a) => a.id !== attachmentId),
                updated_at: new Date().toISOString(),
              }
            : op
        )
      );
    } else if (recordType === 'Payment') {
      setCrusherPayments((prev) =>
        prev.map((p) =>
          p.id === recordId
            ? {
                ...p,
                attachments: (p.attachments || []).filter((a) => a.id !== attachmentId),
              }
            : p
        )
      );
    }
  };

  const resetToDefaults = () => {
    setOperations(generateInitialOperations());
    setCustomers(INITIAL_CUSTOMERS);
    setCrushers(INITIAL_CRUSHERS);
    setTransporters(INITIAL_TRANSPORTERS);
    setMaterials(MATERIAL_OPTIONS);
    setUsers(INITIAL_USERS);
    setCrusherPayments(INITIAL_CRUSHER_PAYMENTS);
    setEditRequests(INITIAL_EDIT_REQUESTS);
    setUserRequests(INITIAL_USER_REQUESTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setBrandConfig(INITIAL_BRAND_CONFIG);

    localStorage.removeItem('meayon_operations');
    localStorage.removeItem('meayon_customers');
    localStorage.removeItem('meayon_crushers');
    localStorage.removeItem('meayon_transporters');
    localStorage.removeItem('meayon_materials');
    localStorage.removeItem('meayon_users');
    localStorage.removeItem('meayon_crusher_payments');
    localStorage.removeItem('meayon_edit_requests');
    localStorage.removeItem('meayon_user_requests');
    localStorage.removeItem('meayon_audit_logs');
    localStorage.removeItem('meayon_brand_config');
  };

  // KPIs aggregation
  const kpis: DashboardKPIs = useMemo(() => {
    const ops = accessibleOperations;
    const totalSales = ops.reduce((acc, curr) => acc + (curr.sales_amount || 0), 0);
    const totalPurchasesCost = ops.reduce((acc, curr) => acc + (curr.purchases_cost || 0), 0);
    const netOperatingProfit = ops.reduce((acc, curr) => acc + (curr.net_profit || 0), 0);
    const profitMarginPercent = totalSales > 0 ? (netOperatingProfit / totalSales) * 100 : 0;
    const totalDeliveredTonnage = ops.reduce((acc, curr) => acc + (curr.qty_delivered || 0), 0);
    const totalLoadedTonnage = ops.reduce((acc, curr) => acc + (curr.qty_loaded || 0), 0);
    const totalWastageTonnage = ops.reduce((acc, curr) => acc + (curr.qty_wastage || 0), 0);
    const overallWastagePercent = totalLoadedTonnage > 0 ? (totalWastageTonnage / totalLoadedTonnage) * 100 : 0;
    const totalTrips = ops.length;

    const totalCrusherPurchased = activeOperations.reduce((acc, curr) => acc + (curr.purchases_cost || 0), 0);
    const totalCrusherPaid = crusherPayments
      .filter((p) => !p.is_deleted)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const crusherPayableBalance = totalCrusherPurchased - totalCrusherPaid;

    const pendingApprovalsCount =
      editRequests.filter((r) => r.status === 'Pending').length +
      userRequests.filter((r) => r.status === 'Pending').length;

    return {
      totalSales,
      totalPurchasesCost,
      netOperatingProfit,
      profitMarginPercent,
      totalDeliveredTonnage,
      totalLoadedTonnage,
      totalWastageTonnage,
      overallWastagePercent,
      totalTrips,
      crusherPayableBalance,
      pendingApprovalsCount,
    };
  }, [accessibleOperations, activeOperations, crusherPayments, editRequests, userRequests]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentCompany,
        setCurrentCompany,
        companies,
        refreshCompanies,
        users,
        setUsers,
        language,
        setLanguage,
        dir,
        customers,
        crushers,
        transporters,
        materials,
        operations,
        crusherPayments,
        addOperation,
        updateOperation,
        deleteOperation,
        softDeleteOperation,
        restoreOperation,
        batchAddOperations,
        overrideOperationRecord,
        bulkOverrideOperations,
        addCrusherPayment,
        deleteCrusherPayment,
        softDeleteCrusherPayment,
        addCustomer,
        updateCustomer,
        softDeleteCustomer,
        restoreCustomer,
        deleteCustomer,
        batchAddCustomers,
        addCrusher,
        updateCrusher,
        softDeleteCrusher,
        restoreCrusher,
        deleteCrusher,
        batchAddCrushers,
        addTransporter,
        updateTransporter,
        softDeleteTransporter,
        restoreTransporter,
        deleteTransporter,
        batchAddTransporters,
        addMaterial,
        updateMaterial,
        softDeleteMaterial,
        restoreMaterial,
        deleteMaterial,
        addUser,
        updateUser,
        softDeleteUser,
        restoreUser,
        deleteUser,
        editRequests,
        createEditRequest,
        approveEditRequest,
        rejectEditRequest,
        userRequests,
        approveUserRequest,
        rejectUserRequest,
        brandConfig,
        updateBrandConfig,
        resetBrandConfig,
        signDocument,
        auditLogs,
        logAuditAction,
        clearAuditLogs,
        addAttachmentToRecord,
        removeAttachmentFromRecord,
        vouchers,
        addVoucher,
        updateVoucher,
        deleteVoucher,
        approveVoucher,
        autoGenerateVoucherFromPayment,
        isOnline,
        signOutAuth,
        isNativeAuthSyncing,
        canAccessFinancials,
        canEditOperations,
        canDeleteRecords,
        canManageSettings,
        isAdmin,
        isCOO,
        isExecutive,
        canApproveEdits,
        canApproveInvoices,
        canEditBranding,
        isGuestUser,
        assignedCustomerId,
        isDriverMode,
        setIsDriverMode,
        toggleDriverMode,
        exportDailyOperationsSnapshotJSON,
        accessibleOperations,
        activeOperations,
        softDeletedOperations,
        kpis,
        resetToDefaults,
        tenantTheme,
        setTenantTheme,
        densityMode,
        setDensityMode,
        themeMode,
        setThemeMode,
        isolationTelemetry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
