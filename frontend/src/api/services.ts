import apiClient from './client';

export function formatErrorMessage(detail: any, fallback: string = 'An error occurred'): string {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const field = Array.isArray(item.loc) ? item.loc.filter((l: any) => l !== 'body').join('.') : '';
          const msg = item.msg || item.message || JSON.stringify(item);
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .join(' | ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || detail.detail || JSON.stringify(detail);
  }
  return String(detail);
}

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


export interface AIChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

export const chatWithAI = async (question: string, history: AIChatMessageItem[] = []): Promise<AIChatResponse> =>
  (await apiClient.post<AIChatResponse>('/ai/chat', { question, history })).data;

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

// ── Email & Diagnostics Services ──
export interface EmailReportPayload {
  recipients: string[];
  report_title: string;
  report_type: string;
  custom_message?: string;
  custom_report_request?: any;
  start_date?: string;
  end_date?: string;
  fy_id?: string;
}

export interface EmailLogItem {
  id: string;
  tenant_id?: string;
  recipient: string;
  subject: string;
  email_type: string;
  status: string;
  error_message?: string;
  metadata_json?: any;
  sent_at: string;
}

export const emailFinancialReport = async (payload: EmailReportPayload) =>
  (await apiClient.post<{ status: string; total_recipients: number; sent_count: number; failed_count: number; message: string }>('/reports/email', payload)).data;

export const testSmtpConnection = async (target_email?: string) =>
  (await apiClient.post<{ success: boolean; message: string; smtp_host: string; smtp_port: number; error?: string }>('/email-logs/test-smtp', { target_email })).data;

export const getEmailLogs = async (params?: { email_type?: string; status?: string; limit?: number }) =>
  (await apiClient.get<EmailLogItem[]>('/email-logs', { params })).data;

export const resendEmailLog = async (logId: string) =>
  (await apiClient.post<{ status: string; message: string }>(`/email-logs/${logId}/resend`)).data;

// ── Inventory & Physical Asset Services ──
export interface AssetCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Asset {
  id: string;
  category_id: string;
  festival_id?: string;
  name: string;
  asset_code: string;
  quantity_total: number;
  quantity_available: number;
  unit: string;
  condition: 'new' | 'good' | 'fair' | 'damaged' | 'under_repair';
  storage_location?: string;
  estimated_value: number;
  purchase_date?: string;
  notes?: string;
  is_active: boolean;
  category?: AssetCategory;
  created_at: string;
}

export interface AssetCheckout {
  id: string;
  asset_id: string;
  action_type: 'checkout' | 'return' | 'maintenance' | 'damage_report';
  quantity: number;
  issued_to_person: string;
  issued_by_user_id: string;
  issued_by_name?: string;
  issued_at: string;
  expected_return_at?: string;
  returned_at?: string;
  returned_condition?: string;
  damage_notes?: string;
  damage_charge: number;
  status: 'issued' | 'returned' | 'overdue' | 'damaged' | 'lost';
  asset?: Asset;
  created_at: string;
}

export interface InventorySummary {
  total_assets_count: number;
  total_items_quantity: number;
  total_estimated_value: number;
  active_checkouts_count: number;
  damaged_repair_count: number;
}

export const getAssetCategories = async () =>
  (await apiClient.get<AssetCategory[]>('/inventory/categories')).data;

export const createAssetCategory = async (payload: { name: string; code?: string; description?: string }) =>
  (await apiClient.post<AssetCategory>('/inventory/categories', payload)).data;

export const getAssets = async (params?: { category_id?: string; festival_id?: string; condition?: string; search?: string }) =>
  (await apiClient.get<Asset[]>('/inventory/assets', { params })).data;

export const createAsset = async (payload: Partial<Asset>) =>
  (await apiClient.post<Asset>('/inventory/assets', payload)).data;

export const updateAsset = async (id: string, payload: Partial<Asset>) =>
  (await apiClient.put<Asset>(`/inventory/assets/${id}`, payload)).data;

export const deleteAsset = async (id: string) =>
  (await apiClient.delete<{ message: string }>(`/inventory/assets/${id}`)).data;

export const checkoutAsset = async (payload: { asset_id: string; quantity: number; issued_to_person: string; expected_return_at?: string; notes?: string }) =>
  (await apiClient.post<AssetCheckout>('/inventory/checkout', payload)).data;

export const returnAsset = async (payload: { checkout_id: string; returned_condition: string; damage_notes?: string; damage_charge?: number }) =>
  (await apiClient.post<AssetCheckout>('/inventory/return', payload)).data;

export const getAssetCheckouts = async (params?: { asset_id?: string; status?: string }) =>
  (await apiClient.get<AssetCheckout[]>('/inventory/checkouts', { params })).data;

export const getInventorySummary = async () =>
  (await apiClient.get<InventorySummary>('/inventory/summary')).data;

// ── AI Vision OCR Bill Scanner ──
export interface ParsedBillOutput {
  vendor_name?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  invoice_number?: string;
  description?: string;
  line_items?: Array<{ item?: string; qty?: number; amount?: number }>;
  confidence_score: number;
  bill_url?: string;
  is_llm_parsed: boolean;
}

