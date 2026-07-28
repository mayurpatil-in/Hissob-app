import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Row, Col, Typography, Tabs, App, Tooltip, Segmented, Avatar, Checkbox
} from 'antd';
import {
  CheckOutlined, CloseOutlined, PlusOutlined,
  CheckCircleOutlined, ClockCircleOutlined, RightOutlined, BankOutlined,
  PrinterOutlined, CalculatorOutlined, UnorderedListOutlined, AppstoreOutlined,
  SearchOutlined, DownloadOutlined, AuditOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSettlements, submitSettlement, verifySettlement, getReceipts, getFinancialYears, settleReceipt
} from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import CashDenominationModal from './CashDenominationModal';
import PrintHandoverSlipModal, { type HandoverSlipData } from './PrintHandoverSlipModal';
import { exportToCSV, exportToExcel } from '../../utils/exportTable';
import dayjs from 'dayjs';

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchText, setSearchText] = useState<string>('');

  React.useEffect(() => {
    if (location.state?.preselectedReceiptIds && location.state.preselectedReceiptIds.length > 0) {
      setSelectedReceiptKeys(location.state.preselectedReceiptIds);
      setIsSubmitModalOpen(true);
    }
  }, [location.state]);

  const [form] = Form.useForm();

  const { user, can } = useAuthStore();
  const privilegedRoles = ['treasurer', 'org_admin', 'org admin', 'organization admin', 'organization_admin', 'admin', 'president', 'super_admin', 'super admin', 'trustee'];
  const canVerify = user?.is_super_admin || can('cash_settlement', 'approve') || (user as any)?.roles?.some((r: any) =>
    privilegedRoles.includes((r.name || r.slug || '').toLowerCase())
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

  const totalPendingCash = pendingReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  const totalSettledCash = settlements.filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
  const pendingCashBatches = settlements.filter((s: any) => s.status === 'submitted').length;
  const pendingDigitalCount = pendingDigitalReceipts.length;

  const filteredPendingReceipts = pendingReceipts.filter((r: any) => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      (r.receipt_number && String(r.receipt_number).toLowerCase().includes(lower)) ||
      (r.donor?.full_name && String(r.donor.full_name).toLowerCase().includes(lower)) ||
      (r.collector_name && String(r.collector_name).toLowerCase().includes(lower))
    );
  });

  const filteredSettlements = settlements.filter((s: any) => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      (s.settlement_number && String(s.settlement_number).toLowerCase().includes(lower)) ||
      (s.notes && String(s.notes).toLowerCase().includes(lower)) ||
      (s.status && String(s.status).toLowerCase().includes(lower))
    );
  });

  const filteredDigitalReceipts = displayedDigitalReceipts.filter((r: any) => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      (r.receipt_number && String(r.receipt_number).toLowerCase().includes(lower)) ||
      (r.donor?.full_name && String(r.donor.full_name).toLowerCase().includes(lower)) ||
      (r.upi_reference && String(r.upi_reference).toLowerCase().includes(lower)) ||
      (r.transaction_ref && String(r.transaction_ref).toLowerCase().includes(lower)) ||
      (r.bank_name && String(r.bank_name).toLowerCase().includes(lower))
    );
  });

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
      label: <span><ClockCircleOutlined /> Unsettled Cash Receipts ({pendingReceipts.length})</span>,
      children: (
        <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Text type="secondary">Select cash receipts collected to submit settlement batch to Treasurer</Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={selectedReceiptKeys.length === 0}
              onClick={handleOpenSubmitModal}
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                borderColor: '#F97316',
                borderRadius: 8,
                fontWeight: 800,
                boxShadow: selectedReceiptKeys.length > 0 ? '0 4px 14px rgba(249, 115, 22, 0.3)' : 'none',
              }}
            >
              Submit Settlement ({selectedReceiptKeys.length} Receipts - ₹ {selectedTotal.toLocaleString('en-IN')})
            </Button>
          </div>

          {viewMode === 'table' ? (
            <Table
              rowSelection={{
                selectedRowKeys: selectedReceiptKeys,
                onChange: (keys) => setSelectedReceiptKeys(keys),
              }}
              dataSource={filteredPendingReceipts}
              columns={receiptColumns}
              rowKey="id"
              loading={isReceiptsLoading}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              scroll={{ x: 700 }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredPendingReceipts.map((record: any) => {
                const isChecked = selectedReceiptKeys.includes(record.id);
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={record.id}>
                    <Card
                      hoverable
                      onClick={() => {
                        if (isChecked) {
                          setSelectedReceiptKeys(selectedReceiptKeys.filter(k => k !== record.id));
                        } else {
                          setSelectedReceiptKeys([...selectedReceiptKeys, record.id]);
                        }
                      }}
                      style={{
                        borderRadius: 14,
                        border: isChecked ? '2px solid #F97316' : '1px solid #E2E8F0',
                        backgroundColor: isChecked ? '#FFF7ED' : '#FFFFFF',
                        boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.receipt_number}
                        </span>
                        <Checkbox checked={isChecked} style={{ transform: 'scale(1.2)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Avatar style={{ backgroundColor: '#2563EB', fontWeight: 900, flexShrink: 0 }} size={36}>
                          {record.donor?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                        </Avatar>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {record.donor?.full_name || 'Anonymous Donor'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>📅 {record.receipt_date}</div>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Amount</Text>
                          <div style={{ fontWeight: 900, fontSize: 17, color: '#059669' }}>
                            ₹ {Number(record.amount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <Tag color="orange" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                          👤 {record.collector_name || 'Collector'}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'verification',
      label: <span><CheckCircleOutlined /> Treasurer Cash Verification Queue ({pendingCashBatches})</span>,
      children: (
        <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
          {viewMode === 'table' ? (
            <Table
              dataSource={filteredSettlements}
              columns={settlementColumns}
              rowKey="id"
              loading={isSettlementsLoading}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              scroll={{ x: 700 }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredSettlements.map((record: any) => {
                const tag = STATUS_TAGS[record.status] || { color: 'default', label: record.status.toUpperCase() };
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.settlement_number}
                        </span>
                        <Tag color={tag.color} style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                          {tag.label}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                        📅 Handover Date: {record.settlement_date}
                      </div>
                      <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 12, border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Total Cash</Text>
                          <div style={{ fontWeight: 900, fontSize: 18, color: '#22C55E' }}>
                            ₹ {Number(record.total_amount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <Tag color="purple" style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                          📦 {record.receipt_count} Receipts
                        </Tag>
                      </div>
                      {record.notes && (
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, flexGrow: 1 }}>
                          📝 <b>Notes:</b> {record.notes}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center', paddingTop: 10, borderTop: '1px dashed #E2E8F0' }}>
                        <Button
                          size="small"
                          icon={<PrinterOutlined />}
                          onClick={() => setSelectedSlipData({
                            settlementNumber: record.settlement_number,
                            settlementDate: record.settlement_date,
                            collectorName: user?.full_name || 'Collector',
                            totalAmount: Number(record.total_amount),
                            receiptCount: record.receipt_count,
                            notes: record.notes,
                            status: record.status,
                          })}
                        >
                          Slip
                        </Button>
                        {record.status === 'submitted' && canVerify && (
                          <>
                            <Button
                              type="primary"
                              icon={<CheckOutlined />}
                              size="small"
                              style={{ background: '#22C55E', borderColor: '#22C55E' }}
                              onClick={() => verifyMutation.mutate({ id: record.id, action: 'approve' })}
                            >
                              Approve
                            </Button>
                            <Button
                              danger
                              icon={<CloseOutlined />}
                              size="small"
                              onClick={() => verifyMutation.mutate({ id: record.id, action: 'reject', rejection_reason: 'Amount discrepancy' })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'bank_verification',
      label: <span><BankOutlined /> UPI & Bank Verification ({pendingDigitalCount})</span>,
      children: (
        <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
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
              style={{ fontWeight: 700 }}
            />
          </div>

          {viewMode === 'table' ? (
            <Table
              dataSource={filteredDigitalReceipts}
              columns={digitalReceiptColumns}
              rowKey="id"
              loading={isDigitalLoading}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              scroll={{ x: 700 }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredDigitalReceipts.map((record: any) => {
                const isSettled = record.status === 'settled';
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.receipt_number}
                        </span>
                        <Tag color={isSettled ? 'success' : 'processing'} style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                          {isSettled ? 'BANK SETTLED' : 'AWAITING CREDIT'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Avatar style={{ backgroundColor: '#059669', fontWeight: 900, flexShrink: 0 }} size={36}>
                          {record.donor?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                        </Avatar>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {record.donor?.full_name || 'Anonymous Donor'}
                          </div>
                          <Tag color="cyan" style={{ fontSize: 10, marginTop: 2 }}>{record.payment_mode?.toUpperCase()}</Tag>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 12, border: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Amount</Text>
                          <span style={{ fontWeight: 900, fontSize: 17, color: '#22C55E' }}>
                            ₹ {Number(record.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#475569' }}>
                          <b>Ref/UTR:</b> {record.upi_reference || record.transaction_ref || record.cheque_number || 'N/A'}
                        </div>
                        {record.bank_name && (
                          <div style={{ fontSize: 11, color: '#64748B' }}><b>Bank:</b> {record.bank_name}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 10, borderTop: '1px dashed #E2E8F0' }}>
                        {isSettled ? (
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
                          <Tag color="gold">Awaiting Trustee Review</Tag>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div className="settlements-module animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: '1 1 300px', minWidth: '240px' }}>
          <Title level={3} style={{ margin: 0, color: '#0F172A', fontWeight: 900 }}>
            Cash & Bank Settlement Workflow
          </Title>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 4 }}>
            Cash & UPI Collections <RightOutlined style={{ fontSize: 10, margin: '0 4px' }} /> Trustee & Treasurer Bank Verification <RightOutlined style={{ fontSize: 10, margin: '0 4px' }} /> Cash Book Posting
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '0 0 auto' }}>
          <Button
            icon={<CalculatorOutlined />}
            size="large"
            onClick={() => setIsDenomModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              borderColor: '#2563EB',
              borderRadius: 8,
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            }}
          >
            Currency Note Calculator
          </Button>
        </div>
      </div>

      {/* ── Quick Overview Metric Cards ── */}
      <div className="hissob-stat-row" style={{ marginBottom: 20 }}>
        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #1E40AF', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                UNSETTLED CASH
              </Text>
              <Avatar style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', flexShrink: 0 }} icon={<ClockCircleOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#0F172A', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalPendingCash.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{pendingReceipts.length} Receipts Pending</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #059669', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                SETTLED CASH
              </Text>
              <Avatar style={{ backgroundColor: '#D1FAE5', color: '#059669', flexShrink: 0 }} icon={<CheckCircleOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#059669', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalSettledCash.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Verified by Treasurer</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #F59E0B', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                CASH VERIFY QUEUE
              </Text>
              <Avatar style={{ backgroundColor: '#FEF3C7', color: '#D97706', flexShrink: 0 }} icon={<AuditOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#D97706', fontWeight: 900 }}>
              {pendingCashBatches}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Batches Awaiting Review</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #6366F1', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                UPI / BANK QUEUE
              </Text>
              <Avatar style={{ backgroundColor: '#E0E7FF', color: '#4F46E5', flexShrink: 0 }} icon={<BankOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#4F46E5', fontWeight: 900 }}>
              {pendingDigitalCount}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Unverified Digital Receipts</Text>
          </Card>
        </div>
      </div>

      {/* ── Directory Controls Bar ── */}
      <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Input
            placeholder="Search receipt #, donor, collector, UTR, or notes..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            allowClear
            style={{ width: 320, borderRadius: 8 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="middle"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => exportToCSV(settlements.map((s: any) => ({
                settlement_number: s.settlement_number,
                date: s.settlement_date,
                receipt_count: s.receipt_count,
                total_amount: Number(s.total_amount || 0).toLocaleString('en-IN'),
                status: s.status?.toUpperCase(),
              })), `Settlements_${dayjs().format('YYYYMMDD')}`, [
                { key: 'settlement_number', title: 'Settlement #' },
                { key: 'date', title: 'Date' },
                { key: 'receipt_count', title: 'Receipts' },
                { key: 'total_amount', title: 'Total Cash (₹)' },
                { key: 'status', title: 'Status' },
              ])}
            >
              CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              style={{ color: '#22C55E', borderColor: '#22C55E' }}
              onClick={() => exportToExcel(settlements.map((s: any) => ({
                settlement_number: s.settlement_number,
                date: s.settlement_date,
                receipt_count: s.receipt_count,
                total_amount: Number(s.total_amount || 0),
                status: s.status?.toUpperCase(),
              })), `Settlements_${dayjs().format('YYYYMMDD')}`, [
                { key: 'settlement_number', title: 'Settlement #' },
                { key: 'date', title: 'Date' },
                { key: 'receipt_count', title: 'Receipts' },
                { key: 'total_amount', title: 'Total Cash (₹)' },
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
      </Card>

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
