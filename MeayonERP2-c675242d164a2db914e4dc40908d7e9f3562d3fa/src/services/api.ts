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
  weighed_in_at: string;
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
  user: {
    id: string;
    email: string;
    fullName: string;
    fullNameAr: string;
    role: 'Super_Admin' | 'Admin' | 'COO' | 'Accountant' | 'Data_Entry' | 'Guest';
    status: 'Active' | 'Pending';
    company_id: string | null;
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
interface Product { id: string; sku: string; name: string; }

const apiBaseUrl = typeof window === 'undefined' ? '' : window.location.origin;

async function request<T>(path: string, companyId?: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(companyId ? { 'X-Company-ID': companyId } : {}), ...options?.headers },
    credentials: 'include',
    ...options,
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
      }
    } catch {}
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
  getCompanies: () => request<ApiCompany[]>('/api/companies'),
  getCompany: (companyId: string) => request<ApiCompany>(`/api/companies/${companyId}`, companyId),
  updateCompany: (companyId: string, payload: CompanyUpdatePayload) => request<ApiCompany>(`/api/companies/${companyId}`, companyId, { method: 'PATCH', body: JSON.stringify(payload) }),
  login: (payload: NativeLoginPayload) => request<NativeAuthResponse>('/api/auth/verify', undefined, { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ message: string }>('/api/auth/logout', undefined, { method: 'POST' }),
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
  getAccountingMoves: (companyId: string) => request<ApiAccountMove[]>('/api/accounting/moves', companyId),
  getSettlements: (companyId: string) => request<ApiSettlement[]>('/api/settlements', companyId),
  getPartners: (companyId: string) => request<Partner[]>('/api/partners', companyId),
  createPartner: (companyId: string, payload: PartnerPayload) => request<Partner>('/api/partners', companyId, { method: 'POST', body: JSON.stringify(payload) }),
  updatePartner: (companyId: string, partnerId: string, payload: Partial<PartnerPayload>) => request<Partner>(`/api/partners/${partnerId}`, companyId, { method: 'PATCH', body: JSON.stringify(payload) }),
  archivePartner: (companyId: string, partnerId: string) => request<void>(`/api/partners/${partnerId}`, companyId, { method: 'DELETE' }),
  async createWeighbridgeOperation(input: {
    companyId: string;
    transporterName: string;
    materialName: string;
    sourceName: string;
    destinationName: string;
    truckNumber: string;
    grossWeight: number;
    tareWeight: number;
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
      }),
    });
  },
};