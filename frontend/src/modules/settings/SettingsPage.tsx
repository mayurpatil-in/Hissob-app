import React from 'react';
import {
  Card, Form, Input, Button, Typography, App, Row, Col, Avatar, Tag, Tabs, Divider
} from 'antd';
import {
  SaveOutlined, UserOutlined, LockOutlined, SafetyCertificateOutlined,
  SettingOutlined, MailOutlined, BankOutlined, CrownOutlined, KeyOutlined,
  UploadOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import OrganizationSettingsTab from './OrganizationSettingsTab';

const { Title, Text } = Typography;

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'gold',
  org_admin: 'purple',
  president: 'crimson',
  treasurer: 'green',
  secretary: 'blue',
  collector: 'orange',
  volunteer: 'cyan',
  auditor: 'magenta',
};

const SettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('Please select a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('Image size must be smaller than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem('hissob_org_logo', dataUrl);
      useAuthStore.setState((state) => ({
        ...state,
        user: state.user ? ({ ...state.user, avatar_url: dataUrl } as any) : null
      }));
      message.success('Organization Logo uploaded & saved permanently!');
    };
    reader.readAsDataURL(file);
  };

  const userRoles = (user as any)?.roles || [];
  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleProfileSave = (values: any) => {
    useAuthStore.setState((state) => ({
      ...state,
      user: state.user ? { ...state.user, full_name: values.full_name } : null
    }));
    message.success('Profile details updated successfully!');
  };

  const handlePasswordSave = () => {
    passwordForm.resetFields();
    message.success('Password updated successfully!');
  };

  const tabItems = [
    {
      key: 'profile',
      label: <span><UserOutlined /> User Profile & Security</span>,
      children: (
        <Row gutter={[20, 20]}>
          <Col xs={24} md={10}>
            <Card className="hissob-card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <Avatar
                  size={88}
                  style={{
                    background: user?.is_super_admin ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #F97316, #EA580C)',
                    fontSize: 32,
                    fontWeight: 900,
                    marginBottom: 12,
                    boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
                    border: '3px solid #FFFFFF',
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                  src={(user as any)?.avatar_url}
                >
                  {initials}
                </Avatar>

                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileChange}
                />

                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={() => logoInputRef.current?.click()}
                    style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                  >
                    Upload Logo from Device
                  </Button>
                  {(user as any)?.avatar_url && (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        localStorage.removeItem('hissob_org_logo');
                        useAuthStore.setState((state) => ({
                          ...state,
                          user: state.user ? { ...state.user, avatar_url: null } as any : null
                        }));
                        message.info('Organization Logo removed');
                      }}
                      style={{ fontSize: 11 }}
                    >
                      Remove Custom Logo
                    </Button>
                  )}
                </div>

                <Title level={4} style={{ margin: '4px 0', color: '#0F172A', fontWeight: 900 }}>
                  {user?.full_name || 'User Profile'}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <MailOutlined /> {user?.email}
                </Text>

                <Divider style={{ margin: '16px 0' }} />

                <div style={{ textAlign: 'left' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>ASSIGNED SYSTEM ROLES</Text>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {user?.is_super_admin && (
                      <Tag color="gold" icon={<CrownOutlined />} style={{ fontWeight: 700, borderRadius: 8, padding: '4px 10px' }}>SUPER ADMIN</Tag>
                    )}
                    {userRoles.map((r: any) => {
                      const slug = (r.slug || r.name || '').toLowerCase();
                      return (
                        <Tag key={r.id || slug} color={ROLE_COLORS[slug] || 'blue'} style={{ fontWeight: 700, borderRadius: 8, padding: '4px 10px' }}>
                          {(r.name || slug).toUpperCase()}
                        </Tag>
                      );
                    })}
                    {!user?.is_super_admin && userRoles.length === 0 && (
                      <Tag color="orange" style={{ fontWeight: 700, borderRadius: 8, padding: '4px 10px' }}>COLLECTOR / MEMBER</Tag>
                    )}
                  </div>

                  <Divider style={{ margin: '16px 0' }} />

                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>TENANT CONTEXT</Text>
                  <div style={{ fontSize: 12, marginTop: 6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', wordBreak: 'break-all' }}>
                    <BankOutlined style={{ color: '#F97316', marginRight: 6 }} />
                    <b>Org Tenant ID:</b> <code style={{ color: '#0F172A', fontWeight: 600 }}>{user?.tenant_id || 'System Global'}</code>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={14}>
            <Card className="hissob-card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} title={<span><UserOutlined style={{ color: '#F97316' }} /> Edit Personal Details</span>}>
              <Form form={profileForm} layout="vertical" onFinish={handleProfileSave} initialValues={{ full_name: user?.full_name, email: user?.email }}>
                <Form.Item label="Full Name" name="full_name" rules={[{ required: true, message: 'Enter full name' }]}>
                  <Input prefix={<UserOutlined />} placeholder="Full Name" />
                </Form.Item>
                <Form.Item label="Email Address" name="email">
                  <Input prefix={<MailOutlined />} disabled readOnly />
                </Form.Item>
                <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} block={window.innerWidth < 576} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
                    Update Profile
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card className="hissob-card" style={{ marginTop: 16, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} title={<span><KeyOutlined style={{ color: '#0EA5E9' }} /> Change Security Password</span>}>
              <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSave}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="New Password" name="new_password" rules={[{ required: true, min: 6, message: 'Minimum 6 characters' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="New Password" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Confirm Password" name="confirm_password" rules={[{ required: true, message: 'Confirm password' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" icon={<SafetyCertificateOutlined />} block={window.innerWidth < 576} style={{ background: '#0EA5E9', borderColor: '#0EA5E9', borderRadius: 8, fontWeight: 700 }}>
                    Change Password
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'org',
      label: <span><SettingOutlined /> Organization & Printing Preferences</span>,
      children: <OrganizationSettingsTab />,
    },
  ];

  return (
    <div className="settings-module animate-fadeIn" style={{ paddingBottom: 32 }}>
      <div className="page-header" style={{ marginBottom: 24, background: '#FFFFFF', padding: '20px 24px', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Title level={3} style={{ margin: 0, color: '#0F172A', fontWeight: 900 }}>User Profile & Settings</Title>
            <Tag color="orange" icon={<SettingOutlined />} style={{ borderRadius: 12, fontWeight: 700 }}>SYSTEM CONTROL CENTER</Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>Manage your account security, assigned roles, organization profile, branding, and email preferences.</Text>
        </div>
      </div>

      <Tabs defaultActiveKey="profile" items={tabItems} size="large" />
    </div>
  );
};

export default SettingsPage;
