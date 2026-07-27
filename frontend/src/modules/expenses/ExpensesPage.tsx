import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  Select, Card, Row, Col, Typography, App, Tooltip, Upload, Image
} from 'antd';
import {
  PlusOutlined, CheckOutlined, CloseOutlined, UploadOutlined,
  EyeOutlined, PaperClipOutlined, FilePdfOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpenses, createExpense, updateExpense, deleteExpense, approveExpense, getFinancialYears,
  uploadExpenseBill, attachExpenseBill
} from '../../api/services';
import { useAuthStore } from '../../store/authStore';
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
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadedBillUrl, setUploadedBillUrl] = useState<string>('');

  // Bill preview & attach modal states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [attachExpenseId, setAttachExpenseId] = useState<string | null>(null);

  const canApprove = user?.is_super_admin || can('expenses', 'approve') || (user as any)?.roles?.some((r: any) =>
    ['treasurer', 'org_admin', 'admin', 'president'].includes((r.name || r.slug || '').toLowerCase())
  );

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
            </Space>
          );
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

          <Tooltip title="Edit Expense Request">
            <Button
              icon={<EditOutlined style={{ color: '#2563EB' }} />}
              size="small"
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Delete / Void Expense">
            <Button
              icon={<DeleteOutlined style={{ color: '#EF4444' }} />}
              size="small"
              onClick={() => setDeleteModalExpense(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="expenses-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Expense Management</Title>
          <Text type="secondary">Track expenditure vouchers, upload bill receipts, and record payouts</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenModal}
          style={{ background: '#F97316', borderColor: '#F97316' }}
        >
          New Expense Request
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary">Total Expenses Claimed</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347' }}>₹ {totalExpense.toLocaleString('en-IN')}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary">Total Paid Amount</Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E' }}>₹ {totalPaid.toLocaleString('en-IN')}</Title>
          </Card>
        </Col>
      </Row>

      <Card className="hissob-card">
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 180 }}
            onChange={(val) => setFilterStatus(val || '')}
          >
            <Option value="pending">PENDING</Option>
            <Option value="approved">APPROVED</Option>
            <Option value="paid">PAID</Option>
            <Option value="rejected">REJECTED</Option>
          </Select>
        </div>

        <Table
          dataSource={expenses}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
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
      {previewUrl && (
        <Modal
          open={Boolean(previewUrl)}
          onCancel={() => setPreviewUrl(null)}
          title="Expense Bill / Receipt Voucher Preview"
          footer={[
            <Button key="close" onClick={() => setPreviewUrl(null)}>Close</Button>,
            <Button
              key="open"
              type="primary"
              onClick={() => window.open(previewUrl.startsWith('http') ? previewUrl : `${window.location.origin}${previewUrl}`, '_blank')}
            >
              Open Original Document
            </Button>
          ]}
          width={700}
        >
          <div style={{ textAlign: 'center', padding: 10 }}>
            {previewUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: 450, border: 'none', borderRadius: 8 }}
                title="Bill PDF Preview"
              />
            ) : (
              <Image
                src={previewUrl.startsWith('http') ? previewUrl : `${window.location.origin}${previewUrl}`}
                style={{ maxHeight: 450, objectFit: 'contain', borderRadius: 8 }}
                alt="Bill Receipt"
              />
            )}
          </div>
        </Modal>
      )}

      {/* Attach Bill to Existing Expense Modal */}
      {attachExpenseId && (
        <Modal
          open={Boolean(attachExpenseId)}
          onCancel={() => setAttachExpenseId(null)}
          title="Attach Bill Document to Expense"
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
              <p className="ant-upload-text">Select Bill photo or PDF to attach</p>
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
