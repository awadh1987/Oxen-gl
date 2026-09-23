export interface ApiOperation {
  picking_id: string;
  picking_reference: string;
  partner_id: string | null;
  partner_name: string | null;
  product_id: string;
  product_name: string;
  source_location_id: string;
  source_location_name: string;
  dest_location_id: string;
  dest_location_name: string;
  ticket_id: string;
  ticket_number: string;
  truck_number: string;
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
  uom?: string;
  unit_of_measure?: string;
  weighed_in_at: string;
  attachments?: any[];
  scale_ticket_attachment?: string;
  material_supplier_name?: string | null;
  service_supplier_name?: string | null;
  destination_customer_name?: string | null;
  loading_invoice_no?: string | null;
  receipt_invoice_no?: string | null;
  material_type?: string | null;
  qty_loaded?: number | null;
  qty_delivered?: number | null;
  qty_wastage?: number | null;
  wastage_percentage?: number | null;
  sales_amount?: number | null;
  vat_amount?: number | null;
  total_sales?: number | null;
  purchases_cost?: number | null;
  crusher_payment?: number | null;
  net_profit?: number | null;
  operation_month?: number | null;
  operation_year?: number | null;
  notes?: string | null;
  raw_legacy_data?: Record<string, any>;
}

export interface ApiCompany {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  commercial_registration: string | null;
  tax_id: string | null;
  currency: string;
  fiscal_calendar: string;
  fiscal_year_start_month: number;
  tax_regime: string;
  subscription_tier: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  license_key: string | null;
  license_expires_at: string | null;
  max_cost_centers: number;
  theme_mode: 'LIGHT' | 'DARK' | 'CUSTOM';
  ui_primary_color: string;
  ui_secondary_color: string;
  ui_logo_url: string | null;
}

export interface LicenseIssuePayload {
  company_id: string;
  subscription_tier: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  validity_days: number;
  theme_mode: 'LIGHT' | 'DARK' | 'CUSTOM';
  ui_primary_color: string;
  ui_secondary_color: string;
}

export interface IsolationAudit {
  isolated_tables: string[];
  total_isolated_tables: number;
  total_registered_tenants: number;
  backend_status: string;
  security_policy: string;
  checked_at: string;
}

export interface CompanyBrandingPayload {
  ui_logo_url?: string | null;
  ui_primary_color: string;
  ui_secondary_color: string;
}

export interface CompanyUpdatePayload {
  parent_id?: string | null;
  name?: string;
  currency?: string;
  fiscal_calendar?: string;
  fiscal_year_start_month?: number;
  tax_regime?: string;
  theme_mode?: 'LIGHT' | 'DARK' | 'CUSTOM';
  ui_primary_color?: string;
  ui_secondary_color?: string;
  ui_logo_url?: string | null;
}

export interface CompanyRegistrationPayload {
  company_name: string;
  slug: string;
  cr_number: string;
  vat_number: string;
  admin_email: string;
  admin_name: string;
  admin_phone?: string;
  admin_password: string;
}

export interface NativeLoginPayload {
  email: string;
  password: string;
}

export interface NativeAuthResponse {
  status: 'Active' | 'Pending';
  message: string;
  token?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    fullNameAr: string;
    role: 'Super_Admin' | 'Admin' | 'COO' | 'Accountant' | 'Data_Entry' | 'Guest';
    status: 'Active' | 'Pending';
    company_id: string | null;
    tenant_id?: string | null;
    tenant_slug?: string | null;
    domain_slug?: string | null;
  };
}

export interface MasterLoginPayload {
  identity: string;
  password: string;
}

export interface TenantLoginPayload {
  tenant_slug: string;
  identity: string;
  password: string;
}

export interface TwoFactorVerifyPayload {
  two_factor_token?: string;
  code: string;
  tenant?: string;
  tenant_slug?: string;
  workspace_slug?: string;
  email?: string;
}

