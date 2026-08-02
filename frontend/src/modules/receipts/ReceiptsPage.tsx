import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input,
  Select, Card, Row, Col, Typography, App, Tooltip, Avatar, Segmented, Skeleton
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
import { printReceiptWindow, shareReceiptViaWhatsApp, downloadReceiptImage, preGenerateReceiptBlob, isReceiptBlobCached, preloadReceiptFonts } from '../../utils/printReceipt';
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

const ReceiptsPageSkeleton: React.FC = () => (
  <div className="receipts-module animate-fadeIn" style={{ paddingBottom: 24 }}>
    {/* Header Skeleton */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      <div>
        <Skeleton.Input active size="large" style={{ width: 260, height: 32, marginBottom: 8 }} />
        <br />
        <Skeleton.Input active size="small" style={{ width: 380, height: 16 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Skeleton.Button active size="large" style={{ width: 110, borderRadius: 8 }} />
        <Skeleton.Button active size="large" style={{ width: 100, borderRadius: 8 }} />
        <Skeleton.Button active size="large" style={{ width: 140, borderRadius: 8 }} />
      </div>
    </div>

    {/* Metric Cards Skeleton */}
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {[1, 2, 3].map((idx) => (
        <Col xs={24} sm={8} key={idx}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #CBD5E1', height: 105, padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Skeleton.Input active size="small" style={{ width: 120, height: 14 }} />
              <Skeleton.Avatar active size="small" shape="circle" />
            </div>
            <Skeleton.Input active size="large" style={{ width: 130, height: 26, marginBottom: 6 }} />
            <br />
            <Skeleton.Input active size="small" style={{ width: 90, height: 12 }} />
          </Card>
        </Col>
      ))}
    </Row>

    {/* Controls & Table Card Skeleton */}
    <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)', minHeight: 450 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Skeleton.Input active size="middle" style={{ width: 280, height: 36, borderRadius: 6 }} />
          <Skeleton.Input active size="middle" style={{ width: 190, height: 36, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton.Button active size="small" style={{ width: 60, height: 28 }} />
          <Skeleton.Button active size="small" style={{ width: 65, height: 28 }} />
          <Skeleton.Button active size="small" style={{ width: 100, height: 28 }} />
        </div>
      </div>
      <Skeleton active paragraph={{ rows: 7 }} />
    </Card>
  </div>
);

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(
    typeof window !== 'undefined' && window.innerWidth <= 768 ? 'grid' : 'table'
  );
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);



  const handleShareImage = async (record: any) => {
    const key = `share-${record.id}`;
    if (actionLoadingKey) return;
    setActionLoadingKey(key);

    const isCached = isReceiptBlobCached(record.id || record.receipt_number);
    if (!isCached) {
      message.loading({ content: 'Generating receipt image for WhatsApp...', key: 'gen-receipt', duration: 0 });
    }

    // Yield execution to browser loop so button spinner renders before html2canvas starts
    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      await shareReceiptViaWhatsApp(record, myOrg?.name || 'Hisob ERP', myOrg);
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      message.destroy('gen-receipt');
      setActionLoadingKey(null);
    }
  };

  const handleDownloadImage = async (record: any) => {
    const key = `download-${record.id}`;
    if (actionLoadingKey) return;
    setActionLoadingKey(key);

    const isCached = isReceiptBlobCached(record.id || record.receipt_number);
    if (!isCached) {
      message.loading({ content: 'Generating high-resolution PNG receipt...', key: 'gen-receipt', duration: 0 });
    }

    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      await downloadReceiptImage(record, myOrg?.name || 'Hisob ERP', myOrg);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      message.destroy('gen-receipt');
      setActionLoadingKey(null);
    }
  };

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

  // Lazy load form options only when modal is opened to speed up initial page render
  const { data: donors = [] } = useQuery({ queryKey: ['donors'], queryFn: () => getDonors(), enabled: isModalOpen });
  const { data: fiscalYears = [] } = useQuery({ queryKey: ['financialYears'], queryFn: getFinancialYears });
  const { data: festivals = [] } = useQuery({ queryKey: ['festivals'], queryFn: () => getFestivals(), enabled: isModalOpen });
  const { data: myOrg } = useQuery({ queryKey: ['myOrganization'], queryFn: getMyOrganization, staleTime: 5 * 60 * 1000 });

  const filteredReceipts = React.useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase().trim();
    return receipts.filter((r: any) =>
      r.receipt_number?.toLowerCase().includes(q) ||
      r.donor?.full_name?.toLowerCase().includes(q) ||
      (r.donor?.phone && r.donor.phone.includes(q)) ||
      r.purpose?.toLowerCase().includes(q)
    );
  }, [receipts, searchQuery]);

  const canPermanentlyDelete = isOrgAdmin && (user?.is_super_admin || myOrg?.allow_permanent_deletion !== false);

  // Pre-generate receipt image blobs lazily in background using requestIdleCallback.
  // Does NOT block page render — receipts page loads instantly.
  // Uses AbortController so navigation away cancels pending renders.
  useEffect(() => {
    if (!receipts?.length || !myOrg) return;
    const orgName = myOrg?.name || 'Hisob ERP';
    const abortCtrl = new AbortController();

    // Preload receipt fonts on first visit (non-blocking)
    preloadReceiptFonts();

    const runBackgroundPrep = async () => {
      // Only pre-gen the first 3 visible receipts (reduced from 5)
      const topReceipts = receipts.slice(0, 3);
      for (let i = 0; i < topReceipts.length; i++) {
        if (abortCtrl.signal.aborted) break;
        try {
          await preGenerateReceiptBlob(topReceipts[i], orgName, myOrg, abortCtrl.signal);
        } catch (_) {}
      }
    };

    // Use requestIdleCallback to start pre-gen only when browser is idle
    const idleId = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(() => { if (!abortCtrl.signal.aborted) runBackgroundPrep(); }, { timeout: 3000 })
      : setTimeout(() => { if (!abortCtrl.signal.aborted) runBackgroundPrep(); }, 500) as any;

    return () => {
      abortCtrl.abort();
      if (typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
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
      render: (num: string) => <b style={{ whiteSpace: 'nowrap', color: '#3B82F6', fontFamily: 'monospace' }}>{num}</b>,
    },
    {
      title: 'Date',
      dataIndex: 'receipt_date',
      key: 'receipt_date',
      render: (d: string) => <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{d ? dayjs(d).format('DD-MM-YYYY') : ''}</span>,
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
          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{donor?.full_name || 'Anonymous'}</span>
        </Space>
      ),
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => (
        <span style={{ fontWeight: 800, color: '#10B981', fontSize: 14, whiteSpace: 'nowrap' }}>
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
              loading={actionLoadingKey === `share-${record.id}`}
              disabled={Boolean(actionLoadingKey) && actionLoadingKey !== `share-${record.id}`}
              style={{ background: '#25D366', borderColor: '#25D366' }}
              onClick={() => handleShareImage(record)}
            />
          </Tooltip>
          <Tooltip title="Download Receipt Image (PNG)">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              loading={actionLoadingKey === `download-${record.id}`}
              disabled={Boolean(actionLoadingKey) && actionLoadingKey !== `download-${record.id}`}
              style={{ color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.15)' }}
              onClick={() => handleDownloadImage(record)}
            />
          </Tooltip>
          <Tooltip title="Print Professional Receipt">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              type="primary"
              style={{ background: '#2563EB', borderColor: '#2563EB' }}
              onClick={() => printReceiptWindow(record, myOrg?.name || 'Hisob ERP', myOrg)}
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

  if (isLoading) {
    return <ReceiptsPageSkeleton />;
  }

  return (
    <div className="receipts-module animate-fadeIn" style={{ paddingBottom: 24 }}>
      {/* ── Responsive Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, letterSpacing: '-0.3px' }}>
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
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #3B82F6', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL COLLECTION
              </Text>
              <Avatar style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6', flexShrink: 0 }} icon={<DollarOutlined />} size="small" />
            </div>
            {isLoading ? (
              <Skeleton.Button active size="small" style={{ width: 100, height: 22, marginTop: 6 }} />
            ) : (
              <Title level={4} style={{ margin: '4px 0 0 0', color: 'var(--color-text-primary)', fontWeight: 900, whiteSpace: 'nowrap' }}>
                ₹ {totalCollected.toLocaleString('en-IN')}
              </Title>
            )}
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Gross Received</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #10B981', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL SETTLED
              </Text>
              <Avatar style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', flexShrink: 0 }} icon={<CheckCircleOutlined />} size="small" />
            </div>
            {isLoading ? (
              <Skeleton.Button active size="small" style={{ width: 100, height: 22, marginTop: 6 }} />
            ) : (
              <Title level={4} style={{ margin: '4px 0 0 0', color: '#10B981', fontWeight: 900, whiteSpace: 'nowrap' }}>
                ₹ {totalSettled.toLocaleString('en-IN')}
              </Title>
            )}
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
            {isLoading ? (
              <Skeleton.Button active size="small" style={{ width: 60, height: 22, marginTop: 6 }} />
            ) : (
              <Title level={4} style={{ margin: '4px 0 0 0', color: '#F97316', fontWeight: 900 }}>
                {validReceipts.length}
              </Title>
            )}
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
              {cancelledCount > 0 ? `Active (${cancelledCount} Voided)` : 'Issued Documents'}
            </Text>
          </Card>
        </div>
      </div>

      {/* ── Main Directory Controls & View Switcher ── */}
      <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 auto' }}>
            <Input.Search
              placeholder="Search donor name, phone, receipt #, cause..."
              allowClear
              style={{ width: 280, maxWidth: '100%' }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 190, maxWidth: '100%' }}
              onChange={(val) => setFilterStatus(val || '')}
              size="middle"
            >
              <Option value="issued">🔵 ISSUED</Option>
              <Option value="pending_settlement">🟡 PENDING SETTLEMENT</Option>
              <Option value="settled">🟢 SETTLED</Option>
              <Option value="cancelled">🔴 CANCELLED</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => exportToCSV(filteredReceipts.map(r => ({
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
              onClick={() => exportToExcel(filteredReceipts.map(r => ({
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
            dataSource={filteredReceipts}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 700 }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredReceipts.map((record: any) => {
              const tag = STATUS_TAGS[record.status] || { color: 'default', label: (record.status || '').toUpperCase() };
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={record.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)',
                      boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontWeight: 900, color: '#3B82F6', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.receipt_number}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
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
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text-primary)' }}>
                          {record.donor?.full_name || 'Anonymous Donor'}
                        </div>
                        {record.donor?.phone && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>📞 +91 {record.donor.phone}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', background: 'var(--color-bg)', borderRadius: 10, marginBottom: 12, border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Amount</Text>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#10B981' }}>
                          ₹ {Number(record.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Tag color="purple" style={{ textTransform: 'uppercase', fontWeight: 800, borderRadius: 6, margin: 0 }}>
                        {record.payment_mode}
                      </Tag>
                    </div>

                    {record.purpose && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
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
                        loading={actionLoadingKey === `share-${record.id}`}
                        disabled={Boolean(actionLoadingKey) && actionLoadingKey !== `share-${record.id}`}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, background: '#25D366', borderColor: '#25D366' }}
                        onClick={() => handleShareImage(record)}
                      >
                        Share Image
                      </Button>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        loading={actionLoadingKey === `download-${record.id}`}
                        disabled={Boolean(actionLoadingKey) && actionLoadingKey !== `download-${record.id}`}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, color: '#059669', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                        onClick={() => handleDownloadImage(record)}
                      >
                        Download Image
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PrinterOutlined />}
                        style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 11, background: '#0B2347', borderColor: '#0B2347' }}
                        onClick={() => printReceiptWindow(record, myOrg?.name || 'Hisob ERP', myOrg)}
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
        <div style={{ padding: '20px 24px', background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#EF4444', display: 'block', marginBottom: 4 }}>
            Cancel Receipt #{cancelModalReceipt?.receipt_number}?
          </span>
          <Text type="secondary" style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
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
              label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Cancellation Reason</span>}
              rules={[{ required: true, message: 'Please enter a cancellation reason' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="e.g. Entered wrong donation amount, duplicate receipt, or donor requested voiding"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={() => setCancelModalReceipt(null)} style={{ borderRadius: 8, fontWeight: 600 }}>
                Keep Active
              </Button>
              <Button
                type="primary"
                danger
                htmlType="submit"
                loading={cancelMutation.isPending}
                style={{ fontWeight: 800, borderRadius: 8, background: '#EF4444', borderColor: '#EF4444' }}
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
