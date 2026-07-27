import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  Select, DatePicker, Card, Row, Col, Typography, App, Tooltip,
  Popconfirm, Segmented, Progress, Badge
} from 'antd';
import {
  PlusOutlined, UnorderedListOutlined, EditOutlined, CalendarOutlined,
  DeleteOutlined, SearchOutlined, AppstoreOutlined,
  TrophyOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getFestivals, createFestival, updateFestival, deleteFestival, getFinancialYears } from '../../api/services';
import FestivalTasksModal from './FestivalTasksModal';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  planning: { color: 'gold', label: 'PLANNING' },
  active: { color: 'green', label: 'ACTIVE' },
  completed: { color: 'blue', label: 'COMPLETED' },
  closed: { color: 'default', label: 'CLOSED' },
};

const DEITY_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  'Lord Ganesha': { icon: '🐘', bg: '#FFF7ED', color: '#EA580C' },
  'Goddess Durga': { icon: '🌺', bg: '#FEF2F2', color: '#DC2626' },
  'Goddess Lakshmi': { icon: '🪙', bg: '#FEFCE8', color: '#CA8A04' },
  'Lord Rama': { icon: '🏹', bg: '#EFF6FF', color: '#2563EB' },
  'Lord Shiva': { icon: '🕉️', bg: '#F3E8FF', color: '#7C3AED' },
  'General Trust Event': { icon: '🎪', bg: '#ECFDF5', color: '#059669' },
};

const getDeityInfo = (deityName?: string) => {
  if (!deityName) return { icon: '🎪', bg: '#F1F5F9', color: '#475569' };
  const found = Object.keys(DEITY_ICONS).find(k => deityName.toLowerCase().includes(k.toLowerCase().replace(/lord|goddess/g, '').trim()));
  return found ? DEITY_ICONS[found] : { icon: '✨', bg: '#FFF7ED', color: '#EA580C' };
};

const DEITY_PRESETS = [
  'Lord Ganesha',
  'Goddess Durga',
  'Goddess Lakshmi',
  'Lord Rama',
  'Lord Shiva',
  'General Trust Event'
];

const LOCATION_PRESETS = [
  'Main Chowk Mandap',
  'Community Hall Pandal',
  'Temple Premises',
  'Grand Event Ground'
];

const FestivalsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFy, setSelectedFy] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTasksFestival, setSelectedTasksFestival] = useState<any | null>(null);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // ── Queries ──
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

  const { data: festivals = [], isLoading } = useQuery({
    queryKey: ['festivals', selectedFy],
    queryFn: () => getFestivals(selectedFy),
  });

  const activeFy = fiscalYears.find((fy: any) => fy.is_current) || fiscalYears[0];

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createFestival,
    onSuccess: () => {
      message.success('Festival created successfully!');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create festival');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateFestival,
    onSuccess: () => {
      message.success('Festival updated successfully!');
      setIsEditModalOpen(false);
      setEditingFestival(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update festival');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFestival,
    onSuccess: () => {
      message.success('Festival deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to delete festival');
    },
  });

  const handleOpenCreateModal = () => {
    form.setFieldsValue({
      financial_year_id: activeFy?.id,
    });
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      start_date: values.date_range[0].format('YYYY-MM-DD'),
      end_date: values.date_range[1].format('YYYY-MM-DD'),
    });
  };

  const openEditModal = (festival: any) => {
    setEditingFestival(festival);
    editForm.setFieldsValue({
      financial_year_id: festival.financial_year_id,
      name: festival.name,
      deity: festival.deity,
      location: festival.location,
      status: festival.status || 'active',
      budget: festival.budget,
      description: festival.description,
      date_range: [
        festival.start_date ? dayjs(festival.start_date) : null,
        festival.end_date ? dayjs(festival.end_date) : null,
      ],
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (values: any) => {
    if (!editingFestival) return;
    const payload: any = { ...values };
    if (values.date_range && values.date_range.length === 2) {
      payload.start_date = values.date_range[0].format('YYYY-MM-DD');
      payload.end_date = values.date_range[1].format('YYYY-MM-DD');
    }
    delete payload.date_range;

    updateMutation.mutate({ id: editingFestival.id, data: payload });
  };

  // ── Filtered Festivals List ──
  const filteredFestivals = festivals.filter((f: any) => {
    const matchesSearch =
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.deity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Aggregated Metrics
  const totalFestivalsCount = filteredFestivals.length;
  const activeFestivalsCount = filteredFestivals.filter((f: any) => f.status === 'active' || f.is_active).length;
  const totalCombinedBudget = filteredFestivals.reduce((acc: number, f: any) => acc + Number(f.budget || 0), 0);
  const avgBudget = totalFestivalsCount > 0 ? Math.round(totalCombinedBudget / totalFestivalsCount) : 0;

  const columns = [
    {
      title: 'Festival Event Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => {
        const dInfo = getDeityInfo(record.deity);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: dInfo.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}>
              {dInfo.icon}
            </div>
            <div>
              <b style={{ color: '#0B2347', fontSize: 14 }}>{name}</b>
              {record.description && (
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                  {record.description.length > 45 ? `${record.description.substring(0, 45)}...` : record.description}
                </Text>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Deity / Entity',
      dataIndex: 'deity',
      key: 'deity',
      render: (d: string) => {
        const dInfo = getDeityInfo(d);
        return d ? (
          <Tag style={{ background: dInfo.bg, color: dInfo.color, borderColor: 'transparent', fontWeight: 700, borderRadius: 12, padding: '2px 10px' }}>
            {dInfo.icon} {d}
          </Tag>
        ) : <Text type="secondary">General Event</Text>;
      },
    },
    {
      title: 'Location / Mandap',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string) => (
        <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          <EnvironmentOutlined style={{ color: '#F97316', marginRight: 4 }} />
          {loc || 'Main Mandap'}
        </span>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#475569', fontWeight: 500 }}>
          <CalendarOutlined style={{ color: '#2563EB', marginRight: 4 }} />
          {r.start_date} → {r.end_date}
        </span>
      ),
    },
    {
      title: 'Target Budget (₹)',
      dataIndex: 'budget',
      key: 'budget',
      render: (b: number) => <span style={{ fontWeight: 800, color: '#EA580C', fontSize: 14 }}>₹ {Number(b || 0).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const tag = STATUS_TAGS[st] || { color: 'processing', label: st?.toUpperCase() || 'ACTIVE' };
        return <Tag color={tag.color} style={{ borderRadius: 12, fontWeight: 800, padding: '2px 10px' }}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size={6}>
          <Tooltip title="Manage Event Tasks & Member Assignments">
            <Button
              type="primary"
              icon={<UnorderedListOutlined />}
              size="small"
              style={{ background: '#0B2347', borderColor: '#0B2347', borderRadius: 8, fontWeight: 700 }}
              onClick={() => setSelectedTasksFestival(record)}
            >
              Tasks
            </Button>
          </Tooltip>

          <Button
            size="small"
            icon={<EditOutlined style={{ color: '#2563EB' }} />}
            style={{ borderRadius: 8, fontWeight: 600 }}
            onClick={() => openEditModal(record)}
          />

          <Popconfirm
            title="Delete Festival Event?"
            description={`Are you sure you want to delete "${record.name}"?`}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="festivals-module animate-fadeIn" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: '1 1 240px' }}>
          <Title level={3} className="gradient-text" style={{ margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
            🎪 Festival & Event Campaigns
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage festival mandates, mandap locations, budget targets, and volunteer task allocations
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenCreateModal}
          className="animated-btn"
          style={{
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            borderColor: '#EA580C',
            fontWeight: 800,
            borderRadius: 10,
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
            flex: '0 0 auto'
          }}
        >
          Create New Festival
        </Button>
      </div>

      {/* ── Summary Stats Cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
        <Col xs={12} sm={12} md={6} style={{ display: 'flex' }}>
          <Card
            className="hissob-card premium-card-hover"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#64748B' }}>TOTAL FESTIVALS</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Title level={2} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>{totalFestivalsCount}</Title>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 10px rgba(37,99,235,0.12)' }}>
                🎪
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} style={{ display: 'flex' }}>
          <Card
            className="hissob-card premium-card-hover"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
              border: '1px solid #DCFCE7',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#166534' }}>ACTIVE CAMPAIGNS</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Title level={2} style={{ margin: 0, color: '#15803D', fontWeight: 900 }}>{activeFestivalsCount}</Title>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 4px 10px rgba(22,101,52,0.12)' }}>
                <Badge status="processing" text={<span style={{ color: '#15803D', fontWeight: 900, fontSize: 11 }}>LIVE</span>} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} style={{ display: 'flex' }}>
          <Card
            className="hissob-card"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%)',
              border: '1px solid #FFEDD5',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#9A3412' }}>TARGET BUDGET</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Title level={2} style={{ margin: 0, color: '#EA580C', fontWeight: 900, fontSize: 22 }}>₹ {totalCombinedBudget.toLocaleString('en-IN')}</Title>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 10px rgba(234,88,12,0.12)' }}>
                💰
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} style={{ display: 'flex' }}>
          <Card
            className="hissob-card"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F3E8FF 100%)',
              border: '1px solid #E9D5FF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#6B21A8' }}>AVG EVENT BUDGET</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Title level={2} style={{ margin: 0, color: '#7C3AED', fontWeight: 900, fontSize: 22 }}>₹ {avgBudget.toLocaleString('en-IN')}</Title>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 10px rgba(124,58,237,0.12)' }}>
                📊
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Search & Filter Controls Card ── */}
      <Card className="hissob-card" style={{ marginBottom: 24, borderRadius: 16, border: '1px solid #E2E8F0' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by festival name, deity, or mandap location..."
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ borderRadius: 10 }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Filter by Financial Year"
              allowClear
              style={{ width: '100%' }}
              value={selectedFy}
              onChange={(val) => setSelectedFy(val)}
            >
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name} {fy.is_current ? '(Active)' : ''}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: 'All Event Statuses', value: 'all' },
                { label: 'Planning Mode', value: 'planning' },
                { label: 'Active / Live', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Closed', value: 'closed' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ textAlign: 'right' }}>
            <Segmented
              options={[
                { label: 'Card Grid', value: 'grid', icon: <AppstoreOutlined /> },
                { label: 'Table View', value: 'table', icon: <UnorderedListOutlined /> },
              ]}
              value={viewMode}
              onChange={(val) => setViewMode(val as 'grid' | 'table')}
              style={{ padding: 4, borderRadius: 10 }}
            />
          </Col>
        </Row>
      </Card>

      {/* ── Main View Content (Grid vs Table) ── */}
      {viewMode === 'grid' ? (
        filteredFestivals.length === 0 ? (
          <Card className="hissob-card" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 16 }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🎪</div>
            <Title level={4} style={{ margin: 0, color: '#0B2347', fontWeight: 800 }}>No Festivals or Event Campaigns Found</Title>
            <Text type="secondary" style={{ display: 'block', margin: '8px 0 24px 0', fontSize: 13 }}>
              Create your organization's festival campaign to track task assignments, budgets, and collections.
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
              className="animated-btn"
              style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#EA580C', borderRadius: 10, fontWeight: 800, padding: '0 24px' }}
            >
              Create New Festival
            </Button>
          </Card>
        ) : (
          <Row gutter={[18, 18]} style={{ display: 'flex', flexWrap: 'wrap' }}>
            {filteredFestivals.map((fest: any) => {
              const targetBudget = Number(fest.budget || 0);
              const raisedAmount = Number(fest.collected || 0);
              const pct = targetBudget > 0 ? Math.min(100, Math.round((raisedAmount / targetBudget) * 100)) : 0;
              const statusTag = STATUS_TAGS[fest.status] || { color: 'processing', label: fest.status?.toUpperCase() || 'ACTIVE' };
              const dInfo = getDeityInfo(fest.deity);

              const gradientHeader = fest.status === 'active'
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : fest.status === 'planning'
                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                : fest.status === 'completed'
                ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                : 'linear-gradient(135deg, #64748B 0%, #475569 100%)';

              return (
                <Col xs={24} sm={12} lg={8} key={fest.id} style={{ display: 'flex' }}>
                  <Card
                    className="hissob-card animate-fadeIn premium-card-hover"
                    hoverable
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                    styles={{ body: { padding: 0 } }}
                  >
                    {/* Vibrant Top Color Banner */}
                    <div style={{ height: 6, background: gradientHeader }} />

                    <div style={{ padding: 20 }}>
                      {/* Header row with Deity Avatar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: dInfo.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                          }}>
                            {dInfo.icon}
                          </div>
                          <div>
                            <Title level={5} style={{ margin: 0, color: '#0B2347', fontWeight: 900, fontSize: 16 }}>
                              {fest.name}
                            </Title>
                            {fest.deity && (
                              <Tag style={{ background: dInfo.bg, color: dInfo.color, borderColor: 'transparent', borderRadius: 10, fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                                {fest.deity}
                              </Tag>
                            )}
                          </div>
                        </div>
                        <Tag color={statusTag.color} style={{ borderRadius: 12, fontWeight: 800, padding: '2px 10px' }}>
                          {statusTag.label}
                        </Tag>
                      </div>

                      {/* Info lines */}
                      <div style={{ fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarOutlined style={{ color: '#2563EB', fontSize: 14 }} />
                          <span><b>Duration:</b> {fest.start_date} to {fest.end_date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <EnvironmentOutlined style={{ color: '#F97316', fontSize: 14 }} />
                          <span><b>Venue:</b> {fest.location || 'Main Mandap'}</span>
                        </div>
                        {fest.description && (
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, color: '#64748B' }}>
                            {fest.description.length > 70 ? `${fest.description.substring(0, 70)}...` : fest.description}
                          </Text>
                        )}
                      </div>

                      {/* Progress & Target Budget Box */}
                      <div style={{ margin: '16px 0 8px 0', padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span><TrophyOutlined style={{ color: '#F59E0B' }} /> Target Budget:</span>
                          <span style={{ fontWeight: 800, color: '#EA580C' }}>₹ {targetBudget.toLocaleString('en-IN')}</span>
                        </div>
                        <Progress percent={pct} strokeColor={{ '0%': '#F97316', '100%': '#EA580C' }} size="small" style={{ margin: 0 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#FAFAFA', borderTop: '1px solid #F1F5F9' }}>
                      <Button
                        type="primary"
                        icon={<UnorderedListOutlined />}
                        size="small"
                        className="animated-btn"
                        style={{ background: '#0B2347', borderColor: '#0B2347', borderRadius: 8, fontWeight: 700 }}
                        onClick={() => setSelectedTasksFestival(fest)}
                      >
                        Plan Tasks & Volunteers
                      </Button>

                      <Space size="small">
                        <Button
                          size="small"
                          icon={<EditOutlined style={{ color: '#2563EB' }} />}
                          style={{ borderRadius: 8, fontWeight: 600 }}
                          onClick={() => openEditModal(fest)}
                        />

                        <Popconfirm
                          title="Delete Festival Event?"
                          description={`Delete "${fest.name}"?`}
                          onConfirm={() => deleteMutation.mutate(fest.id)}
                          okText="Yes"
                          cancelText="No"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )
      ) : (
        /* ── Table View ── */
        <Card className="hissob-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <Table
            className="custom-table"
            dataSource={filteredFestivals}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 750 }}
          />
        </Card>
      )}

      {/* ── Create Festival Modal ── */}
      <Modal
        title={<span className="gradient-text-orange" style={{ fontSize: 18, fontWeight: 800 }}>Provision New Festival Event Campaign</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={560}
        className="glass-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Title level={5} style={{ color: '#F97316', marginTop: 0 }}>1. Event & Deity Details</Title>

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
            name="name"
            label="Festival / Campaign Name"
            rules={[{ required: true, message: 'e.g. Ganesh Utsav 2026' }]}
          >
            <Input placeholder="e.g. Ganesh Utsav 2026" />
          </Form.Item>

          <Form.Item name="deity" label="Deity / Entity" style={{ marginBottom: 8 }}>
            <Input placeholder="e.g. Lord Ganesha" />
          </Form.Item>
          {/* Quick Deity Presets */}
          <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DEITY_PRESETS.map((d) => (
              <Tag
                key={d}
                color="orange"
                style={{ cursor: 'pointer', borderRadius: 8, fontSize: 11 }}
                onClick={() => form.setFieldsValue({ deity: d })}
              >
                + {d}
              </Tag>
            ))}
          </div>

          <Title level={5} style={{ color: '#0B2347', marginTop: 16 }}>2. Duration & Mandap Location</Title>

          <Form.Item
            name="date_range"
            label="Festival Duration (Start & End Date)"
            rules={[{ required: true, message: 'Select duration' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="location" label="Location / Mandap Venue" style={{ marginBottom: 8 }}>
            <Input placeholder="e.g. Main Chowk Mandap" prefix={<EnvironmentOutlined />} />
          </Form.Item>
          {/* Quick Location Presets */}
          <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LOCATION_PRESETS.map((loc) => (
              <Tag
                key={loc}
                color="blue"
                style={{ cursor: 'pointer', borderRadius: 8, fontSize: 11 }}
                onClick={() => form.setFieldsValue({ location: loc })}
              >
                + {loc}
              </Tag>
            ))}
          </div>

          <Title level={5} style={{ color: '#2563EB', marginTop: 16 }}>3. Target Budget & Notes</Title>

          <Form.Item name="budget" label="Target Budget (₹)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 500000" prefix="₹" />
          </Form.Item>

          <Form.Item name="description" label="Description / Guidelines">
            <Input.TextArea rows={2} placeholder="Event instructions or vendor guidelines" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} className="animated-btn" style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 700 }}>
                Save Festival Campaign
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit Festival Modal ── */}
      <Modal
        title={<span className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>Edit Festival — {editingFestival?.name || ''}</span>}
        open={isEditModalOpen}
        onCancel={() => { setIsEditModalOpen(false); setEditingFestival(null); }}
        footer={null}
        destroyOnHidden
        width={560}
        className="glass-modal"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item
            name="financial_year_id"
            label="Financial Year"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="name" label="Festival Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deity" label="Deity / Entity">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location / Mandap">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Event Status" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Planning Mode', value: 'planning' },
                { label: 'Active / Live', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Closed', value: 'closed' },
              ]}
            />
          </Form.Item>

          <Form.Item name="date_range" label="Festival Duration (Start & End Date)" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="budget" label="Target Budget (₹)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} prefix="₹" />
          </Form.Item>

          <Form.Item name="description" label="Description / Notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => { setIsEditModalOpen(false); setEditingFestival(null); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending} className="animated-btn" style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 700 }}>
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Festival Event Tasks & Assignments Modal ── */}
      <FestivalTasksModal
        open={Boolean(selectedTasksFestival)}
        onClose={() => setSelectedTasksFestival(null)}
        festival={selectedTasksFestival}
      />
    </div>
  );
};

export default FestivalsPage;
