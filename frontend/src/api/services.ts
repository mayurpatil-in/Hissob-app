import apiClient from './client';

export interface FinancialYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  is_current: boolean;
  opening_balance: number;
  closing_balance: number;
}

export interface Festival {
  id: string;
  financial_year_id: string;
  name: string;
  deity?: string;
  location?: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: string;
}

export interface Donor {
  id: string;
  donor_number?: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  is_80g_eligible: boolean;
  is_vip: boolean;
  total_donations: number;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  donor_id: string;
  amount: number;
  payment_mode: string;
  status: string;
  purpose?: string;
  donor?: Donor;
}

export interface Expense {
  id: string;
  expense_number: string;
  expense_date: string;
  category: string;
  vendor_name?: string;
  amount: number;
  description?: string;
  status: string;
  requested_by_name?: string;
  bill_url?: string;
  voucher_number?: string;
  financial_year_id?: string;
}

export interface DailyCollection {
  date: string;
  total_amount: number;
  receipt_count: number;
  cash_amount: number;
  upi_amount: number;
  cheque_amount: number;
  other_amount: number;
}

export interface CashBookEntry {
  date: string;
  voucher_number: string;
  entry_type: string;
  particulars: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

export interface AuditLog {
  id: string;
  user_email?: string;
  action: string;
  module: string;
  record_label?: string;
  ip_address?: string;
  old_values?: unknown;
  new_values?: unknown;
  notes?: string;
  created_at: string;
}

export interface CreateReceiptData {
  donor_id: string;
  amount: number;
  payment_mode: string;
  financial_year_id?: string;
  festival_id?: string;
  receipt_date?: string;
  purpose?: string;
  notes?: string;
  upi_reference?: string;
  cheque_number?: string;
  bank_name?: string;
}

export interface CreateExpenseData {
  category: string;
  amount: number;
  vendor_name?: string;
  description?: string;
  expense_date?: string;
  financial_year_id?: string;
  festival_id?: string;
  voucher_number?: string;
  bill_url?: string;
}

export interface CreateDonorData {
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  area_id?: string;
  is_80g_eligible?: boolean;
  is_vip?: boolean;
  notes?: string;
}

export interface CreateFestivalData {
  name: string;
  financial_year_id: string;
  start_date: string;
  end_date: string;
  budget?: number;
  deity?: string;
  location?: string;
}

export interface CashSettlementData {
  financial_year_id?: string;
  festival_id?: string;
  receipt_ids: string[];
  settlement_date?: string;
  notes?: string;
}

// ── Financial Year API ──
export const getFinancialYears = async () => (await apiClient.get<FinancialYear[]>('/financial-years')).data;
export const createFinancialYear = async (data: Record<string, unknown>) => (await apiClient.post<FinancialYear>('/financial-years', data)).data;
export const setFYActive = async (id: string) => (await apiClient.post<FinancialYear>(`/financial-years/${id}/set-current`)).data;

export const getFestivals = async (fy_id?: string) => (await apiClient.get<Festival[]>('/festivals', { params: { fy_id } })).data;
export const createFestival = async (data: CreateFestivalData) => (await apiClient.post<Festival>('/festivals', data)).data;
export const updateFestival = async ({ id, data }: { id: string; data: Partial<CreateFestivalData> }) => (await apiClient.put<Festival>(`/festivals/${id}`, data)).data;
export const deleteFestival = async (id: string) => (await apiClient.delete<{ message: string }>(`/festivals/${id}`)).data;

// ── Donor API ──
export const getDonors = async (q?: string) => (await apiClient.get<Donor[]>('/donors', { params: { q } })).data;
export const createDonor = async (data: CreateDonorData) => (await apiClient.post<Donor>('/donors', data)).data;
export const updateDonor = async ({ id, data }: { id: string; data: Partial<CreateDonorData> }) => (await apiClient.put<Donor>(`/donors/${id}`, data)).data;
export const deleteDonor = async (id: string) => (await apiClient.delete<{ message: string }>(`/donors/${id}`)).data;
export const getDonorSummary = async (id: string) => (await apiClient.get<any>(`/donors/${id}/summary`)).data;

// ── Receipt API ──
export const getReceipts = async (params?: Record<string, unknown>) => (await apiClient.get<Receipt[]>('/receipts', { params })).data;
export const createReceipt = async (data: CreateReceiptData) => (await apiClient.post<Receipt>('/receipts', data)).data;
export const updateReceipt = async (id: string, data: Partial<CreateReceiptData>) => (await apiClient.put<Receipt>(`/receipts/${id}`, data)).data;
export const cancelReceipt = async (id: string, reason?: string) => (await apiClient.post<Receipt>(`/receipts/${id}/cancel`, { reason: reason || 'Cancelled by user' })).data;
export const deleteReceipt = async (id: string) => (await apiClient.delete(`/receipts/${id}`)).data;
export const settleReceipt = async (id: string, data?: Record<string, unknown>) => (await apiClient.post<Receipt>(`/receipts/${id}/settle`, data)).data;

// Public Verification (No Auth Required)
export const verifyPublicReceipt = async (id: string) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/receipts/public/${id}/verify`);
  if (!response.ok) {
    let errMsg = 'Receipt verification failed';
    try {
      const errData = await response.json();
      if (errData.detail) errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
    } catch (e) {
      // Ignore JSON parse error if response is not JSON
    }
    throw new Error(errMsg);
  }
  return response.json();
};

export const getCollectorDailySummary = async (params?: any) => (await apiClient.get<any>('/receipts/daily-summary', { params })).data;

// ── Expense API ──
export const getExpenses = async (params?: any) => (await apiClient.get<Expense[]>('/expenses', { params })).data;
export const createExpense = async (data: any) => (await apiClient.post<Expense>('/expenses', data)).data;
export const updateExpense = async (id: string, data: any) => (await apiClient.put<Expense>(`/expenses/${id}`, data)).data;
export const deleteExpense = async (id: string) => (await apiClient.delete(`/expenses/${id}`)).data;
export const approveExpense = async (id: string, action: string, rejection_reason?: string) => (await apiClient.post<Expense>(`/expenses/${id}/approve`, { action, rejection_reason })).data;
export const uploadExpenseBill = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await apiClient.post<{ url: string; filename: string }>('/expenses/upload-bill', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};
export const attachExpenseBill = async (expenseId: string, billUrl: string) =>
  (await apiClient.post<Expense>(`/expenses/${expenseId}/attach-bill`, { bill_url: billUrl })).data;

// ── Reports API ──
export const getDailyCollectionReport = async () => (await apiClient.get<DailyCollection[]>('/reports/daily-collection')).data;
export const getCashBookReport = async (fy_id?: string) => (await apiClient.get<CashBookEntry[]>('/reports/cash-book', { params: { fy_id } })).data;
export const getIncomeExpenseReport = async (fy_id?: string) => (await apiClient.get<any>('/reports/income-expense', { params: { fy_id } })).data;
export const runCustomReport = async (payload: any) => (await apiClient.post<any>('/reports/custom', payload)).data;
export const exportCustomReport = async (payload: any) => {
  const response = await apiClient.post('/reports/custom/export', payload, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `custom_report_${payload.entity || 'data'}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ── Audit Log API ──
export interface ActivityFeedItem {
  id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string | null;
  story: string;
  action: string;
  module: string;
  created_at: string;
  time_ago: string;
}

export const getAuditLogs = async (module?: string) => (await apiClient.get<AuditLog[]>('/audit', { params: { module } })).data;
export const getActivityFeed = async (module?: string, limit: number = 20) =>
  (await apiClient.get<ActivityFeedItem[]>('/audit/feed', { params: { module, limit } })).data;

// ── Super Admin & Organizations API ──
export const getSuperAdminStats = async () => (await apiClient.get<any>('/super-admin/dashboard-stats')).data;
export const getOrganizations = async () => (await apiClient.get<any[]>('/organizations')).data;
export const createOrganization = async (data: any) => (await apiClient.post<any>('/organizations', data)).data;
export const updateOrganization = async ({ id, data }: { id: string; data: any }) => (await apiClient.put<any>(`/organizations/${id}`, data)).data;

export const getMyOrganization = async () => (await apiClient.get<any>('/organizations/my-org')).data;
export const updateMyOrganization = async (data: any) => (await apiClient.put<any>('/organizations/my-org', data)).data;

// ── File Upload API ──
export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await apiClient.post<{ url: string }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};

