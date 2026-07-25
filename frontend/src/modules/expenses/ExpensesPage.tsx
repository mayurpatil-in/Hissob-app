import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  Select, Card, Row, Col, Typography, App, Tooltip
} from 'antd';
import {
  PlusOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenses, createExpense, approveExpense, getFinancialYears } from '../../api/services';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterStatus],
    queryFn: () => getExpenses({ status: filterStatus || undefined }),
  });

  const { data: fiscalYears = [] } = useQuery({ queryKey: ['financialYears'], queryFn: getFinancialYears });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      message.success('Expense request submitted!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create expense');
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

  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      expense_date: values.expense_date ? values.expense_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    });
  };

  const totalExpense = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const columns = [
    { title: 'Voucher #', dataIndex: 'expense_number', key: 'expense_number', render: (t: string) => <b>{t}</b> },
    { title: 'Date', dataIndex: 'expense_date', key: 'expense_date' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat: string) => <Tag color="geekblue">{cat}</Tag> },
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name', render: (v: string) => v || 'N/A' },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#EF4444' }}>₹ {Number(val).toLocaleString('en-IN')}</span>,
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
        <Space>
          {record.status === 'pending' && (
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
          )}
          {record.status === 'approved' && (
            <Button
              type="primary"
              size="small"
              style={{ background: '#22C55E' }}
              onClick={() => actionMutation.mutate({ id: record.id, action: 'pay' })}
            >
              Mark Paid
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="expenses-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Expense Management</Title>
          <Text type="secondary">Track expenditure vouchers, request approvals, and record payments</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
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
          scroll={{ x: 700 }}
        />
      </Card>

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

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Submit Expense
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