export interface TwoTierTenantRegistrationPayload {
  company_name: string;
  tenant_slug?: string;
  owner_full_name: string;
  email: string;
  mobile_number: string;
  password: string;
  commercial_registration?: string;
  tax_id?: string;
}

export interface PasswordRecoveryPayload {
  identity: string;
  plane: 'master' | 'tenant';
  workspace_slug?: string;
}

export interface PasswordResetPayload {
  identity?: string;
  plane: 'master' | 'tenant';
  workspace_slug?: string;
  reset_token?: string;
  reset_code?: string;
  otp_code: string;
  new_password: string;
}

export interface TwoTierAuthResponse {
  access_token?: string;
  token_type?: string;
  tier?: 'master' | 'tenant';
  role?: string;
  tenant_id?: string;
  tenant_slug?: string;
  status?: string;
  two_factor_token?: string;
  message?: string;
  user?: {
    id: string;
    email: string;
    mobile?: string;
    fullName?: string;
    fullNameAr?: string;
    role?: string;
  };
}


export interface UserRegistrationPayload {
  company_id: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  requested_role?: 'Guest' | 'Data_Entry' | 'Accountant';
}

export interface DirectWorkspaceAccessPayload {
  scope: 'master' | 'tenant';
  company_id?: string;
  recovery_code: string;
}

export interface DirectWorkspaceAccessResponse {
  status: 'Active';
  message: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    fullNameAr: string;
    role: 'Super_Admin' | 'Admin' | 'COO';
    status: 'Active';
    company_id: string | null;
  };
}

export interface ApiAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  internal_type: string;
  currency: string;
}

export interface AccountMoveLinePayload {
  account_id?: string;
  account_code?: string;
  partner_id?: string | null;
  cost_center_id?: string | null;
  debit: number;
  credit: number;
  name: string;
}

export interface AccountMoveCreatePayload {
  name?: string;
  journal_code: string;
  move_type?: 'entry' | 'out_invoice' | 'in_invoice' | 'settlement';
  partner_id?: string | null;
  cost_center_id?: string | null;
  date?: string;
  ref?: string;
  lines: AccountMoveLinePayload[];
}

export interface ApiAccountMove {
  id: string;
  company_id: string;
  name: string;
  move_type: 'entry' | 'out_invoice' | 'in_invoice' | 'settlement';
  partner_id: string | null;
  date: string;
  state: 'draft' | 'posted' | 'canceled';
  ref: string | null;
}

export interface ApiCustomerInvoice {
  id: string;
  company_id: string;
  partner_id: string | null;
  move_id: string | null;
  invoice_number: string;
  customer_name: string;
  customer_tax_number: string | null;
  issue_date: string;
  due_date: string | null;
  status: 'Draft' | 'Approved' | 'Issued' | 'Cancelled';
  subtotal: string | number;
  vat_amount: string | number;
  grand_total: string | number;
  approved_by: string | null;
  approved_at: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInvoiceCreatePayload {
  partner_id?: string | null;
  invoice_number?: string | null;
  customer_name: string;
  customer_tax_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
}

export interface CustomerInvoiceUpdatePayload {
  partner_id?: string | null;
  customer_name?: string | null;
  customer_tax_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal?: number;
  vat_amount?: number;
  grand_total?: number;
  status?: 'Draft' | 'Approved' | 'Issued' | 'Cancelled';
}

export interface ApiSettlement {
  id: string;
  company_id: string;
  partner_id: string;
  move_id: string;
  total_gross_amount: string;
  total_penalties_loss: string;
  net_payable: string;
  period_start: string;
  period_end: string;
  state: 'draft' | 'approved' | 'paid';
}

export interface Partner { id: string; name: string; partner_type: string; email?: string | null; phone?: string | null; tax_number?: string | null; commercial_registration?: string | null; branch_scope_ids?: string | null; warehouse_scope_ids?: string | null; access_control_list?: string | null; }
export type PartnerPayload = Omit<Partner, 'id'>;
interface Location { id: string; name: string; location_type: string; }
interface Product {
  id: string;
  sku: string;
  name: string;
  product_type?: string;
  unit_of_measure?: string;
  standard_cost?: number;
  sale_price?: number;
}

import { setAuthCookie, getAuthCookie, clearAuthCookie, getSubdomain } from '../utils/subdomain';

export const OXENGL_AUTH_TOKEN_KEY = 'oxengl_auth_jwt';
export const OXENGL_AUTH_TIER_KEY = 'oxengl_auth_tier';
export const OXENGL_TENANT_SLUG_KEY = 'oxengl_tenant_slug';
export const OXENGL_TENANT_ID_KEY = 'oxengl_tenant_id';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const cookieToken = getAuthCookie();
  const localToken = localStorage.getItem(OXENGL_AUTH_TOKEN_KEY) || localStorage.getItem('token') || localStorage.getItem('access_token');
  if (cookieToken && !localToken) {
    localStorage.setItem(OXENGL_AUTH_TOKEN_KEY, cookieToken);
    localStorage.setItem('token', cookieToken);
    localStorage.setItem('access_token', cookieToken);
    return cookieToken;
  }
  return localToken || cookieToken;
}

