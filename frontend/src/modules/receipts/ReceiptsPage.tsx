import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  Select, Card, Row, Col, Typography, App, Tooltip
} from 'antd';
import {
  PlusOutlined, PrinterOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReceipts, createReceipt, getDonors, getFinancialYears } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  issued: { color: 'blue', label: 'ISSUED' },
  pending_settlement: { color: 'warning', label: 'PENDING SETTLEMENT' },
  settled: { color: 'success', label: 'SETTLED' },
  cancelled: { color: 'error', label: 'CANCELLED' },
};

const ReceiptsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Queries
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', filterStatus],
    queryFn: () => getReceipts({ status: filterStatus || undefined }),
  });

  const { data: donors = [] } = useQuery({ queryKey: ['donors'], queryFn: () => getDonors() });
  const { data: fiscalYears = [] } = useQuery({ queryKey: ['financialYears'], queryFn: getFinancialYears });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createReceipt,
    onSuccess: (data) => {
      message.success('Receipt created successfully!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setPrintReceipt(data);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create receipt');
    },
  });

  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      receipt_date: values.receipt_date ? values.receipt_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    });
  };

  // Calculations
  const totalCollected = receipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalSettled = receipts.filter(r => r.status === 'settled').reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const columns = [
    {
      title: 'Receipt #',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: 'Date',
      dataIndex: 'receipt_date',
      key: 'receipt_date',
    },
    {
      title: 'Donor',
      dataIndex: 'donor',
      key: 'donor',
      render: (donor: any) => donor?.full_name || 'N/A',
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#0B2347' }}>₹ {Number(val).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => <Tag color="blue">{mode.toUpperCase()}</Tag>,
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
          <Tooltip title="Print Receipt">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => setPrintReceipt(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="receipts-module animate-fadeIn">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Donation Receipts</Title>
          <Text type="secondary">Manage collections, issue receipts, and print vouchers</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#F97316', borderColor: '#F97316' }}
        >
          New Receipt
        </Button>
      </div>

      {/* ── Stats Overview ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Total Collection</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347' }}>₹ {totalCollected.toLocaleString('en-IN')}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Total Settled</Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E' }}>₹ {totalSettled.toLocaleString('en-IN')}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Total Receipts Count</Text>
            <Title level={3} style={{ margin: 0, color: '#F97316' }}>{receipts.length}</Title>
          </Card>
        </Col>
      </Row>

      {/* ── Table Card ── */}
      <Card className="hissob-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 180 }}
              onChange={(val) => setFilterStatus(val || '')}
            >
              <Option value="issued">ISSUED</Option>
              <Option value="pending_settlement">PENDING SETTLEMENT</Option>
              <Option value="settled">SETTLED</Option>
              <Option value="cancelled">CANCELLED</Option>
            </Select>
          </Space>
        </div>

        <Table
          dataSource={receipts}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* ── Create Receipt Modal ── */}
      <Modal
        title="Issue New Donation Receipt"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ payment_mode: 'cash', receipt_date: dayjs() }}>
          <Form.Item
            name="financial_year_id"
            label="Financial Year"
            rules={[{ required: true, message: 'Select Financial Year' }]}
          >
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name} {fy.is_current ? '(Active)' : ''}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="donor_id"
            label="Donor"
            rules={[{ required: true, message: 'Select Donor' }]}
          >
            <Select placeholder="Select or search Donor" showSearch optionFilterProp="children">
              {donors.map((d: any) => (
                <Option key={d.id} value={d.id}>{d.full_name} ({d.phone || 'No phone'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount (₹)"
                rules={[{ required: true, message: 'Enter amount' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Amount" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_mode" label="Payment Mode" rules={[{ required: true }]}>
                <Select>
                  <Option value="cash">Cash</Option>
                  <Option value="upi">UPI</Option>
                  <Option value="cheque">Cheque</Option>
                  <Option value="neft">NEFT / Bank</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="purpose" label="Purpose / Cause">
            <Input placeholder="e.g. Festival Collection, Pooja, General Donation" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Issue Receipt
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Printable Voucher Preview Modal ── */}
      {printReceipt && (
        <Modal
          open={Boolean(printReceipt)}
          onCancel={() => setPrintReceipt(null)}
          title="Print Receipt Voucher"
          footer={[
            <Button key="close" onClick={() => setPrintReceipt(null)}>Close</Button>,
            <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()} style={{ background: '#F97316' }}>
              Print Voucher
            </Button>
          ]}
        >
          <div style={{ padding: 20, border: '2px solid #0B2347', borderRadius: 8, background: '#FFF' }}>
            <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '1px solid #EEE', paddingBottom: 12 }}>
              <Title level={4} style={{ color: '#0B2347', margin: 0 }}>HISSOB ERP — DONATION RECEIPT</Title>
              <Text type="secondary">Official Festival Collection Receipt</Text>
            </div>
            <Row style={{ marginBottom: 10 }}>
              <Col span={12}><b>Receipt No:</b> {printReceipt.receipt_number}</Col>
              <Col span={12} style={{ textAlign: 'right' }}><b>Date:</b> {printReceipt.receipt_date}</Col>
            </Row>
            <div style={{ margin: '16px 0', padding: 12, background: '#F8F9FC', borderRadius: 6 }}>
              <p><b>Received From:</b> {printReceipt.donor?.full_name || 'Donor'}</p>
              <p><b>Amount:</b> <span style={{ fontSize: 18, color: '#22C55E', fontWeight: 800 }}>₹ {Number(printReceipt.amount).toLocaleString('en-IN')}</span></p>
              <p><b>Payment Mode:</b> {printReceipt.payment_mode?.toUpperCase()}</p>
              <p><b>Purpose:</b> {printReceipt.purpose || 'Festival Donation'}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
              <div><Text type="secondary">Collector Signature</Text></div>
              <div><Text type="secondary">Authorized Trustee Signature</Text></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReceiptsPage;
