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
  created_at: string;
}

// ── Financial Year API ──
export const getFinancialYears = async () => (await apiClient.get<FinancialYear[]>('/financial-years')).data;
export const createFinancialYear = async (data: any) => (await apiClient.post<FinancialYear>('/financial-years', data)).data;
export const setFYActive = async (id: string) => (await apiClient.post<FinancialYear>(`/financial-years/${id}/set-current`)).data;

// ── Festival API ──
export const getFestivals = async (fy_id?: string) => (await apiClient.get<Festival[]>('/festivals', { params: { fy_id } })).data;
export const createFestival = async (data: any) => (await apiClient.post<Festival>('/festivals', data)).data;

// ── Donor API ──
export const getDonors = async (q?: string) => (await apiClient.get<Donor[]>('/donors', { params: { q } })).data;
export const createDonor = async (data: any) => (await apiClient.post<Donor>('/donors', data)).data;

// ── Receipt API ──
export const getReceipts = async (params?: any) => (await apiClient.get<Receipt[]>('/receipts', { params })).data;
export const createReceipt = async (data: any) => (await apiClient.post<Receipt>('/receipts', data)).data;

// ── Expense API ──
export const getExpenses = async (params?: any) => (await apiClient.get<Expense[]>('/expenses', { params })).data;
export const createExpense = async (data: any) => (await apiClient.post<Expense>('/expenses', data)).data;
export const approveExpense = async (id: string, action: string, rejection_reason?: string) => (await apiClient.post<Expense>(`/expenses/${id}/approve`, { action, rejection_reason })).data;

// ── Reports API ──
export const getDailyCollectionReport = async () => (await apiClient.get<DailyCollection[]>('/reports/daily-collection')).data;
export const getCashBookReport = async (fy_id?: string) => (await apiClient.get<CashBookEntry[]>('/reports/cash-book', { params: { fy_id } })).data;
export const getIncomeExpenseReport = async (fy_id?: string) => (await apiClient.get<any>('/reports/income-expense', { params: { fy_id } })).data;

// ── Audit Log API ──
export const getAuditLogs = async (module?: string) => (await apiClient.get<AuditLog[]>('/audit', { params: { module } })).data;

// ── Super Admin & Organizations API ──
export const getSuperAdminStats = async () => (await apiClient.get<any>('/super-admin/dashboard-stats')).data;
export const getOrganizations = async () => (await apiClient.get<any[]>('/organizations')).data;
export const createOrganization = async (data: any) => (await apiClient.post<any>('/organizations', data)).data;

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