export const scanVendorBillOCR = async (file: File): Promise<ParsedBillOutput> => {
  const formData = new FormData();
  formData.append('file', file);
  return (await apiClient.post<ParsedBillOutput>('/ai/parse-bill-ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};

// ── Festival Planning Suite APIs ──
export interface FestivalTask {
  id: string;
  festival_id: string;
  title: string;
  category: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  created_at: string;
}

export interface FestivalBudgetAllocation {
  id: string;
  festival_id: string;
  category_name: string;
  allocated_amount: number;
  actual_spent: number;
  notes?: string;
  created_at: string;
}

export interface VolunteerShift {
  id: string;
  festival_id: string;
  shift_name: string;
  duty_zone: string;
  start_time: string;
  end_time: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface FestivalEventSchedule {
  id: string;
  festival_id: string;
  title: string;
  event_type: 'aarti' | 'pooja' | 'cultural' | 'blood_donation' | 'annoutsav' | 'other';
  event_date: string;
  start_time?: string;
  end_time?: string;
  yajman_name?: string;
  description?: string;
  location?: string;
  created_at: string;
}

export interface PlanningSummary {
  festival_id: string;
  festival_name: string;
  total_tasks: number;
  completed_tasks: number;
  task_completion_percentage: number;
  total_allocated_budget: number;
  total_spent_budget: number;
  budget_utilization_percentage: number;
  total_shifts: number;
  filled_shifts: number;
  total_events: number;
}

export const getPlanningSummary = async (festivalId: string) =>
  (await apiClient.get<PlanningSummary>(`/planning/summary/${festivalId}`)).data;

export const getFestivalTasks = async (params: { festival_id: string; status?: string; priority?: string; category?: string }) =>
  (await apiClient.get<FestivalTask[]>('/planning/tasks', { params })).data;

export const createFestivalTask = async (payload: Partial<FestivalTask>) =>
  (await apiClient.post<FestivalTask>('/planning/tasks', payload)).data;

export const updateFestivalTask = async (id: string, payload: Partial<FestivalTask>) =>
  (await apiClient.put<FestivalTask>(`/planning/tasks/${id}`, payload)).data;

export const deleteFestivalTask = async (id: string) =>
  (await apiClient.delete<{ message: string }>(`/planning/tasks/${id}`)).data;

export const getFestivalBudgets = async (festivalId: string) =>
  (await apiClient.get<FestivalBudgetAllocation[]>('/planning/budgets', { params: { festival_id: festivalId } })).data;

export const createFestivalBudget = async (payload: Partial<FestivalBudgetAllocation>) =>
  (await apiClient.post<FestivalBudgetAllocation>('/planning/budgets', payload)).data;

export const updateFestivalBudget = async (id: string, payload: Partial<FestivalBudgetAllocation>) =>
  (await apiClient.put<FestivalBudgetAllocation>(`/planning/budgets/${id}`, payload)).data;

export const deleteFestivalBudget = async (id: string) =>
  (await apiClient.delete<{ message: string }>(`/planning/budgets/${id}`)).data;

export const getVolunteerShifts = async (params: { festival_id: string; duty_zone?: string; status?: string }) =>
  (await apiClient.get<VolunteerShift[]>('/planning/shifts', { params })).data;

export const createVolunteerShift = async (payload: Partial<VolunteerShift>) =>
  (await apiClient.post<VolunteerShift>('/planning/shifts', payload)).data;

export const updateVolunteerShift = async (id: string, payload: Partial<VolunteerShift>) =>
  (await apiClient.put<VolunteerShift>(`/planning/shifts/${id}`, payload)).data;

export const deleteVolunteerShift = async (id: string) =>
  (await apiClient.delete<{ message: string }>(`/planning/shifts/${id}`)).data;

export const getEventSchedules = async (params: { festival_id: string; event_type?: string }) =>
  (await apiClient.get<FestivalEventSchedule[]>('/planning/schedules', { params })).data;

export const createEventSchedule = async (payload: Partial<FestivalEventSchedule>) =>
  (await apiClient.post<FestivalEventSchedule>('/planning/schedules', payload)).data;

export const updateEventSchedule = async (id: string, payload: Partial<FestivalEventSchedule>) =>
  (await apiClient.put<FestivalEventSchedule>(`/planning/schedules/${id}`, payload)).data;

export const deleteEventSchedule = async (id: string) =>
  (await apiClient.delete<{ message: string }>(`/planning/schedules/${id}`)).data;

export const getPublicFestivalSchedule = async (festivalId: string) =>
  (await apiClient.get<any>(`/planning/public/schedule/${festivalId}`)).data;

export const submitPublicYajmanRequest = async (payload: any) =>
  (await apiClient.post<any>('/planning/public/yajman-request', payload)).data;

// ─── Razorpay Online Payment Gateway Services ───
export const getRazorpayConfig = async () =>
  (await apiClient.get<{ key_id: string; enabled: boolean; mode: string }>('/payments/razorpay/config')).data;

export const createRazorpayOrder = async (payload: {
  amount: number;
  currency?: string;
  donor_name?: string;
  donor_phone?: string;
  donor_email?: string;
  purpose?: string;
  slug_or_id?: string;
}) => (await apiClient.post<{ order_id: string; amount: number; currency: string; key_id: string; is_mock?: boolean }>('/payments/razorpay/create-order', payload)).data;

export const verifyRazorpayPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  slug_or_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  pan_number?: string;
  city?: string;
  amount: number;
  purpose?: string;
  notes?: string;
}) => (await apiClient.post<any>('/payments/razorpay/verify-payment', payload)).data;

export const createRazorpayPaymentLink = async (payload: {
  amount: number;
  donor_name?: string;
  donor_phone?: string;
  donor_email?: string;
  purpose?: string;
  description?: string;
  slug_or_id?: string;
}) => (await apiClient.post<{
  payment_link_id: string;
  short_url: string;
  amount: number;
  currency: string;
  status: string;
  whatsapp_link: string;
  is_mock?: boolean;
}>('/payments/razorpay/create-payment-link', payload)).data;

export const initiateRazorpayRefund = async (payload: {
  receipt_id: string;
  amount?: number;
  reason?: string;
}) => (await apiClient.post<{
  success: boolean;
  refund_id: string;
  amount: number;
  status: string;
  receipt_number: string;
  message: string;
}>('/payments/razorpay/refund', payload)).data;





