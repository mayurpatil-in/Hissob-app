import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Table, Tag, Button, Modal, Form, Input, Space, App
} from 'antd';
import {
  BankOutlined, TeamOutlined, DollarOutlined, SafetyOutlined,
  RocketOutlined, PlusOutlined, UserAddOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuperAdminStats, getOrganizations, createOrganization } from '../../api/services';

const { Title, Text } = Typography;

const SuperAdminPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: stats = {} } = useQuery({
    queryKey: ['superAdminStats'],
    queryFn: getSuperAdminStats,
  });

  const { data: organizations = [], isLoading: isOrgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

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

  const handleSubmit = (values: any) => {
    createMutation.mutate(values);
  };

  const columns = [
    { title: 'Organization Name', dataIndex: 'name', key: 'name', render: (text: string) => <b>{text}</b> },
    { title: 'Slug Identifier', dataIndex: 'slug', key: 'slug', render: (slug: string) => <Tag color="geekblue">{slug}</Tag> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (st: string) => <Tag color={st === 'active' ? 'green' : 'orange'}>{st?.toUpperCase()}</Tag> },
    { title: 'User Limit', dataIndex: 'max_users', key: 'max_users', render: (limit: number) => `${limit} users` },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
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

      {/* ── Organizations Table ── */}
      <Card title="Registered Organizations (Tenants)" className="hissob-card">
        <Table
          dataSource={organizations}
          columns={columns}
          rowKey="id"
          loading={isOrgsLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* ── Create Organization Modal ── */}
      <Modal
        title="Provision New SaaS Organization & Org Admin"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ max_users: 10, storage_limit_mb: 500 }}>
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
    </div>
  );
};

export default SuperAdminPage;
