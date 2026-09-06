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
    | 'Ledger';
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
  balance: number; // Current calculated balance
  description?: string;
  isActive?: boolean;
  isSystemAccount?: boolean;
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
  entryType?: 'Manual' | 'Invoice_Posting' | 'Payment_Voucher' | 'Receipt_Voucher' | 'Crusher_Settlement' | 'Transporter_Settlement' | 'Period_Closing';
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

