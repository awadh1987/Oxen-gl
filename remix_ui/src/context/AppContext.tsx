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
  Account,
  AccountType,
  JournalLine,
  JournalEntry,
  TenantRole,
  TenantLicense,
} from '../types';
import { apiService } from '../services/api';
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
import {
  INITIAL_CHART_OF_ACCOUNTS,
  INITIAL_JOURNAL_ENTRIES,
} from '../data/initialAccountingData';
import { tafqeetArabic, tafqeetEnglish } from '../utils/tafqeet';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  users: User[];
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
  addOperation: (op: Omit<OperationRecord, 'id' | 'created_at' | 'updated_at'>) => void;
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
  addVoucher: (vch: Omit<FinancialVoucher, 'id' | 'created_at' | 'updated_at' | 'amountInWordsAr'> & { id?: string }) => FinancialVoucher;
  updateVoucher: (id: string, updates: Partial<FinancialVoucher>) => void;
  deleteVoucher: (id: string) => Promise<boolean>;
  approveVoucher: (id: string, reviewNotes?: string) => Promise<void>;
  autoGenerateVoucherFromPayment: (payment: CrusherPaymentEntry) => FinancialVoucher;
  // Full Double-Entry Accounting Module (شجرة الحسابات والقيود والقوائم المالية)
  accounts: Account[];
  journalEntries: JournalEntry[];
  addAccount: (account: Omit<Account, 'id' | 'balance'>) => { success: boolean; message?: string; account?: Account };
  updateAccount: (id: string, updates: Partial<Account>) => { success: boolean; message?: string };
  deleteAccount: (id: string) => { success: boolean; message?: string };
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'created_at'> & { id?: string }) => { success: boolean; message?: string; entryId?: string };
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<{ success: boolean; message?: string }>;
  postJournalEntry: (id: string) => Promise<{ success: boolean; message?: string }>;
  cancelOrDraftJournalEntry: (id: string) => Promise<{ success: boolean; message?: string }>;
  deleteJournalEntry: (id: string) => { success: boolean; message?: string };
  getAccountCalculatedBalance: (accountId: string) => number;
  getTrialBalance: (asOfDate?: string) => {
    rows?: Array<{
      account: Account;
      initialDebit: number;
      initialCredit: number;
      periodDebit: number;
      periodCredit: number;
      totalDebit?: number;
      totalCredit?: number;
      endingDebit: number;
      endingCredit: number;
    }>;
    lines: Array<{
      account: Account;
      initialDebit: number;
      initialCredit: number;
      periodDebit: number;
      periodCredit: number;
      totalDebit?: number;
      totalCredit?: number;
      endingDebit: number;
      endingCredit: number;
    }>;
    totalInitialDebit: number;
    totalInitialCredit: number;
    totalPeriodDebit: number;
    totalPeriodCredit: number;
    totalEndingDebit: number;
    totalEndingCredit: number;
    totalDebitSum?: number;
    totalCreditSum?: number;
    totalEndingDebitSum?: number;
    totalEndingCreditSum?: number;
    isBalanced: boolean;
  };
  getIncomeStatement: (startDate?: string, endDate?: string) => {
    revenues: Array<{ account: Account; amount: number }>;
    directCosts: Array<{ account: Account; amount: number }>;
    costOfSales?: Array<{ account: Account; amount: number }>;
    operatingExpenses: Array<{ account: Account; amount: number }>;
    totalRevenue: number;
    totalRevenues?: number;
    totalDirectCosts: number;
    totalCostOfSales?: number;
    grossProfit: number;
    grossProfitMargin?: number;
    totalOperatingExpenses: number;
    netIncome: number;
    netProfit?: number;
    netProfitMargin?: number;
  };
  getBalanceSheet: (asOfDate?: string) => {
    assets: Array<{ account: Account; amount: number }>;
    currentAssets?: Array<{ account: Account; amount: number }>;
    nonCurrentAssets?: Array<{ account: Account; amount: number }>;
    liabilities: Array<{ account: Account; amount: number }>;
    currentLiabilities?: Array<{ account: Account; amount: number }>;
    equity: Array<{ account: Account; amount: number }>;
    equityItems?: Array<{ account: Account; amount: number }>;
    retainedEarnings?: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    currentPeriodProfit: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  };
  getAccountLedger: (accountId: string, startDate?: string, endDate?: string) => {
    account?: Account;
    startingBalance: number;
    entries: Array<{
      id: string;
      journalId?: string;
      date: string;
      referenceId: string;
      description: string;
      entryId: string;
      debit: number;
      credit: number;
      notes?: string;
      costCenter?: string;
      runningBalance: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    endingBalance: number;
  };
  autoGenerateJournalsFromOperations: () => { generatedCount: number };
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
  // Multi-Tenant Isolation & Platform Licensing
  activeTenantId: string;
  activeTenantLicense: TenantLicense | null;
  availableTenants: TenantLicense[];
  switchTenant: (tenantId: string) => Promise<void>;
  registerNewTenant: (tenantData: {
    companyName: string;
    companyNameEn: string;
    crNumber?: string;
    taxNumber?: string;
    address?: string;
    addressEn?: string;
    contactPhone?: string;
    contactEmail?: string;
    subscriptionTier?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
    planType?: string;
    adminName?: string;
  }) => Promise<TenantLicense>;
  isPlatformSuperAdmin: boolean;
  tenantRole: TenantRole;
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
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  // Brand Configuration State
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(() => {
    const saved = localStorage.getItem('meayon_brand_config');
    return saved ? JSON.parse(saved) : INITIAL_BRAND_CONFIG;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (!apiService.isAuthenticated()) {
      return INITIAL_USERS[0];
    }

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

  // Multi-Tenant Isolation & License State
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    return localStorage.getItem('meayon_active_tenant_id') || currentUser.tenantId || 'tenant-default-001';
  });

  const DEFAULT_INITIAL_TENANTS: TenantLicense[] = useMemo(() => [
    {
      tenantId: 'tenant-default-001',
      companyName: 'شركة ميون الاقتصادية المحدودة',
      companyNameEn: 'Mayon Economic Company Ltd',
      commercialRegister: '1010894520',
      crNumber: '1010894520',
      taxNumber: '300189452300003',
      address: 'الرياض - طريق الملك عبد العزيز - برج الأعمال',
      addressEn: 'Riyadh, King Abdulaziz Road, Business Tower',
      contactPhone: '+966 11 482 9900',
      contactEmail: 'info@meayon.com',
      contactInfo: '+966 11 482 9900 | info@meayon.com',
      licenseKey: 'OXEN-PRO-DEFAULT-MASTER',
      subscriptionTier: 'PROFESSIONAL',
      planType: 'PRO',
      planId: 'plan-pro',
      maxAllowedCostCenters: 25,
      maxAllowedUsers: 20,
      maxAllowedBranches: 5,
      uiThemeMode: 'LIGHT',
      uiPrimaryColor: '#F05627',
      uiSecondaryColor: '#1A1A1A',
      isActive: true,
    },
    {
      tenantId: 'tenant-gulf-002',
      companyName: 'شركة أفق الخليج للنقليات والمقاولات',
      companyNameEn: 'Gulf Horizon Transport & Contracting Co.',
      commercialRegister: '1010994821',
      crNumber: '1010994821',
      taxNumber: '300994821500003',
      address: 'الدمام - المدينة الصناعية الثانية',
      addressEn: 'Dammam, 2nd Industrial City',
      contactPhone: '+966 13 892 4411',
      contactEmail: 'contact@gulf-horizon.sa',
      contactInfo: '+966 13 892 4411 | contact@gulf-horizon.sa',
      licenseKey: 'OXEN-ENT-GULF-8821',
      subscriptionTier: 'ENTERPRISE',
      planType: 'ENTERPRISE',
      planId: 'plan-enterprise',
      maxAllowedCostCenters: 100,
      maxAllowedUsers: 50,
      maxAllowedBranches: 10,
      uiThemeMode: 'LIGHT',
      uiPrimaryColor: '#4F46E5',
      uiSecondaryColor: '#0F172A',
      isActive: true,
    },
    {
      tenantId: 'tenant-alriyadh-003',
      companyName: 'مؤسسة محاجر وكسارات الرياض المعتمدة',
      companyNameEn: 'Riyadh Certified Quarries & Crushers Est.',
      commercialRegister: '1010772910',
      crNumber: '1010772910',
      taxNumber: '300772910400003',
      address: 'الرياض - طريق الحاير',
      addressEn: 'Riyadh, Al-Haier Road',
      contactPhone: '+966 11 445 1100',
      contactEmail: 'ops@riyadh-quarries.sa',
      contactInfo: '+966 11 445 1100 | ops@riyadh-quarries.sa',
      licenseKey: 'OXEN-BAS-RIYADH-3392',
      subscriptionTier: 'BASIC',
      planType: 'STARTER',
      planId: 'plan-basic',
      maxAllowedCostCenters: 5,
      maxAllowedUsers: 5,
      maxAllowedBranches: 1,
      uiThemeMode: 'LIGHT',
      uiPrimaryColor: '#059669',
      uiSecondaryColor: '#064E3B',
      isActive: true,
    },
  ], []);

  const [availableTenants, setAvailableTenants] = useState<TenantLicense[]>(() => {
    try {
      const saved = localStorage.getItem('meayon_custom_tenants');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [
      {
        tenantId: 'tenant-default-001',
        companyName: 'شركة ميون الاقتصادية المحدودة',
        companyNameEn: 'Mayon Economic Company Ltd',
        commercialRegister: '1010894520',
        crNumber: '1010894520',
        taxNumber: '300189452300003',
        address: 'الرياض - طريق الملك عبد العزيز - برج الأعمال',
        addressEn: 'Riyadh, King Abdulaziz Road, Business Tower',
        contactPhone: '+966 11 482 9900',
        contactEmail: 'info@meayon.com',
        contactInfo: '+966 11 482 9900 | info@meayon.com',
        licenseKey: 'OXEN-PRO-DEFAULT-MASTER',
        subscriptionTier: 'PROFESSIONAL',
        planType: 'PRO',
        planId: 'plan-pro',
        maxAllowedCostCenters: 25,
        maxAllowedUsers: 20,
        maxAllowedBranches: 5,
        uiThemeMode: 'LIGHT',
        uiPrimaryColor: '#F05627',
        uiSecondaryColor: '#1A1A1A',
        isActive: true,
      },
      {
        tenantId: 'tenant-gulf-002',
        companyName: 'شركة أفق الخليج للنقليات والمقاولات',
        companyNameEn: 'Gulf Horizon Transport & Contracting Co.',
        commercialRegister: '1010994821',
        crNumber: '1010994821',
        taxNumber: '300994821500003',
        address: 'الدمام - المدينة الصناعية الثانية',
        addressEn: 'Dammam, 2nd Industrial City',
        contactPhone: '+966 13 892 4411',
        contactEmail: 'contact@gulf-horizon.sa',
        contactInfo: '+966 13 892 4411 | contact@gulf-horizon.sa',
        licenseKey: 'OXEN-ENT-GULF-8821',
        subscriptionTier: 'ENTERPRISE',
        planType: 'ENTERPRISE',
        planId: 'plan-enterprise',
        maxAllowedCostCenters: 100,
        maxAllowedUsers: 50,
        maxAllowedBranches: 10,
        uiThemeMode: 'LIGHT',
        uiPrimaryColor: '#4F46E5',
        uiSecondaryColor: '#0F172A',
        isActive: true,
      },
      {
        tenantId: 'tenant-alriyadh-003',
        companyName: 'مؤسسة محاجر وكسارات الرياض المعتمدة',
        companyNameEn: 'Riyadh Certified Quarries & Crushers Est.',
        commercialRegister: '1010772910',
        crNumber: '1010772910',
        taxNumber: '300772910400003',
        address: 'الرياض - طريق الحاير',
        addressEn: 'Riyadh, Al-Haier Road',
        contactPhone: '+966 11 445 1100',
        contactEmail: 'ops@riyadh-quarries.sa',
        contactInfo: '+966 11 445 1100 | ops@riyadh-quarries.sa',
        licenseKey: 'OXEN-BAS-RIYADH-3392',
        subscriptionTier: 'BASIC',
        planType: 'STARTER',
        planId: 'plan-basic',
        maxAllowedCostCenters: 5,
        maxAllowedUsers: 5,
        maxAllowedBranches: 1,
        uiThemeMode: 'LIGHT',
        uiPrimaryColor: '#059669',
        uiSecondaryColor: '#064E3B',
        isActive: true,
      },
    ];
  });
  const [activeTenantLicense, setActiveTenantLicense] = useState<TenantLicense | null>(null);

  useEffect(() => {
    apiService.getTenants().then((list: TenantLicense[]) => {
      if (Array.isArray(list) && list.length > 0) {
        setAvailableTenants((prev) => {
          const apiIds = new Set(list.map((t) => t.tenantId));
          const customOnly = prev.filter((p) => !apiIds.has(p.tenantId));
          const combined = [...list, ...customOnly];
          try {
            localStorage.setItem('meayon_custom_tenants', JSON.stringify(combined));
          } catch (err) {}
          return combined;
        });

        const currentId = localStorage.getItem('meayon_active_tenant_id') || activeTenantId;
        const matched = list.find((t) => t.tenantId === currentId) || list[0];
        if (matched) {
          setActiveTenantLicense(matched);
          if (matched.licenseKey && !localStorage.getItem('meayon_tenant_license_key')) {
            localStorage.setItem('meayon_tenant_license_key', matched.licenseKey);
          }
          // Dynamic identity synchronization with active tenant data
          setBrandConfig((prev) => ({
            ...prev,
            companyNameAr: matched.companyName || prev.companyNameAr,
            companyNameEn: matched.companyNameEn || prev.companyNameEn,
            crNumber: matched.crNumber || (matched as any).commercialRegister || prev.crNumber,
            taxNumber: matched.taxNumber || prev.taxNumber,
            addressAr: (matched as any).address || prev.addressAr,
            addressEn: (matched as any).addressEn || prev.addressEn,
            phone: (matched as any).contactPhone || (matched as any).contactInfo || prev.phone,
            email: (matched as any).contactEmail || prev.email,
            customLogoUrl: (matched as any).logoUrl || (matched as any).uiLogoUrl || prev.customLogoUrl,
            primaryColor: matched.uiPrimaryColor || prev.primaryColor,
            secondaryColor: matched.uiSecondaryColor || prev.secondaryColor,
            bankNameAr: (matched as any).bankName || prev.bankNameAr,
            iban: (matched as any).bankIban || prev.iban,
          }));
        }
      }
    }).catch((err) => {
      console.warn('Failed to load tenants list from API, using default/cached state:', err);
    });
  }, [activeTenantId]);

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

  const [crusherPayments, setCrusherPayments] = useState<CrusherPaymentEntry[]>(() => {
    const saved = localStorage.getItem('meayon_crusher_payments');
    return saved ? JSON.parse(saved) : INITIAL_CRUSHER_PAYMENTS;
  });

  // Financial Vouchers State (سندات القبض والصرف)
  const [vouchers, setVouchers] = useState<FinancialVoucher[]>(() => {
    const saved = localStorage.getItem('meayon_vouchers');
    return saved ? JSON.parse(saved) : INITIAL_FINANCIAL_VOUCHERS;
  });

  // Chart of Accounts & Journal Entries State (شجرة الحسابات والقيود المحاسبية)
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('meayon_accounts');
    return saved ? JSON.parse(saved) : INITIAL_CHART_OF_ACCOUNTS;
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('meayon_journal_entries');
    return saved ? JSON.parse(saved) : INITIAL_JOURNAL_ENTRIES;
  });

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

  // Offline / Quarry Connection Status Tracker
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

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

  useEffect(() => {
    if (currentUser.role !== 'Admin' || !apiService.isAuthenticated()) return;

    void fetch('/api/user-registrations', {
      credentials: 'include',
    }).then(async (response) => {
      if (!response.ok) return;
      const registrations = await response.json();
      if (!Array.isArray(registrations)) return;
      setUserRequests(registrations.map((registration) => ({
        id: registration.id,
        fullName: registration.fullName || registration.full_name,
        fullNameAr: registration.fullNameAr || registration.full_name || registration.fullName,
        username: registration.username,
        email: registration.email,
        phone: registration.phone || '',
        requestedRole: registration.requestedRole || registration.requested_role || 'Guest',
        requestedAt: registration.requestedAt || registration.created_at,
        status: registration.status,
        reviewedBy: registration.reviewedBy || registration.reviewed_by,
        notes: registration.notes,
      })));
    }).catch((error: unknown) => console.error('Registration queue load failed:', error));
  }, [currentUser.role]);

  useEffect(() => {
    if (!apiService.isAuthenticated()) return;

    void apiService.getWorkflowRecords().then((records) => {
      if (records.operations?.length) {
        setOperations((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newOps = records.operations
            .filter((record: any) => !existingIds.has(record.id))
            .map((record: any) => ({
              id: record.id,
              loading_date: record.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              truck_no: record.transporterId || 'Database operation',
              transporter_name: record.transporterId || '',
              loading_source: '',
              loading_invoice_no: '',
              destination_customer: record.clientName,
              receipt_invoice_no: record.invoiceId || '',
              material_type: '',
              qty_loaded: 0,
              qty_delivered: 0,
              qty_wastage: 0,
              wastage_percentage: 0,
              scale_ticket_no: '',
              sales_amount: record.amount,
              vat_amount: 0,
              total_sales: record.amount,
              purchases_cost: 0,
              crusher_payment: 0,
              net_profit: record.profit,
              operation_month: Number(record.createdAt?.slice(5, 7)) || new Date().getMonth() + 1,
              operation_year: Number(record.createdAt?.slice(0, 4)) || new Date().getFullYear(),
              notes: 'Loaded from database workflow',
              version: 1,
              is_deleted: false,
              created_at: record.createdAt,
              updated_at: record.createdAt,
            }));
          return newOps.length > 0 ? [...newOps, ...prev] : prev;
        });
      }
      if (records.vouchers?.length) {
        setVouchers((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newVouchers = records.vouchers
            .filter((record: any) => !existingIds.has(record.id))
            .map((record: any) => ({
              id: record.id,
              voucherNumber: record.voucherNumber,
              type: record.type === 'Receipt' ? 'Receipt' : 'Payment',
              category: 'General',
              date: record.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              amount: record.amount,
              amountInWordsAr: '',
              partyType: 'Other',
              partyName: record.partyName,
              paymentMethod: 'Bank Transfer',
              purpose: record.notes || 'Database workflow voucher',
              month: Number(record.createdAt?.slice(5, 7)) || new Date().getMonth() + 1,
              year: Number(record.createdAt?.slice(0, 4)) || new Date().getFullYear(),
              preparedBy: 'Database workflow',
              isApproved: record.status === 'Approved',
              status: record.status,
              created_at: record.createdAt,
              updated_at: record.createdAt,
            }));
          return newVouchers.length > 0 ? [...newVouchers, ...prev] : prev;
        });
      }
      if (records.journalEntries?.length) {
        setJournalEntries((prev) => {
          const existingIds = new Set(prev.map((j) => j.id));
          const newEntries = records.journalEntries
            .filter((record: any) => !existingIds.has(record.id))
            .map((record: any) => ({
              id: record.id,
              date: record.date,
              referenceId: record.referenceId || record.entryNumber,
              description: record.description || '',
              status: record.status === 'Posted' ? 'Posted' : 'Draft',
              totalDebit: record.totalDebit,
              totalCredit: record.totalCredit,
              lines: (record.lines || []).map((line: any) => ({
                accountId: line.account,
                accountNameEn: line.account,
                debit: line.debit,
                credit: line.credit,
                description: line.description,
              })),
              createdAt: record.createdAt,
              created_at: record.createdAt,
            }));
          return newEntries.length > 0 ? [...newEntries, ...prev] : prev;
        });
      }
    }).catch((error: unknown) => console.error('Workflow records load failed:', error));
  }, [currentUser.role]);

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
    link.download = `Meayon_Operations_Snapshot_${todayStr}_${Date.now().toString().slice(-4)}.json`;
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
    localStorage.setItem('meayon_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('meayon_journal_entries', JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  // Inject dynamic CSS custom properties for Brand Theming
  useEffect(() => {
    if (brandConfig.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', brandConfig.primaryColor);
    }
    if (brandConfig.secondaryColor) {
      document.documentElement.style.setProperty('--brand-secondary', brandConfig.secondaryColor);
    }
  }, [brandConfig]);

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
    apiService.logout();
    setCurrentUser(INITIAL_USERS[0]);
  };

  // RBAC Permission Gates
  const isAdmin = currentUser.role === 'Admin';
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

  // Multi-Tenant Isolation & Switch Handler
  const isPlatformSuperAdmin = Boolean(currentUser.isPlatformSuperAdmin || currentUser.role === 'Admin');
  const tenantRole: TenantRole = (currentUser.tenantRole as TenantRole) || (currentUser.role === 'Admin' ? 'Admin' : 'Accountant');

  const switchTenant = async (newTenantId: string) => {
    localStorage.setItem('meayon_active_tenant_id', newTenantId);
    setActiveTenantId(newTenantId);
    const matched = availableTenants.find((t) => t.tenantId === newTenantId);
    if (matched) {
      setActiveTenantLicense(matched);
      if (matched.licenseKey) {
        localStorage.setItem('meayon_tenant_license_key', matched.licenseKey);
      }
      // Dynamic identity synchronization on switch
      setBrandConfig((prev) => ({
        ...prev,
        companyNameAr: matched.companyName || prev.companyNameAr,
        companyNameEn: matched.companyNameEn || prev.companyNameEn,
        crNumber: matched.crNumber || (matched as any).commercialRegister || prev.crNumber,
        taxNumber: matched.taxNumber || prev.taxNumber,
        addressAr: (matched as any).address || prev.addressAr,
        addressEn: (matched as any).addressEn || prev.addressEn,
        phone: (matched as any).contactPhone || (matched as any).contactInfo || prev.phone,
        email: (matched as any).contactEmail || prev.email,
        customLogoUrl: (matched as any).logoUrl || (matched as any).uiLogoUrl || prev.customLogoUrl,
        primaryColor: matched.uiPrimaryColor || prev.primaryColor,
        secondaryColor: matched.uiSecondaryColor || prev.secondaryColor,
        bankNameAr: (matched as any).bankName || prev.bankNameAr,
        iban: (matched as any).bankIban || prev.iban,
      }));
    }
    setCurrentUser((prev) => ({
      ...prev,
      tenantId: newTenantId,
    }));
    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Tenant',
      entityId: newTenantId,
      summary: `تبديل بيئة المستأجر النشطة إلى: ${matched ? matched.companyName : newTenantId}`,
    });
  };

  const registerNewTenant = async (tenantData: {
    companyName: string;
    companyNameEn: string;
    crNumber?: string;
    taxNumber?: string;
    address?: string;
    addressEn?: string;
    contactPhone?: string;
    contactEmail?: string;
    subscriptionTier?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
    planType?: string;
    adminName?: string;
  }): Promise<TenantLicense> => {
    let created: any = null;
    try {
      created = await apiService.createTenant({
        company_name: tenantData.companyName,
        company_name_en: tenantData.companyNameEn,
        cr_number: tenantData.crNumber,
        tax_number: tenantData.taxNumber,
        address: tenantData.address,
        address_en: tenantData.addressEn,
        contact_phone: tenantData.contactPhone,
        contact_email: tenantData.contactEmail,
        subscription_tier: tenantData.subscriptionTier || 'PROFESSIONAL',
        plan_type: tenantData.planType || 'PRO',
      });
    } catch (e) {
      console.warn('Backend createTenant fallback to local creation:', e);
    }

    const safeTier = tenantData.subscriptionTier || 'PROFESSIONAL';
    const newLicense: TenantLicense = created?.tenantId ? created : {
      tenantId: `tenant-${Date.now().toString(36)}`,
      companyName: tenantData.companyName,
      companyNameEn: tenantData.companyNameEn || 'New Enterprise Co.',
      commercialRegister: tenantData.crNumber || '1010998877',
      crNumber: tenantData.crNumber || '1010998877',
      taxNumber: tenantData.taxNumber || '300998877600003',
      address: tenantData.address || 'المملكة العربية السعودية',
      addressEn: tenantData.addressEn || 'Kingdom of Saudi Arabia',
      contactPhone: tenantData.contactPhone || '+966 50 000 0000',
      contactEmail: tenantData.contactEmail || 'admin@enterprise.sa',
      contactInfo: `${tenantData.contactPhone || ''} | ${tenantData.contactEmail || ''}`,
      licenseKey: `OXEN-${safeTier.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`,
      subscriptionTier: safeTier,
      planType: tenantData.planType || 'PRO',
      planId: `plan-${safeTier.toLowerCase()}`,
      maxAllowedCostCenters: safeTier === 'ENTERPRISE' ? 100 : safeTier === 'PROFESSIONAL' ? 25 : 5,
      maxAllowedUsers: safeTier === 'ENTERPRISE' ? 50 : safeTier === 'PROFESSIONAL' ? 15 : 5,
      maxAllowedBranches: safeTier === 'ENTERPRISE' ? 10 : 3,
      uiThemeMode: 'LIGHT',
      uiPrimaryColor: '#1E3A8A',
      uiSecondaryColor: '#7C3AED',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    };

    setAvailableTenants((prev) => {
      const updated = [newLicense, ...prev.filter((t) => t.tenantId !== newLicense.tenantId)];
      try {
        localStorage.setItem('meayon_custom_tenants', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Tenant',
      entityId: newLicense.tenantId,
      summary: `تسجيل منشأة جديدة بالمنصة: ${newLicense.companyName} (${newLicense.subscriptionTier})`,
    });

    return newLicense;
  };

  const clearAuditLogs = () => {
    if (!isAdmin) return;
    setAuditLogs([]);
    localStorage.removeItem('meayon_audit_logs');
  };

  // Operations Handlers
  const addOperation = (opData: Omit<OperationRecord, 'id' | 'created_at' | 'updated_at'>) => {
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
    vchData: Omit<FinancialVoucher, 'id' | 'created_at' | 'updated_at' | 'amountInWordsAr'> & { id?: string }
  ): FinancialVoucher => {
    const id = vchData.id || `vch-${Date.now()}`;
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

  const deleteVoucher = async (id: string): Promise<boolean> => {
    if (!canDeleteRecords) return false;
    const existing = vouchers.find((v) => v.id === id);
    if (!existing) return false;

    try {
      await apiService.cancelVoucher(id);
    } catch (error) {
      console.error('Voucher cancellation failed:', error);
      return false;
    }

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

  const approveVoucher = async (id: string, reviewNotes?: string) => {
    if (!isAdmin && !isCOO) return;
    const existing = vouchers.find((v) => v.id === id);
    if (!existing) return;

    try {
      await apiService.approveVoucher(id, reviewNotes);
    } catch (error) {
      console.error('Voucher approval failed:', error);
      return;
    }

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
      notes: payment.notes || 'سند صرف صادر آلياً من جدول حسابات ومدفوعات الكسارات',
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

  // =========================================================================
  // DOUBLE-ENTRY ACCOUNTING MODULE (محرك القيود المزدوجة وشجرة الحسابات والقوائم المالية)
  // =========================================================================

  const addAccount = (accData: Omit<Account, 'id' | 'balance'>): { success: boolean; message?: string; account?: Account } => {
    const trimmedCode = accData.code.trim();
    if (!trimmedCode) {
      return { success: false, message: 'رمز الحساب مطلوب' };
    }
    if (accounts.some((a) => a.code.trim() === trimmedCode)) {
      return { success: false, message: `رقم الحساب (${trimmedCode}) مستخدم مسبقاً، يرجى اختيار رمز حساب فريد` };
    }

    const id = `acc-${Date.now()}`;
    const newAcc: Account = {
      ...accData,
      id,
      code: trimmedCode,
      balance: 0,
      isActive: accData.isActive !== false,
      isSystemAccount: false,
    };

    setAccounts((prev) => [...prev, newAcc]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Voucher' as any,
      entityId: id,
      summary: `إضافة حساب جديد في دليل الحسابات: [${newAcc.code}] ${newAcc.nameAr} (${newAcc.type})`,
      newData: newAcc,
    });

    return { success: true, account: newAcc };
  };

  const updateAccount = (id: string, updates: Partial<Account>): { success: boolean; message?: string } => {
    const target = accounts.find((a) => a.id === id);
    if (!target) return { success: false, message: 'الحساب غير موجود' };

    if (updates.code && updates.code.trim() !== target.code.trim()) {
      const codeClean = updates.code.trim();
      if (accounts.some((a) => a.id !== id && a.code.trim() === codeClean)) {
        return { success: false, message: `رقم الحساب (${codeClean}) مستخدم مسبقاً في حساب آخر` };
      }
    }

    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'Account',
      entityId: id,
      summary: `تحديث بيانات الحساب المحاسبي [${target.code}] ${target.nameAr}`,
      newData: updates,
    });

    return { success: true };
  };

  const deleteAccount = (id: string): { success: boolean; message?: string } => {
    const target = accounts.find((a) => a.id === id);
    if (!target) return { success: false, message: 'الحساب غير موجود' };
    if (target.isSystemAccount) {
      return { success: false, message: 'لا يمكن حذف الحسابات النظامية الأساسية' };
    }

    // Check if account has child accounts
    if (accounts.some((a) => a.parentId === id)) {
      return { success: false, message: 'لا يمكن حذف حساب رئيسي يضم حسابات فرعية تحته' };
    }

    // Check if account is used in any journal entries
    const hasEntries = journalEntries.some((entry) => entry.lines.some((line) => line.accountId === id));
    if (hasEntries) {
      return { success: false, message: 'لا يمكن حذف حساب مسجل عليه قيود يومية وحركات سابقة' };
    }

    setAccounts((prev) => prev.filter((a) => a.id !== id));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'DELETE',
      entityType: 'Account',
      entityId: id,
      summary: `حذف الحساب المحاسبي [${target.code}] ${target.nameAr}`,
    });

    return { success: true };
  };

  const addJournalEntry = (
    entryData: {
      id?: string;
      date: string;
      referenceId?: string;
      description: string;
      lines: JournalLine[];
      status?: 'Draft' | 'Posted';
      postedBy?: string;
      totalDebit?: number;
      totalCredit?: number;
      entryType?: any;
    }
  ): { success: boolean; message?: string; entryId?: string } => {
    const totalDebit = Number(entryData.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0).toFixed(2));
    const totalCredit = Number(entryData.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0).toFixed(2));

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        message: `القيد غير متزن! إجمالي المدين (${totalDebit.toLocaleString()} ر.س) لا يساوي إجمالي الدائن (${totalCredit.toLocaleString()} ر.س). الفارق: ${Math.abs(totalDebit - totalCredit).toFixed(2)} ر.س`,
      };
    }

    if (entryData.lines.length < 2) {
      return {
        success: false,
        message: 'يجب أن يحتوي القيد على طرفين على الأقل (طرف مدين وطرف دائن)',
      };
    }

    const yearMonth = (entryData.date || new Date().toISOString()).substring(0, 7).replace('-', '');
    const serial = String(journalEntries.length + 1).padStart(4, '0');
    const id = entryData.id || `JE-${yearMonth}-${serial}`;
    const now = new Date().toISOString();
    const entryStatus = entryData.status || 'Posted';

    const enrichedLines: JournalLine[] = entryData.lines.map((line) => {
      const acc = accounts.find((a) => a.id === line.accountId);
      return {
        accountId: line.accountId,
        accountCode: line.accountCode || acc?.code,
        accountNameAr: line.accountNameAr || acc?.nameAr,
        accountNameEn: line.accountNameEn || acc?.nameEn,
        debit: Number(Number(line.debit || 0).toFixed(2)),
        credit: Number(Number(line.credit || 0).toFixed(2)),
        costCenter: line.costCenter,
        notes: line.notes,
      };
    });

    const newEntry: JournalEntry = {
      id,
      date: entryData.date,
      referenceId: entryData.referenceId || '',
      description: entryData.description,
      status: entryStatus,
      totalDebit,
      totalCredit,
      lines: enrichedLines,
      createdAt: now,
      created_at: now,
      createdBy: currentUser.fullNameAr || currentUser.fullName,
      postedAt: entryStatus === 'Posted' ? now : undefined,
      posted_at: entryStatus === 'Posted' ? now : undefined,
      postedBy: entryData.postedBy || (entryStatus === 'Posted' ? (currentUser.fullNameAr || currentUser.fullName) : ''),
      entryType: entryData.entryType || 'Manual',
    };

    setJournalEntries((prev) => [newEntry, ...prev]);

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'JOURNAL_ENTRY',
      entityType: 'JournalEntry',
      entityId: id,
      summary: `تسجيل قيد محاسبي (${id}) - ${newEntry.description} بإجمالي ${totalDebit.toLocaleString()} ر.س`,
      newData: newEntry,
    });

    return { success: true, entryId: id };
  };

  const updateJournalEntry = async (id: string, updates: Partial<JournalEntry>): Promise<{ success: boolean; message?: string }> => {
    const existing = journalEntries.find((e) => e.id === id);
    if (!existing) return { success: false, message: 'القيد غير موجود' };
    if (existing.status !== 'Draft') return { success: false, message: 'لا يمكن تعديل قيد مرحل' };

    let totalDebit = existing.totalDebit;
    let totalCredit = existing.totalCredit;

    if (updates.lines) {
      totalDebit = Number(updates.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0).toFixed(2));
      totalCredit = Number(updates.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0).toFixed(2));

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return {
          success: false,
          message: `القيد غير متزن! إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit})`,
        };
      }
    }

    const updatedEntry: JournalEntry = {
      ...existing,
      ...updates,
      totalDebit,
      totalCredit,
      updated_at: new Date().toISOString(),
    };

    try {
      await apiService.updateJournalEntry(id, {
        description: updatedEntry.description,
        reference_id: updatedEntry.referenceId,
        lines: updatedEntry.lines.map((line) => ({
          account: line.accountNameEn || line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.notes,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل تحديث القيد في الخادم';
      console.error('Journal update failed:', error);
      return { success: false, message };
    }

    setJournalEntries((prev) => prev.map((e) => (e.id === id ? updatedEntry : e)));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'LEDGER_EDIT',
      entityType: 'JournalEntry',
      entityId: id,
      summary: `تعديل دفتر الأستاذ والقيد المحاسبي (${id})`,
      oldData: existing,
      newData: updates,
    });

    return { success: true };
  };

  const postJournalEntry = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const existing = journalEntries.find((e) => e.id === id);
    if (!existing) return { success: false, message: 'القيد غير موجود' };
    if (existing.status === 'Posted') return { success: true };

    try {
      await apiService.postJournalEntry(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل ترحيل القيد في الخادم';
      console.error('Journal posting failed:', error);
      return { success: false, message };
    }

    const now = new Date().toISOString();
    const updated: JournalEntry = {
      ...existing,
      status: 'Posted',
      posted_at: now,
      postedBy: currentUser.fullNameAr || currentUser.fullName,
    };

    setJournalEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'STATUS_CHANGE',
      entityType: 'JournalEntry',
      entityId: id,
      summary: `ترحيل واعتماد القيد المحاسبي (${id}) إلى الأستاذ العام وتثبيت الأرصدة`,
    });

    return { success: true };
  };

  const cancelOrDraftJournalEntry = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const existing = journalEntries.find((e) => e.id === id);
    if (!existing) return { success: false, message: 'القيد غير موجود' };

    if (existing.status === 'Posted') {
      try {
        const reversal = await apiService.reverseJournalEntry(id);
        const now = new Date().toISOString();
        const reversalEntry: JournalEntry = {
          id: reversal.id,
          date: now.slice(0, 10),
          referenceId: id,
          description: `Reversal of ${existing.description}`,
          status: 'Posted',
          totalDebit: existing.totalCredit,
          totalCredit: existing.totalDebit,
          lines: existing.lines.map((line) => ({ ...line, debit: line.credit, credit: line.debit })),
          createdAt: now,
          created_at: now,
          createdBy: currentUser.fullNameAr || currentUser.fullName,
          postedAt: now,
          posted_at: now,
          postedBy: currentUser.fullNameAr || currentUser.fullName,
          entryType: 'Manual',
        };
        setJournalEntries((prev) => [reversalEntry, ...prev]);
        logAuditAction({
          userId: currentUser.id,
          userName: currentUser.fullNameAr || currentUser.fullName,
          userRole: currentUser.role,
          action: 'STATUS_CHANGE',
          entityType: 'JournalEntry',
          entityId: id,
          summary: `عكس القيد المرحل (${id}) بقيد عكسي جديد`,
          newData: reversalEntry,
        });
        return { success: true, message: 'تم إنشاء القيد العكسي' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'فشل عكس القيد في الخادم';
        console.error('Journal reversal failed:', error);
        return { success: false, message };
      }
    }

    setJournalEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'Draft',
              posted_at: undefined,
              postedBy: undefined,
            }
          : e
      )
    );

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'STATUS_CHANGE',
      entityType: 'JournalEntry',
      entityId: id,
      summary: `إلغاء ترحيل القيد (${id}) وإعادته لحالة المسودة`,
    });

    return { success: true };
  };

  const deleteJournalEntry = (id: string): { success: boolean; message?: string } => {
    const existing = journalEntries.find((e) => e.id === id);
    if (!existing) return { success: false, message: 'القيد غير موجود' };

    setJournalEntries((prev) => prev.filter((e) => e.id !== id));

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'DELETE',
      entityType: 'JournalEntry',
      entityId: id,
      summary: `حذف القيد المحاسبي (${id}) - ${existing.description}`,
      oldData: existing,
    });

    return { success: true };
  };

  // Dynamic balance calculation based on posted Journal Entries
  const getAccountCalculatedBalance = (accountId: string): number => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return 0;

    // If account has child accounts, aggregate children
    const childAccounts = accounts.filter((a) => a.parentId === accountId);
    if (childAccounts.length > 0) {
      return childAccounts.reduce((sum, child) => sum + getAccountCalculatedBalance(child.id), 0);
    }

    // Leaf account: sum debits and credits from posted journal entries
    const postedEntries = journalEntries.filter((e) => e.status === 'Posted');
    let totalDebit = 0;
    let totalCredit = 0;

    postedEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (line.accountId === accountId) {
          totalDebit += Number(line.debit || 0);
          totalCredit += Number(line.credit || 0);
        }
      });
    });

    // Debit normal accounts: Assets, Expenses
    // Credit normal accounts: Liabilities, Equity, Revenues
    if (acc.type === 'Asset' || acc.type === 'Expense') {
      return Number((totalDebit - totalCredit).toFixed(2));
    } else {
      return Number((totalCredit - totalDebit).toFixed(2));
    }
  };

  // Trial Balance (ميزان المراجعة)
  const getTrialBalance = (asOfDate?: string) => {
    const postedEntries = journalEntries.filter((e) => {
      if (e.status !== 'Posted') return false;
      if (asOfDate && e.date > asOfDate) return false;
      return true;
    });

    // We calculate for leaf accounts (accounts without children)
    const leafAccounts = accounts.filter((a) => !accounts.some((child) => child.parentId === a.id));

    let totalInitialDebit = 0;
    let totalInitialCredit = 0;
    let totalPeriodDebit = 0;
    let totalPeriodCredit = 0;
    let totalEndingDebit = 0;
    let totalEndingCredit = 0;

    const rows = leafAccounts.map((acc) => {
      let pDebit = 0;
      let pCredit = 0;

      postedEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.accountId === acc.id) {
            pDebit += Number(line.debit || 0);
            pCredit += Number(line.credit || 0);
          }
        });
      });

      pDebit = Number(pDebit.toFixed(2));
      pCredit = Number(pCredit.toFixed(2));

      totalPeriodDebit += pDebit;
      totalPeriodCredit += pCredit;

      // Net ending balance
      let endingDebit = 0;
      let endingCredit = 0;

      if (acc.type === 'Asset' || acc.type === 'Expense') {
        const net = pDebit - pCredit;
        if (net >= 0) endingDebit = net;
        else endingCredit = Math.abs(net);
      } else {
        const net = pCredit - pDebit;
        if (net >= 0) endingCredit = net;
        else endingDebit = Math.abs(net);
      }

      totalEndingDebit += endingDebit;
      totalEndingCredit += endingCredit;

      return {
        account: acc,
        initialDebit: 0,
        initialCredit: 0,
        periodDebit: pDebit,
        periodCredit: pCredit,
        totalDebit: pDebit,
        totalCredit: pCredit,
        endingDebit: Number(endingDebit.toFixed(2)),
        endingCredit: Number(endingCredit.toFixed(2)),
      };
    });

    totalPeriodDebit = Number(totalPeriodDebit.toFixed(2));
    totalPeriodCredit = Number(totalPeriodCredit.toFixed(2));
    totalEndingDebit = Number(totalEndingDebit.toFixed(2));
    totalEndingCredit = Number(totalEndingCredit.toFixed(2));

    const isBalanced = Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.05 && Math.abs(totalEndingDebit - totalEndingCredit) < 0.05;

    return {
      rows,
      lines: rows,
      totalInitialDebit,
      totalInitialCredit,
      totalPeriodDebit,
      totalPeriodCredit,
      totalEndingDebit,
      totalEndingCredit,
      totalDebitSum: totalPeriodDebit,
      totalCreditSum: totalPeriodCredit,
      totalEndingDebitSum: totalEndingDebit,
      totalEndingCreditSum: totalEndingCredit,
      isBalanced,
    };
  };

  // Income Statement (قائمة الدخل / الأرباح والخسائر)
  const getIncomeStatement = (startDate?: string, endDate?: string) => {
    const postedEntries = journalEntries.filter((e) => {
      if (e.status !== 'Posted') return false;
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    const leafAccounts = accounts.filter((a) => !accounts.some((child) => child.parentId === a.id));

    const revenues: Array<{ account: Account; amount: number }> = [];
    const directCosts: Array<{ account: Account; amount: number }> = [];
    const operatingExpenses: Array<{ account: Account; amount: number }> = [];

    leafAccounts.forEach((acc) => {
      let debit = 0;
      let credit = 0;

      postedEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.accountId === acc.id) {
            debit += Number(line.debit || 0);
            credit += Number(line.credit || 0);
          }
        });
      });

      if (acc.type === 'Revenue') {
        const netRevenue = Number((credit - debit).toFixed(2));
        if (netRevenue !== 0 || acc.code === '4101' || acc.code === '4102') {
          revenues.push({ account: acc, amount: netRevenue });
        }
      } else if (acc.type === 'Expense') {
        const netExpense = Number((debit - credit).toFixed(2));
        // Class 5000 is Direct Operational Costs / Cost of Goods Sold
        if (acc.code.startsWith('5')) {
          directCosts.push({ account: acc, amount: netExpense });
        } else {
          // Class 6000 is General, Administrative & Operating Expenses
          operatingExpenses.push({ account: acc, amount: netExpense });
        }
      }
    });

    const totalRevenue = Number(revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0).toFixed(2));
    const totalDirectCosts = Number(directCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0).toFixed(2));
    const grossProfit = Number((totalRevenue - totalDirectCosts).toFixed(2));
    const totalOperatingExpenses = Number(operatingExpenses.reduce((s, o) => s + (Number(o.amount) || 0), 0).toFixed(2));
    const netIncome = Number((grossProfit - totalOperatingExpenses).toFixed(2));

    const grossProfitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const netProfitMargin = totalRevenue > 0 ? Number(((netIncome / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      revenues,
      directCosts,
      costOfSales: directCosts,
      operatingExpenses,
      totalRevenue,
      totalRevenues: totalRevenue,
      totalDirectCosts,
      totalCostOfSales: totalDirectCosts,
      grossProfit,
      grossProfitMargin,
      totalOperatingExpenses,
      netIncome,
      netProfit: netIncome,
      netProfitMargin,
    };
  };

  // Balance Sheet (الميزانية العمومية / المركز المالي)
  const getBalanceSheet = (asOfDate?: string) => {
    const postedEntries = journalEntries.filter((e) => {
      if (e.status !== 'Posted') return false;
      if (asOfDate && e.date > asOfDate) return false;
      return true;
    });

    const leafAccounts = accounts.filter((a) => !accounts.some((child) => child.parentId === a.id));

    const assets: Array<{ account: Account; amount: number }> = [];
    const liabilities: Array<{ account: Account; amount: number }> = [];
    const equity: Array<{ account: Account; amount: number }> = [];

    leafAccounts.forEach((acc) => {
      let debit = 0;
      let credit = 0;

      postedEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.accountId === acc.id) {
            debit += Number(line.debit || 0);
            credit += Number(line.credit || 0);
          }
        });
      });

      if (acc.type === 'Asset') {
        const netAsset = Number((debit - credit).toFixed(2));
        assets.push({ account: acc, amount: netAsset });
      } else if (acc.type === 'Liability') {
        const netLiability = Number((credit - debit).toFixed(2));
        liabilities.push({ account: acc, amount: netLiability });
      } else if (acc.type === 'Equity') {
        const netEquity = Number((credit - debit).toFixed(2));
        equity.push({ account: acc, amount: netEquity });
      }
    });

    const totalAssets = Number(assets.reduce((s, a) => s + (Number(a.amount) || 0), 0).toFixed(2));
    const totalLiabilities = Number(liabilities.reduce((s, l) => s + (Number(l.amount) || 0), 0).toFixed(2));
    const totalEquity = Number(equity.reduce((s, e) => s + (Number(e.amount) || 0), 0).toFixed(2));

    // Calculate current period net income to balance the equity
    const incomeStatement = getIncomeStatement(undefined, asOfDate);
    const currentPeriodProfit = incomeStatement.netIncome || 0;

    const totalLiabilitiesAndEquity = Number((totalLiabilities + totalEquity + currentPeriodProfit).toFixed(2));
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.05;

    const currentAssets = assets.filter(
      (a) => !a.account.code.startsWith('12') && a.account.code !== '1200' && a.account.code !== '1201'
    );
    const nonCurrentAssets = assets.filter(
      (a) => a.account.code.startsWith('12') || a.account.code === '1200' || a.account.code === '1201'
    );

    return {
      assets,
      currentAssets,
      nonCurrentAssets,
      liabilities,
      currentLiabilities: liabilities,
      equity,
      equityItems: equity,
      retainedEarnings: currentPeriodProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      currentPeriodProfit,
      totalLiabilitiesAndEquity,
      isBalanced,
    };
  };

  // General Ledger for a specific account (كشف حساب أستاذ)
  const getAccountLedger = (accountId: string, startDate?: string, endDate?: string) => {
    const targetAccount = accounts.find((a) => a.id === accountId);
    const isDebitNormal = targetAccount?.type === 'Asset' || targetAccount?.type === 'Expense';

    // Prior posted entries for opening balance
    const priorEntries = journalEntries.filter((e) => {
      if (e.status !== 'Posted') return false;
      if (startDate && e.date < startDate) return true;
      return false;
    });

    let startingBalance = 0;
    priorEntries.forEach((entry) => {
      entry.lines.forEach((l) => {
        if (l.accountId === accountId) {
          const debit = Number(l.debit || 0);
          const credit = Number(l.credit || 0);
          if (isDebitNormal) startingBalance += debit - credit;
          else startingBalance += credit - debit;
        }
      });
    });

    // Current period posted entries
    const periodEntries = journalEntries
      .filter((e) => {
        if (e.status !== 'Posted') return false;
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = startingBalance;
    let totalDebit = 0;
    let totalCredit = 0;
    const entries: Array<{
      id: string;
      journalId: string;
      date: string;
      referenceId: string;
      description: string;
      entryId: string;
      debit: number;
      credit: number;
      notes?: string;
      costCenter?: string;
      runningBalance: number;
    }> = [];

    periodEntries.forEach((entry) => {
      entry.lines.forEach((line, idx) => {
        if (line.accountId === accountId) {
          const debit = Number(line.debit || 0);
          const credit = Number(line.credit || 0);
          totalDebit += debit;
          totalCredit += credit;

          if (isDebitNormal) {
            running += debit - credit;
          } else {
            running += credit - debit;
          }

          entries.push({
            id: `${entry.id}-${idx}`,
            journalId: entry.id,
            date: entry.date,
            referenceId: entry.referenceId || entry.id,
            description: line.notes || entry.description,
            notes: line.notes,
            costCenter: line.costCenter,
            entryId: entry.id,
            debit,
            credit,
            runningBalance: Number(running.toFixed(2)),
          });
        }
      });
    });

    return {
      account: targetAccount || accounts[0],
      startingBalance: Number(startingBalance.toFixed(2)),
      entries,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      endingBalance: Number(running.toFixed(2)),
    };
  };

  // Auto-generate Journal Entries from unlinked operational transactions
  const autoGenerateJournalsFromOperations = (): { generatedCount: number } => {
    let generatedCount = 0;

    // 1. Process Vouchers that haven't been journalized
    vouchers.forEach((vch) => {
      const alreadyJournalized = journalEntries.some(
        (e) => e.referenceId === vch.voucherNumber || (e.lines && e.lines.some((l) => l.notes?.includes(vch.voucherNumber)))
      );

      if (!alreadyJournalized && vch.amount > 0) {
        if (vch.type === 'Payment') {
          // Payment voucher: Debit Accounts Payable (Crushers 2101 or Transporters 2102) / Credit Bank (1102)
          const debitAccId = vch.partyType === 'Crusher' ? 'acc-2101' : vch.partyType === 'Transporter' ? 'acc-2102' : 'acc-6101';
          const debitAcc = accounts.find((a) => a.id === debitAccId) || accounts.find((a) => a.code === '2101') || accounts[0];
          const creditAcc = accounts.find((a) => a.id === 'acc-1102') || accounts.find((a) => a.code === '1102') || accounts[0];

          addJournalEntry({
            date: vch.date,
            referenceId: vch.voucherNumber,
            description: `سند صرف رقم ${vch.voucherNumber} - ${vch.purpose}`,
            status: vch.isApproved ? 'Posted' : 'Draft',
            lines: [
              {
                accountId: debitAcc.id,
                accountCode: debitAcc.code,
                accountNameAr: debitAcc.nameAr,
                debit: vch.amount,
                credit: 0,
                notes: `سداد مستحق لـ ${vch.partyName} بموجب سند ${vch.voucherNumber}`,
              },
              {
                accountId: creditAcc.id,
                accountCode: creditAcc.code,
                accountNameAr: creditAcc.nameAr,
                debit: 0,
                credit: vch.amount,
                notes: `خصم من الحساب البنكي / وسيلة الدفع: ${vch.paymentMethod}`,
              },
            ],
          });
          generatedCount++;
        } else if (vch.type === 'Receipt') {
          // Receipt voucher: Debit Bank (1102) / Credit Accounts Receivable (Customers 1103)
          const debitAcc = accounts.find((a) => a.id === 'acc-1102') || accounts.find((a) => a.code === '1102') || accounts[0];
          const creditAcc = accounts.find((a) => a.id === 'acc-1103') || accounts.find((a) => a.code === '1103') || accounts[0];

          addJournalEntry({
            date: vch.date,
            referenceId: vch.voucherNumber,
            description: `سند قبض رقم ${vch.voucherNumber} - ${vch.purpose}`,
            status: vch.isApproved ? 'Posted' : 'Draft',
            lines: [
              {
                accountId: debitAcc.id,
                accountCode: debitAcc.code,
                accountNameAr: debitAcc.nameAr,
                debit: vch.amount,
                credit: 0,
                notes: `إيداع في البنك بموجب سند قبض ${vch.voucherNumber}`,
              },
              {
                accountId: creditAcc.id,
                accountCode: creditAcc.code,
                accountNameAr: creditAcc.nameAr,
                debit: 0,
                credit: vch.amount,
                notes: `تحصيل من العميل: ${vch.partyName}`,
              },
            ],
          });
          generatedCount++;
        }
      }
    });

    return { generatedCount };
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
      summary: `تحديث بيانات الكسارة ${id}`,
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

    logAuditAction({
      userId: currentUser.id,
      userName: currentUser.fullNameAr || currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'Transporter',
      entityId: id,
      summary: `إضافة ناقل/مقاول نقل جديد: ${newTrans.transporterName}`,
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
      summary: `تحديث بيانات الناقل ${id}`,
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
      summary: `استيراد دفعة ناقلين عبر CSV: تم إضافة (${added}) وتحديث (${updated}) سجل`,
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

  const approveUserRequest = async (id: string, assignedRole: UserRole) => {
    const req = userRequests.find((r) => r.id === id);
    if (!req) return;

    const response = await fetch(`/api/user-registrations/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assigned_role: assignedRole }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Could not approve registration');
    }

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
    void fetch(`/api/user-registrations/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes }),
    }).catch((error: unknown) => console.error('Registration rejection failed:', error));
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
    setAccounts(INITIAL_CHART_OF_ACCOUNTS);
    setJournalEntries(INITIAL_JOURNAL_ENTRIES);

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
    localStorage.removeItem('meayon_accounts');
    localStorage.removeItem('meayon_journal_entries');
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
        setUsers,
        users,
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
        accounts,
        journalEntries,
        addAccount,
        updateAccount,
        deleteAccount,
        addJournalEntry,
        updateJournalEntry,
        postJournalEntry,
        cancelOrDraftJournalEntry,
        deleteJournalEntry,
        getAccountCalculatedBalance,
        getTrialBalance,
        getIncomeStatement,
        getBalanceSheet,
        getAccountLedger,
        autoGenerateJournalsFromOperations,
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
        activeTenantId,
        activeTenantLicense,
        availableTenants,
        switchTenant,
        registerNewTenant,
        isPlatformSuperAdmin,
        tenantRole,
        isDriverMode,
        setIsDriverMode,
        toggleDriverMode,
        exportDailyOperationsSnapshotJSON,
        accessibleOperations,
        activeOperations,
        softDeletedOperations,
        kpis,
        resetToDefaults,
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
