// تحديد الرابط بذكاء: يقرأ من ملف .env أولاً، أو يحدد الرابط تلقائياً.
const getApiBaseUrl = (): string => {
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}

	return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
	private getHeaders(includeAuth: boolean = true): HeadersInit {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		const tenantId = localStorage.getItem('meayon_active_tenant_id') || 'tenant-default-001';
		const licenseKey = localStorage.getItem('meayon_tenant_license_key');
		headers['X-Tenant-Id'] = tenantId;
		if (licenseKey) {
			headers['X-Tenant-License-Key'] = licenseKey;
		}

		return headers;
	}

	isAuthenticated(): boolean {
		return localStorage.getItem('meayon_session_active') === 'true';
	}

	async login(username: string, password: string, tenantId?: string): Promise<boolean> {
		const email = username.trim().toLowerCase();
		if (!email || !password) {
			throw new Error('Email and password are required');
		}

		const activeTenant = tenantId || localStorage.getItem('meayon_active_tenant_id') || 'tenant-default-001';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'X-Tenant-Id': activeTenant,
		};
		const licenseKey = localStorage.getItem('meayon_tenant_license_key');
		if (licenseKey) {
			headers['X-Tenant-License-Key'] = licenseKey;
		}

		const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
			method: 'POST',
			headers,
			credentials: 'include',
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.detail || errorData.message || 'Invalid email or password');
		}

		const data = await response.json();
		if (data.status === 'Active' && data.user) {
			localStorage.setItem('meayon_session_active', 'true');
			if (data.tenant_id) {
				localStorage.setItem('meayon_active_tenant_id', data.tenant_id);
			}
			const profile = await this.getCurrentUser();
			if (profile) {
				localStorage.setItem('meayon_session_user', JSON.stringify(profile));
				if (profile.tenantId) {
					localStorage.setItem('meayon_active_tenant_id', profile.tenantId);
				}
				if (profile.licenseKey) {
					localStorage.setItem('meayon_tenant_license_key', profile.licenseKey);
				}
			}
			return true;
		}
		return false;
	}

	async getCurrentUser(): Promise<any | null> {
		const response = await fetch(`${API_BASE_URL}/api/me`, {
			headers: this.getHeaders(true),
			credentials: 'include',
		});

		if (!response.ok) {
			if (response.status === 401) {
				this.logout();
			}
			return null;
		}

		return response.json();
	}

	logout(): void {
		localStorage.removeItem('meayon_session_active');
		localStorage.removeItem('meayon_session_user');
		localStorage.removeItem('meayon_user');
		window.location.href = '/login';
	}

	async createOperation(operationData: {
		transporter_id: string;
		route: string;
		amount: number;
		client_name: string;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/operations`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(operationData),
		});
		return this.handleResponse(response, 'فشل في تسجيل العملية التشغيلية');
	}

	async getOperations() {
		const response = await fetch(`${API_BASE_URL}/api/operations`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب العمليات');
	}

	async createOperationToJournal(workflowData: {
		transporter_id: string;
		route: string;
		amount: number;
		client_name: string;
		customer_id: string;
		customer_name: string;
		invoice_number: string;
		voucher_type?: string;
		beneficiary: string;
		voucher_number: string;
		description?: string;
		debit_account?: string;
		credit_account?: string;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/workflows/operation-to-journal`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(workflowData),
		});
		return this.handleResponse(response, 'فشل في إنشاء دورة العملية المالية');
	}

	async getWorkflowRecords() {
		const response = await fetch(`${API_BASE_URL}/api/workflow-records`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في تحميل سجلات دورة العمليات');
	}

	async createVoucher(voucherData: {
		voucher_type: string;
		voucher_number: string;
		beneficiary: string;
		amount: number;
		status?: string;
		notes?: string;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/vouchers`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(voucherData),
		});
		return this.handleResponse(response, 'فشل في حفظ السند المالي');
	}

	async createJournalEntry(journalData: {
		entry_number: string;
		reference_type?: string;
		reference_id?: string;
		description: string;
		status?: string;
		lines: Array<{ account: string; debit: number; credit: number; description?: string }>;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/journal-entries`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(journalData),
		});
		return this.handleResponse(response, 'فشل في حفظ القيد المحاسبي');
	}

	async approveVoucher(voucherId: string, notes?: string) {
		const response = await fetch(`${API_BASE_URL}/api/vouchers/${voucherId}/approve`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ notes }),
		});
		return this.handleResponse(response, 'فشل في اعتماد السند المالي');
	}

	async cancelVoucher(voucherId: string) {
		const response = await fetch(`${API_BASE_URL}/api/vouchers/${voucherId}/cancel`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في إلغاء السند المالي');
	}

	async updateVoucher(voucherId: string, updates: { beneficiary?: string; amount?: number; notes?: string }) {
		const response = await fetch(`${API_BASE_URL}/api/vouchers/${voucherId}`, {
			method: 'PATCH',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});
		return this.handleResponse(response, 'فشل في تحديث السند المالي');
	}

	async postJournalEntry(journalId: string) {
		const response = await fetch(`${API_BASE_URL}/api/journal-entries/${journalId}/post`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في ترحيل القيد المحاسبي');
	}

	async reverseJournalEntry(journalId: string) {
		const response = await fetch(`${API_BASE_URL}/api/journal-entries/${journalId}/reverse`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في عكس القيد المحاسبي');
	}

	async updateJournalEntry(journalId: string, updates: { description?: string; reference_id?: string; lines?: Array<{ account: string; debit: number; credit: number; description?: string }> }) {
		const response = await fetch(`${API_BASE_URL}/api/journal-entries/${journalId}`, {
			method: 'PATCH',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});
		return this.handleResponse(response, 'فشل في تحديث القيد المحاسبي');
	}

	async createInvoice(invoiceData: { invoice_number: string; customer_id: string; customer_name: string; subtotal: number; vat_amount: number; grand_total: number; status?: string }) {
		const response = await fetch(`${API_BASE_URL}/api/invoices`, {
			method: 'POST', headers: this.getHeaders(), body: JSON.stringify(invoiceData),
		});
		return this.handleResponse(response, 'فشل في حفظ الفاتورة');
	}

	async approveInvoice(invoiceId: string) {
		const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/approve`, { method: 'POST', headers: this.getHeaders() });
		return this.handleResponse(response, 'فشل في اعتماد الفاتورة');
	}

	async issueInvoice(invoiceId: string) {
		const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/issue`, { method: 'POST', headers: this.getHeaders() });
		return this.handleResponse(response, 'فشل في إصدار الفاتورة');
	}

	async payInvoice(invoiceId: string) {
		const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/pay`, { method: 'POST', headers: this.getHeaders() });
		return this.handleResponse(response, 'فشل في تسجيل سداد الفاتورة');
	}

	async getOverdueInvoices() {
		const response = await fetch(`${API_BASE_URL}/api/reports/overdue-invoices`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب تقرير الفواتير المتأخرة');
	}

	async triggerInventorySalesHook(payload: {
		item_id: string;
		warehouse_id: string;
		quantity: number;
		unit_price: number;
		cost_price: number;
		customer_id?: string;
		customer_name?: string;
		reference_doc?: string;
		cost_center?: string;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/inventory/sales-hook`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(payload),
		});
		return this.handleResponse(response, 'فشل في تنفيذ خطاف مبيعات المخزون والقيد الرباعي');
	}

	async addTripWithJournalMatrix(tripData: {
		truck_no: string;
		transporter_name: string;
		loading_source: string;
		destination_customer: string;
		material_type: string;
		qty_loaded: number;
		qty_delivered: number;
		sales_price_per_ton: number;
		purchases_cost_per_ton: number;
		scale_ticket_no?: string;
		loading_invoice_no?: string;
		receipt_invoice_no?: string;
		cost_center?: string;
		notes?: string;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/operations/add-trip`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(tripData),
		});
		return this.handleResponse(response, 'فشل في تسجيل تذكرة الرحلة وتوليد القيد الخماسي');
	}

	async executeIntercompanyTrade(tradeData: {
		source_branch_id?: string;
		target_branch_id?: string;
		origin_company_id?: string;
		target_company_id?: string;
		trade_amount?: number;
		amount?: number;
		origin_cost_center_id?: string;
		target_cost_center_id?: string;
		clearing_account?: string;
		target_clearing_account?: string;
		revenue_account?: string;
		expense_account?: string;
		trade_date?: string;
		reference_no?: string;
		reference_id?: string;
		notes?: string;
		description?: string;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/operations/intercompany-trade`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(tradeData),
		});
		return this.handleResponse(response, 'فشل في تسجيل عملية المقاصة بين الفروع');
	}

	async getIntercompanyTrades() {
		const response = await fetch(`${API_BASE_URL}/api/operations/intercompany-trade`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب سجلات التجارة البينية');
	}

	async approveIntercompanyTrade(tradeId: string) {
		const response = await fetch(`${API_BASE_URL}/api/operations/intercompany-trade/${tradeId}/approve`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في اعتماد عملية المقاصة وترحيلها لدفتر الأستاذ');
	}

	async getIntercompanyConsolidation() {
		const response = await fetch(`${API_BASE_URL}/api/finance/intercompany/consolidation`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب تقرير توحيد الفروع والمقاصة المجمعة');
	}

	async reconcileBankStatement(payload: {
		account_id: string;
		statement_currency: string;
		exchange_rate: number;
		tolerance_threshold: number;
		transactions: Array<{
			id?: string;
			date: string;
			amount: number;
			type: 'Credit' | 'Debit';
			reference: string;
			matched_voucher_id?: string;
		}>;
	}) {
		const response = await fetch(`${API_BASE_URL}/api/finance/bank-reconciliation/multi-currency`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(payload),
		});
		return this.handleResponse(response, 'فشل في إجراء التسوية البنكية');
	}

	async getBankReconciliations() {
		const response = await fetch(`${API_BASE_URL}/api/finance/bank-reconciliation/multi-currency`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب التسويات البنكية');
	}

	async getDbOptimizationCheck() {
		const response = await fetch(`${API_BASE_URL}/api/admin/db/optimize-check`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في فحص أداء وفهارس النظام');
	}

	async getInvoices() {
		const response = await fetch(`${API_BASE_URL}/api/invoices`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب الفواتير');
	}

	async getUserRegistrations() {
		const response = await fetch(`${API_BASE_URL}/api/user-registrations`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب طلبات تسجيل المستخدمين');
	}

	async approveUserRegistration(id: string, assignedRole?: string) {
		const response = await fetch(`${API_BASE_URL}/api/user-registrations/${id}/approve`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ assigned_role: assignedRole }),
		});
		return this.handleResponse(response, 'فشل في اعتماد طلب التسجيل');
	}

	async rejectUserRegistration(id: string, notes?: string) {
		const response = await fetch(`${API_BASE_URL}/api/user-registrations/${id}/reject`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ notes }),
		});
		return this.handleResponse(response, 'فشل في رفض طلب التسجيل');
	}

	async getSystemSettings(licenseKey?: string) {
		const url = licenseKey
			? `${API_BASE_URL}/api/system/settings?tenant_license_key=${encodeURIComponent(licenseKey)}`
			: `${API_BASE_URL}/api/system/settings`;
		const response = await fetch(url, {
			headers: this.getHeaders(false),
		});
		return this.handleResponse(response, 'فشل في جلب إعدادات النظام');
	}

	async issueSaaSLicense(
		licensePayload: {
			company_name: string;
			subscription_tier?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
			max_allowed_cost_centers?: number;
			ui_theme_mode?: string;
			ui_primary_color?: string;
			ui_secondary_color?: string;
			ui_font_family?: string;
			ui_logo_url?: string | null;
			expires_in_days?: number;
		},
		superAdminKey: string
	) {
		const response = await fetch(`${API_BASE_URL}/api/saas/issue-license`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-System-SuperAdmin': superAdminKey,
			},
			body: JSON.stringify(licensePayload),
		});
		return this.handleResponse(response, 'فشل في إصدار ترخيص المؤسسة');
	}

	async getCostCenters() {
		const response = await fetch(`${API_BASE_URL}/api/cost-centers`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب مراكز التكلفة');
	}

	async createCostCenter(costCenter: { code: string; nameAr: string; nameEn?: string }) {
		const response = await fetch(`${API_BASE_URL}/api/cost-centers`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(costCenter),
		});
		return this.handleResponse(response, 'فشل في إضافة مركز التكلفة');
	}

	// --- Master Data (Customers, Transporters, Crushers) ---
	async getCustomers() {
		const response = await fetch(`${API_BASE_URL}/api/customers`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب قائمة العملاء');
	}

	async createCustomer(customer: any) {
		const response = await fetch(`${API_BASE_URL}/api/customers`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(customer),
		});
		return this.handleResponse(response, 'فشل في حفظ العميل');
	}

	async getTransporters() {
		const response = await fetch(`${API_BASE_URL}/api/transporters`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب قائمة الناقلين');
	}

	async createTransporter(transporter: any) {
		const response = await fetch(`${API_BASE_URL}/api/transporters`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(transporter),
		});
		return this.handleResponse(response, 'فشل في حفظ الناقل');
	}

	async getCrushers() {
		const response = await fetch(`${API_BASE_URL}/api/crushers`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب قائمة الكسارات');
	}

	async createCrusher(crusher: any) {
		const response = await fetch(`${API_BASE_URL}/api/crushers`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(crusher),
		});
		return this.handleResponse(response, 'فشل في حفظ الكسارة');
	}

	// --- FIFO Inventory Layers ---
	async getInventoryLayers() {
		const response = await fetch(`${API_BASE_URL}/api/inventory/layers`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب طبقات المخزون (FIFO)');
	}

	async createInventoryLayer(layer: any) {
		const response = await fetch(`${API_BASE_URL}/api/inventory/layers`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(layer),
		});
		return this.handleResponse(response, 'فشل في تسجيل دفعة المخزون');
	}

	// --- Fixed Assets & Depreciation ---
	async getFixedAssets() {
		const response = await fetch(`${API_BASE_URL}/api/finance/fixed-assets`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب الأصول الثابتة');
	}

	async createFixedAsset(asset: any) {
		const response = await fetch(`${API_BASE_URL}/api/finance/fixed-assets`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(asset),
		});
		return this.handleResponse(response, 'فشل في تسجيل الأصل الثابت');
	}

	async runFixedAssetDepreciation() {
		const response = await fetch(`${API_BASE_URL}/api/finance/fixed-assets/run-depreciation`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في تشغيل الإهلاك الشهري للأصول');
	}

	// --- Employee Contracts & Payroll ---
	async getEmployeeContracts() {
		const response = await fetch(`${API_BASE_URL}/api/finance/employee-contracts`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب عقود الموظفين');
	}

	async createEmployeeContract(contract: any) {
		const response = await fetch(`${API_BASE_URL}/api/finance/employee-contracts`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(contract),
		});
		return this.handleResponse(response, 'فشل في تسجيل عقد الموظف');
	}

	async processMonthlyPayroll() {
		const response = await fetch(`${API_BASE_URL}/api/finance/payroll/process-monthly`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في ترحيل مسير الرواتب الشهري');
	}

	// --- Fiscal Year-End Close ---
	async getFiscalPeriods() {
		const response = await fetch(`${API_BASE_URL}/api/finance/fiscal-periods`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب الفترات المالية');
	}

	async closeFiscalYear(year: number) {
		const response = await fetch(`${API_BASE_URL}/api/finance/year-end-close/${year}`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, `فشل في إقفال السنة المالية ${year}`);
	}

	// --- Public Shared Invoices ---
	async generatePublicInvoiceLink(invoiceId: string) {
		const response = await fetch(`${API_BASE_URL}/api/invoices/generate-public-link/${invoiceId}`, {
			method: 'POST',
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في توليد رابط الفاتورة الآمن');
	}

	async getPublicInvoiceData(token: string) {
		const response = await fetch(`${API_BASE_URL}/api/public/invoice-data/${token}`, {
			headers: this.getHeaders(false),
		});
		return this.handleResponse(response, 'فشل في جلب بيانات الفاتورة العامة');
	}

	// --- WAF Threat Intelligence ---
	async getWafThreats() {
		const response = await fetch(`${API_BASE_URL}/api/admin/waf-threats`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب تقرير أمان جدار الحماية WAF');
	}

	// --- Dashboard BI Summaries ---
	async getDashboardSummaryCards() {
		const response = await fetch(`${API_BASE_URL}/api/dashboard/summary-cards`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب إحصائيات لوحة التحكم');
	}

	// --- Multi-Tenant Platform Management ---
	async getTenants() {
		const response = await fetch(`${API_BASE_URL}/api/platform/tenants`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب قائمة المستأجرين والشركات');
	}

	async createTenant(tenantData: any) {
		const response = await fetch(`${API_BASE_URL}/api/platform/tenants`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(tenantData),
		});
		return this.handleResponse(response, 'فشل في إضافة وتسجيل المنشأة');
	}

	async updateTenant(tenantId: string, tenantData: any) {
		const response = await fetch(`${API_BASE_URL}/api/platform/tenants/${tenantId}`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: JSON.stringify(tenantData),
		});
		return this.handleResponse(response, 'فشل في تحديث بيانات المنشأة');
	}

	async getCurrentTenant() {
		const response = await fetch(`${API_BASE_URL}/api/tenant/current`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب بيانات المنشأة النشطة');
	}

	async getSubscriptionPlans() {
		const response = await fetch(`${API_BASE_URL}/api/platform/subscription-plans`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في جلب باقات وخطط الاشتراك');
	}

	async getMultiTenantAuditCheck() {
		const response = await fetch(`${API_BASE_URL}/api/system/multi-tenant/audit-check`, {
			headers: this.getHeaders(),
		});
		return this.handleResponse(response, 'فشل في فحص عزل المستأجرين والتحقق من النظام');
	}

	private async handleResponse(response: Response, defaultMessage: string) {
		if (response.status === 401) {
			this.logout();
			throw new Error('انتهت الجلسة، يرجى إعادة تسجيل الدخول');
		}

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.detail || defaultMessage);
		}

		return response.json();
	}
}

export const apiService = new ApiService();