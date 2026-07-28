import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  Select, Card, Row, Col, Typography, App, Tooltip, Upload, Image, Avatar, Segmented
} from 'antd';
import {
  PlusOutlined, CheckOutlined, CloseOutlined, UploadOutlined,
  EyeOutlined, PaperClipOutlined, FilePdfOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  SearchOutlined, DownloadOutlined, UnorderedListOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpenses, createExpense, updateExpense, deleteExpense, approveExpense, getFinancialYears,
  uploadExpenseBill, attachExpenseBill
} from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { exportToCSV, exportToExcel } from '../../utils/exportTable';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: 'PENDING APPROVAL' },
  approved: { color: 'blue', label: 'APPROVED' },
  paid: { color: 'success', label: 'PAID' },
  rejected: { color: 'error', label: 'REJECTED' },
};

const ExpensesPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user, can } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deleteModalExpense, setDeleteModalExpense] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadedBillUrl, setUploadedBillUrl] = useState<string>('');

  // Bill preview & attach modal states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [attachExpenseId, setAttachExpenseId] = useState<string | null>(null);

  const privilegedRoles = ['treasurer', 'org_admin', 'org admin', 'organization admin', 'organization_admin', 'admin', 'president', 'super_admin', 'super admin', 'trustee'];
  const canApprove = user?.is_super_admin || can('expenses', 'approve') || (user as any)?.roles?.some((r: any) =>
    privilegedRoles.includes((r.name || r.slug || '').toLowerCase())
  );

  const canModifyPaid = user?.is_super_admin || canApprove || (user as any)?.roles?.some((r: any) =>
    privilegedRoles.includes((r.name || r.slug || '').toLowerCase())
  );
  const isLocked = (record: any) => record.status === 'paid' && !canModifyPaid;

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterStatus],
    queryFn: () => getExpenses({ status: filterStatus || undefined }),
  });

  const { data: fiscalYears = [] } = useQuery({ queryKey: ['financialYears'], queryFn: getFinancialYears });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      message.success('Expense request submitted successfully!');
      setIsModalOpen(false);
      setEditingExpense(null);
      setUploadedBillUrl('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create expense');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) => updateExpense(id, values),
    onSuccess: () => {
      message.success('Expense updated successfully!');
      setIsModalOpen(false);
      setEditingExpense(null);
      setUploadedBillUrl('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      message.success('Expense deleted successfully!');
      setDeleteModalExpense(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to delete expense');
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }: any) => approveExpense(id, action, rejection_reason),
    onSuccess: () => {
      message.success('Expense status updated!');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Action failed');
    },
  });

  const attachMutation = useMutation({
    mutationFn: ({ expenseId, billUrl }: { expenseId: string; billUrl: string }) =>
      attachExpenseBill(expenseId, billUrl),
    onSuccess: () => {
      message.success('Bill document attached successfully!');
      setAttachExpenseId(null);
      setUploadedBillUrl('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to attach bill');
    },
  });

  const [form] = Form.useForm();

  const handleOpenModal = () => {
    setEditingExpense(null);
    const activeFy = fiscalYears.find((fy: any) => fy.is_current) || fiscalYears[0];
    setUploadedBillUrl('');
    setIsModalOpen(true);
    setTimeout(() => {
      form.resetFields();
      if (activeFy) {
        form.setFieldsValue({
          financial_year_id: activeFy.id,
          category: 'Decoration',
          expense_date: dayjs()
        });
      }
    }, 0);
  };

  const handleOpenEditModal = (record: any) => {
    setEditingExpense(record);
    setUploadedBillUrl(record.bill_url || '');
    setIsModalOpen(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        financial_year_id: record.financial_year_id,
        category: record.category,
        vendor_name: record.vendor_name,
        amount: Number(record.amount),
        description: record.description,
        voucher_number: record.voucher_number,
        expense_date: dayjs(record.expense_date),
        bill_url: record.bill_url,
      });
    }, 0);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingBill(true);
      const res = await uploadExpenseBill(file);
      setUploadedBillUrl(res.url);
      form.setFieldsValue({ bill_url: res.url });
      message.success(`Bill uploaded successfully: ${res.filename}`);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'File upload failed');
    } finally {
      setUploadingBill(false);
    }
  };

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      bill_url: uploadedBillUrl || values.bill_url,
      expense_date: values.expense_date ? values.expense_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    };
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalExpense = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalPending = expenses.filter(e => e.status === 'pending' || e.status === 'approved').reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const filteredExpenses = expenses.filter(e => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      (e.expense_number && e.expense_number.toLowerCase().includes(lower)) ||
      (e.category && e.category.toLowerCase().includes(lower)) ||
      (e.vendor_name && e.vendor_name.toLowerCase().includes(lower)) ||
      (e.requested_by_name && e.requested_by_name.toLowerCase().includes(lower)) ||
      (e.description && e.description.toLowerCase().includes(lower))
    );
  });

  const columns = [
    { title: 'Voucher #', dataIndex: 'expense_number', key: 'expense_number', render: (t: string) => <b>{t}</b> },
    { title: 'Date', dataIndex: 'expense_date', key: 'expense_date' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat: string) => <Tag color="geekblue">{cat}</Tag> },
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name', render: (v: string) => v || 'N/A' },
    {
      title: 'Requested By',
      dataIndex: 'requested_by_name',
      key: 'requested_by_name',
      render: (name: string) => (
        <Tag color="cyan" style={{ borderRadius: 10, fontWeight: 600 }}>
          👤 {name || 'Member'}
        </Tag>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#EF4444' }}>₹ {Number(val).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Bill / Voucher',
      key: 'bill_url',
      render: (_: any, record: any) => {
        if (record.bill_url) {
          const isPdf = record.bill_url.toLowerCase().endsWith('.pdf');
          return (
            <Space>
              <Button
                size="small"
                type="primary"
                ghost
                icon={isPdf ? <FilePdfOutlined /> : <EyeOutlined />}
                onClick={() => setPreviewUrl(record.bill_url)}
              >
                {isPdf ? 'PDF Bill' : 'View Receipt'}
              </Button>
              {!isLocked(record) && (
                <Tooltip title="Replace Attached Bill">
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={() => setAttachExpenseId(record.id)}
                  />
                </Tooltip>
              )}
            </Space>
          );
        }
        if (isLocked(record)) {
          return <Text type="secondary" style={{ fontSize: 12 }}>No Bill Attached (Paid)</Text>;
        }
        return (
          <Button
            size="small"
            type="dashed"
            icon={<PaperClipOutlined />}
            onClick={() => setAttachExpenseId(record.id)}
          >
            Attach Bill
          </Button>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const tag = STATUS_TAGS[st] || { color: 'default', label: st.toUpperCase() };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size={4}>
          {record.status === 'pending' && canApprove ? (
            <>
              <Tooltip title="Approve Expense">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => actionMutation.mutate({ id: record.id, action: 'approve' })}
                />
              </Tooltip>
              <Tooltip title="Reject Expense">
                <Button
                  danger
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => actionMutation.mutate({ id: record.id, action: 'reject', rejection_reason: 'Rejected by Treasurer' })}
                />
              </Tooltip>
            </>
          ) : record.status === 'pending' ? (
            <Tag color="gold" style={{ borderRadius: 10 }}>Awaiting Trustee Review</Tag>
          ) : null}

          {record.status === 'approved' && canApprove ? (
            <Button
              type="primary"
              size="small"
              style={{ background: '#22C55E' }}
              onClick={() => actionMutation.mutate({ id: record.id, action: 'pay' })}
            >
              Mark Paid
            </Button>
          ) : record.status === 'approved' ? (
            <Tag color="blue" style={{ borderRadius: 10 }}>Approved - Awaiting Payout</Tag>
          ) : null}

          <Tooltip title={isLocked(record) ? 'Cannot edit paid/settled expense' : 'Edit Expense Request'}>
            <Button
              icon={<EditOutlined style={{ color: isLocked(record) ? '#9CA3AF' : '#2563EB' }} />}
              size="small"
              disabled={isLocked(record)}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Tooltip title={isLocked(record) ? 'Cannot delete paid/settled expense' : 'Delete / Void Expense'}>
            <Button
              icon={<DeleteOutlined style={{ color: isLocked(record) ? '#9CA3AF' : '#EF4444' }} />}
              size="small"
              disabled={isLocked(record)}
              onClick={() => setDeleteModalExpense(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="expenses-module animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
          <Title level={3} style={{ margin: 0, fontWeight: 900, color: '#0F172A' }}>Expense Management</Title>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 4 }}>
            Track expenditure vouchers, upload bill receipts, and manage payouts
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '0 0 auto' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleOpenModal}
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              borderColor: '#F97316',
              borderRadius: 8,
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
            }}
          >
            New Expense Request
          </Button>
        </div>
      </div>

      {/* ── Quick Overview Metric Cards ── */}
      <div className="hissob-stat-row" style={{ marginBottom: 20 }}>
        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #1E40AF', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL CLAIMED
              </Text>
              <Avatar style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', flexShrink: 0 }} icon={<DollarOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#0F172A', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalExpense.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Gross Expenditures</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #059669', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL PAID
              </Text>
              <Avatar style={{ backgroundColor: '#D1FAE5', color: '#059669', flexShrink: 0 }} icon={<CheckCircleOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#059669', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalPaid.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Settled Payouts</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #F59E0B', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                PENDING PAYOUT
              </Text>
              <Avatar style={{ backgroundColor: '#FEF3C7', color: '#D97706', flexShrink: 0 }} icon={<ClockCircleOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#D97706', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalPending.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Awaiting Approval / Pay</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #6366F1', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL VOUCHERS
              </Text>
              <Avatar style={{ backgroundColor: '#E0E7FF', color: '#4F46E5', flexShrink: 0 }} icon={<FileTextOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#4F46E5', fontWeight: 900 }}>
              {expenses.length}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Recorded Requests</Text>
          </Card>
        </div>
      </div>

      {/* ── Main Directory Controls ── */}
      <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '1 1 300px' }}>
            <Input
              placeholder="Search vouchers, category, vendor, or applicant..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
              style={{ width: 300, borderRadius: 8 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="middle"
            />
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 200 }}
              onChange={(val) => setFilterStatus(val || '')}
              size="middle"
            >
              <Option value="pending">🟡 PENDING APPROVAL</Option>
              <Option value="approved">🔵 APPROVED</Option>
              <Option value="paid">🟢 PAID</Option>
              <Option value="rejected">🔴 REJECTED</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => exportToCSV(filteredExpenses.map(e => ({
                voucher_number: e.expense_number,
                date: e.expense_date,
                category: e.category,
                vendor: e.vendor_name || 'N/A',
                requested_by: e.requested_by_name || 'Member',
                amount: Number(e.amount).toLocaleString('en-IN'),
                status: e.status?.toUpperCase(),
              })), `Expenses_${dayjs().format('YYYYMMDD')}`, [
                { key: 'voucher_number', title: 'Voucher #' },
                { key: 'date', title: 'Date' },
                { key: 'category', title: 'Category' },
                { key: 'vendor', title: 'Vendor' },
                { key: 'requested_by', title: 'Requested By' },
                { key: 'amount', title: 'Amount (₹)' },
                { key: 'status', title: 'Status' },
              ])}
            >
              CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              style={{ color: '#22C55E', borderColor: '#22C55E' }}
              onClick={() => exportToExcel(filteredExpenses.map(e => ({
                voucher_number: e.expense_number,
                date: e.expense_date,
                category: e.category,
                vendor: e.vendor_name || 'N/A',
                requested_by: e.requested_by_name || 'Member',
                amount: Number(e.amount),
                status: e.status?.toUpperCase(),
              })), `Expenses_${dayjs().format('YYYYMMDD')}`, [
                { key: 'voucher_number', title: 'Voucher #' },
                { key: 'date', title: 'Date' },
                { key: 'category', title: 'Category' },
                { key: 'vendor', title: 'Vendor' },
                { key: 'requested_by', title: 'Requested By' },
                { key: 'amount', title: 'Amount (₹)' },
                { key: 'status', title: 'Status' },
              ])}
            >
              Excel
            </Button>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as any)}
              options={[
                { label: 'Table', value: 'table', icon: <UnorderedListOutlined /> },
                { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
              ]}
              style={{ fontWeight: 700 }}
            />
          </div>
        </div>

        {/* View Mode: Table vs Mobile Grid Cards */}
        {viewMode === 'table' ? (
          <Table
            dataSource={filteredExpenses}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} vouchers` }}
            scroll={{ x: 1000 }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredExpenses.map((record: any) => {
              const tag = STATUS_TAGS[record.status] || { color: 'default', label: (record.status || '').toUpperCase() };
              const isPdf = record.bill_url ? record.bill_url.toLowerCase().endsWith('.pdf') : false;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={record.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                    }}
                    styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.expense_number || record.voucher_number || 'EXP'}
                        </span>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          📅 {record.expense_date ? dayjs(record.expense_date).format('DD-MM-YYYY') : ''}
                        </div>
                      </div>
                      <Tag color={tag.color} style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                        {tag.label}
                      </Tag>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar style={{ backgroundColor: '#F97316', fontWeight: 900, flexShrink: 0 }} size={38}>
                        {record.vendor_name?.charAt(0)?.toUpperCase() || record.category?.charAt(0)?.toUpperCase() || 'E'}
                      </Avatar>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {record.vendor_name || 'General Vendor'}
                        </div>
                        <Tag color="geekblue" style={{ marginTop: 4, fontSize: 11 }}>{record.category}</Tag>
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 12, border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Amount</Text>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#F97316' }}>
                          ₹ {Number(record.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Tag color="cyan" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                        👤 {record.requested_by_name || 'Member'}
                      </Tag>
                    </div>

                    {record.description && (
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, flexGrow: 1 }}>
                        📝 <b>Notes:</b> {record.description}
                      </div>
                    )}

                    {/* Bill attachment status bar */}
                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed #e2e8f0' }}>
                      {record.bill_url ? (
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            icon={isPdf ? <FilePdfOutlined /> : <EyeOutlined />}
                            onClick={() => setPreviewUrl(record.bill_url)}
                          >
                            {isPdf ? 'PDF Bill' : 'View Receipt'}
                          </Button>
                          {!isLocked(record) && (
                            <Tooltip title="Replace Attached Bill">
                              <Button
                                size="small"
                                icon={<UploadOutlined />}
                                onClick={() => setAttachExpenseId(record.id)}
                              />
                            </Tooltip>
                          )}
                        </Space>
                      ) : isLocked(record) ? (
                        <Text type="secondary" style={{ fontSize: 11 }}>No Bill Attached (Paid & Locked)</Text>
                      ) : (
                        <Button
                          size="small"
                          type="dashed"
                          icon={<PaperClipOutlined />}
                          onClick={() => setAttachExpenseId(record.id)}
                        >
                          Attach Bill Voucher
                        </Button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                      {record.status === 'pending' && canApprove ? (
                        <>
                          <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            size="small"
                            onClick={() => actionMutation.mutate({ id: record.id, action: 'approve' })}
                          >
                            Approve
                          </Button>
                          <Button
                            danger
                            icon={<CloseOutlined />}
                            size="small"
                            onClick={() => actionMutation.mutate({ id: record.id, action: 'reject', rejection_reason: 'Rejected by Treasurer' })}
                          >
                            Reject
                          </Button>
                        </>
                      ) : record.status === 'pending' ? (
                        <Tag color="gold" style={{ borderRadius: 6, flexGrow: 1 }}>Awaiting Review</Tag>
                      ) : null}

                      {record.status === 'approved' && canApprove ? (
                        <Button
                          type="primary"
                          size="small"
                          style={{ background: '#22C55E' }}
                          onClick={() => actionMutation.mutate({ id: record.id, action: 'pay' })}
                        >
                          Mark Paid
                        </Button>
                      ) : record.status === 'approved' ? (
                        <Tag color="blue" style={{ borderRadius: 6, flexGrow: 1 }}>Awaiting Payout</Tag>
                      ) : null}

                      <Tooltip title={isLocked(record) ? 'Cannot edit paid/settled expense' : 'Edit Expense Request'}>
                        <Button
                          icon={<EditOutlined style={{ color: isLocked(record) ? '#9CA3AF' : '#2563EB' }} />}
                          size="small"
                          disabled={isLocked(record)}
                          onClick={() => handleOpenEditModal(record)}
                        />
                      </Tooltip>
                      <Tooltip title={isLocked(record) ? 'Cannot delete paid/settled expense' : 'Delete / Void Expense'}>
                        <Button
                          icon={<DeleteOutlined style={{ color: isLocked(record) ? '#9CA3AF' : '#EF4444' }} />}
                          size="small"
                          disabled={isLocked(record)}
                          onClick={() => setDeleteModalExpense(record)}
                        />
                      </Tooltip>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* New Expense Modal */}
      <Modal
        title="Submit Expense Request"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ expense_date: dayjs() }}>
          <Form.Item
            name="financial_year_id"
            label="Financial Year"
            rules={[{ required: true, message: 'Select Financial Year' }]}
          >
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select category">
              <Option value="Decoration">Decoration & Mandap</Option>
              <Option value="Pooja & Rituals">Pooja & Rituals</Option>
              <Option value="Prasad & Catering">Prasad & Catering</Option>
              <Option value="Sound & Lighting">Sound & Lighting</Option>
              <Option value="Security & Permits">Security & Permits</Option>
              <Option value="Logistics & Transport">Logistics & Transport</Option>
              <Option value="Miscellaneous">Miscellaneous</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Amount" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vendor_name" label="Vendor Name">
                <Input placeholder="Vendor Name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description / Purpose">
            <Input.TextArea rows={2} placeholder="Add voucher details or invoice notes" />
          </Form.Item>

          {/* Bill Document Upload */}
          <Form.Item label="Upload Bill / Invoice Document (Audit Proof)">
            <Upload.Dragger
              beforeUpload={(file) => {
                handleFileUpload(file);
                return false; // prevent default upload submit
              }}
              showUploadList={false}
              multiple={false}
              accept=".jpg,.jpeg,.png,.webp,.pdf"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 32, color: '#F97316' }} />
              </p>

              {uploadedBillUrl ? (
                <div>
                  <Tag color="green" style={{ fontSize: 13, padding: '4px 12px' }}>
                    ✓ Bill File Attached ({uploadedBillUrl.split('/').pop()})
                  </Tag>
                  <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Click or drag another file to replace</p>
                </div>
              ) : (
                <div>
                  <p className="ant-upload-text">Click or drag bill receipt photo/PDF here to upload</p>
                  <p className="ant-upload-hint">Supports JPG, PNG, WEBP & PDF (Max 10MB)</p>
                </div>
              )}
            </Upload.Dragger>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending || uploadingBill}
                style={{ background: '#F97316', borderColor: '#F97316' }}
              >
                {editingExpense ? 'Update Expense' : 'Submit Expense'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bill Preview Modal */}
      {previewUrl && (() => {
        const apiHost = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
        const fullUrl = previewUrl.startsWith('http') ? previewUrl : `${apiHost}${previewUrl}`;
        const isPdf = previewUrl.toLowerCase().endsWith('.pdf');
        const iframeSrc = isPdf ? `${fullUrl}#view=FitH&navpanes=0` : fullUrl;

        return (
          <Modal
            open={Boolean(previewUrl)}
            onCancel={() => setPreviewUrl(null)}
            title="Expense Bill / Receipt Voucher Preview"
            footer={[
              <Button key="close" onClick={() => setPreviewUrl(null)}>Close</Button>,
              <Button
                key="open"
                type="primary"
                onClick={() => window.open(fullUrl, '_blank')}
              >
                Open Original Document
              </Button>
            ]}
            width={850}
          >
            <div style={{ textAlign: 'center', padding: 10 }}>
              {isPdf ? (
                <iframe
                  src={iframeSrc}
                  style={{ width: '100%', height: 650, border: 'none', borderRadius: 8 }}
                  title="Bill PDF Preview"
                />
              ) : (
                <Image
                  src={fullUrl}
                  style={{ maxHeight: 650, objectFit: 'contain', borderRadius: 8 }}
                  alt="Bill Receipt"
                />
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Attach Bill to Existing Expense Modal */}
      {attachExpenseId && (
        <Modal
          open={Boolean(attachExpenseId)}
          onCancel={() => setAttachExpenseId(null)}
          title="Attach / Replace Expense Bill Document"
          footer={null}
        >
          <div style={{ padding: 10 }}>
            <Upload.Dragger
              beforeUpload={async (file) => {
                try {
                  setUploadingBill(true);
                  const res = await uploadExpenseBill(file);
                  attachMutation.mutate({ expenseId: attachExpenseId, billUrl: res.url });
                } catch (err: any) {
                  message.error('File upload failed');
                } finally {
                  setUploadingBill(false);
                }
                return false;
              }}
              showUploadList={false}
              accept=".jpg,.jpeg,.png,.webp,.pdf"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 36, color: '#F97316' }} />
              </p>
              <p className="ant-upload-text">Select Bill photo or PDF to attach or replace</p>
              <p className="ant-upload-hint">Supports JPG, PNG, WEBP & PDF (Max 10MB)</p>
            </Upload.Dragger>
          </div>
        </Modal>
      )}

      {/* Delete Expense Confirmation Modal */}
      <Modal
        open={Boolean(deleteModalExpense)}
        onCancel={() => setDeleteModalExpense(null)}
        footer={null}
        destroyOnHidden
        width={440}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '20px 24px', background: '#FEF2F2', borderBottom: '1px solid #FEE2E2' }}>
          <Title level={4} style={{ margin: 0, color: '#DC2626', fontWeight: 900 }}>
            Delete Expense Voucher #{deleteModalExpense?.expense_number}?
          </Title>
          <Text type="secondary" style={{ fontSize: 12, color: '#991B1B' }}>
            This will permanently remove expense record ₹{Number(deleteModalExpense?.amount || 0).toLocaleString('en-IN')} ({deleteModalExpense?.category}).
          </Text>
        </div>
        <div style={{ padding: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={() => setDeleteModalExpense(null)} style={{ borderRadius: 8, fontWeight: 600 }}>
            Keep Expense
          </Button>
          <Button
            type="primary"
            danger
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteModalExpense.id)}
            style={{ fontWeight: 800, borderRadius: 8, background: '#DC2626', borderColor: '#DC2626' }}
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
