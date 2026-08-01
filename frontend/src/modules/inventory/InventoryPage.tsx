import React, { useState } from 'react';
import {
  Card, Table, Button, Tag, Space, Input, Select, Modal, Form,
  InputNumber, DatePicker, Row, Col, Statistic, Tabs, Drawer,
  Typography, message, Popconfirm, Badge
} from 'antd';
import {
  ToolOutlined, PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, ExportOutlined, SwapRightOutlined,
  AppstoreOutlined, ShoppingOutlined, UserOutlined
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

const CONDITION_COLORS: Record<string, { color: string; label: string }> = {
  new: { color: 'cyan', label: '🆕 NEW' },
  good: { color: 'green', label: '✅ GOOD' },
  fair: { color: 'orange', label: '⚠️ FAIR' },
  damaged: { color: 'red', label: '🚨 DAMAGED' },
  under_repair: { color: 'purple', label: '🛠️ REPAIR' },
};

const CHECKOUT_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  issued: { color: 'processing', label: '⏳ ISSUED' },
  returned: { color: 'success', label: '✅ RETURNED' },
  overdue: { color: 'error', label: '⏰ OVERDUE' },
  damaged: { color: 'warning', label: '🚨 DAMAGED' },
  lost: { color: 'default', label: '❌ LOST' },
};

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assets');
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
      title: 'Code & Name',
      key: 'name',
      render: (_: any, r: Asset) => (
        <div>
          <Text style={{ fontWeight: 800, color: '#0B2347', display: 'block' }}>{r.name}</Text>
          <Tag color="blue" style={{ fontSize: 10, fontWeight: 700 }}>{r.asset_code}</Tag>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: any, r: Asset) => r.category?.name || 'General',
    },
    {
      title: 'Stock (Available / Total)',
      key: 'stock',
      render: (_: any, r: Asset) => (
        <div>
          <Badge
            status={r.quantity_available > 0 ? 'success' : 'error'}
            text={<span style={{ fontWeight: 800, color: r.quantity_available > 0 ? '#059669' : '#DC2626' }}>{r.quantity_available} Available</span>}
          />
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Total: {r.quantity_total} {r.unit}</Text>
        </div>
      ),
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      render: (cond: string) => {
        const c = CONDITION_COLORS[cond] || { color: 'default', label: cond };
        return <Tag color={c.color} style={{ fontWeight: 800 }}>{c.label}</Tag>;
      },
    },
    {
      title: 'Storage Location',
      dataIndex: 'storage_location',
      key: 'storage_location',
      render: (loc: string) => loc ? <span>📍 {loc}</span> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Est. Value (₹)',
      dataIndex: 'estimated_value',
      key: 'estimated_value',
      render: (val: number) => <Text style={{ fontWeight: 700 }}>₹{Number(val).toLocaleString('en-IN')}</Text>,
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
            style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 700 }}
            disabled={r.quantity_available <= 0}
            onClick={() => handleOpenCheckout(r)}
          >
            Issue
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: '#2563EB' }} />}
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
          <Text style={{ fontWeight: 800, color: '#0B2347' }}>{r.asset?.name || 'Asset Item'}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Code: {r.asset?.asset_code}</Text>
        </div>
      ),
    },
    {
      title: 'Issued To',
      key: 'issued_to',
      render: (_: any, r: AssetCheckout) => (
        <div>
          <Text style={{ fontWeight: 700 }}>👤 {r.issued_to_person}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Qty: {r.quantity} {r.asset?.unit || 'Pcs'}</Text>
        </div>
      ),
    },
    {
      title: 'Issue Date',
      dataIndex: 'issued_at',
      key: 'issued_at',
      render: (dt: string) => dayjs(dt).format('DD MMM YYYY, hh:mm A'),
    },
    {
      title: 'Expected Return',
      dataIndex: 'expected_return_at',
      key: 'expected_return_at',
      render: (dt: string) => dt ? dayjs(dt).format('DD MMM YYYY') : <Text type="secondary">Not set</Text>,
    },
    {
      title: 'Issued By',
      dataIndex: 'issued_by_name',
      key: 'issued_by_name',
      render: (name: string) => name || 'User',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const s = CHECKOUT_STATUS_COLORS[st] || { color: 'default', label: st };
        return <Tag color={s.color} style={{ fontWeight: 800 }}>{s.label}</Tag>;
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
            style={{ background: '#059669', borderColor: '#059669', fontWeight: 700 }}
            onClick={() => handleOpenReturn(r)}
          >
            Process Return
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>Returned on {dayjs(r.returned_at).format('DD MMM')}</Text>
        )
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Page Title Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 800 }}>
            📦 Mandal Equipment & Physical Asset Inventory
          </Title>
          <Text type="secondary">
            Manage reusable equipment, track volunteer checkouts, storage locations & damage logs.
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => setCatModalOpen(true)}
            style={{ fontWeight: 600 }}
          >
            Manage Categories
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 700 }}
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
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(11,35,71,0.06)' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total Registered Assets</span>}
              value={summary?.total_assets_count ?? 0}
              prefix={<ShoppingOutlined style={{ color: '#3B82F6' }} />}
              styles={{ content: { fontWeight: 900, color: 'var(--color-text-primary)' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(11,35,71,0.06)' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total Items Quantity</span>}
              value={summary?.total_items_quantity ?? 0}
              suffix="Pcs/Sets"
              prefix={<ToolOutlined style={{ color: '#3B82F6' }} />}
              styles={{ content: { fontWeight: 900, color: '#3B82F6' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(11,35,71,0.06)' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total Estimated Value</span>}
              value={summary?.total_estimated_value ?? 0}
              precision={2}
              prefix="₹"
              styles={{ content: { fontWeight: 900, color: '#10B981' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(11,35,71,0.06)' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Active Checkouts / Issued</span>}
              value={summary?.active_checkouts_count ?? 0}
              prefix={<ExportOutlined style={{ color: '#F97316' }} />}
              styles={{ content: { fontWeight: 900, color: '#F97316' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Main Tabbed Content ── */}
      <Card variant="borderless" style={{ borderRadius: 14, boxShadow: '0 6px 20px rgba(11,35,71,0.08)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'assets',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  📋 Equipment Register ({assets.length})
                </span>
              ),
              children: (
                <div>
                  {/* Filters Bar */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={10} md={8}>
                      <Input
                        placeholder="Search by asset name, code, location..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
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

                  <Table
                    columns={assetColumns}
                    dataSource={assets}
                    rowKey="id"
                    loading={assetsLoading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 800 }}
                  />
                </div>
              ),
            },
            {
              key: 'checkouts',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  🤝 Active Checkouts ({checkouts.filter((c) => c.status === 'issued').length})
                </span>
              ),
              children: (
                <Table
                  columns={checkoutColumns}
                  dataSource={checkouts.filter((c) => c.status === 'issued')}
                  rowKey="id"
                  loading={checkoutsLoading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                />
              ),
            },
            {
              key: 'history',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  📜 Return & Damage Audit Trail ({checkouts.length})
                </span>
              ),
              children: (
                <Table
                  columns={[
                    ...checkoutColumns,
                    {
                      title: 'Damage Notes / Charges',
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
              ),
            },
          ]}
        />
      </Card>

      {/* ── Modal: Add / Edit Asset ── */}
      <Modal
        title={<span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{editingAsset ? 'Edit Asset Item' : 'Add New Mandal Asset'}</span>}
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
              <Button type="primary" htmlType="submit" loading={createAssetMut.isPending || updateAssetMut.isPending} style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', fontWeight: 700 }}>
                {editingAsset ? 'Update Asset' : 'Save Asset'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Manage Categories ── */}
      <Modal
        title={<span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>Manage Asset Categories</span>}
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
              <Button type="primary" htmlType="submit" block icon={<PlusOutlined />} loading={createCatMut.isPending} style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 700 }}>
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
            { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => c || '-' },
          ]}
        />
      </Modal>

      {/* ── Drawer: Issue Equipment Checkout ── */}
      <Drawer
        title={<span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>🤝 Issue Equipment to Volunteer / Vendor</span>}
        placement="right"
        styles={{ wrapper: { width: '420px', maxWidth: '100vw' } }}
        onClose={() => setCheckoutModalOpen(false)}
        open={checkoutModalOpen}
      >
        {selectedAssetForCheckout && (
          <div style={{ background: 'rgba(249, 115, 22, 0.15)', padding: 14, borderRadius: 10, marginBottom: 20, border: '1px solid rgba(249, 115, 22, 0.3)', color: 'var(--color-text-primary)' }}>
            <Text style={{ fontWeight: 800, color: 'var(--color-text-primary)', display: 'block', fontSize: 16 }}>{selectedAssetForCheckout.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Code: {selectedAssetForCheckout.asset_code}</Text>
            <div style={{ marginTop: 6 }}>
              <Badge status="success" text={<span style={{ fontWeight: 800, color: '#10B981' }}>Available: {selectedAssetForCheckout.quantity_available} {selectedAssetForCheckout.unit}</span>} />
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
            <Input prefix={<UserOutlined />} placeholder="e.g. Ramesh Patil (Sound Incharge)" />
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

          <Button type="primary" htmlType="submit" block size="large" loading={checkoutMut.isPending} style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 800 }}>
            Confirm Issue Equipment
          </Button>
        </Form>
      </Drawer>

      {/* ── Modal: Process Return & Damage Assessment ── */}
      <Modal
        title={<span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>📥 Process Equipment Return</span>}
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        footer={null}
      >
        {selectedCheckoutForReturn && (
          <div style={{ background: 'var(--color-bg)', padding: 14, borderRadius: 10, marginBottom: 20, border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            <Text style={{ fontWeight: 800, color: 'var(--color-text-primary)', display: 'block' }}>{selectedCheckoutForReturn.asset?.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Issued to: <b>{selectedCheckoutForReturn.issued_to_person}</b> (Qty: {selectedCheckoutForReturn.quantity})
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

          <Button type="primary" htmlType="submit" block size="large" loading={returnMut.isPending} style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 800 }}>
            Submit Return & Update Stock
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
