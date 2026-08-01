import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Checkbox,
  Card, Row, Col, Typography, App, Tooltip, Avatar, Segmented
} from 'antd';
import {
  PlusOutlined, SearchOutlined, CrownOutlined, SafetyCertificateOutlined,
  HistoryOutlined, UserOutlined, PhoneOutlined, MailOutlined, IdcardOutlined,
  EnvironmentOutlined, TeamOutlined, DollarOutlined, SafetyOutlined,
  AppstoreOutlined, UnorderedListOutlined, FileAddOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDonors, createDonor, updateDonor, deleteDonor } from '../../api/services';
import { formatApiError } from '../../api/client';
import Tax80GCertificateModal, { type Tax80GData } from '../reports/Tax80GCertificateModal';
import DonorDetailDrawer from './DonorDetailDrawer';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const CITY_PRESETS = ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai', 'Nagpur', 'Nashik', 'Surat'];

const DonorsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'vip' | '80g'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(
    typeof window !== 'undefined' && window.innerWidth <= 768 ? 'grid' : 'table'
  );
  const [selected80GData, setSelected80GData] = useState<Tax80GData | null>(null);
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);

  const [form] = Form.useForm();

  const [editingDonor, setEditingDonor] = useState<any | null>(null);

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ['donors', searchQuery],
    queryFn: () => getDonors(searchQuery || undefined),
  });

  const createMutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => {
      message.success('Donor profile registered successfully!');
      setIsModalOpen(false);
      setEditingDonor(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(formatApiError(err, 'Failed to register donor'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) => updateDonor({ id, data: values }),
    onSuccess: () => {
      message.success('Donor profile updated successfully!');
      setIsModalOpen(false);
      setEditingDonor(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(formatApiError(err, 'Failed to update donor'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDonor,
    onSuccess: () => {
      message.success('Donor profile deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(formatApiError(err, 'Failed to delete donor'));
    },
  });

  const handleSubmit = (values: any) => {
    if (editingDonor) {
      updateMutation.mutate({ id: editingDonor.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleOpenModal = () => {
    setEditingDonor(null);
    setIsModalOpen(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        is_80g_eligible: true,
      });
    }, 0);
  };

  const handleOpenEditModal = (donor: any) => {
    setEditingDonor(donor);
    setIsModalOpen(true);
    setTimeout(() => {
      form.setFieldsValue({
        full_name: donor.full_name,
        phone: donor.phone,
        email: donor.email,
        pan_number: donor.pan_number,
        city: donor.city,
        is_vip: donor.is_vip,
        is_80g_eligible: donor.is_80g_eligible,
      });
    }, 0);
  };

  // Aggregated Stat Metrics
  const totalDonors = donors.length;
  const vipDonorsCount = donors.filter((d: any) => d.is_vip).length;
  const tax80gCount = donors.filter((d: any) => d.is_80g_eligible).length;
  const totalLifetimeContribution = donors.reduce((sum: number, d: any) => sum + Number(d.total_donations || 0), 0);
  const avgContribution = totalDonors > 0 ? Math.round(totalLifetimeContribution / totalDonors) : 0;

  // Filtered Donors List
  const filteredDonors = donors.filter((d: any) => {
    if (filterCategory === 'vip') return d.is_vip;
    if (filterCategory === '80g') return d.is_80g_eligible;
    return true;
  });

  const columns = [
    {
      title: 'Donor #',
      dataIndex: 'donor_number',
      key: 'donor_number',
      render: (t: string) => (
        <span style={{ fontWeight: 800, color: '#3B82F6', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
          {t || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Donor Name & Badges',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string, record: any) => (
        <Space size={10}>
          <Avatar
            style={{
              backgroundColor: record.is_vip ? '#D97706' : '#2563EB',
              fontWeight: 800,
              flexShrink: 0,
              border: record.is_vip ? '2px solid #FCD34D' : 'none',
              boxShadow: record.is_vip ? '0 0 10px rgba(217, 119, 6, 0.3)' : 'none'
            }}
          >
            {name?.charAt(0)?.toUpperCase() || 'D'}
          </Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a
                style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: 14 }}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedDonorId(record.id);
                }}
              >
                {name}
              </a>
              {record.is_vip && (
                <Tag color="gold" icon={<CrownOutlined />} style={{ fontWeight: 800, borderRadius: 10, fontSize: 10, margin: 0 }}>
                  VIP
                </Tag>
              )}
              {record.is_80g_eligible && (
                <Tag color="green" icon={<SafetyOutlined />} style={{ fontWeight: 700, borderRadius: 10, fontSize: 10, margin: 0 }}>
                  80G
                </Tag>
              )}
            </div>
            {record.email && (
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{record.email}</div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (p: string) => (
        <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {p ? `+91 ${p}` : 'N/A'}
        </span>
      ),
    },
    {
      title: 'City & Location',
      dataIndex: 'city',
      key: 'city',
      render: (c: string) => (
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {c ? `📍 ${c}` : 'N/A'}
        </span>
      ),
    },
    {
      title: 'This Year',
      dataIndex: 'this_year_donations',
      key: 'this_year_donations',
      render: (val: number) => (
        <span style={{ fontWeight: 800, color: '#3B82F6', fontSize: 14, whiteSpace: 'nowrap' }}>
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Total Contribution',
      dataIndex: 'total_donations',
      key: 'total_donations',
      render: (val: number) => (
        <span style={{ fontWeight: 800, color: '#10B981', fontSize: 14, whiteSpace: 'nowrap' }}>
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size={6}>
          <Tooltip title="Create Receipt for this Donor">
            <Button
              type="text"
              icon={<FileAddOutlined style={{ color: '#F97316' }} />}
              size="small"
              style={{ fontWeight: 700, color: '#F97316', background: 'rgba(249, 115, 22, 0.15)', borderRadius: 6, borderColor: 'rgba(249, 115, 22, 0.3)' }}
              onClick={() => navigate('/receipts', { state: { preselectedDonorId: record.id, preselectedDonorName: record.full_name } })}
            >
              + Receipt
            </Button>
          </Tooltip>
          <Tooltip title="View Comprehensive Donation History">
            <Button
              type="default"
              icon={<HistoryOutlined style={{ color: '#3B82F6' }} />}
              size="small"
              style={{ fontWeight: 600, borderRadius: 6 }}
              onClick={() => setSelectedDonorId(record.id)}
            >
              History
            </Button>
          </Tooltip>
          <Tooltip title="Generate Section 80G Tax Certificate">
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              size="small"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', borderColor: '#2563EB', borderRadius: 6, fontWeight: 700 }}
              onClick={() => {
                setSelected80GData({
                  certificateNumber: `80G-2025-${record.donor_number || record.id.slice(0, 6)}`,
                  donorName: record.full_name,
                  panNumber: record.pan_number || 'PAN-NOT-PROVIDED',
                  address: record.city ? `${record.city}, India` : 'India',
                  financialYear: '2025-26',
                  totalDonationAmount: Number(record.total_donations || 5000),
                  receiptNumbers: [`RC-2026-${record.id.slice(0, 4)}`],
                  trustName: 'HISOB GANESH UTSAV CHARITABLE TRUST',
                  issueDate: dayjs().format('DD MMM YYYY'),
                });
              }}
            >
              80G
            </Button>
          </Tooltip>
          <Tooltip title="Edit Donor Profile">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#2563EB' }} />}
              size="small"
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Donor Profile">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined style={{ color: '#EF4444' }} />}
              size="small"
              onClick={() => {
                Modal.confirm({
                  title: 'Delete Donor Profile',
                  content: `Are you sure you want to delete ${record.full_name}? This action cannot be undone.`,
                  okText: 'Yes, Delete',
                  okType: 'danger',
                  cancelText: 'Cancel',
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="donors-module animate-fadeIn" style={{ paddingBottom: 24 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, letterSpacing: '-0.3px' }}>
            🤝 Donor Directory & Profiles
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage donor records, track lifetime contribution history, and issue Section 80G tax certificates
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenModal}
          style={{
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            borderColor: '#F97316',
            borderRadius: 10,
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
          }}
        >
          Register New Donor
        </Button>
      </div>

      {/* ── Quick Overview Metric Cards ── */}
      <div className="hissob-stat-row" style={{ marginBottom: 20 }}>
        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #3B82F6', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL DONORS
              </Text>
              <Avatar style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6', flexShrink: 0 }} icon={<TeamOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: 'var(--color-text-primary)', fontWeight: 900 }}>
              {totalDonors}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Active Profiles</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #F59E0B', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                VIP DONORS
              </Text>
              <Avatar style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', flexShrink: 0 }} icon={<CrownOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#F59E0B', fontWeight: 900 }}>
              {vipDonorsCount}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>VIP Patrons</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #10B981', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                80G CERTIFIED
              </Text>
              <Avatar style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', flexShrink: 0 }} icon={<SafetyOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#10B981', fontWeight: 900 }}>
              {tax80gCount}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Tax Exemption</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #A855F7', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                CONTRIBUTIONS
              </Text>
              <Avatar style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#A855F7', flexShrink: 0 }} icon={<DollarOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#A855F7', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {totalLifetimeContribution.toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Avg ₹{avgContribution.toLocaleString('en-IN')}</Text>
          </Card>
        </div>
      </div>

      {/* ── Main Donor Directory Control Bar & View Container ── */}
      <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Search by donor name, phone, or city..."
            style={{ width: '100%', borderRadius: 8 }}
            allowClear
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Segmented
              value={filterCategory}
              onChange={(val) => setFilterCategory(val as any)}
              options={[
                { label: `All (${totalDonors})`, value: 'all' },
                { label: `👑 VIP (${vipDonorsCount})`, value: 'vip' },
                { label: `🛡️ 80G (${tax80gCount})`, value: '80g' },
              ]}
              style={{ fontWeight: 600 }}
            />

            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as any)}
              options={[
                { label: 'Table View', value: 'table', icon: <UnorderedListOutlined /> },
                { label: 'Grid Cards', value: 'grid', icon: <AppstoreOutlined /> },
              ]}
              style={{ fontWeight: 700 }}
            />
          </div>
        </div>

        {/* View Mode: Table vs Grid Cards */}
        {viewMode === 'table' ? (
          <Table
            dataSource={filteredDonors}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 800 }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredDonors.map((record: any) => (
              <Col xs={24} sm={12} md={8} lg={6} key={record.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 14,
                    border: record.is_vip ? '2px solid #FCD34D' : '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Avatar
                      size={48}
                      style={{
                        backgroundColor: record.is_vip ? '#D97706' : '#2563EB',
                        fontWeight: 900,
                        fontSize: 20,
                        boxShadow: record.is_vip ? '0 4px 12px rgba(217, 119, 6, 0.3)' : 'none',
                      }}
                    >
                      {record.full_name?.charAt(0)?.toUpperCase() || 'D'}
                    </Avatar>

                    <div style={{ textAlign: 'right' }}>
                      <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 800, borderRadius: 6, margin: 0 }}>
                        {record.donor_number || 'N/A'}
                      </Tag>
                      <div style={{ marginTop: 4 }}>
                        {record.is_vip && <Tag color="gold" icon={<CrownOutlined />} style={{ fontWeight: 800, margin: 0 }}>VIP</Tag>}
                        {record.is_80g_eligible && <Tag color="green" icon={<SafetyOutlined />} style={{ fontWeight: 700, margin: 0 }}>80G</Tag>}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <a onClick={(e) => { e.preventDefault(); setSelectedDonorId(record.id); }}>
                      {record.full_name}
                    </a>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '6px 0 12px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>📞 {record.phone ? `+91 ${record.phone}` : 'No phone provided'}</div>
                    {record.email && <div>✉️ {record.email}</div>}
                    <div>📍 {record.city || 'City Not Specified'}</div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--color-bg)', borderRadius: 10, marginBottom: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>This Year (2025-26):</Text>
                      <span style={{ fontWeight: 900, fontSize: 14, color: '#3B82F6' }}>
                        ₹ {Number(record.this_year_donations || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>Lifetime Total:</Text>
                      <span style={{ fontWeight: 900, fontSize: 14, color: '#10B981' }}>
                        ₹ {Number(record.total_donations || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Row 1: Primary Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        size="small"
                        icon={<FileAddOutlined style={{ color: '#F97316' }} />}
                        style={{ flex: 1, fontWeight: 700, fontSize: 11, background: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)', color: '#F97316' }}
                        onClick={() => navigate('/receipts', { state: { preselectedDonorId: record.id, preselectedDonorName: record.full_name } })}
                      >
                        + Receipt
                      </Button>
                      <Button
                        size="small"
                        icon={<HistoryOutlined style={{ color: '#2563EB' }} />}
                        style={{ flex: 1, fontWeight: 600, fontSize: 11 }}
                        onClick={() => setSelectedDonorId(record.id)}
                      >
                        History
                      </Button>
                    </div>

                    {/* Row 2: Secondary & Manage Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<SafetyCertificateOutlined />}
                        style={{ flex: 1, fontWeight: 700, fontSize: 11, background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', padding: '0 4px' }}
                        onClick={() => {
                          setSelected80GData({
                            certificateNumber: `80G-2025-${record.donor_number || record.id.slice(0, 6)}`,
                            donorName: record.full_name,
                            panNumber: record.pan_number || 'PAN-NOT-PROVIDED',
                            address: record.city ? `${record.city}, India` : 'India',
                            financialYear: '2025-26',
                            totalDonationAmount: Number(record.total_donations || 5000),
                            receiptNumbers: [`RC-2026-${record.id.slice(0, 4)}`],
                            trustName: 'HISOB GANESH UTSAV CHARITABLE TRUST',
                            issueDate: dayjs().format('DD MMM YYYY'),
                          });
                        }}
                      >
                        80G
                      </Button>
                      <Button
                        size="small"
                        icon={<EditOutlined style={{ color: '#2563EB' }} />}
                        style={{ flex: 1, fontWeight: 600, fontSize: 11, padding: '0 4px' }}
                        onClick={() => handleOpenEditModal(record)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined style={{ color: '#EF4444' }} />}
                        style={{ flex: 1, fontWeight: 600, fontSize: 11, padding: '0 4px' }}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Donor Profile',
                            content: `Are you sure you want to delete ${record.full_name}?`,
                            okText: 'Yes, Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            onOk: () => deleteMutation.mutate(record.id),
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* ── Register New Donor Modal ── */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={560}
        styles={{ body: { padding: 0 } }}
      >
        {/* Sleek Gradient Modal Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0B2347 0%, #1E40AF 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar style={{ backgroundColor: '#F97316', color: '#fff', fontWeight: 900 }} icon={<UserOutlined />} size={42} />
            <div>
              <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 900 }}>
                {editingDonor ? 'Edit Donor Profile' : 'Register New Donor'}
              </Title>
              <Text style={{ color: '#93C5FD', fontSize: 12 }}>
                {editingDonor ? 'Update donor contact details, tax identification, and VIP status' : 'Enter donor contact details, tax identification, and VIP status'}
              </Text>
            </div>
          </div>
        </div>

        {/* Modal Form Content */}
        <div style={{ padding: '24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="full_name"
              label={<span style={{ fontWeight: 700, color: '#0F172A' }}>Full Name</span>}
              rules={[{ required: true, message: 'Please enter the donor full name' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="e.g. Ramesh Chandra Sharma" size="large" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label={<span style={{ fontWeight: 700, color: '#0F172A' }}>Phone Number</span>}>
                  <Input prefix={<PhoneOutlined style={{ color: '#94A3B8' }} />} placeholder="9876543210" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="email" label={<span style={{ fontWeight: 700, color: '#0F172A' }}>Email Address</span>}>
                  <Input prefix={<MailOutlined style={{ color: '#94A3B8' }} />} placeholder="donor@gmail.com" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="pan_number" label={<span style={{ fontWeight: 700, color: '#0F172A' }}>PAN Number (80G Tax)</span>}>
                  <Input prefix={<IdcardOutlined style={{ color: '#94A3B8' }} />} placeholder="ABCDE1234F" size="large" style={{ borderRadius: 8, textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="city" label={<span style={{ fontWeight: 700, color: '#0F172A' }}>City / District</span>}>
                  <Input prefix={<EnvironmentOutlined style={{ color: '#94A3B8' }} />} placeholder="e.g. Mumbai" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>

            {/* Quick City Presets */}
            <div style={{ marginBottom: 16, marginTop: -8 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, marginRight: 8 }}>Quick City Presets:</Text>
              <Space size={4} wrap>
                {CITY_PRESETS.map((cityName) => (
                  <Tag
                    key={cityName}
                    color="blue"
                    style={{ cursor: 'pointer', borderRadius: 12, fontSize: 11, fontWeight: 600 }}
                    onClick={() => form.setFieldValue('city', cityName)}
                  >
                    + {cityName}
                  </Tag>
                ))}
              </Space>
            </div>

            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <Text style={{ fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Donor Preferences & Badges
              </Text>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="is_vip" valuePropName="checked" style={{ margin: 0 }}>
                    <Checkbox style={{ fontWeight: 700, color: '#D97706' }}>
                      👑 Mark as VIP Donor
                    </Checkbox>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="is_80g_eligible" valuePropName="checked" style={{ margin: 0 }}>
                    <Checkbox style={{ fontWeight: 700, color: '#059669' }}>
                      🛡️ 80G Tax Exemption
                    </Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <Button size="large" onClick={() => setIsModalOpen(false)} style={{ borderRadius: 8, fontWeight: 600 }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={createMutation.isPending || updateMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  borderColor: '#F97316',
                  borderRadius: 8,
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                }}
              >
                {editingDonor ? 'Update Donor Profile' : 'Save Donor Profile'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* 80G Tax Exemption Certificate Modal */}
      <Tax80GCertificateModal
        open={Boolean(selected80GData)}
        onClose={() => setSelected80GData(null)}
        data={selected80GData}
      />

      {/* Donor Detailed Profile & History Drawer */}
      <DonorDetailDrawer
        donorId={selectedDonorId}
        onClose={() => setSelectedDonorId(null)}
      />
    </div>
  );
};

export default DonorsPage;