// ── AI Engine API ──
export const getAIInsights = async () => (await apiClient.get<any>('/ai/insights')).data;
export const parseAIReceipt = async (text: string) => (await apiClient.post<any>('/ai/parse-receipt', { text })).data;

// ── Cash Settlement API ──
export const getSettlements = async (params?: any) => (await apiClient.get<any[]>('/settlements', { params })).data;
export const submitSettlement = async (data: any) => (await apiClient.post<any>('/settlements', data)).data;
export const verifySettlement = async (id: string, action: string, rejection_reason?: string, notes?: string) => (await apiClient.post<any>(`/settlements/${id}/verify`, { action, rejection_reason, notes })).data;

// ── User Management API ──
export const getUsers = async () => (await apiClient.get<any[]>('/users')).data;
export const createUser = async (data: any) => (await apiClient.post<any>('/users', data)).data;
export const updateUser = async (id: string, data: any) => (await apiClient.put<any>(`/users/${id}`, data)).data;
export const deleteUser = async (id: string) => (await apiClient.delete<any>(`/users/${id}`)).data;

// ── Dashboard API ──
export const getDashboardSummary = async () => (await apiClient.get<any>('/dashboard/summary')).data;

// ── Notifications API ──
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  related_module?: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationResponse {
  unread_count: number;
  notifications: NotificationItem[];
}

