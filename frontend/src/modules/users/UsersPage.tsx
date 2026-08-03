import React, { useState } from 'react';
import {
  Table, Button, Tag, Card, Row, Col, Typography, Modal, Form, Input,
  Select, Space, Popconfirm, Tooltip, App, Avatar
} from 'antd';
import {
  PlusOutlined, UserAddOutlined, EditOutlined, DeleteOutlined,
  LockOutlined, UnlockOutlined, TeamOutlined, CheckCircleOutlined,
  StopOutlined, SearchOutlined, FilterOutlined, MailOutlined,
  PhoneOutlined, CrownOutlined, UserOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'gold',
  org_admin: 'purple',
  treasurer: 'green',
  collector: 'orange',
  president: 'crimson',
  secretary: 'blue',
  auditor: 'cyan',
  member: 'geekblue',
  volunteer: 'default',
};

const UsersPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      message.success(`User "${data.full_name}" created successfully! 🎉`);
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => updateUser(id, data),
    onSuccess: () => {
      message.success('User details & role updated successfully! ✨');
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      message.success('User account removed!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to delete user');
    },
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: any) => {
    setEditingUser(record);
    const firstRole = record.roles?.[0]?.name?.toLowerCase() || record.roles?.[0]?.slug || 'collector';
    form.setFieldsValue({
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      role_name: firstRole,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q);

    if (!matchesSearch) return false;

    if (selectedRoleFilter) {
      if (selectedRoleFilter === 'super_admin') return u.is_super_admin;
      const userRoles = (u.roles || []).map((r: any) => (r.slug || r.name || '').toLowerCase());
      return userRoles.includes(selectedRoleFilter);
    }

    return true;
  });

  const columns = [
    {
      title: 'Member Name',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 190,
      render: (t: string, record: any) => {
        const initials = (t || 'U').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={36}
              style={{
                background: record.is_super_admin
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                  : 'linear-gradient(135deg, #F97316, #EA580C)',
                fontWeight: 800,
                fontSize: 13,
                border: '2px solid #FFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              {initials}
            </Avatar>
            <div>
              <b style={{ color: 'var(--color-text-primary)', fontSize: 13, display: 'block' }}>{t}</b>
              <Text type="secondary" style={{ fontSize: 11 }}>ID: {record.id?.substring(0, 8)}</Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (em: string) => (
        <span style={{ fontSize: 13, wordBreak: 'break-all' }}>
          <MailOutlined style={{ color: 'var(--color-text-secondary)', marginRight: 6 }} />
          {em}
        </span>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (ph: string) => (
        <span style={{ fontSize: 12 }}>
          <PhoneOutlined style={{ color: '#22C55E', marginRight: 4 }} />
          {ph || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 110,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'} style={{ borderRadius: 8, fontWeight: 700, padding: '2px 8px' }}>
          {active ? 'ACTIVE' : 'SUSPENDED'}
        </Tag>
      ),
    },
    {
      title: 'Role / Designation',
      key: 'roles',
      width: 160,
      render: (_: any, record: any) => {
        if (record.is_super_admin) {
          return <Tag color="gold" icon={<CrownOutlined />} style={{ borderRadius: 8, fontWeight: 800 }}>SUPER ADMIN</Tag>;
        }
        if (record.roles && record.roles.length > 0) {
          return record.roles.map((r: any) => {
            const roleKey = (r.name || r.slug || 'member').toLowerCase().replace(' ', '_');
            const color = ROLE_COLORS[roleKey] || 'blue';
            const label = (r.name || r.slug || 'MEMBER').replace('_', ' ').toUpperCase();
            return (
              <Tag color={color} key={r.id || r.name} style={{ borderRadius: 8, fontWeight: 700 }}>
                {label}
              </Tag>
            );
          });
        }
        return <Tag color="geekblue" style={{ borderRadius: 8 }}>MEMBER</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Edit Role & Details">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOpenEditModal(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          <Tooltip title={record.is_active ? 'Suspend Account' : 'Activate Account'}>
            <Button
              icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
              size="small"
              onClick={() => updateMutation.mutate({ id: record.id, data: { is_active: !record.is_active } })}
              style={{ color: record.is_active ? '#EF4444' : '#22C55E', borderRadius: 6 }}
            />
          </Tooltip>

          <Popconfirm
            title="Delete Account?"
            description="Permanently delete this user?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Account">
              <Button danger icon={<DeleteOutlined />} size="small" style={{ borderRadius: 6 }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="users-module animate-fadeIn" style={{ paddingBottom: 32 }}>
      {/* ── Page Header Banner ── */}
      <div
        className="page-header"
        style={{
          marginBottom: 20,
          background: 'var(--color-bg-card)',
          padding: '16px 20px',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: 'calc(1.1rem + 0.5vw)' }}>
              <TeamOutlined style={{ color: '#F97316', marginRight: 6 }} />
              Organization User Directory
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
            Manage trustees, treasurers, secretaries, collectors, and active volunteers.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenAddModal}
          style={{
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            borderColor: '#F97316',
            borderRadius: 10,
            fontWeight: 700,
            width: '100%',
            maxWidth: 180,
          }}
        >
          Add New User
        </Button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card
            className="hissob-card"
            style={{ borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Organization Users
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: 'var(--color-text-primary)', fontWeight: 900 }}>
                  {users.length}
                </Title>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.12)', padding: 12, borderRadius: 12 }}>
                <TeamOutlined style={{ fontSize: 24, color: '#F97316' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="hissob-card"
            style={{ borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Active Accounts
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#22C55E', fontWeight: 900 }}>
                  {users.filter((u: any) => u.is_active).length}
                </Title>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.12)', padding: 12, borderRadius: 12 }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: '#22C55E' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="hissob-card"
            style={{ borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Suspended Accounts
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#EF4444', fontWeight: 900 }}>
                  {users.filter((u: any) => !u.is_active).length}
                </Title>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: 12, borderRadius: 12 }}>
                <StopOutlined style={{ fontSize: 24, color: '#EF4444' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Table Card with Search & Filter ── */}
      <Card
        className="hissob-card"
        style={{ borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={14} md={16}>
              <Input
                size="large"
                prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="Search user by name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col xs={24} sm={10} md={8}>
              <Select
                size="large"
                placeholder="Filter by Role"
                allowClear
                suffixIcon={<FilterOutlined />}
                style={{ width: '100%', borderRadius: 10 }}
                onChange={(val) => setSelectedRoleFilter(val)}
              >
                <Option value="org_admin">🏢 Org Admin</Option>
                <Option value="president">👑 President</Option>
                <Option value="treasurer">💰 Treasurer</Option>
                <Option value="secretary">📜 Secretary</Option>
                <Option value="collector">📲 Collector</Option>
                <Option value="auditor">🔍 Auditor</Option>
                <Option value="member">👤 Member</Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, responsive: true }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Add / Edit User Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserAddOutlined style={{ color: '#F97316' }} />
            <span>{editingUser ? 'Edit Member Role & Details' : 'Add New Organization User'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={540}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role_name: 'collector' }}>
          <Form.Item name="full_name" label={<span style={{ fontWeight: 700 }}>Full Name</span>} rules={[{ required: true, message: 'Enter member full name' }]}>
            <Input placeholder="e.g. Vinay Kumar" prefix={<UserOutlined />} size="large" style={{ borderRadius: 10 }} />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label={<span style={{ fontWeight: 700 }}>Email Address</span>} rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="vinay@mandal.org" prefix={<MailOutlined />} size="large" style={{ borderRadius: 10 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label={<span style={{ fontWeight: 700 }}>Phone Number</span>}>
                <Input placeholder="+91 98765 43210" prefix={<PhoneOutlined />} size="large" style={{ borderRadius: 10 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            {!editingUser && (
              <Col xs={24} sm={12}>
                <Form.Item name="password" label={<span style={{ fontWeight: 700 }}>Initial Password</span>} rules={[{ required: true, min: 8, message: 'Min 8 chars' }]}>
                  <Input.Password placeholder="Password" prefix={<LockOutlined />} size="large" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={editingUser ? 24 : 12}>
              <Form.Item name="role_name" label={<span style={{ fontWeight: 700 }}>Assigned Role</span>} rules={[{ required: true }]}>
                <Select placeholder="Select Role" size="large" style={{ borderRadius: 10 }}>
                  <Option value="org_admin">🏢 Org Admin</Option>
                  <Option value="president">👑 President</Option>
                  <Option value="treasurer">💰 Treasurer</Option>
                  <Option value="secretary">📜 Secretary</Option>
                  <Option value="collector">📲 Collector</Option>
                  <Option value="auditor">🔍 Auditor</Option>
                  <Option value="member">👤 Member</Option>
                  <Option value="volunteer">🤝 Volunteer / Helper</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 20 }}>
            <Space>
              <Button size="large" onClick={() => setIsModalOpen(false)} style={{ borderRadius: 10 }}>
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 10, fontWeight: 700 }}
              >
                {editingUser ? 'Save User & Role' : 'Create Member User'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
