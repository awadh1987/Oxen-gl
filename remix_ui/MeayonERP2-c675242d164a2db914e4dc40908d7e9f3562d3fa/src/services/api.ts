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

		if (includeAuth) {
			const token = localStorage.getItem('meayon_access_token');
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}
		}

		return headers;
	}

	isAuthenticated(): boolean {
		return !!localStorage.getItem('meayon_access_token');
	}

	async login(username: string, password: string): Promise<boolean> {
		const formData = new URLSearchParams();
		formData.append('username', username.trim());
		formData.append('password', password);

		const response = await fetch(`${API_BASE_URL}/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData.toString(),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.detail || 'فشل تسجيل الدخول: بيانات الاعتماد غير صحيحة');
		}

		const data = await response.json();
		if (data.access_token) {
			localStorage.setItem('meayon_access_token', data.access_token);
			const profile = await this.getCurrentUser();
			if (profile) {
				localStorage.setItem('meayon_session_user', JSON.stringify(profile));
			}
			return true;
		}
		return false;
	}

	async getCurrentUser(): Promise<any | null> {
		const token = localStorage.getItem('meayon_access_token');
		if (!token) {
			return null;
		}

		const response = await fetch(`${API_BASE_URL}/api/me`, {
			headers: this.getHeaders(true),
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
		localStorage.removeItem('meayon_access_token');
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