export const getNotifications = async (): Promise<NotificationResponse> =>
  (await apiClient.get<NotificationResponse>('/notifications')).data;

export const markNotificationRead = async (id: string): Promise<NotificationItem> =>
  (await apiClient.post<NotificationItem>(`/notifications/${id}/read`)).data;

export const markAllNotificationsRead = async (): Promise<void> =>
  (await apiClient.post('/notifications/read-all')).data;

// ── Public UPI Payment Services ──
export const getPublicOrgInfo = async (slugOrId?: string) => {
  const url = slugOrId ? `/organizations/public/info/${slugOrId}` : '/organizations/public/info';
  return (await apiClient.get<any>(url)).data;
};

export const submitPublicDonation = async (payload: any) =>
  (await apiClient.post<any>('/receipts/public-donate', payload)).data;

export const lookupPublicDonor = async (phone: string, slugOrId?: string) =>
  (await apiClient.get<any>('/receipts/public-donor-lookup', { params: { phone, slug_or_id: slugOrId } })).data;

// ── AI LLM Assistant Services ──
export interface AIChatResponse {
  question: string;
  answer: string;
  suggested_followups: string[];
  generated_at: string;
  is_llm_powered: boolean;
  ai_provider?: string;
}


export const chatWithAI = async (question: string): Promise<AIChatResponse> =>
  (await apiClient.post<AIChatResponse>('/ai/chat', { question })).data;

// ── AI Audit & Report Services ──
export interface AuditFinding {
  category: string;
  severity: string;
  title: string;
  description: string;
  suggestion: string;
  affected_records: string[];
}

export interface AIAuditResponse {
  generated_at: string;
  tenant_name?: string;
  total_findings: number;
  high_count: number;
  medium_count: number;
  info_count: number;
  health_score: number;
  findings: AuditFinding[];
}

export interface AIReportResponse {
  generated_at: string;
  tenant_name?: string;
  report_text: string;
  ai_provider?: string;
  is_llm_powered: boolean;
}

export const runAIAudit = async (): Promise<AIAuditResponse> =>
  (await apiClient.post<AIAuditResponse>('/ai/audit')).data;

export const getAIExecutiveReport = async (): Promise<AIReportResponse> =>
  (await apiClient.get<AIReportResponse>('/ai/executive-report')).data;
