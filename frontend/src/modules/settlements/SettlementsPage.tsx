import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Row, Col, Typography, Tabs, App, Tooltip
} from 'antd';
import {
  CheckOutlined, CloseOutlined, PlusOutlined,
  CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSettlements, submitSettlement, verifySettlement, getReceipts, getFinancialYears
} from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  submitted: { color: 'warning', label: 'SUBMITTED FOR VERIFICATION' },
  approved: { color: 'success', label: 'APPROVED & SETTLED' },
  rejected: { color: 'error', label: 'REJECTED' },
};

const SettlementsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedReceiptKeys, setSelectedReceiptKeys] = useState<React.Key[]>([]);

  const [form] = Form.useForm();

  // Queries
  const { data: settlements = [], isLoading: isSettlementsLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => getSettlements(),
  });

  const { data: pendingReceipts = [], isLoading: isReceiptsLoading } = useQuery({
    queryKey: ['receipts', 'pending_settlement'],
    queryFn: () => getReceipts({ status: 'pending_settlement', payment_mode: 'cash' }),
  });

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
          {record.status === 'submitted' && (
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
          )}
        </Space>
      ),
    },
  ];

  const receiptColumns = [
    { title: 'Receipt #', dataIndex: 'receipt_number', key: 'receipt_number', render: (t: string) => <b>{t}</b> },
    { title: 'Date', dataIndex: 'receipt_date', key: 'receipt_date' },
    { title: 'Donor', dataIndex: 'donor', key: 'donor', render: (d: any) => d?.full_name || 'Donor' },
    { title: 'Amount (₹)', dataIndex: 'amount', key: 'amount', render: (val: number) => `₹ ${Number(val).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (st: string) => <Tag color="warning">{st.toUpperCase()}</Tag> },
  ];

  const tabItems = [
    {
      key: 'verification',
      label: <span><CheckCircleOutlined /> Treasurer Verification Queue</span>,
      children: (
        <Card className="hissob-card">
          <Table
            dataSource={settlements}
            columns={settlementColumns}
            rowKey="id"
            loading={isSettlementsLoading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'unsettled',
      label: <span><ClockCircleOutlined /> Unsettled Cash Receipts</span>,
      children: (
        <Card className="hissob-card">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">Select cash receipts collected to submit settlement batch to Treasurer</Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={selectedReceiptKeys.length === 0}
              onClick={() => setIsSubmitModalOpen(true)}
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
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="settlements-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Cash Settlement Workflow</Title>
          <Text type="secondary">Collector cash hand-over submission $\rightarrow$ Treasurer verification & cash book posting</Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Total Settlements</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347' }}>{settlements.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Approved & Settled Cash</Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E' }}>
              ₹ {settlements.filter((s: any) => s.status === 'approved').reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0).toLocaleString('en-IN')}
            </Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Pending Verification</Text>
            <Title level={3} style={{ margin: 0, color: '#F59E0B' }}>
              {settlements.filter((s: any) => s.status === 'submitted').length}
            </Title>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="verification" items={tabItems} />

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

          <Form.Item name="financial_year_id" label="Financial Year" rules={[{ required: true }]}>
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes / Handover Reference">
            <Input.TextArea rows={2} placeholder="Optional handover notes for Treasurer" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Confirm & Submit to Treasurer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SettlementsPage;