export function getAuthTier(): 'master' | 'tenant' | null {
  if (typeof window === 'undefined') return null;
  const tier = (localStorage.getItem(OXENGL_AUTH_TIER_KEY) as 'master' | 'tenant');
  if (tier) return tier;
  if (getSubdomain() || localStorage.getItem('tenant_slug') || localStorage.getItem(OXENGL_TENANT_SLUG_KEY)) return 'tenant';
  if (localStorage.getItem('role') === 'Super_Admin') return 'master';
  return null;
}

export function getTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const subdomain = getSubdomain();
  if (subdomain) return subdomain;
  return localStorage.getItem(OXENGL_TENANT_SLUG_KEY) || localStorage.getItem('tenant_slug');
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OXENGL_TENANT_ID_KEY) || localStorage.getItem('tenant_id') || localStorage.getItem('company_id');
}

export function setAuthSession(token: string, tier: 'master' | 'tenant', tenantSlug?: string | null, tenantId?: string | null): void {
  if (typeof window === 'undefined') return;
  setAuthCookie(token);
  localStorage.setItem(OXENGL_AUTH_TOKEN_KEY, token);
  localStorage.setItem('token', token);
  localStorage.setItem('access_token', token);
  localStorage.setItem(OXENGL_AUTH_TIER_KEY, tier);
  const effectiveSlug = tenantSlug || getSubdomain();
  if (effectiveSlug) {
    localStorage.setItem(OXENGL_TENANT_SLUG_KEY, effectiveSlug);
    localStorage.setItem('tenant_slug', effectiveSlug);
  } else {
    localStorage.removeItem(OXENGL_TENANT_SLUG_KEY);
    localStorage.removeItem('tenant_slug');
  }
  if (tenantId) {
    localStorage.setItem(OXENGL_TENANT_ID_KEY, tenantId);
    localStorage.setItem('tenant_id', tenantId);
    localStorage.setItem('company_id', tenantId);
  } else {
    localStorage.removeItem(OXENGL_TENANT_ID_KEY);
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('company_id');
  }
  localStorage.setItem('oxengl_session_active', 'true');
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  clearAuthCookie();
  localStorage.removeItem(OXENGL_AUTH_TOKEN_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem(OXENGL_AUTH_TIER_KEY);
  localStorage.removeItem(OXENGL_TENANT_SLUG_KEY);
  localStorage.removeItem('tenant_slug');
  localStorage.removeItem(OXENGL_TENANT_ID_KEY);
  localStorage.removeItem('tenant_id');
  localStorage.removeItem('company_id');
  localStorage.removeItem('oxengl_current_company');
  localStorage.removeItem('role');
  localStorage.removeItem('oxengl_session_active');
  localStorage.removeItem('oxengl_user');
  localStorage.removeItem('meayon_user');
}

const apiBaseUrl = typeof window === 'undefined' ? '' : window.location.origin;

async function request<T>(path: string, companyId?: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const activeTenantSlug = getTenantSlug();
  const activeTenantId = companyId || getTenantId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantSlug ? { 'X-Tenant-Slug': activeTenantSlug } : {}),
    ...(activeTenantId ? { 'X-Company-ID': activeTenantId, 'X-Tenant-ID': activeTenantId } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (options?.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (errJson.message) {
        errorDetail = errJson.message;
      } else if (errJson.error) {
        errorDetail = typeof errJson.error === 'string' ? errJson.error : JSON.stringify(errJson.error);
      }
    } catch {}
    if (errorDetail) {
      console.error(`[API Error ${response.status}] ${path}:`, errorDetail);
    }

    // Global 401/403 Interceptor
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('oxengl-auth-error', {
            detail: { status: response.status, message: errorDetail || `Authentication error (${response.status})` },
          })
        );
        if (response.status === 401) {
          clearAuthSession();
        }
      }
    }

    throw new Error(errorDetail || `API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function findOrCreate<T extends { id: string }>(path: string, companyId: string, predicate: (record: T) => boolean, payload: object): Promise<T> {
  const records = await request<T[]>(path, companyId);
  return records.find(predicate) ?? request<T>(path, companyId, { method: 'POST', body: JSON.stringify(payload) });
}

export const erpApi = {
  // Two-Tier Identity & Auth Endpoints
  masterLogin: (payload: MasterLoginPayload) =>
    request<TwoTierAuthResponse>('/api/auth/master/login', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  tenantLogin: async (payload: TenantLoginPayload) => {
    const res = await request<TwoTierAuthResponse>('/api/auth/tenant/login', undefined, { method: 'POST', body: JSON.stringify(payload) });
    if (res?.access_token) {
      setAuthSession(res.access_token, 'tenant', res.tenant_slug || payload.tenant_slug, res.tenant_id);
    }
    return res;
  },
  loginTenant: async (payload: TenantLoginPayload) => {
    const res = await request<TwoTierAuthResponse>('/api/auth/tenant/login', undefined, { method: 'POST', body: JSON.stringify(payload) });
    if (res?.access_token) {
      setAuthSession(res.access_token, 'tenant', res.tenant_slug || payload.tenant_slug, res.tenant_id);
    }
    return res;
  },
  verifyTwoFactor: async (payload: TwoFactorVerifyPayload) => {
    const res = await request<TwoTierAuthResponse>('/auth/2fa/verify', undefined, { method: 'POST', body: JSON.stringify(payload) });
    if (res?.access_token) {
      setAuthSession(res.access_token, 'tenant', res.tenant_slug || payload.tenant_slug || payload.workspace_slug, res.tenant_id);
    }
    return res;
  },
  registerTenant: (payload: TwoTierTenantRegistrationPayload) =>
    request<{ message: string; tenant_id: string; tenant_slug: string; tenant: any; admin_user_id: string }>('/api/auth/register-tenant', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  recoverPassword: (payload: PasswordRecoveryPayload) =>
    request<{ message: string; delivery_channel?: string; reset_token?: string }>('/api/auth/recover-password', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload: PasswordResetPayload) =>
    request<{ message: string }>('/api/auth/reset-password', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  getMasterMe: () =>
    request<any>('/api/auth/master/me'),
  getTenantMe: () =>
    request<any>('/api/auth/tenant/me'),

  getCompanies: () => request<ApiCompany[]>('/api/companies'),
  getCompany: (companyId: string) => request<ApiCompany>(`/api/companies/${companyId}`, companyId),
  updateCompany: (companyId: string, payload: CompanyUpdatePayload) => request<ApiCompany>(`/api/companies/${companyId}`, companyId, { method: 'PATCH', body: JSON.stringify(payload) }),
  login: async (payload: NativeLoginPayload) => {
    const res = await request<NativeAuthResponse>('/api/auth/verify', undefined, { method: 'POST', body: JSON.stringify(payload) });
    const tenantId = res?.user?.company_id || res?.user?.tenant_id;
    const tenantSlug = res?.user?.tenant_slug || res?.user?.domain_slug;
    if (res?.token) {
      setAuthSession(res.token, 'tenant', tenantSlug, tenantId);
    } else if (tenantId) {
      localStorage.setItem(OXENGL_TENANT_ID_KEY, tenantId);
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('company_id', tenantId);
      if (tenantSlug) {
        localStorage.setItem(OXENGL_TENANT_SLUG_KEY, tenantSlug);
        localStorage.setItem('tenant_slug', tenantSlug);
      }
    }
    return res;
  },
  logout: () => {
    clearAuthSession();
    return request<{ message: string }>('/api/auth/logout', undefined, { method: 'POST' });
  },
  registerUser: (payload: UserRegistrationPayload) => request<NativeAuthResponse>('/api/user-registrations', payload.company_id, { method: 'POST', body: JSON.stringify(payload) }),
  registerCompany: (payload: CompanyRegistrationPayload) => request<{ company: ApiCompany; user: { id: string; company_id: string; role: string } }>('/api/companies/register', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  updateCompanyBranding: (companyId: string, payload: CompanyBrandingPayload) => request<ApiCompany>(`/api/companies/${companyId}/branding`, companyId, { method: 'PUT', body: JSON.stringify(payload) }),
  directWorkspaceAccess: (payload: DirectWorkspaceAccessPayload) => request<DirectWorkspaceAccessResponse>('/api/auth/direct-access', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  getIsolationAudit: () => request<IsolationAudit>('/api/platform/audit'),
  issueLicense: (payload: LicenseIssuePayload, superAdminKey: string) => request<ApiCompany>('/api/platform/licenses', undefined, {
    method: 'POST',
    headers: { 'X-Recovery-Code': superAdminKey },
    body: JSON.stringify(payload),
  }),
  getOperations: (companyId: string) => request<ApiOperation[]>('/api/operations', companyId),
  getProducts: (companyId: string) => request<Product[]>('/api/products', companyId),
  deleteOperation: (companyId: string, pickingId: string) => request<void>(`/api/operations/${pickingId}`, companyId, {
    method: 'DELETE',
  }),
  getAccountingAccounts: (companyId: string) => request<ApiAccount[]>('/api/accounting/accounts', companyId),
  createAccountingAccount: (
    companyId: string,
    payload: {
      code: string;
      name: string;
      internal_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      currency?: string;
      node_path?: string;
    }
  ) =>
    request<ApiAccount>('/api/accounting/accounts', companyId, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAccountingMoves: (companyId: string) => request<ApiAccountMove[]>('/api/accounting/moves', companyId),
  getAccountingMove: (companyId: string, moveId: string) => request<ApiAccountMove>(`/api/accounting/moves/${moveId}`, companyId),
  createAccountMove: (companyId: string, payload: AccountMoveCreatePayload) => request<ApiAccountMove>('/api/accounting/moves', companyId, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getCustomerInvoices: (companyId: string) => request<ApiCustomerInvoice[]>('/api/customer-invoices', companyId),
  getCustomerInvoice: (companyId: string, invoiceId: string) => request<ApiCustomerInvoice>(`/api/customer-invoices/${invoiceId}`, companyId),
  createCustomerInvoice: (companyId: string, payload: CustomerInvoiceCreatePayload) => request<ApiCustomerInvoice>('/api/customer-invoices', companyId, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateCustomerInvoice: (companyId: string, invoiceId: string, payload: CustomerInvoiceUpdatePayload) => request<ApiCustomerInvoice>(`/api/customer-invoices/${invoiceId}`, companyId, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteCustomerInvoice: (companyId: string, invoiceId: string) => request<void>(`/api/customer-invoices/${invoiceId}`, companyId, {
    method: 'DELETE',
  }),
  approveCustomerInvoice: (companyId: string, invoiceId: string) => request<ApiCustomerInvoice>(`/api/customer-invoices/${invoiceId}/approve`, companyId, {
    method: 'POST',
  }),
  issueCustomerInvoice: (companyId: string, invoiceId: string) => request<ApiCustomerInvoice>(`/api/customer-invoices/${invoiceId}/issue`, companyId, {
    method: 'POST',
  }),
  processZatcaInvoice: (companyId: string, invoiceId: string) => request<any>(`/api/compliance/zatca/process-invoice/${invoiceId}`, companyId, {
    method: 'POST',
  }),
  calculateZatcaInvoice: (companyId: string, payload: {
    subtotal?: number;
    quantity?: number;
    unit_price?: number;
    rate?: number;
    amount?: number;
    vat_rate?: number;
  }) => request<{
    subtotal: number;
    vat_amount: number;
    grand_total: number;
    vat_rate: number;
  }>('/api/compliance/zatca/calculate-invoice', companyId, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getSettlements: (companyId: string) => request<ApiSettlement[]>('/api/settlements', companyId),
  getVouchers: (companyId: string) => request<any[]>('/api/accounting/moves', companyId),
  createVoucher: (companyId: string, payload: any) => request<any>('/api/accounting/moves', companyId, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getPartners: (companyId: string) => request<Partner[]>('/api/partners', companyId),
  createPartner: (companyId: string, payload: PartnerPayload) => request<Partner>('/api/partners', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  updatePartner: (companyId: string, partnerId: string, payload: Partial<PartnerPayload>) => request<Partner>(`/api/partners/${partnerId}`, companyId, { method: 'PATCH', body: JSON.stringify(payload) }),
  archivePartner: (companyId: string, partnerId: string) => request<void>(`/api/partners/${partnerId}`, companyId, { method: 'DELETE' }),
  
  // Phase 7: Universal Bulk Import Engine
  bulkImportOperations: (payload: FormData | any, companyId?: string) =>
    request<{ success: boolean; imported_count: number; skipped_count: number; errors: string[]; imported_ticket_ids: string[] }>(
      '/api/v1/operations/bulk-import',
      companyId,
      {
        method: 'POST',
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      }
    ),
  bulkImportPartners: (payload: FormData | any, companyId?: string) =>
    request<{ success: boolean; imported_count: number; updated_count: number; errors: string[] }>(
      '/api/v1/partners/bulk-import',
      companyId,
      {
        method: 'POST',
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      }
    ),
  
  // Phase 5: SaaS Subscription & Billing
  getSubscriptionPlans: () => request<any[]>('/api/master/subscriptions/plans'),
  updateTenantSubscription: (tenantId: string, payload: { tier: string; max_users?: number; max_storage_gb?: number }) =>
    request<any>(`/api/master/tenants/${tenantId}/subscription`, undefined, { method: 'PUT', body: JSON.stringify(payload) }),
  getTenantBillingSummary: () => request<any>('/api/tenant/billing/summary'),
  getTenantSaaSInvoices: () => request<any[]>('/api/tenant/billing/invoices'),
  
  // Phase 5: Mobile Fleet Operations & Driver Proof of Delivery
  getMobileTrips: (companyId: string) => request<any[]>('/api/mobile/trips', companyId),
  createMobileTrip: (companyId: string, payload: any) => request<any>('/api/mobile/trips', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  getMobileTrip: (tripId: string, companyId?: string) => request<any>(`/api/mobile/trips/${tripId}`, companyId),
  updateTripStatus: (tripId: string, payload: any, companyId?: string) => request<any>(`/api/mobile/trips/${tripId}/status`, companyId, { method: 'PUT', body: JSON.stringify(payload) }),
  submitDeliveryProof: (payload: any, companyId?: string) => request<any>('/api/mobile/delivery-proof', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  submitInspectionLog: (payload: any, companyId?: string) => request<any>('/api/mobile/inspection-logs', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  getInspectionLogs: (companyId?: string) => request<any[]>('/api/mobile/inspection-logs', companyId),
  
  // Phase 5: Fleet Maintenance & Fuel Management
  getVehicles: (companyId: string) => request<any[]>('/api/fleet/vehicles', companyId),
  createVehicle: (companyId: string, payload: any) => request<any>('/api/fleet/vehicles', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  getMaintenanceOrders: (companyId: string) => request<any[]>('/api/fleet/maintenance-orders', companyId),
  createMaintenanceOrder: (companyId: string, payload: any) => request<any>('/api/fleet/maintenance-orders', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  getFuelTransactions: (companyId: string) => request<any[]>('/api/fleet/fuel-transactions', companyId),
  createFuelTransaction: (companyId: string, payload: any) => request<any>('/api/fleet/fuel-transactions', companyId, { method: 'POST', body: JSON.stringify(payload) }),

  // Phase 5: GPS Fleet Radar Registration
  registerFleetTruck: (payload: {
    plate_number: string;
    vehicle_id?: string;
    carrier_id?: string;
    carrier_name?: string;
    imei?: string;
    driver_name_ar?: string;
    driver_name_en?: string;
    destination_ar?: string;
    destination_en?: string;
    min_temp?: number;
    max_temp?: number;
    initial_lat?: number;
    initial_lng?: number;
    speed?: number;
    cargo_temp?: number;
    ambient_humidity?: number;
    device_battery_voltage?: number;
    vehicle_type?: string;
    tenant_id?: string;
  }, companyId?: string) => request<any>('/api/v1/logistics/fleet/register', companyId, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Phase 5: Planning Department Charters
  getProjectCharters: (companyId?: string) => request<any[]>('/api/tenant/planning/charters', companyId),
  getProjectCharterDetails: (charterId: string, companyId?: string) => request<any>(`/api/tenant/planning/charters/${charterId}`, companyId),
  createProjectCharter: (payload: {
    project_name: string;
    manager_name?: string;
    manager_id?: string;
    total_budget?: number;
    start_date?: string;
    end_date?: string;
    scope_of_work_text?: string;
    smart_goals?: any[];
    kpis_json?: Record<string, any>;
    status?: string;
  }, companyId?: string) => request<any>('/api/tenant/planning/charters', companyId, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  
  // Phase 5: Multi-Tenant Real-Time Analytics
  getTenantAnalyticsSummary: (companyId: string) => request<any>('/api/analytics/tenant-summary', companyId),

  // Tenant User Management API (Live Backend Integration)
  getUsers: () =>
    request<
      Array<{
        id: string;
        email: string;
        full_name: string;
        role: string;
        is_active: boolean;
        created_at?: string;
        tenant_id: string;
      }>
    >('/api/v1/users'),

  inviteUser: (payload: { email: string; role: string; full_name?: string }) =>
    request<{
      status: string;
      user_id: string;
      email: string;
      full_name: string;
      role: string;
      temporary_password: string;
      message: string;
    }>('/api/v1/users/invite', undefined, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteUser: (userId: string) =>
    request<{ status: string; user_id: string; message: string }>(`/api/v1/users/${userId}`, undefined, {
      method: 'DELETE',
    }),

  updateUserRole: (userId: string, role: string) =>
    request<{ status: string; user_id: string; role: string; message: string }>(
      `/api/v1/users/${userId}/role`,
      undefined,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }
    ),

  async createWeighbridgeOperation(input: {
    companyId: string;
    transporterName: string;
    materialName: string;
    sourceName: string;
    destinationName: string;
    truckNumber: string;
    grossWeight: number;
    tareWeight: number;
    uom?: string;
    unitOfMeasure?: string;
    attachments?: any[];
    scaleTicketAttachment?: string;
  }) {
    const partner = await findOrCreate<Partner>('/api/partners', input.companyId, (record) => record.name === input.transporterName, {
      name: input.transporterName, partner_type: 'service_supplier',
    });
    const product = await findOrCreate<Product>('/api/products', input.companyId, (record) => record.name === input.materialName, {
      name: input.materialName, sku: `AUTO-${input.materialName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40) || 'MATERIAL'}`,
    });
    const source = await findOrCreate<Location>('/api/locations', input.companyId, (record) => record.name === input.sourceName, {
      name: input.sourceName, location_type: 'supplier',
    });
    const destination = await findOrCreate<Location>('/api/locations', input.companyId, (record) => record.name === input.destinationName, {
      name: input.destinationName, location_type: 'customer',
    });
      return request<ApiOperation>('/api/operations/weighbridge', input.companyId, {
        method: 'POST',
        body: JSON.stringify({
          partner_id: partner.id,
          product_id: product.id,
          source_location_id: source.id,
          dest_location_id: destination.id,
          truck_number: input.truckNumber,
          gross_weight: input.grossWeight,
          tare_weight: input.tareWeight,
          uom: input.uom || input.unitOfMeasure || 'MT',
          unit_of_measure: input.unitOfMeasure || input.uom || 'MT',
          attachments: input.attachments || [],
          scale_ticket_attachment: input.scaleTicketAttachment || null,
        }),
      });
    },

  getCustomsManifests: (companyId: string) =>
    request<ApiCustomsManifest[]>('/api/v1/logistics/customs/manifests', companyId),

  createCustomsManifest: (companyId: string, payload: CreateCustomsManifestPayload) =>
    request<ApiCustomsManifest>('/api/v1/logistics/customs/manifests', companyId, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCustomsStatus: (companyId: string, manifestId: string, status: string, reviewNotes?: string) =>
    request<ApiCustomsManifest>(`/api/v1/logistics/customs/manifests/${manifestId}/status`, companyId, {
      method: 'PUT',
      body: JSON.stringify({ status, review_notes: reviewNotes }),
    }),

  // HR Personnel Core
  getEmployees: (companyId?: string) =>
    request<any[]>('/api/v1/hr/employees', companyId),
  createEmployee: (payload: any, companyId?: string) =>
    request<any>('/api/v1/hr/employees', companyId, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Procurement & Inventory Purchase Orders
  getPurchaseOrders: (companyId?: string) =>
    request<any[]>('/api/v1/inventory/purchase-orders', companyId),
  createPurchaseOrder: (payload: any, companyId?: string) =>
    request<any>('/api/v1/inventory/purchase-orders', companyId, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Legacy System Resource Excel Import
  importLegacySystemResource: (file: File, companyId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{
      success: boolean;
      filename: string;
      imported_count: number;
      updated_count: number;
      skipped_count: number;
      records_processed: number;
      entities_created: {
        tickets: number;
        partners: number;
        materials: number;
      };
      errors: string[];
    }>('/api/v1/system/import-legacy', companyId, {
      method: 'POST',
      body: formData,
    });
  },
};

export interface ApiCustomsManifest {
  id: string;
  tenant_id: string;
  company_id?: string;
  manifest_number: string;
  declaration_number?: string;
  declaration_type: 'IMPORT' | 'EXPORT' | 'TRANSIT';
  port_of_entry?: string;
  border_port_name: string;
  carrier_name?: string;
  status: string;
  clearance_status: 'CLEARED' | 'PENDING_DOCUMENTATION' | 'UNDER_INSPECTION' | 'HELD';
  zatca_compliance_status: 'REPORTED' | 'NOT_SUBMITTED' | 'REJECTED';
  duty_amount: number;
  vat_amount: number;
  total_customs_amount: number;
  total_value_sar: number;
  hs_codes: string[];
  payload_hash?: string;
  block_hash: string;
  previous_hash: string;
  block_index: number;
  created_at: string;
  updated_at: string;
  timestamp: string;
}

export interface CreateCustomsManifestPayload {
  manifest_number?: string;
  declaration_number?: string;
  declaration_type?: 'IMPORT' | 'EXPORT' | 'TRANSIT';
  port_of_entry?: string;
  border_port_name?: string;
  carrier_name?: string;
  status?: string;
  duty_amount?: number;
  vat_amount?: number;
  total_customs_amount?: number;
  total_value_sar?: number;
  hs_codes?: string[];
}
