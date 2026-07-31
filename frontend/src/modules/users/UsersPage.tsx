import React, { useState } from 'react';
import {
  Table, Button, Tag, Card, Row, Col, Typography, Modal, Form, Input,
  Select, Space, Popconfirm, Tooltip, App
} from 'antd';
import {
  PlusOutlined, UserAddOutlined, EditOutlined, DeleteOutlined,
  LockOutlined, UnlockOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'gold',
  org_admin: 'purple',
  treasurer: 'blue',
  collector: 'green',
  president: 'orange',
  secretary: 'volcano',
  auditor: 'cyan',
  member: 'cyan',
  volunteer: 'default',
};

const UsersPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
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

  const columns = [
    { title: 'Full Name', dataIndex: 'full_name', key: 'full_name', render: (t: string) => <b>{t}</b> },
    { title: 'Email Address', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (ph: string) => ph || 'N/A' },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'} style={{ borderRadius: 10 }}>
          {active ? 'ACTIVE' : 'SUSPENDED'}
        </Tag>
      ),
    },
    {
      title: 'Role / Designation',
      key: 'roles',
      render: (_: any, record: any) => {
        if (record.is_super_admin) {
          return <Tag color="gold" style={{ borderRadius: 10, fontWeight: 700 }}>SUPER ADMIN 👑</Tag>;
        }
        if (record.roles && record.roles.length > 0) {
          return record.roles.map((r: any) => {
            const roleKey = (r.name || r.slug || 'member').toLowerCase().replace(' ', '_');
            const color = ROLE_COLORS[roleKey] || 'blue';
            const label = (r.name || r.slug || 'MEMBER').replace('_', ' ').toUpperCase();
            return (
              <Tag color={color} key={r.id || r.name} style={{ borderRadius: 10, fontWeight: 700 }}>
                {label}
              </Tag>
            );
          });
        }
        return <Tag color="cyan" style={{ borderRadius: 10 }}>MEMBER</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Edit Member Role & Details">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>

          <Tooltip title={record.is_active ? 'Suspend User' : 'Activate User'}>
            <Button
              icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
              size="small"
              onClick={() => updateMutation.mutate({ id: record.id, data: { is_active: !record.is_active } })}
              style={{ color: record.is_active ? '#EF4444' : '#22C55E' }}
            />
          </Tooltip>

          <Popconfirm
            title="Delete Member Account?"
            description="Are you sure you want to permanently delete this user?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Account">
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="users-module animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>
            Organization User Directory
          </Title>
          <Text type="secondary">
            Manage trustees, treasurers, secretaries, collectors, and volunteers
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenAddModal}
          style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316', borderRadius: 10, fontWeight: 700 }}
        >
          Add New User
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              Total Organization Members
            </Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>
              {users.length}
            </Title>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              Active Members
            </Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E', fontWeight: 900 }}>
              {users.filter((u: any) => u.is_active).length}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card className="hissob-card">
        <Table dataSource={users} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 10 }} scroll={{ x: 600 }} />
      </Card>

      {/* Add / Edit User Modal */}
      <Modal
        title={editingUser ? 'Edit Member User Role & Details' : 'Add New Organization User / Member'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role_name: 'collector' }}>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true, message: 'Enter member full name' }]}>
            <Input placeholder="e.g. Vinay Kumar" prefix={<UserAddOutlined />} size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="vinay@mandal.org" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="+91 98765 43210" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {!editingUser && (
              <Col span={12}>
                <Form.Item name="password" label="Initial Password" rules={[{ required: true, min: 6 }]}>
                  <Input.Password placeholder="Password" size="large" />
                </Form.Item>
              </Col>
            )}
            <Col span={editingUser ? 24 : 12}>
              <Form.Item name="role_name" label="Assigned Organization Role" rules={[{ required: true }]}>
                <Select placeholder="Select Role" size="large">
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

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
              >
                {editingUser ? 'Save User & Role Changes' : 'Create Member User'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
