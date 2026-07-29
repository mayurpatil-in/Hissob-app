import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input,
  Select, Card, Row, Col, Typography, App, Tooltip, Avatar, Segmented
} from 'antd';
import {
  PlusOutlined, PrinterOutlined, RobotOutlined, CheckCircleOutlined, WhatsAppOutlined, DownloadOutlined, RocketOutlined,
  AppstoreOutlined, UnorderedListOutlined, DollarOutlined, EditOutlined, DeleteOutlined, CloseOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getReceipts, createReceipt, updateReceipt, cancelReceipt, deleteReceipt, settleReceipt, getDonors, getFinancialYears, getFestivals, getMyOrganization } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { generateWhatsAppReceiptLink } from '../../utils/whatsapp';
import { printReceiptWindow, shareReceiptViaWhatsApp, downloadReceiptImage, preGenerateReceiptBlob } from '../../utils/printReceipt';
import { exportToCSV, exportToExcel } from '../../utils/exportTable';
import AIVoiceAssistantModal from '../ai/AIVoiceAssistantModal';
import CollectorDailySummaryModal from '../settlements/CollectorDailySummaryModal';
import ReceiptFormModal from './ReceiptFormModal';
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
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user, can } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null);
  const [cancelModalReceipt, setCancelModalReceipt] = useState<any | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(
    typeof window !== 'undefined' && window.innerWidth <= 768 ? 'grid' : 'table'
  );

  const canSettle = user?.is_super_admin || can('receipts', 'approve') || can('cash_settlement', 'approve') || (user as any)?.roles?.some((r: any) =>
    ['treasurer', 'org_admin', 'admin', 'president', 'trustee'].includes((r.name || r.slug || '').toLowerCase())
  );

  const isOrgAdmin = user?.is_super_admin || (user as any)?.roles?.some((r: any) =>
    ['org_admin', 'org admin', 'organization_admin', 'organization admin', 'admin', 'president', 'super_admin', 'super admin'].includes((r.name || r.slug || '').toLowerCase())
  );

  // Queries
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', filterStatus],
    queryFn: () => getReceipts({ status: filterStatus || undefined }),
  });

  const { data: donors = [] } = useQuery({ queryKey: ['donors'], queryFn: () => getDonors() });
  const { data: fiscalYears = [] } = useQuery({ queryKey: ['financialYears'], queryFn: getFinancialYears });
  const { data: festivals = [] } = useQuery({ queryKey: ['festivals'], queryFn: () => getFestivals() });
  const { data: myOrg } = useQuery({ queryKey: ['myOrganization'], queryFn: getMyOrganization });

  const canPermanentlyDelete = isOrgAdmin && (user?.is_super_admin || myOrg?.allow_permanent_deletion !== false);

  // Pre-generate receipt image blobs in the background so the Share panel
  // opens immediately on mobile (within the browser's 1-second user-gesture window)
  useEffect(() => {
    if (!receipts?.length) return;
    const orgName = myOrg?.name || 'Hisob ERP';
    // Stagger pre-generation to avoid overloading (one per second)
    receipts.forEach((receipt: any, idx: number) => {
      setTimeout(() => {
        preGenerateReceiptBlob(receipt, orgName).catch(() => {});
      }, idx * 1000);
    });
  }, [receipts, myOrg]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createReceipt,
    onSuccess: () => {
      message.success('Receipt created successfully!');
      setIsModalOpen(false);
      setEditingReceipt(null);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create receipt');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) => updateReceipt(id, values),
    onSuccess: () => {
      message.success('Receipt updated successfully!');
      setIsModalOpen(false);
      setEditingReceipt(null);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update receipt');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelReceipt(id, reason),
    onSuccess: () => {
      message.success('Receipt marked as CANCELLED!');
      setCancelModalReceipt(null);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to cancel receipt');
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => {
      message.success('Receipt permanently deleted!');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to delete receipt');
    },
  });

  const settleMutation = useMutation({
    mutationFn: settleReceipt,
    onSuccess: () => {
      message.success('Receipt status updated to SETTLED!');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to settle receipt');
    },
  });

  const [form] = Form.useForm();
  const [cancelForm] = Form.useForm();

  const handleOpenModal = () => {
    setEditingReceipt(null);
    const activeFy = fiscalYears.find((fy: any) => fy.is_current) || fiscalYears[0];
    form.resetFields();
    if (activeFy) {
      form.setFieldsValue({
        financial_year_id: activeFy.id,
        payment_mode: 'cash',
        receipt_date: dayjs()
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: any) => {
    setEditingReceipt(record);
    form.resetFields();
    setTimeout(() => {
      form.setFieldsValue({
        financial_year_id: record.financial_year_id,
        festival_id: record.festival_id,
        donor_id: record.donor_id || record.donor?.id,
        amount: Number(record.amount),
        payment_mode: record.payment_mode,
        receipt_date: dayjs(record.receipt_date),
        purpose: record.purpose,
        upi_reference: record.upi_reference,
        cheque_number: record.cheque_number,
        bank_name: record.bank_name,
        transaction_ref: record.transaction_ref,
      });
    }, 0);
    setIsModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      receipt_date: values.receipt_date ? values.receipt_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    };

    if (editingReceipt) {
      updateMutation.mutate({ id: editingReceipt.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Calculations (Exclude cancelled receipts from gross collection)
  const validReceipts = receipts.filter(r => r.status !== 'cancelled');
  const totalCollected = validReceipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalSettled = receipts.filter(r => r.status === 'settled').reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const cancelledCount = receipts.filter(r => r.status === 'cancelled').length;

  const columns = [
    {
      title: 'Receipt #',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      render: (num: string) => <b style={{ whiteSpace: 'nowrap', color: '#1E40AF', fontFamily: 'monospace' }}>{num}</b>,
    },
    {
      title: 'Date',
      dataIndex: 'receipt_date',
      key: 'receipt_date',
      render: (d: string) => <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#475569' }}>{d ? dayjs(d).format('DD-MM-YYYY') : ''}</span>,
    },
    {
      title: 'Donor',
      dataIndex: 'donor',
      key: 'donor',
      render: (donor: any) => (
        <Space size={8}>
          <Avatar style={{ backgroundColor: '#2563EB', fontWeight: 800 }} size="small">
            {donor?.full_name?.charAt(0)?.toUpperCase() || 'D'}
          </Avatar>
          <span style={{ fontWeight: 700, color: '#0F172A' }}>{donor?.full_name || 'Anonymous'}</span>
        </Space>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => (
        <span style={{ fontWeight: 800, color: '#059669', fontSize: 14, whiteSpace: 'nowrap' }}>
          ₹ {Number(val).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => (
        <Tag color="purple" style={{ textTransform: 'uppercase', fontWeight: 700, borderRadius: 6 }}>
          {mode}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const tag = STATUS_TAGS[st] || { color: 'default', label: st.toUpperCase() };
        return <Tag color={tag.color} style={{ fontWeight: 700, borderRadius: 6 }}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="Share Voucher on WhatsApp">
            <Button
              icon={<WhatsAppOutlined style={{ color: '#25D366' }} />}
              size="small"
              onClick={() => {
                const link = generateWhatsAppReceiptLink({
                  receiptId: record.id,
                  receiptNumber: record.receipt_number,
                  donorName: record.donor?.full_name || 'Donor',
                  donorPhone: record.donor?.phone,
                  amount: record.amount,
                  paymentMode: record.payment_mode,
                  receiptDate: record.receipt_date,
                  purpose: record.purpose,
                  orgName: myOrg?.name,
                });
                window.open(link, '_blank');
              }}
            />
          </Tooltip>
          <Tooltip title="Share Image via WhatsApp">
            <Button
              icon={<WhatsAppOutlined />}
              size="small"
              type="primary"
              style={{ background: '#25D366', borderColor: '#25D366' }}
              onClick={() => shareReceiptViaWhatsApp(record, myOrg?.name || 'Hisob ERP')}
            />
          </Tooltip>
          <Tooltip title="Download Receipt Image (PNG)">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              style={{ color: '#059669', borderColor: '#A7F3D0', background: '#ECFDF5' }}
              onClick={() => downloadReceiptImage(record, myOrg?.name || 'Hisob ERP')}
            />
          </Tooltip>
          <Tooltip title="Print Professional Receipt">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              type="primary"
              style={{ background: '#0B2347', borderColor: '#0B2347' }}
              onClick={() => printReceiptWindow(record, myOrg?.name || 'Hisob ERP')}
            />
          </Tooltip>
          {record.status !== 'cancelled' ? (
            <>
              <Tooltip title="Edit Receipt Details">
                <Button
                  icon={<EditOutlined style={{ color: '#2563EB' }} />}
                  size="small"
                  onClick={() => handleOpenEditModal(record)}
                />
              </Tooltip>
              <Tooltip title="Cancel / Void Receipt">
                <Button
                  icon={<CloseOutlined style={{ color: '#EF4444' }} />}
                  size="small"
                  onClick={() => setCancelModalReceipt(record)}
                />
              </Tooltip>
            </>
          ) : canPermanentlyDelete ? (
            <Tooltip title="Permanently Purge / Delete from Database (Org Admin Only)">
              <Button
                danger
                type="dashed"
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: `Permanently delete ${record.receipt_number}?`,
                    content: 'This will purge the receipt permanently from the database. This action cannot be undone.',
                    okText: 'Permanently Delete',
                    okButtonProps: { danger: true },
                    onOk: () => hardDeleteMutation.mutate(record.id),
                  });
                }}
              />
            </Tooltip>
          ) : null}
          {record.status !== 'settled' && record.status !== 'cancelled' && canSettle && (
            <Tooltip title="Verify Credit & Mark Settled (Trustee / Treasurer)">
              <Button
                icon={<CheckCircleOutlined />}
                size="small"
                style={{ color: '#22C55E' }}
                onClick={() => settleMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="receipts-module animate-fadeIn" style={{ paddingBottom: 24 }}>
      {/* ── Responsive Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900, letterSpacing: '-0.3px' }}>
            🧾 Donation Receipts & Vouchers
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage collections, issue digital receipts, track settlements, and print vouchers
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', maxWidth: 'max-content' }}>
          <Button
            icon={<RocketOutlined style={{ color: '#F97316' }} />}
            size="large"
            onClick={() => setIsEodModalOpen(true)}
            style={{ fontWeight: 600, borderRadius: 8, flex: '1 1 auto' }}
          >
            Daily EOD
          </Button>
          <Button
            icon={<RobotOutlined />}
            size="large"
            onClick={() => setIsAiModalOpen(true)}
            style={{ color: '#F97316', borderColor: '#F97316', borderRadius: 8, flex: '1 1 auto' }}
          >
            AI Entry
          </Button>
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
              flex: '1 1 auto'
            }}
          >
            + New Receipt
          </Button>
        </div>
      </div>

      {/* ── Quick Overview Metric Cards ── */}
      <div className="hissob-stat-row" style={{ marginBottom: 20 }}>
        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #1E40AF', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL COLLECTION
              </Text>
              <Avatar style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', flexShrink: 0 }} icon={<DollarOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#0F172A', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalCollected.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Gross Received</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #059669', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL SETTLED
              </Text>
              <Avatar style={{ backgroundColor: '#D1FAE5', color: '#059669', flexShrink: 0 }} icon={<CheckCircleOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#059669', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalSettled.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Bank Verified</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #F97316', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                RECEIPTS COUNT
              </Text>
              <Avatar style={{ backgroundColor: '#FFEDD5', color: '#F97316', flexShrink: 0 }} icon={<PrinterOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#F97316', fontWeight: 900 }}>
              {validReceipts.length}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
              {cancelledCount > 0 ? `Active (${cancelledCount} Voided)` : 'Issued Documents'}
            </Text>
          </Card>
        </div>
      </div>

      {/* ── Main Directory Controls & View Switcher ── */}
      <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 220, maxWidth: '100%' }}
            onChange={(val) => setFilterStatus(val || '')}
            size="middle"
          >
            <Option value="issued">🔵 ISSUED</Option>
            <Option value="pending_settlement">🟡 PENDING SETTLEMENT</Option>
            <Option value="settled">🟢 SETTLED</Option>
            <Option value="cancelled">🔴 CANCELLED</Option>
          </Select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => exportToCSV(receipts.map(r => ({
                receipt_number: r.receipt_number,
                receipt_date: r.receipt_date,
                donor: (r as any).donor?.full_name || 'N/A',
                amount: Number(r.amount).toLocaleString('en-IN'),
                payment_mode: r.payment_mode?.toUpperCase(),
                status: r.status?.toUpperCase(),
                purpose: (r as any).purpose || '',
              })), `Receipts_${dayjs().format('YYYYMMDD')}`, [
                { key: 'receipt_number', title: 'Receipt #' },
                { key: 'receipt_date', title: 'Date' },
                { key: 'donor', title: 'Donor' },
                { key: 'amount', title: 'Amount (₹)' },
                { key: 'payment_mode', title: 'Mode' },
                { key: 'status', title: 'Status' },
                { key: 'purpose', title: 'Purpose' },
              ])}
            >
              CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              style={{ color: '#22C55E', borderColor: '#22C55E' }}
              onClick={() => exportToExcel(receipts.map(r => ({
                receipt_number: r.receipt_number,
                receipt_date: r.receipt_date,
                donor: (r as any).donor?.full_name || 'N/A',
                amount: Number(r.amount),
                payment_mode: r.payment_mode?.toUpperCase(),
                status: r.status?.toUpperCase(),
                purpose: (r as any).purpose || '',
              })), `Receipts_${dayjs().format('YYYYMMDD')}`, [
                { key: 'receipt_number', title: 'Receipt #' },
                { key: 'receipt_date', title: 'Date' },
                { key: 'donor', title: 'Donor' },
                { key: 'amount', title: 'Amount (₹)' },
                { key: 'payment_mode', title: 'Mode' },
                { key: 'status', title: 'Status' },
                { key: 'purpose', title: 'Purpose' },
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
            dataSource={receipts}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 700 }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {receipts.map((record: any) => {
              const tag = STATUS_TAGS[record.status] || { color: 'default', label: (record.status || '').toUpperCase() };
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={record.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.receipt_number}
                        </span>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          📅 {record.receipt_date ? dayjs(record.receipt_date).format('DD-MM-YYYY') : ''}
                        </div>
                      </div>
                      <Tag color={tag.color} style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                        {tag.label}
                      </Tag>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar style={{ backgroundColor: '#2563EB', fontWeight: 900 }} size={38}>
                        {record.donor?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>
                          {record.donor?.full_name || 'Anonymous Donor'}
                        </div>
                        {record.donor?.phone && (
                          <div style={{ fontSize: 11, color: '#64748B' }}>📞 +91 {record.donor.phone}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 12, border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Amount</Text>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#059669' }}>
                          ₹ {Number(record.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Tag color="purple" style={{ textTransform: 'uppercase', fontWeight: 800, borderRadius: 6, margin: 0 }}>
                        {record.payment_mode}
                      </Tag>
                    </div>

                    {record.purpose && (
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
                        🎯 <b>Cause:</b> {record.purpose}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        icon={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11 }}
                        onClick={() => {
                          const link = generateWhatsAppReceiptLink({
                            receiptId: record.id,
                            receiptNumber: record.receipt_number,
                            donorName: record.donor?.full_name || 'Donor',
                            donorPhone: record.donor?.phone,
                            amount: record.amount,
                            paymentMode: record.payment_mode,
                            receiptDate: record.receipt_date,
                            purpose: record.purpose,
                            orgName: myOrg?.name,
                          });
                          window.open(link, '_blank');
                        }}
                      >
                        WhatsApp Text
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        icon={<WhatsAppOutlined />}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, background: '#25D366', borderColor: '#25D366' }}
                        onClick={() => shareReceiptViaWhatsApp(record, myOrg?.name || 'Hisob ERP')}
                      >
                        Share Image
                      </Button>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, color: '#059669', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                        onClick={() => downloadReceiptImage(record, myOrg?.name || 'Hisob ERP')}
                      >
                        Download Image
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PrinterOutlined />}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, background: '#0B2347', borderColor: '#0B2347' }}
                        onClick={() => printReceiptWindow(record, myOrg?.name || 'Hisob ERP')}
                      >
                        Print
                      </Button>
                      {record.status !== 'cancelled' ? (
                        <>
                          <Button
                            size="small"
                            icon={<EditOutlined style={{ color: '#2563EB' }} />}
                            style={{ flex: '1 1 auto', fontWeight: 600, fontSize: 11 }}
                            onClick={() => handleOpenEditModal(record)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            icon={<CloseOutlined style={{ color: '#EF4444' }} />}
                            style={{ flex: '1 1 auto', fontWeight: 600, fontSize: 11, color: '#EF4444' }}
                            onClick={() => setCancelModalReceipt(record)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : canPermanentlyDelete ? (
                        <Button
                          size="small"
                          danger
                          type="dashed"
                          icon={<DeleteOutlined />}
                          style={{ flex: '1 1 auto', fontWeight: 600, fontSize: 11 }}
                          onClick={() => {
                            Modal.confirm({
                              title: `Permanently delete ${record.receipt_number}?`,
                              content: 'This will purge the receipt permanently from the database. This action cannot be undone.',
                              okText: 'Permanently Delete',
                              okButtonProps: { danger: true },
                              onOk: () => hardDeleteMutation.mutate(record.id),
                            });
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
                      {record.status !== 'settled' && record.status !== 'cancelled' && canSettle && (
                        <Button
                          size="small"
                          icon={<CheckCircleOutlined style={{ color: '#22C55E' }} />}
                          style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, borderColor: '#86EFAC' }}
                          onClick={() => settleMutation.mutate(record.id)}
                        >
                          Settle
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* ── Create / Edit Receipt Modal ── */}
      <ReceiptFormModal
        open={isModalOpen}
        editingReceipt={editingReceipt}
        form={form}
        donors={donors}
        fiscalYears={fiscalYears}
        festivals={festivals}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onCancel={() => { setIsModalOpen(false); setEditingReceipt(null); }}
        onSubmit={handleSubmit}
      />

      {/* ── Cancel Receipt Confirmation Modal ── */}
      <Modal
        open={Boolean(cancelModalReceipt)}
        onCancel={() => setCancelModalReceipt(null)}
        footer={null}
        destroyOnHidden
        width={480}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '20px 24px', background: '#FEF2F2', borderBottom: '1px solid #FEE2E2' }}>
          <Title level={4} style={{ margin: 0, color: '#DC2626', fontWeight: 900 }}>
            Cancel Receipt #{cancelModalReceipt?.receipt_number}?
          </Title>
          <Text type="secondary" style={{ fontSize: 12, color: '#991B1B' }}>
            This will void receipt credit ₹{Number(cancelModalReceipt?.amount || 0).toLocaleString('en-IN')} and adjust donor balance.
          </Text>
        </div>
        <div style={{ padding: 24 }}>
          <Form
            form={cancelForm}
            layout="vertical"
            onFinish={(values) => cancelMutation.mutate({ id: cancelModalReceipt.id, reason: values.reason })}
          >
            <Form.Item
              name="reason"
              label={<span style={{ fontWeight: 700, color: '#0F172A' }}>Cancellation Reason</span>}
              rules={[{ required: true, message: 'Please enter a cancellation reason' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="e.g. Entered wrong donation amount, duplicate receipt, or donor requested voiding"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <Button onClick={() => setCancelModalReceipt(null)} style={{ borderRadius: 8, fontWeight: 600 }}>
                Keep Active
              </Button>
              <Button
                type="primary"
                danger
                htmlType="submit"
                loading={cancelMutation.isPending}
                style={{ fontWeight: 800, borderRadius: 8, background: '#DC2626', borderColor: '#DC2626' }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* ── AI Voice Assistant Modal ── */}
      <AIVoiceAssistantModal
        open={isAiModalOpen}
        onCancel={() => setIsAiModalOpen(false)}
        onApplyParsedData={(parsed) => {
          setIsModalOpen(true);
          form.setFieldsValue({
            amount: parsed.amount,
            payment_mode: parsed.payment_mode || 'cash',
            purpose: parsed.purpose,
          });
        }}
      />

      {/* ── Collector Daily EOD Summary Modal ── */}
      <CollectorDailySummaryModal
        open={isEodModalOpen}
        onClose={() => setIsEodModalOpen(false)}
        onOpenSettlementWithReceipts={(ids) => {
          navigate('/settlements', { state: { preselectedReceiptIds: ids } });
        }}
      />
    </div>
  );
};

export default ReceiptsPage;
