import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Row, Col, Typography, Tabs, App, Tooltip, Segmented
} from 'antd';
import {
  CheckOutlined, CloseOutlined, PlusOutlined,
  CheckCircleOutlined, ClockCircleOutlined, RightOutlined, BankOutlined,
  PrinterOutlined, CalculatorOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSettlements, submitSettlement, verifySettlement, getReceipts, getFinancialYears, settleReceipt
} from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import CashDenominationModal from './CashDenominationModal';
import PrintHandoverSlipModal, { type HandoverSlipData } from './PrintHandoverSlipModal';

import { useLocation } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  submitted: { color: 'warning', label: 'SUBMITTED FOR VERIFICATION' },
  approved: { color: 'success', label: 'APPROVED & SETTLED' },
  rejected: { color: 'error', label: 'REJECTED' },
};

const SettlementsPage: React.FC = () => {
  const location = useLocation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDenomModalOpen, setIsDenomModalOpen] = useState(false);
  const [selectedSlipData, setSelectedSlipData] = useState<HandoverSlipData | null>(null);
  const [selectedReceiptKeys, setSelectedReceiptKeys] = useState<React.Key[]>([]);
  const [digitalFilter, setDigitalFilter] = useState<'pending' | 'all'>('pending');

  React.useEffect(() => {
    if (location.state?.preselectedReceiptIds && location.state.preselectedReceiptIds.length > 0) {
      setSelectedReceiptKeys(location.state.preselectedReceiptIds);
      setIsSubmitModalOpen(true);
    }
  }, [location.state]);

  const [form] = Form.useForm();

  const { user, can } = useAuthStore();
  const canVerify = user?.is_super_admin || can('cash_settlement', 'approve') || (user as any)?.roles?.some((r: any) =>
    ['treasurer', 'org_admin', 'admin', 'president'].includes((r.name || r.slug || '').toLowerCase())
  );

  // Queries
  const { data: settlements = [], isLoading: isSettlementsLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => getSettlements(),
  });

  const { data: pendingReceipts = [], isLoading: isReceiptsLoading } = useQuery({
    queryKey: ['receipts', 'pending_settlement'],
    queryFn: () => getReceipts({ status: 'pending_settlement', payment_mode: 'cash' }),
  });

  const { data: allDigitalReceipts = [], isLoading: isDigitalLoading } = useQuery({
    queryKey: ['receipts', 'digital'],
    queryFn: async () => {
      const res = await getReceipts();
      return res.filter((r: any) => r.payment_mode !== 'cash' && r.status !== 'cancelled');
    },
  });

  const pendingDigitalReceipts = allDigitalReceipts.filter((r: any) => r.status !== 'settled');
  const displayedDigitalReceipts = digitalFilter === 'pending' ? pendingDigitalReceipts : allDigitalReceipts;

  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

  // Mutations
  const submitMutation = useMutation({
    mutationFn: submitSettlement,
    onSuccess: () => {
      message.success('Cash settlement submitted to Treasurer!');
      setIsSubmitModalOpen(false);
      setSelectedReceiptKeys([]);
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to submit settlement');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }: any) => verifySettlement(id, action, rejection_reason),
    onSuccess: () => {
      message.success('Settlement verified successfully!');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Action failed');
    },
  });

  const [verifyModalReceipt, setVerifyModalReceipt] = useState<any>(null);

  const verifyDigitalMutation = useMutation({
    mutationFn: ({ id, payload }: any) => settleReceipt(id, payload),
    onSuccess: () => {
      message.success('Bank credit verified, UTR recorded & receipt settled!');
      setVerifyModalReceipt(null);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to verify bank credit');
    },
  });

  const handleOpenSubmitModal = () => {
    const activeFy = fiscalYears.find((fy: any) => fy.is_current) || fiscalYears[0];
    form.resetFields();
    if (activeFy) {
      form.setFieldsValue({
        financial_year_id: activeFy.id,
      });
    }
    setIsSubmitModalOpen(true);
  };

  const handleFormSubmit = (values: any) => {
    submitMutation.mutate({
      ...values,
      receipt_ids: selectedReceiptKeys,
    });
  };

  const selectedTotal = pendingReceipts
    .filter((r: any) => selectedReceiptKeys.includes(r.id))
    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

  const settlementColumns = [
    { title: 'Settlement #', dataIndex: 'settlement_number', key: 'settlement_number', render: (t: string) => <b>{t}</b> },
    { title: 'Date', dataIndex: 'settlement_date', key: 'settlement_date' },
    { title: 'Receipt Count', dataIndex: 'receipt_count', key: 'receipt_count' },
    {
      title: 'Total Cash (₹)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#22C55E' }}>₹ {Number(val).toLocaleString('en-IN')}</span>,
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
          <Tooltip title="Print Cash Handover Voucher Slip">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => setSelectedSlipData({
                settlementNumber: record.settlement_number,
                settlementDate: record.settlement_date,
                collectorName: user?.full_name || 'Collector',
                totalAmount: Number(record.total_amount),
                receiptCount: record.receipt_count,
                notes: record.notes,
                status: record.status,
              })}
            />
          </Tooltip>
          {record.status === 'submitted' && canVerify ? (
            <>
              <Tooltip title="Approve Cash Settlement">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  size="small"
                  style={{ background: '#22C55E', borderColor: '#22C55E' }}
                  onClick={() => verifyMutation.mutate({ id: record.id, action: 'approve' })}
                />
              </Tooltip>
              <Tooltip title="Reject Settlement">
                <Button
                  danger
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => verifyMutation.mutate({ id: record.id, action: 'reject', rejection_reason: 'Amount discrepancy' })}
                />
              </Tooltip>
            </>
          ) : record.status === 'submitted' ? (
            <Tag color="gold" style={{ borderRadius: 10 }}>Awaiting Treasurer Review</Tag>
          ) : null}
        </Space>
      ),
    },
  ];

  const receiptColumns = [
    { title: 'Receipt #', dataIndex: 'receipt_number', key: 'receipt_number', render: (t: string) => <b>{t}</b> },
    { title: 'Date', dataIndex: 'receipt_date', key: 'receipt_date' },
    { title: 'Donor', dataIndex: 'donor', key: 'donor', render: (d: any) => d?.full_name || 'Donor' },
    { title: 'Collector', dataIndex: 'collector_name', key: 'collector_name', render: (c: string) => <Tag color="orange">👤 {c || 'Collector'}</Tag> },
    { title: 'Amount (₹)', dataIndex: 'amount', key: 'amount', render: (val: number) => `₹ ${Number(val).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (st: string) => <Tag color="warning">{st.toUpperCase()}</Tag> },
  ];

  const digitalReceiptColumns = [
    { title: 'Receipt #', dataIndex: 'receipt_number', key: 'receipt_number', render: (t: string) => <b>{t}</b> },
    { title: 'Date', dataIndex: 'receipt_date', key: 'receipt_date' },
    { title: 'Donor', dataIndex: 'donor', key: 'donor', render: (d: any) => d?.full_name || 'Donor' },
    { title: 'Collector', dataIndex: 'collector_name', key: 'collector_name', render: (c: string) => <Tag color="orange">👤 {c || 'Collector'}</Tag> },
    {
      title: 'Payment Mode & UTR / Ref',
      key: 'payment_ref',
      render: (_: any, r: any) => (
        <div>
          <Tag color="cyan">{r.payment_mode?.toUpperCase()}</Tag>
          <br />
          <Text style={{ fontSize: 12 }}><b>Ref/UTR:</b> {r.upi_reference || r.transaction_ref || r.cheque_number || 'N/A'}</Text>
          {r.bank_name && <><br /><Text type="secondary" style={{ fontSize: 11 }}>Bank: {r.bank_name}</Text></>}
        </div>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#22C55E' }}>₹ {Number(val).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'settled' ? 'success' : 'processing'}>
          {st === 'settled' ? 'BANK CREDITED & SETTLED' : 'AWAITING BANK CREDIT'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'settled' ? (
            <Tag color="green">✓ Verified & Settled</Tag>
          ) : canVerify ? (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              style={{ background: '#22C55E', borderColor: '#22C55E', borderRadius: 6, fontWeight: 600 }}
              loading={verifyDigitalMutation.isPending}
              onClick={() => setVerifyModalReceipt(record)}
            >
              Verify Credit & Settle
            </Button>
          ) : (
            <Tag color="gold">Awaiting Trustee Verification</Tag>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'unsettled',
      label: <span><ClockCircleOutlined /> Unsettled Cash Receipts</span>,
      children: (
        <Card className="hissob-card">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Text type="secondary">Select cash receipts collected to submit settlement batch to Treasurer</Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={selectedReceiptKeys.length === 0}
              onClick={handleOpenSubmitModal}
              style={{ background: '#F97316', borderColor: '#F97316' }}
            >
              Submit Settlement ({selectedReceiptKeys.length} Receipts - ₹ {selectedTotal.toLocaleString('en-IN')})
            </Button>
          </div>

          <Table
            rowSelection={{
              selectedRowKeys: selectedReceiptKeys,
              onChange: (keys) => setSelectedReceiptKeys(keys),
            }}
            dataSource={pendingReceipts}
            columns={receiptColumns}
            rowKey="id"
            loading={isReceiptsLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
          />
        </Card>
      ),
    },
    {
      key: 'verification',
      label: <span><CheckCircleOutlined /> Treasurer Cash Verification Queue ({settlements.filter((s: any) => s.status === 'submitted').length})</span>,
      children: (
        <Card className="hissob-card">
          <Table
            dataSource={settlements}
            columns={settlementColumns}
            rowKey="id"
            loading={isSettlementsLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
          />
        </Card>
      ),
    },
    {
      key: 'bank_verification',
      label: <span><BankOutlined /> UPI & Bank Verification ({pendingDigitalReceipts.length})</span>,
      children: (
        <Card className="hissob-card">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Text type="secondary">
              Review UPI transaction references, UTR numbers, and bank receipts before marking as Bank Credited & Settled in Cash Book
            </Text>
            <Segmented
              options={[
                { label: `Unverified Queue (${pendingDigitalReceipts.length})`, value: 'pending' },
                { label: `All Digital History (${allDigitalReceipts.length})`, value: 'all' },
              ]}
              value={digitalFilter}
              onChange={(val: any) => setDigitalFilter(val)}
            />
          </div>
          <Table
            dataSource={displayedDigitalReceipts}
            columns={digitalReceiptColumns}
            rowKey="id"
            loading={isDigitalLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 700 }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="settlements-module animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>
            Cash & Bank Settlement Workflow
          </Title>
          <Text type="secondary">
            Cash & UPI Collections <RightOutlined style={{ fontSize: 10, margin: '0 4px' }} /> Trustee & Treasurer Bank Verification <RightOutlined style={{ fontSize: 10, margin: '0 4px' }} /> Cash Book Posting
          </Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Total Cash Batches</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>{settlements.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Approved & Settled Cash</Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E', fontWeight: 900 }}>
              ₹ {settlements.filter((s: any) => s.status === 'approved').reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0).toLocaleString('en-IN')}
            </Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Pending Bank & Cash Reviews</Text>
            <Title level={3} style={{ margin: 0, color: '#F59E0B', fontWeight: 900 }}>
              {settlements.filter((s: any) => s.status === 'submitted').length + pendingDigitalReceipts.length}
            </Title>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey={canVerify ? "bank_verification" : "unsettled"} items={tabItems} />

      {/* Submit Settlement Modal */}
      <Modal
        title="Submit Cash Settlement Batch"
        open={isSubmitModalOpen}
        onCancel={() => setIsSubmitModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <div style={{ padding: 12, background: '#FFF7ED', borderRadius: 8, marginBottom: 16, border: '1px solid #FFEDD5' }}>
            <Text>Receipts Selected: <b>{selectedReceiptKeys.length}</b></Text><br />
            <Text>Total Cash Amount: <b style={{ color: '#22C55E', fontSize: 16 }}>₹ {selectedTotal.toLocaleString('en-IN')}</b></Text>
          </div>

          <Button
            icon={<CalculatorOutlined />}
            onClick={() => setIsDenomModalOpen(true)}
            style={{ marginBottom: 16, width: '100%', borderColor: '#F97316', color: '#F97316', fontWeight: 600 }}
          >
            Count Physical Currency Notes (₹500, ₹200, ₹100...)
          </Button>

          <Form.Item name="financial_year_id" label="Financial Year" rules={[{ required: true, message: 'Select Financial Year' }]}>
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name} {fy.is_current ? '(Active)' : ''}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes / Handover Reference / Denominations">
            <Input.TextArea rows={2} placeholder="Optional handover notes or denomination summary" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
                Confirm & Submit to Treasurer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Cash Denomination Calculator Modal */}
      <CashDenominationModal
        open={isDenomModalOpen}
        onClose={() => setIsDenomModalOpen(false)}
        targetTotal={selectedTotal}
        onConfirmNotes={(denomSummary) => {
          const currentNotes = form.getFieldValue('notes') || '';
          form.setFieldsValue({
            notes: currentNotes ? `${currentNotes} | ${denomSummary}` : denomSummary,
          });
        }}
      />

      {/* Printable Cash Handover Slip Modal */}
      <PrintHandoverSlipModal
        open={Boolean(selectedSlipData)}
        onClose={() => setSelectedSlipData(null)}
        data={selectedSlipData}
      />

      {/* Trustee Bank Credit & UTR Verification Modal */}
      {verifyModalReceipt && (
        <Modal
          title={
            <Space>
              <BankOutlined style={{ color: '#22C55E' }} />
              <span>Verify Bank Credit & UTR Reference</span>
            </Space>
          }
          open={Boolean(verifyModalReceipt)}
          onCancel={() => setVerifyModalReceipt(null)}
          footer={null}
          destroyOnHidden
        >
          <Form
            layout="vertical"
            initialValues={{
              upi_reference: verifyModalReceipt.upi_reference || verifyModalReceipt.transaction_ref || verifyModalReceipt.cheque_number || '',
              bank_name: verifyModalReceipt.bank_name || 'HDFC Trust Account',
            }}
            onFinish={(values) => {
              verifyDigitalMutation.mutate({
                id: verifyModalReceipt.id,
                payload: {
                  upi_reference: verifyModalReceipt.payment_mode === 'upi' ? values.upi_reference : undefined,
                  transaction_ref: verifyModalReceipt.payment_mode === 'neft' ? values.upi_reference : undefined,
                  bank_name: values.bank_name,
                },
              });
            }}
          >
            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 16, border: '1px solid #E2E8F0' }}>
              <Row>
                <Col span={12}><b>Receipt No:</b> {verifyModalReceipt.receipt_number}</Col>
                <Col span={12} style={{ textAlign: 'right' }}><b>Donor:</b> {verifyModalReceipt.donor?.full_name || 'Donor'}</Col>
                <Col span={24} style={{ marginTop: 6 }}>
                  <b>Amount to Credit:</b> <span style={{ fontSize: 18, color: '#22C55E', fontWeight: 900 }}>₹ {Number(verifyModalReceipt.amount).toLocaleString('en-IN')}</span>
                </Col>
              </Row>
            </div>

            <Form.Item
              name="upi_reference"
              label={verifyModalReceipt.payment_mode === 'cheque' ? "Cheque Number" : "Bank UTR / Transaction Reference #"}
              rules={[{ required: true, message: 'Enter or confirm UTR / Transaction Reference Number' }]}
            >
              <Input placeholder="Enter UTR / Transaction Ref # from Bank Passbook" prefix={<Tag color="cyan">UTR</Tag>} />
            </Form.Item>

            <Form.Item name="bank_name" label="Verified Bank / Account">
              <Input placeholder="e.g. HDFC Trust Main Account" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setVerifyModalReceipt(null)}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={verifyDigitalMutation.isPending}
                  style={{ background: '#22C55E', borderColor: '#22C55E', borderRadius: 8, fontWeight: 700 }}
                >
                  Confirm Credit & Settle
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default SettlementsPage;
