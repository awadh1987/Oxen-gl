export type UserRole = 'Admin' | 'COO' | 'Accountant' | 'Data_Entry' | 'Guest';

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  docCategory: 'Scale Ticket' | 'Waybill' | 'Delivery Receipt' | 'Tax Invoice' | 'Payment Voucher' | 'Contract' | 'Other';
  fileData: string; // Base64 or URL
  uploadedAt: string;
  uploadedBy: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  fullNameAr: string;
  email: string;
  phone?: string;
  role: UserRole;
  tenantId?: string;
  tenantRole?: TenantRole;
  isPlatformSuperAdmin?: boolean;
  firebaseUid?: string;
  assignedCustomerId?: string | null;
  avatar?: string;
  status?: 'Active' | 'Pending' | 'Suspended';
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  customerName: string;
  customerNameEn: string;
  taxNumber: string;
  crNumber?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  openingBalance?: number;
  creditLimit?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Crusher {
  id: string;
  crusherName: string;
  crusherNameEn: string;
  location: string;
  bankDetails: string;
  accountNumber?: string;
  taxNumber?: string;
  materialProduced?: string;
  openingBalance: number;
  contactPerson?: string;
  phone?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export type CrusherEntity = Crusher;

export interface Transporter {
  id: string;
  transporterName: string;
  transporterNameEn: string;
  driverName: string;
  phone: string;
  truckDetails: string;
  defaultTruckNo?: string;
  capacityTons?: number;
  ratePerTon?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface MaterialOption {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'Aggregate' | 'Sand' | 'Powder' | 'Subbase' | 'Water';
  defaultSellingPrice: number;
  defaultPurchasePrice: number;
  unit: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface OperationRecord {
  id: string;
  date?: string; // Legacy alias for loading_date
  loading_date: string; // YYYY-MM-DD
  truck_no: string;
  transporter_name: string;
  loading_source: string; // Crusher Name
  loading_invoice_no: string;
  destination_customer: string; // Customer Name
  receipt_invoice_no: string;
  material_type: string;
  qty_loaded: number; // Metric Tons
  qty_delivered: number; // Metric Tons
  qty_wastage: number; // Computed: loaded - delivered
  wastage_percentage: number; // Computed: (wastage / loaded) * 100
  scale_ticket_no: string;
  sales_amount: number; // Excl. VAT
  transporter_cost_amount?: number;
  crusher_cost_amount?: number;
  vat_amount: number; // 15%
  total_sales: number; // sales + vat
  purchases_cost: number; // Payable to Crusher
  crusher_payment: number; // Paid to Crusher
  net_profit: number; // Computed: sales_amount - purchases_cost
  operation_month: number; // 1-12
  operation_year: number;
  notes?: string;
  scale_ticket_attachment?: string;
  attachments?: DocumentAttachment[];
  version?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CrusherPaymentEntry {
  id: string;
  crusher_id: string;
  crusher_name: string;
  payment_date: string;
  amount: number;
  payment_method: 'Bank Transfer' | 'Cheque' | 'Cash' | 'Credit Memo';
  reference_no: string;
  notes?: string;
  month: number;
  year: number;
  attachments?: DocumentAttachment[];
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
}

export type CrusherPayment = CrusherPaymentEntry;

export interface DigitalSignatureStamp {
  signedBy: string;
  signedByRole: string;
  signedAt: string;
  verificationHash: string;
  signatureImageUrl?: string;
  stampImageUrl?: string;
  signNotes?: string;
}

export interface InvoiceVersion {
  versionNumber: number;
  versionLabel: string;
  savedAt: string;
  savedBy: string;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  tripsCount: number;
  notes?: string;
  items: InvoiceItem[];
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerTaxNumber: string;
  billingMonth: number;
  billingYear: number;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  totalTrips: number;
  totalLoadedWeight: number;
  totalDeliveredWeight: number;
  totalWastageWeight: number;
  status: 'Draft' | 'Pending_Approval' | 'Approved' | 'Issued' | 'Paid' | 'Overdue';
  preparedBy?: string;
  preparedByRole?: string;
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;
  qrCodeData?: string;
  version?: number;
  versionHistory?: InvoiceVersion[];
  isSigned?: boolean;
  signatureData?: DigitalSignatureStamp;
  attachments?: DocumentAttachment[];
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface InvoiceItem {
  materialType: string;
  tripsCount: number;
  loadedWeight: number;
  deliveredWeight: number;
  wastageWeight: number;
  unitPrice: number;
  subtotal: number;
  vatAmount: number;
  total: number;
}

export interface TransporterSettlement {
  transporterId?: string;
  transporterName: string;
  month?: number;
  year?: number;
  tripsCount: number;
  totalLoaded: number;
  totalDelivered: number;
  totalWastage: number;
  wastagePercentage: number;
  totalFreightFee: number;
  penaltyDeductions: number;
  netPayable: number;
  status: 'Excellent' | 'Warning' | 'Penalty' | 'Pending' | 'Approved' | 'Disbursed';
  isSigned?: boolean;
  signatureData?: DigitalSignatureStamp;
  attachments?: DocumentAttachment[];
}

export interface DashboardKPIs {
  totalSales: number;
  totalPurchasesCost: number;
  netOperatingProfit: number;
  profitMarginPercent: number;
  totalDeliveredTonnage: number;
  totalLoadedTonnage: number;
  totalWastageTonnage: number;
  overallWastagePercent: number;
  totalTrips: number;
  crusherPayableBalance: number;
  pendingApprovalsCount: number;
}

// Executive Admin & Workflow Models
export interface EditApprovalRequest {
  id: string;
  recordId: string;
  entityType: 'Operation' | 'Invoice' | 'CrusherPayment' | 'Customer' | 'Crusher' | 'Transporter';
  requestedBy: string;
  requestedByRole: UserRole;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  diffSummary: string;
}

export interface UserApprovalRequest {
  id: string;
  fullName: string;
  fullNameAr: string;
  username: string;
  email: string;
  phone: string;
  requestedRole: UserRole;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  assignedRole?: UserRole;
  notes?: string;
}

export interface BrandConfig {
  companyNameAr: string;
  companyNameEn: string;
  crNumber: string;
  taxNumber: string;
  phone: string;
  email: string;
  addressAr: string;
  addressEn: string;
  bankNameAr: string;
  bankNameEn: string;
  iban: string;
  bankAccountNumber?: string;
  bankIban?: string;
  primaryColor: string; // e.g. #4f46e5
  secondaryColor: string; // e.g. #9333ea
  customLogoUrl?: string;
  ceoSignatureUrl?: string;
  companyStampUrl?: string;
  ceoNameAr: string;
  ceoNameEn: string;
  ceoTitleAr: string;
  ceoTitleEn: string;
  sloganAr?: string;
  sloganEn?: string;
  // Dynamic Homepage & Portal Customization
  heroBadgeAr?: string;
  heroBadgeEn?: string;
  homepageBadgeAr?: string;
  homepageBadgeEn?: string;
  heroHeadlineAr?: string;
  heroHeadlineEn?: string;
  homepageHeroTitleAr?: string;
  homepageHeroTitleEn?: string;
  heroSubtitleAr?: string;
  heroSubtitleEn?: string;
  homepageHeroSubtitleAr?: string;
  homepageHeroSubtitleEn?: string;
  heroCtaPrimaryAr?: string;
  heroCtaPrimaryEn?: string;
  heroCtaSecondaryAr?: string;
  heroCtaSecondaryEn?: string;
  homepageAnnualTonnage?: string;
  homepageFleetCount?: string;
  homepageCrushersCount?: string;
  homepageAboutTitleAr?: string;
  homepageAboutTitleEn?: string;
  homepageAboutDescriptionAr?: string;
  homepageAboutDescriptionEn?: string;
  stat1Value?: string;
  stat1LabelAr?: string;
  stat1LabelEn?: string;
  stat2Value?: string;
  stat2LabelAr?: string;
  stat2LabelEn?: string;
  stat3Value?: string;
  stat3LabelAr?: string;
  stat3LabelEn?: string;
  stat4Value?: string;
  stat4LabelAr?: string;
  stat4LabelEn?: string;
  aboutTitleAr?: string;
  aboutTitleEn?: string;
  aboutTextAr?: string;
  aboutTextEn?: string;
  workingHoursAr?: string;
  workingHoursEn?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action:
    | 'CREATE'
    | 'READ'
    | 'UPDATE'
    | 'DELETE'
    | 'SOFT_DELETE'
    | 'RESTORE'
    | 'APPROVE'
    | 'REJECT'
    | 'SIGN'
    | 'LOGIN'
    | 'OVERRIDE_DB'
    | 'BRAND_CONFIG'
    | 'ATTACH_FILE'
    | 'STATUS_CHANGE'
    | 'LEDGER_EDIT'
    | 'JOURNAL_ENTRY';
  entityType:
    | 'Operation'
    | 'Customer'
    | 'Crusher'
    | 'Transporter'
    | 'Material'
    | 'Invoice'
    | 'User'
    | 'BrandConfig'
    | 'Payment'
    | 'Settlement'
    | 'Voucher'
    | 'Account'
    | 'JournalEntry'
    | 'Ledger'
    | 'Tenant';
  entityId: string;
  summary: string;
  ipAddress: string;
  oldData?: any;
  newData?: any;
}

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  code: string; // e.g., '1000' for Assets, '1100' for Current Assets
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentId: string | null; // For hierarchical tree structure
  parent_code?: string | null; // e.g., '1000' for account '1100'
  is_postable?: boolean; // Leaf accounts = true, Group/Parent summary accounts = false
  balance: number; // Current calculated balance
  description?: string;
  isActive?: boolean;
  isSystemAccount?: boolean;
}

export interface CostCenter {
  id: string;
  code: string; // e.g., 'CC-OPS-01'
  nameAr: string;
  nameEn: string;
  parentId?: string | null;
  parentCode?: string | null;
  isLeaf: boolean;
  isActive: boolean;
  budget?: number;
  created_at?: string;
}

export interface JournalLine {
  accountId: string;
  accountCode?: string;
  accountNameAr?: string;
  accountNameEn?: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  costCenterId?: string;
  costCenterCode?: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  referenceId: string; // e.g., Invoice Number, Voucher ID
  description: string;
  lines: JournalLine[];
  postedBy?: string;
  status: 'Draft' | 'Posted';
  totalDebit?: number;
  totalCredit?: number;
  createdBy?: string;
  createdAt?: string;
  postedAt?: string;
  created_at?: string;
  posted_at?: string;
  updated_at?: string;
  entryType?: 'Manual' | 'Invoice_Posting' | 'Payment_Voucher' | 'Receipt_Voucher' | 'Crusher_Settlement' | 'Transporter_Settlement' | 'Period_Closing' | 'IntercompanyTrade';
}

export type VoucherType = 'Payment' | 'Receipt'; // سند صرف | سند قبض
export type VoucherCategory =
  | 'Crusher_Settlement'
  | 'Transporter_Payment'
  | 'Customer_Collection'
  | 'Operational_Expense'
  | 'General';

export interface FinancialVoucher {
  id: string; // e.g. "PV-2026-08-0012" or "RV-2026-08-0005"
  voucherNumber: string;
  type: VoucherType; // Payment = سند صرف, Receipt = سند قبض
  category: VoucherCategory;
  date: string; // YYYY-MM-DD
  amount: number;
  amountInWordsAr: string; // تفقيط باللغة العربية
  amountInWordsEn?: string; // تفقيط باللغة الإنجليزية
  partyType: 'Crusher' | 'Transporter' | 'Customer' | 'Other';
  partyId?: string;
  partyName: string; // اسم المستفيد / المستلم منه
  partyTaxNumber?: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Credit Memo';
  bankName?: string;
  checkNumber?: string;
  transferRefNumber?: string;
  linkedReferenceNo?: string; // Invoice #, Crusher Inv #, Trip Ref
  purpose: string; // الغرض من الصرف / القبض
  notes?: string;
  month: number;
  year: number;
  // Approvals & Signatures
  preparedBy: string; // إعداد المحاسب
  reviewedBy?: string; // مراجعة وتدقيق الإدارة المالية
  receivedBy?: string; // توقيع المستلم / المستفيد
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  digitalSignature?: DigitalSignatureStamp;
  status: 'Draft' | 'Pending_Approval' | 'Approved' | 'Cancelled';
  attachments?: DocumentAttachment[];
  created_at: string;
  updated_at: string;
}

export interface IntercompanyTrade {
  id: string;
  source_branch_id: string;
  target_branch_id: string;
  origin_company_id?: string;
  target_company_id?: string;
  trade_amount: number;
  amount?: number; // legacy alias
  clearing_account: string; // '1300'
  target_clearing_account: string; // '2300'
  revenue_account?: string; // '4100'
  expense_account?: string; // '5100'
  origin_cost_center_id?: string;
  target_cost_center_id?: string;
  trade_date: string;
  reference_no: string;
  notes?: string;
  status: 'PENDING_CEO_APPROVAL' | 'Pending' | 'Approved' | 'Settled' | 'POSTED_TO_MAIN_LEDGER';
  journal_entry_id?: string;
  totalDebit?: number;
  totalCredit?: number;
  created_at?: string;
}

export interface IntercompanyConsolidationReport {
  branches: Array<{
    branchId: string;
    branchNameAr: string;
    branchNameEn: string;
    receivables_1300: number;
    payables_2300: number;
    revenue_4100: number;
    expenses_5100: number;
    netBalance: number;
  }>;
  totalPreElimination: {
    receivables_1300: number;
    payables_2300: number;
    revenue_4100: number;
    expenses_5100: number;
  };
  eliminations: {
    debit_2300: number;
    credit_1300: number;
    debit_4100: number;
    credit_5100: number;
  };
  consolidatedNetImpact: number;
  isFullyReconciled: boolean;
}

export interface BankTransactionItem {
  id: string;
  date: string;
  amount: number;
  type: 'Credit' | 'Debit';
  reference: string;
  matched_voucher_id?: string;
  notes?: string;
}

export interface BankReconciliation {
  id: string;
  account_id: string;
  statement_currency: string;
  exchange_rate: number;
  tolerance_threshold: number;
  total_statement_amount: number;
  total_matched_amount: number;
  total_unmatched_amount: number;
  exchange_gain_loss: number;
  is_reconciled: boolean;
  status: 'Draft' | 'Reconciled';
  transactions: BankTransactionItem[];
  created_at: string;
}

export interface OptimizationReport {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  response_time_ms: number;
  is_under_threshold: boolean; // < 50ms
  index_health: Array<{
    index: string;
    table: string;
    status: 'OPTIMAL' | 'DEGRADED';
    cardinality: number;
  }>;
  table_counts: Record<string, number>;
  cache_hit_ratio: string;
  recommendation: string;
  checked_at: string;
}

export interface InventoryLayer {
  id: string;
  item_sku: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  date_received: string;
  batch_number: string;
  warehouse_id: string;
  cost_center_id?: string;
  is_active: boolean;
  created_at?: string;
}

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name_ar: string;
  asset_name_en: string;
  category: 'Heavy_Trucks' | 'Crushing_Machinery' | 'Trailers' | 'IT_Office' | 'Vehicles' | 'Other';
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  accumulated_depreciation: number;
  book_value: number;
  cost_center_id: string;
  status: 'Active' | 'Disposed' | 'Fully_Depreciated';
  last_depreciation_date?: string;
  created_at?: string;
}

export interface FixedAssetDepreciationRunResult {
  success: boolean;
  run_date: string;
  period: string;
  total_depreciation: number;
  assets_processed: number;
  journal_entry_id: string;
  message?: string;
}

export interface EmployeeContract {
  id: string;
  employee_code: string;
  employee_name_ar: string;
  employee_name_en: string;
  national_id: string;
  job_title: string;
  department: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  gosi_deduction: number;
  net_salary: number;
  bank_iban: string;
  cost_center_id: string;
  status: 'Active' | 'Terminated' | 'Suspended';
  hire_date: string;
  created_at?: string;
}

export interface PayrollRunResult {
  success: boolean;
  month: number;
  year: number;
  pay_date: string;
  total_basic: number;
  total_allowances: number;
  total_gosi: number;
  total_net_payout: number;
  employees_count: number;
  journal_entry_id: string;
  message?: string;
}

export interface FiscalPeriod {
  id: string;
  year: number;
  is_closed: boolean;
  closed_at?: string;
  closed_by?: string;
  net_profit_or_loss: number;
  retained_earnings_journal_id?: string;
  total_revenue: number;
  total_expenses: number;
  closing_notes?: string;
}

export interface PublicInvoiceToken {
  token: string;
  invoice_id: string;
  public_url: string;
  expires_at: string;
  created_at: string;
  access_count?: number;
}

export interface WafThreat {
  id: string;
  ip_address: string;
  threat_type: string;
  endpoint: string;
  details: string;
  timestamp: string;
  blocked: boolean;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export type TenantRole = 'Owner' | 'Admin' | 'Accountant' | 'Data_Entry' | 'Viewer' | 'Guest';
export type TenantPlanType = 'PARTIAL' | 'PRO' | 'ENTERPRISE' | 'STARTER';
export type TenantTier = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface SubscriptionPlan {
  id: string;
  planCode: string;
  nameAr: string;
  nameEn: string;
  tier: TenantTier;
  planType: TenantPlanType;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxCostCenters: number;
  maxBranches: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export interface TenantLicense {
  tenantId: string;
  companyName: string;
  companyNameEn?: string;
  crNumber?: string;
  taxNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseKey: string;
  subscriptionTier: TenantTier;
  planType: TenantPlanType;
  planId?: string;
  maxAllowedCostCenters: number;
  maxAllowedUsers: number;
  maxAllowedBranches: number;
  uiThemeMode?: 'LIGHT' | 'DARK' | 'CUSTOM';
  uiPrimaryColor?: string;
  uiSecondaryColor?: string;
  uiFontFamily?: string;
  uiLogoUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  expiresAt?: string;
}

