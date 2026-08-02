import React, { useState } from 'react';
import {
  Card, Table, Button, Tag, Space, Input, Select, Modal, Form,
  InputNumber, DatePicker, Row, Col, Statistic, Tabs, Drawer,
  Typography, message, Popconfirm, Badge, Progress, Segmented
} from 'antd';
import {
  ToolOutlined, PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, ExportOutlined, SwapRightOutlined,
  AppstoreOutlined, ShoppingOutlined, UserOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getAssets, createAsset, updateAsset, deleteAsset,
  getAssetCategories, createAssetCategory,
  checkoutAsset, returnAsset, getAssetCheckouts,
  getInventorySummary
} from '../../api/services';
import type { Asset, AssetCheckout } from '../../api/services';

const { Title, Text } = Typography;

const CONDITION_COLORS: Record<string, { color: string; label: string; icon: string }> = {
  new: { color: 'cyan', label: 'NEW', icon: '🆕' },
  good: { color: 'green', label: 'GOOD', icon: '✅' },
  fair: { color: 'gold', label: 'FAIR', icon: '⚠️' },
  damaged: { color: 'red', label: 'DAMAGED', icon: '🚨' },
  under_repair: { color: 'purple', label: 'REPAIR', icon: '🛠️' },
};

const CHECKOUT_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  issued: { color: 'processing', label: 'ISSUED' },
  returned: { color: 'success', label: 'RETURNED' },
  overdue: { color: 'error', label: 'OVERDUE' },
  damaged: { color: 'warning', label: 'DAMAGED' },
  lost: { color: 'default', label: 'LOST' },
};

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assets');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined);

  // Modals state
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedAssetForCheckout, setSelectedAssetForCheckout] = useState<Asset | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedCheckoutForReturn, setSelectedCheckoutForReturn] = useState<AssetCheckout | null>(null);

  const [assetForm] = Form.useForm();
  const [catForm] = Form.useForm();
  const [checkoutForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  const queryClient = useQueryClient();

  // Queries
  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: getInventorySummary,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: getAssetCategories,
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', selectedCategory, selectedCondition, search],
    queryFn: () => getAssets({ category_id: selectedCategory, condition: selectedCondition, search }),
  });

  const { data: checkouts = [], isLoading: checkoutsLoading } = useQuery({
    queryKey: ['asset-checkouts'],
    queryFn: () => getAssetCheckouts(),
  });

  // Mutations
  const createAssetMut = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      message.success('Asset added successfully');
      setAssetModalOpen(false);
      assetForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
    onError: (err: any) => message.error(err.response?.data?.detail || 'Failed to create asset'),
  });

  const updateAssetMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Asset> }) => updateAsset(id, payload),
    onSuccess: () => {
      message.success('Asset updated successfully');
      setAssetModalOpen(false);
      setEditingAsset(null);
      assetForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
    onError: (err: any) => message.error(err.response?.data?.detail || 'Failed to update asset'),
  });

  const deleteAssetMut = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      message.success('Asset deactivated');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });

  const createCatMut = useMutation({
    mutationFn: createAssetCategory,
    onSuccess: () => {
      message.success('Category created');
      setCatModalOpen(false);
      catForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });

  const checkoutMut = useMutation({
    mutationFn: checkoutAsset,
    onSuccess: () => {
      message.success('Equipment issued successfully');
      setCheckoutModalOpen(false);
      checkoutForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
    onError: (err: any) => message.error(err.response?.data?.detail || 'Checkout failed'),
  });

  const returnMut = useMutation({
    mutationFn: returnAsset,
    onSuccess: () => {
      message.success('Return recorded successfully');
      setReturnModalOpen(false);
      returnForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
    onError: (err: any) => message.error(err.response?.data?.detail || 'Return failed'),
  });

  // Handlers
  const handleOpenEdit = (record: Asset) => {
    setEditingAsset(record);
    assetForm.setFieldsValue({
      ...record,
      purchase_date: record.purchase_date ? dayjs(record.purchase_date) : undefined,
    });
    setAssetModalOpen(true);
  };

  const handleOpenCheckout = (asset: Asset) => {
    setSelectedAssetForCheckout(asset);
    checkoutForm.setFieldsValue({
      asset_id: asset.id,
      quantity: 1,
    });
    setCheckoutModalOpen(true);
  };

  const handleOpenReturn = (checkoutItem: AssetCheckout) => {
    setSelectedCheckoutForReturn(checkoutItem);
    returnForm.setFieldsValue({
      checkout_id: checkoutItem.id,
      returned_condition: 'good',
      damage_charge: 0,
    });
    setReturnModalOpen(true);
  };

  // Asset Table Columns
  const assetColumns = [
    {
      title: 'Asset Code & Item Name',
      key: 'name',
      render: (_: any, r: Asset) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: 'rgba(249, 115, 22, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: '#F97316'
          }}>
            📦
          </div>
          <div>
            <Text style={{ fontWeight: 800, color: 'var(--color-text-primary)', display: 'block', fontSize: 14 }}>{r.name}</Text>
            <Tag color="blue" style={{ fontSize: 10, fontWeight: 700, borderRadius: 6 }}>{r.asset_code}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: any, r: Asset) => (
        <Tag color="volcano" style={{ fontWeight: 700, borderRadius: 8 }}>
          {r.category?.name || 'General'}
        </Tag>
      ),
    },
    {
      title: 'Stock (Available / Total)',
      key: 'stock',
      render: (_: any, r: Asset) => {
        const percent = Math.round((r.quantity_available / (r.quantity_total || 1)) * 100);
        return (
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: r.quantity_available > 0 ? '#10B981' : '#EF4444' }}>
                {r.quantity_available} {r.unit}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #94A3B8)' }}>
                of {r.quantity_total}
              </span>
            </div>
            <Progress percent={percent} size="small" showInfo={false} strokeColor={r.quantity_available > 0 ? '#10B981' : '#EF4444'} />
          </div>
        );
      },
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      render: (cond: string) => {
        const c = CONDITION_COLORS[cond] || { color: 'default', label: cond, icon: '📌' };
        return <Tag color={c.color} style={{ fontWeight: 800, borderRadius: 8 }}>{c.icon} {c.label}</Tag>;
      },
    },
    {
      title: 'Storage Location',
      dataIndex: 'storage_location',
      key: 'storage_location',
      render: (loc: string) => loc ? <span style={{ color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600 }}>📍 {loc}</span> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Est. Value (₹)',
      dataIndex: 'estimated_value',
      key: 'estimated_value',
      render: (val: number) => <Text style={{ fontWeight: 800, color: '#10B981', fontSize: 13 }}>₹{Number(val).toLocaleString('en-IN')}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: Asset) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<ExportOutlined />}
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 700, borderRadius: 8 }}
            disabled={r.quantity_available <= 0}
            onClick={() => handleOpenCheckout(r)}
          >
            Issue
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: '#3B82F6' }} />}
            onClick={() => handleOpenEdit(r)}
          />
          <Popconfirm title="Deactivate this asset?" onConfirm={() => deleteAssetMut.mutate(r.id)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Checkouts Table Columns
  const checkoutColumns = [
    {
      title: 'Item Name',
      key: 'asset_name',
      render: (_: any, r: AssetCheckout) => (
        <div>
          <Text style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{r.asset?.name || 'Asset Item'}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', color: 'var(--color-text-secondary, #94A3B8)' }}>Code: {r.asset?.asset_code}</Text>
        </div>
      ),
    },
    {
      title: 'Issued To',
      key: 'issued_to',
      render: (_: any, r: AssetCheckout) => (
        <div>
          <Text style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>👤 {r.issued_to_person}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', color: 'var(--color-text-secondary, #94A3B8)' }}>Qty: {r.quantity} {r.asset?.unit || 'Pcs'}</Text>
        </div>
      ),
    },
    {
      title: 'Issue Date',
      dataIndex: 'issued_at',
      key: 'issued_at',
      render: (dt: string) => <span style={{ color: 'var(--color-text-secondary, #94A3B8)', fontSize: 12 }}>{dayjs(dt).format('DD MMM YYYY, hh:mm A')}</span>,
    },
    {
      title: 'Expected Return',
      dataIndex: 'expected_return_at',
      key: 'expected_return_at',
      render: (dt: string) => dt ? <span style={{ color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600 }}>{dayjs(dt).format('DD MMM YYYY')}</span> : <Text type="secondary">Not set</Text>,
    },
    {
      title: 'Issued By',
      dataIndex: 'issued_by_name',
      key: 'issued_by_name',
      render: (name: string) => <span style={{ color: 'var(--color-text-primary)', fontSize: 12 }}>{name || 'User'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const s = CHECKOUT_STATUS_COLORS[st] || { color: 'default', label: st };
        return <Tag color={s.color} style={{ fontWeight: 800, borderRadius: 8 }}>{s.label}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: AssetCheckout) => (
        r.status === 'issued' ? (
          <Button
            type="primary"
            size="small"
            icon={<SwapRightOutlined />}
            style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 700, borderRadius: 8 }}
            onClick={() => handleOpenReturn(r)}
          >
            Process Return
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 11, color: 'var(--color-text-secondary, #94A3B8)' }}>Returned on {dayjs(r.returned_at).format('DD MMM')}</Text>
        )
      ),
    },
  ];

  return (
    <div className="inventory-module animate-fadeIn" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Responsive Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            📦 Mandal Equipment & Physical Asset Inventory
          </Title>
          <Text type="secondary" style={{ fontSize: 13, color: 'var(--color-text-secondary, #94A3B8)' }}>
            Manage reusable equipment, sound systems, shamiana mandap items, volunteer checkouts, storage locations & damage audit logs
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => setCatModalOpen(true)}
            style={{ fontWeight: 600, borderRadius: 10 }}
          >
            Manage Categories
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 800, borderRadius: 10, boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}
            onClick={() => {
              setEditingAsset(null);
              assetForm.resetFields();
              setAssetModalOpen(true);
            }}
          >
            Add New Asset
          </Button>
        </Space>
      </div>

      {/* ── Summary Statistics Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{
              borderRadius: 16,
              backgroundColor: 'var(--color-bg-container)',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #3B82F6',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary, #94A3B8)', fontSize: 12, textTransform: 'uppercase' }}>Registered Assets</span>}
              value={summary?.total_assets_count ?? 0}
              prefix={<ShoppingOutlined style={{ color: '#3B82F6' }} />}
              styles={{ content: { fontWeight: 900, color: 'var(--color-text-primary)' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{
              borderRadius: 16,
              backgroundColor: 'var(--color-bg-container)',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #F59E0B',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary, #94A3B8)', fontSize: 12, textTransform: 'uppercase' }}>Total Quantity</span>}
              value={summary?.total_items_quantity ?? 0}
              suffix={<span style={{ fontSize: 12, color: 'var(--color-text-secondary, #94A3B8)' }}>Pcs</span>}
              prefix={<ToolOutlined style={{ color: '#F59E0B' }} />}
              styles={{ content: { fontWeight: 900, color: '#F59E0B' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{
              borderRadius: 16,
              backgroundColor: 'var(--color-bg-container)',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #10B981',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary, #94A3B8)', fontSize: 12, textTransform: 'uppercase' }}>Est. Total Valuation</span>}
              value={summary?.total_estimated_value ?? 0}
              precision={2}
              prefix="₹"
              styles={{ content: { fontWeight: 900, color: '#10B981' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{
              borderRadius: 16,
              backgroundColor: 'var(--color-bg-container)',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #F97316',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary, #94A3B8)', fontSize: 12, textTransform: 'uppercase' }}>Active Volunteer Checkouts</span>}
              value={summary?.active_checkouts_count ?? 0}
              prefix={<ExportOutlined style={{ color: '#F97316' }} />}
              styles={{ content: { fontWeight: 900, color: '#F97316' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Main Content Tabs & Grid Toggle ── */}
      <Card
        style={{
          borderRadius: 16,
          backgroundColor: 'var(--color-bg-container)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 4
        }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              tabBarStyle={{ marginBottom: 0, borderBottom: 'none' }}
              items={[
                {
                  key: 'assets',
                  label: (
                    <span style={{ fontWeight: 800, fontSize: 14 }}>
                      📋 Assets ({assets.length})
                    </span>
                  ),
                },
                {
                  key: 'checkouts',
                  label: (
                    <span style={{ fontWeight: 800, fontSize: 14 }}>
                      🤝 Checkouts ({checkouts.filter((c) => c.status === 'issued').length})
                    </span>
                  ),
                },
                {
                  key: 'history',
                  label: (
                    <span style={{ fontWeight: 800, fontSize: 14 }}>
                      📜 Return Audit ({checkouts.length})
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'table' | 'grid')}
              options={[
                { value: 'grid', icon: <AppstoreOutlined /> },
                { value: 'table', icon: <UnorderedListOutlined /> },
              ]}
              size="small"
            />
          </div>
        </div>

        {/* Tab Children Content */}
        {activeTab === 'assets' && (
          <div>
            {/* Filters Bar */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={10} md={8}>
                      <Input
                        placeholder="Search by asset name, code, storage location..."
                        prefix={<SearchOutlined style={{ color: '#F97316' }} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                        style={{ borderRadius: 10 }}
                      />
                    </Col>
                    <Col xs={12} sm={7} md={5}>
                      <Select
                        placeholder="Filter by Category"
                        style={{ width: '100%' }}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        allowClear
                      >
                        {categories.map((c) => (
                          <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={12} sm={7} md={5}>
                      <Select
                        placeholder="Filter by Condition"
                        style={{ width: '100%' }}
                        value={selectedCondition}
                        onChange={setSelectedCondition}
                        allowClear
                      >
                        <Select.Option value="new">🆕 New</Select.Option>
                        <Select.Option value="good">✅ Good</Select.Option>
                        <Select.Option value="fair">⚠️ Fair</Select.Option>
                        <Select.Option value="damaged">🚨 Damaged</Select.Option>
                        <Select.Option value="under_repair">🛠️ Under Repair</Select.Option>
                      </Select>
                    </Col>
                  </Row>

                  {/* Render Grid Cards View or Table View */}
                  {viewMode === 'grid' ? (
                    <Row gutter={[16, 16]}>
                      {assets.map((item: Asset) => {
                        const cond = CONDITION_COLORS[item.condition] || { color: 'default', label: item.condition, icon: '📌' };
                        const percent = Math.round((item.quantity_available / (item.quantity_total || 1)) * 100);
                        return (
                          <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                            <Card
                              size="small"
                              style={{
                                borderRadius: 14,
                                backgroundColor: 'var(--color-bg-container)',
                                border: '1px solid var(--color-border)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <Tag color="blue" style={{ fontWeight: 800, borderRadius: 6, fontSize: 11 }}>{item.asset_code}</Tag>
                                <Tag color={cond.color} style={{ fontWeight: 800, borderRadius: 8, margin: 0 }}>{cond.icon} {cond.label}</Tag>
                              </div>

                              <Text strong style={{ fontSize: 16, color: 'var(--color-text-primary)', display: 'block', marginBottom: 2 }}>
                                {item.name}
                              </Text>

                              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12, color: 'var(--color-text-secondary, #94A3B8)' }}>
                                Category: {item.category?.name || 'General'}
                              </Text>

                              <div style={{ backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.04))', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary, #94A3B8)' }}>Stock Status</span>
                                  <span style={{ fontWeight: 800, fontSize: 12, color: item.quantity_available > 0 ? '#10B981' : '#EF4444' }}>
                                    {item.quantity_available} / {item.quantity_total} {item.unit}
                                  </span>
                                </div>
                                <Progress percent={percent} size="small" showInfo={false} strokeColor={item.quantity_available > 0 ? '#10B981' : '#EF4444'} />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 14 }}>
                                <span style={{ color: 'var(--color-text-secondary, #94A3B8)' }}>
                                  📍 {item.storage_location || 'Main Storage'}
                                </span>
                                <span style={{ fontWeight: 800, color: '#10B981' }}>
                                  ₹{Number(item.estimated_value || 0).toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<ExportOutlined />}
                                  style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 800, borderRadius: 8 }}
                                  disabled={item.quantity_available <= 0}
                                  onClick={() => handleOpenCheckout(item)}
                                >
                                  Issue Item
                                </Button>

                                <Space size={4}>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined style={{ color: '#3B82F6' }} />}
                                    onClick={() => handleOpenEdit(item)}
                                  />
                                  <Popconfirm title="Deactivate this asset?" onConfirm={() => deleteAssetMut.mutate(item.id)}>
                                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                </Space>
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                    <Table
                      columns={assetColumns}
                      dataSource={assets}
                      rowKey="id"
                      loading={assetsLoading}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      scroll={{ x: 800 }}
                    />
                  )}
                </div>
              )}

        {activeTab === 'checkouts' && (
          <div>
            {viewMode === 'grid' ? (
              <Row gutter={[16, 16]}>
                {checkouts.filter((c) => c.status === 'issued').map((item: AssetCheckout) => {
                  const s = CHECKOUT_STATUS_COLORS[item.status] || { color: 'default', label: item.status };
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                      <Card
                        size="small"
                        style={{
                          borderRadius: 14,
                          backgroundColor: 'var(--color-bg-container)',
                          border: '1px solid var(--color-border)',
                          borderLeft: '4px solid #F97316',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 16, color: 'var(--color-text-primary)' }}>
                            {item.asset?.name || 'Asset Item'}
                          </Text>
                          <Tag color={s.color} style={{ fontWeight: 800, borderRadius: 8, margin: 0 }}>{s.label}</Tag>
                        </div>

                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12, color: 'var(--color-text-secondary, #94A3B8)' }}>
                          Code: {item.asset?.asset_code || 'N/A'}
                        </Text>

                        <div style={{ backgroundColor: 'var(--color-bg-subtle, rgba(249,115,22,0.08))', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <UserOutlined style={{ color: '#F97316' }} />
                            <Text strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                              {item.issued_to_person}
                            </Text>
                          </div>
                          <Tag color="orange" style={{ fontWeight: 800, borderRadius: 6, fontSize: 11 }}>
                            Quantity: {item.quantity} {item.asset?.unit || 'Pcs'}
                          </Tag>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #94A3B8)', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div>📅 Issued: {dayjs(item.issued_at).format('DD MMM YYYY, hh:mm A')}</div>
                          <div>⏰ Expected: {item.expected_return_at ? dayjs(item.expected_return_at).format('DD MMM YYYY') : 'Not specified'}</div>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                          <Button
                            type="primary"
                            block
                            icon={<SwapRightOutlined />}
                            style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 800, borderRadius: 10 }}
                            onClick={() => handleOpenReturn(item)}
                          >
                            Process Return & Check-in
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Table
                columns={checkoutColumns}
                dataSource={checkouts.filter((c) => c.status === 'issued')}
                rowKey="id"
                loading={checkoutsLoading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {viewMode === 'grid' ? (
              <Row gutter={[16, 16]}>
                {checkouts.map((item: AssetCheckout) => {
                  const s = CHECKOUT_STATUS_COLORS[item.status] || { color: 'default', label: item.status };
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                      <Card
                        size="small"
                        style={{
                          borderRadius: 14,
                          backgroundColor: 'var(--color-bg-container)',
                          border: '1px solid var(--color-border)',
                          borderLeft: item.damage_charge > 0 ? '4px solid #EF4444' : '4px solid #10B981',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 15, color: 'var(--color-text-primary)' }}>
                            {item.asset?.name || 'Asset Item'}
                          </Text>
                          <Tag color={s.color} style={{ fontWeight: 800, borderRadius: 8, margin: 0 }}>{s.label}</Tag>
                        </div>

                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10, color: 'var(--color-text-secondary, #94A3B8)' }}>
                          Borrower: <b style={{ color: 'var(--color-text-primary)' }}>{item.issued_to_person}</b> ({item.quantity} {item.asset?.unit || 'Pcs'})
                        </Text>

                        {item.damage_notes || item.damage_charge > 0 ? (
                          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: 10 }}>
                            {item.damage_notes && (
                              <Text type="danger" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>
                                ⚠️ {item.damage_notes}
                              </Text>
                            )}
                            {item.damage_charge > 0 && (
                              <Tag color="error" style={{ fontWeight: 800, marginTop: 4, borderRadius: 6 }}>
                                Penalty Charge: ₹{item.damage_charge}
                              </Tag>
                            )}
                          </div>
                        ) : (
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: 10 }}>
                            <Text style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                              ✓ Returned Intact in Good Condition
                            </Text>
                          </div>
                        )}

                        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-secondary, #94A3B8)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Issued: {dayjs(item.issued_at).format('DD MMM')}</span>
                          <span>{item.returned_at ? `Returned: ${dayjs(item.returned_at).format('DD MMM YYYY')}` : 'Active'}</span>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Table
                columns={[
                  ...checkoutColumns,
                  {
                    title: 'Damage Notes / Penalty Charges',
                    key: 'damage',
                    render: (_: any, r: AssetCheckout) => (
                      <div>
                        {r.damage_notes ? <Text type="danger" style={{ fontSize: 11, display: 'block' }}>⚠️ {r.damage_notes}</Text> : null}
                        {r.damage_charge > 0 ? <Tag color="error">Charge: ₹{r.damage_charge}</Tag> : <Text type="secondary">-</Text>}
                      </div>
                    ),
                  },
                ]}
                dataSource={checkouts}
                rowKey="id"
                loading={checkoutsLoading}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 900 }}
              />
            )}
          </div>
        )}
      </Card>

      {/* ── Modal: Add / Edit Asset ── */}
      <Modal
        title={<span style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontSize: 18 }}>{editingAsset ? 'Edit Asset Item' : 'Add New Mandal Asset'}</span>}
        open={assetModalOpen}
        onCancel={() => setAssetModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={assetForm}
          layout="vertical"
          onFinish={(values) => {
            if (editingAsset) {
              updateAssetMut.mutate({ id: editingAsset.id, payload: values });
            } else {
              createAssetMut.mutate(values);
            }
          }}
        >
          <Form.Item name="category_id" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Asset Category</span>} rules={[{ required: true, message: 'Select category' }]}>
            <Select placeholder="Select category">
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="name" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Item Name</span>} rules={[{ required: true, message: 'Enter item name' }]}>
            <Input placeholder="e.g. JBL Sound System Speaker, Gold Crown, Silver Plate" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="quantity_total" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Total Quantity</span>} initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Unit of Measurement</span>} initialValue="Pcs">
                <Input placeholder="Pcs, Sets, Boxes, Meters" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="condition" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Condition</span>} initialValue="good">
                <Select>
                  <Select.Option value="new">🆕 New</Select.Option>
                  <Select.Option value="good">✅ Good</Select.Option>
                  <Select.Option value="fair">⚠️ Fair</Select.Option>
                  <Select.Option value="damaged">🚨 Damaged</Select.Option>
                  <Select.Option value="under_repair">🛠️ Under Repair</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimated_value" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Est. Value (₹)</span>} initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="storage_location" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Storage Location</span>}>
            <Input placeholder="e.g. Main Godown Rack B3, Storage Room 2" />
          </Form.Item>

          <Form.Item name="notes" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Notes / Description</span>}>
            <Input.TextArea rows={2} placeholder="Serial numbers, specifications, maintenance instructions..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAssetModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createAssetMut.isPending || updateAssetMut.isPending} style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 800 }}>
                {editingAsset ? 'Update Asset' : 'Save Asset'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Manage Categories ── */}
      <Modal
        title={<span style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontSize: 18 }}>Manage Asset Categories</span>}
        open={catModalOpen}
        onCancel={() => setCatModalOpen(false)}
        footer={null}
      >
        <Form
          form={catForm}
          layout="vertical"
          onFinish={(values) => createCatMut.mutate(values)}
          style={{ marginBottom: 20 }}
        >
          <Row gutter={8}>
            <Col span={16}>
              <Form.Item name="name" rules={[{ required: true, message: 'Enter category name' }]} style={{ marginBottom: 0 }}>
                <Input placeholder="e.g. Sound & Lighting, Utensils" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Button type="primary" htmlType="submit" block icon={<PlusOutlined />} loading={createCatMut.isPending} style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 800 }}>
                Add Category
              </Button>
            </Col>
          </Row>
        </Form>

        <Table
          dataSource={categories}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: 'Category Name', dataIndex: 'name', key: 'name', render: (n: string) => <Text style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{n}</Text> },
            { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <span style={{ color: 'var(--color-text-secondary, #94A3B8)' }}>{c || '-'}</span> },
          ]}
        />
      </Modal>

      {/* ── Drawer: Issue Equipment Checkout ── */}
      <Drawer
        title={<span style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontSize: 16 }}>🤝 Issue Equipment to Volunteer / Vendor</span>}
        placement="right"
        styles={{ wrapper: { width: '420px', maxWidth: '100vw' } }}
        onClose={() => setCheckoutModalOpen(false)}
        open={checkoutModalOpen}
      >
        {selectedAssetForCheckout && (
          <div style={{ backgroundColor: 'var(--color-bg-subtle, rgba(249, 115, 22, 0.12))', padding: 14, borderRadius: 10, marginBottom: 20, border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            <Text style={{ fontWeight: 900, color: 'var(--color-text-primary)', display: 'block', fontSize: 16 }}>{selectedAssetForCheckout.name}</Text>
            <Text type="secondary" style={{ fontSize: 12, color: 'var(--color-text-secondary, #94A3B8)' }}>Code: {selectedAssetForCheckout.asset_code}</Text>
            <div style={{ marginTop: 6 }}>
              <Badge status="success" text={<span style={{ fontWeight: 800, color: '#10B981' }}>Available Stock: {selectedAssetForCheckout.quantity_available} {selectedAssetForCheckout.unit}</span>} />
            </div>
          </div>
        )}

        <Form
          form={checkoutForm}
          layout="vertical"
          onFinish={(values) => checkoutMut.mutate(values)}
        >
          <Form.Item name="asset_id" hidden><Input /></Form.Item>

          <Form.Item name="issued_to_person" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Issued To (Volunteer / Contractor Name)</span>} rules={[{ required: true, message: 'Enter recipient name' }]}>
            <Input prefix={<UserOutlined style={{ color: '#F97316' }} />} placeholder="e.g. Ramesh Patil (Sound Incharge)" />
          </Form.Item>

          <Form.Item name="quantity" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Quantity to Issue</span>} rules={[{ required: true }]}>
            <InputNumber min={1} max={selectedAssetForCheckout?.quantity_available || 1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="expected_return_at" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Expected Return Date</span>}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="notes" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Checkout Notes / Handover Condition</span>}>
            <Input.TextArea rows={3} placeholder="Note any pre-existing scratches or specific event usage details..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={checkoutMut.isPending} style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 800, borderRadius: 10 }}>
            Confirm Issue Equipment
          </Button>
        </Form>
      </Drawer>

      {/* ── Modal: Process Return & Damage Assessment ── */}
      <Modal
        title={<span style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontSize: 18 }}>📥 Process Equipment Return</span>}
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        footer={null}
      >
        {selectedCheckoutForReturn && (
          <div style={{ backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 10, marginBottom: 20, border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            <Text style={{ fontWeight: 800, color: 'var(--color-text-primary)', display: 'block', fontSize: 15 }}>{selectedCheckoutForReturn.asset?.name}</Text>
            <Text type="secondary" style={{ fontSize: 12, color: 'var(--color-text-secondary, #94A3B8)' }}>
              Issued to: <b style={{ color: 'var(--color-text-primary)' }}>{selectedCheckoutForReturn.issued_to_person}</b> (Qty: {selectedCheckoutForReturn.quantity})
            </Text>
          </div>
        )}

        <Form
          form={returnForm}
          layout="vertical"
          onFinish={(values) => returnMut.mutate(values)}
        >
          <Form.Item name="checkout_id" hidden><Input /></Form.Item>

          <Form.Item name="returned_condition" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Returned Condition</span>} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="good">✅ Good / Intact Condition</Select.Option>
              <Select.Option value="fair">⚠️ Minor Wear / Fair</Select.Option>
              <Select.Option value="damaged">🚨 Damaged (Requires Repair)</Select.Option>
              <Select.Option value="under_repair">🛠️ Sent for Repair</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="damage_notes" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Damage / Assessment Notes</span>}>
            <Input.TextArea rows={3} placeholder="Describe any broken parts, missing accessories or repairs required..." />
          </Form.Item>

          <Form.Item name="damage_charge" label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Damage Penalty / Charge (₹)</span>} initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={returnMut.isPending} style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 800, borderRadius: 10 }}>
            Submit Return & Update Stock
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
