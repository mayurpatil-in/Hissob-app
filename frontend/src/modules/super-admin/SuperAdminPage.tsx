import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Table, Tag, Button, Modal, Form,
  Input, Space, App, Select, Popconfirm, InputNumber, Tabs, Switch
} from 'antd';
import {
  BankOutlined, TeamOutlined, DollarOutlined, SafetyOutlined,
  RocketOutlined, PlusOutlined, UserAddOutlined, EditOutlined,
  PoweroffOutlined, SearchOutlined, AuditOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSuperAdminStats, getOrganizations, createOrganization,
  updateOrganization, getAuditLogs
} from '../../api/services';

const { Title, Text } = Typography;

const SuperAdminPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // ── Queries ──
  const { data: stats = {} } = useQuery({
    queryKey: ['superAdminStats'],
    queryFn: getSuperAdminStats,
  });

  const { data: organizations = [], isLoading: isOrgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  const { data: auditLogs = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => getAuditLogs(),
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (data) => {
      message.success(`Organization "${data.name}" and Org Admin created successfully!`);
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['superAdminStats'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create organization');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      message.success('Organization updated successfully!');
      setIsEditModalOpen(false);
      setEditingOrg(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['superAdminStats'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update organization');
    },
  });

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate(values);
  };

  const handleEditSubmit = (values: any) => {
    if (!editingOrg) return;
    updateMutation.mutate({ id: editingOrg.id, data: values });
  };

  const openEditModal = (org: any) => {
    setEditingOrg(org);
    editForm.setFieldsValue({
      name: org.name,
      email: org.email,
      status: org.status,
      max_users: org.max_users,
      storage_limit_mb: org.storage_limit_mb,
      allow_permanent_deletion: org.allow_permanent_deletion !== false,
    });
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = (org: any) => {
    const newStatus = org.status === 'active' ? 'suspended' : 'active';
    updateMutation.mutate({ id: org.id, data: { status: newStatus } });
  };

  // ── Filtering Logic ──
  const filteredOrganizations = organizations.filter((org: any) => {
    const matchesSearch =
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Columns ──
  const orgColumns = [
    {
      title: 'Organization Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: 'Slug Identifier',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <Tag color="geekblue">{slug}</Tag>,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'active' ? 'green' : st === 'suspended' ? 'volcano' : 'orange'}>
          {st?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'User Limit',
      dataIndex: 'max_users',
      key: 'max_users',
      render: (limit: number) => `${limit} users`,
    },
    {
      title: 'Storage (MB)',
      dataIndex: 'storage_limit_mb',
      key: 'storage_limit_mb',
      render: (mb: number) => `${mb || 500} MB`,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>

          <Popconfirm
            title={`${record.status === 'active' ? 'Suspend' : 'Reactivate'} Organization?`}
            description={`Are you sure you want to change status of "${record.name}" to ${record.status === 'active' ? 'suspended' : 'active'}?`}
            onConfirm={() => handleToggleStatus(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="small"
              danger={record.status === 'active'}
              icon={<PoweroffOutlined />}
            >
              {record.status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const auditColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => d ? new Date(d).toLocaleString('en-IN') : 'N/A',
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (m: string) => <Tag color="blue">{m?.toUpperCase()}</Tag>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (a: string) => <Tag color="purple">{a?.toUpperCase()}</Tag>,
    },
    {
      title: 'User ID / Context',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (uid: string) => uid ? <Text code style={{ fontSize: 11 }}>{uid}</Text> : <Text type="secondary">System</Text>,
    },
    {
      title: 'Audit Details',
      dataIndex: 'details',
      key: 'details',
      render: (det: any) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {typeof det === 'object' ? JSON.stringify(det) : (det || '—')}
        </Text>
      ),
    },
  ];

  return (
    <div className="super-admin-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Super Admin Platform Command Center</Title>
          <Text type="secondary">Global platform analytics, SaaS tenant management, and organization provisioning</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#F97316', borderColor: '#F97316' }}
        >
          Create New Organization
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Statistic title="Total Active Organizations" value={stats.total_organizations || 0} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Statistic title="Total System Users" value={stats.total_users || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Statistic title="Platform MRR (Est ₹)" value={stats.mrr || 0} prefix={<RocketOutlined />} styles={{ content: { color: '#22C55E' } }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Statistic title="Platform Total Collections (₹)" value={stats.total_platform_collections || 0} prefix={<DollarOutlined />} precision={2} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Statistic title="Audit Trail Log Count" value={stats.total_audit_records || 0} prefix={<SafetyOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* ── Main Tabbed Section ── */}
      <Tabs
        defaultActiveKey="orgs"
        items={[
          {
            key: 'orgs',
            label: <span><BankOutlined /> Registered Organizations (Tenants)</span>,
            children: (
              <Card className="hissob-card">
                {/* ── Table Filter Controls ── */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} md={8}>
                    <Input
                      placeholder="Search organization, slug, or email..."
                      prefix={<SearchOutlined />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Select
                      style={{ width: '100%' }}
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      options={[
                        { label: 'All Statuses', value: 'all' },
                        { label: 'Active Only', value: 'active' },
                        { label: 'Suspended Only', value: 'suspended' },
                      ]}
                    />
                  </Col>
                </Row>

                <Table
                  dataSource={filteredOrganizations}
                  columns={orgColumns}
                  rowKey="id"
                  loading={isOrgsLoading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'audit',
            label: <span><AuditOutlined /> System Audit Logs</span>,
            children: (
              <Card title="Global Platform Audit Log Trail" className="hissob-card">
                <Table
                  dataSource={auditLogs}
                  columns={auditColumns}
                  rowKey="id"
                  loading={isAuditLoading}
                  pagination={{ pageSize: 15 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* ── Create Organization Modal ── */}
      <Modal
        title="Provision New SaaS Organization & Org Admin"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit} initialValues={{ max_users: 10, storage_limit_mb: 500 }}>
          <Title level={5} style={{ marginTop: 0, color: '#F97316' }}>1. Organization Details</Title>
          <Form.Item name="name" label="Organization / Mandal Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Lalbaugcha Raja Mandal" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="slug" label="URL Slug" rules={[{ required: true }]}>
                <Input placeholder="e.g. lalbaug-mandal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Org Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="contact@lalbaug.org" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ color: '#0B2347', marginTop: 12 }}>2. Initial Org Admin User</Title>
          <Form.Item name="admin_name" label="Org Admin Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Ramesh Patil" prefix={<UserAddOutlined />} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="admin_email" label="Admin Login Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="admin@lalbaug.org" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="admin_password" label="Admin Password" rules={[{ required: true, min: 6 }]}>
                <Input.Password placeholder="Secure Password" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Provision Organization
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit Organization Modal ── */}
      <Modal
        title={`Edit Organization — ${editingOrg?.name || ''}`}
        open={isEditModalOpen}
        onCancel={() => { setIsEditModalOpen(false); setEditingOrg(null); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Organization Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="status" label="Account Status" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="max_users" label="Max Users Limit" rules={[{ required: true }]}>
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storage_limit_mb" label="Storage Limit (MB)" rules={[{ required: true }]}>
                <InputNumber min={50} max={100000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="allow_permanent_deletion" valuePropName="checked" label="Allow Permanent Receipt Deletion (Org Admin)">
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => { setIsEditModalOpen(false); setEditingOrg(null); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SuperAdminPage;
