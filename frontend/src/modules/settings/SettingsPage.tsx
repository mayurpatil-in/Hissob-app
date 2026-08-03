import React from 'react';
import {
  Card, Form, Input, Button, Typography, App, Row, Col, Avatar, Tag, Tabs, Divider, Modal
} from 'antd';
import {
  SaveOutlined, UserOutlined, LockOutlined, SafetyCertificateOutlined,
  SettingOutlined, MailOutlined, BankOutlined, CrownOutlined, KeyOutlined,
  UploadOutlined, DeleteOutlined, SafetyOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { authService, type TOTPSetupResponse } from '../../auth/authService';
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
  const { user, can } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const [totpModalOpen, setTotpModalOpen] = React.useState(false);
  const [totpData, setTotpData] = React.useState<TOTPSetupResponse | null>(null);
  const [totpLoading, setTotpLoading] = React.useState(false);
  const [totpCodeInput, setTotpCodeInput] = React.useState('');
  const [totpEnabled, setTotpEnabled] = React.useState<boolean>(!!user?.totp_enabled);

  const userRolesList = (user as any)?.roles || [];
  const roleSlugs = userRolesList.map((r: any) => (r.slug || r.name || '').toLowerCase());
  
  // Check if current user is an Admin/Executive authorized to modify Mandal Branding & Org Settings
  const canManageOrg = !!user?.is_super_admin ||
    can('organization', 'manage') ||
    can('tenant', 'update') ||
    roleSlugs.some((r: string) => r.includes('admin') || r.includes('president') || r.includes('treasurer') || r.includes('secretary'));

  const handleStart2FASetup = async () => {
    setTotpLoading(true);
    try {
      const data = await authService.setup2FA();
      setTotpData(data);
      setTotpCodeInput('');
      setTotpModalOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to start 2FA setup');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleConfirm2FASetup = async () => {
    if (!totpCodeInput || totpCodeInput.trim().length !== 6) {
      message.error('Please enter 6-digit verification code from Google Authenticator');
      return;
    }
    setTotpLoading(true);
    try {
      await authService.verify2FASetup(totpCodeInput.trim());
      message.success('✅ Two-Factor Authentication (2FA) is now ACTIVE!');
      setTotpEnabled(true);
      setTotpModalOpen(false);
      useAuthStore.setState((state) => ({
        ...state,
        user: state.user ? { ...state.user, totp_enabled: true } : null,
      }));
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Invalid verification code');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setTotpLoading(true);
    try {
      await authService.disable2FA();
      message.success('Two-Factor Authentication has been disabled.');
      setTotpEnabled(false);
      useAuthStore.setState((state) => ({
        ...state,
        user: state.user ? { ...state.user, totp_enabled: false } : null,
      }));
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to disable 2FA');
    } finally {
      setTotpLoading(false);
    }
  };

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

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const [passwordLoading, setPasswordLoading] = React.useState(false);

  const handleProfileSave = (values: any) => {
    useAuthStore.setState((state) => ({
      ...state,
      user: state.user ? { ...state.user, full_name: values.full_name } : null
    }));
    message.success('Profile details updated successfully!');
  };

  const handlePasswordSave = async (values: any) => {
    if (values.new_password !== values.confirm_password) {
      message.error('New Password and Confirm Password do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword(values.current_password, values.new_password);
      message.success('🔑 Security password updated successfully!');
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to update password. Check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'profile',
      label: <span><UserOutlined /> User Profile & Security</span>,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={9}>
            <Card
              className="hissob-card"
              style={{
                borderRadius: 16,
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <Avatar
                  size={88}
                  style={{
                    background: user?.is_super_admin ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #F97316, #EA580C)',
                    fontSize: 32,
                    fontWeight: 900,
                    marginBottom: 12,
                    boxShadow: '0 8px 24px rgba(249, 115, 22, 0.25)',
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

                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%' }}>
                  <Button
                    type="primary"
                    size="middle"
                    icon={<UploadOutlined />}
                    onClick={() => logoInputRef.current?.click()}
                    style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontSize: 13, fontWeight: 700, width: '100%', maxWidth: 220 }}
                  >
                    Upload Picture
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
                        message.info('Profile picture removed');
                      }}
                      style={{ fontSize: 12 }}
                    >
                      Remove Picture
                    </Button>
                  )}
                </div>

                <Title level={4} style={{ margin: '4px 0', color: 'var(--color-text-primary)', fontWeight: 900 }}>
                  {user?.full_name || 'User Profile'}
                </Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'inline-block', wordBreak: 'break-all' }}>
                  <MailOutlined /> {user?.email}
                </Text>

                <Divider style={{ margin: '16px 0' }} />

                <div style={{ textAlign: 'left' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>ASSIGNED SYSTEM ROLES</Text>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {user?.is_super_admin && (
                      <Tag color="gold" icon={<CrownOutlined />} style={{ fontWeight: 700, borderRadius: 8, padding: '4px 10px' }}>SUPER ADMIN</Tag>
                    )}
                    {userRolesList.map((r: any) => {
                      const slug = (r.slug || r.name || '').toLowerCase();
                      return (
                        <Tag key={r.id || slug} color={ROLE_COLORS[slug] || 'blue'} style={{ fontWeight: 700, borderRadius: 8, padding: '4px 10px' }}>
                          {(r.name || slug).toUpperCase()}
                        </Tag>
                      );
                    })}
                    {!user?.is_super_admin && userRolesList.length === 0 && (
                      <Tag color="orange" style={{ fontWeight: 700, borderRadius: 8, padding: '4px 10px' }}>COLLECTOR / MEMBER</Tag>
                    )}
                  </div>

                  <Divider style={{ margin: '16px 0' }} />

                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>TENANT CONTEXT</Text>
                  <div style={{ fontSize: 12, marginTop: 6, background: 'var(--color-bg)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', wordBreak: 'break-all' }}>
                    <BankOutlined style={{ color: '#F97316', marginRight: 6 }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>Tenant ID:</span> <code style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{user?.tenant_id || 'System Global'}</code>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={15}>
            <Card
              className="hissob-card"
              style={{ borderRadius: 16, boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}
              title={<span style={{ color: 'var(--color-text-primary)', fontWeight: 800 }}><UserOutlined style={{ color: '#F97316' }} /> Edit Personal Details</span>}
            >
              <Form form={profileForm} layout="vertical" onFinish={handleProfileSave} initialValues={{ full_name: user?.full_name, email: user?.email }}>
                <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Full Name</span>} name="full_name" rules={[{ required: true, message: 'Enter full name' }]}>
                  <Input size="large" prefix={<UserOutlined />} placeholder="Full Name" style={{ borderRadius: 10 }} />
                </Form.Item>
                <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Email Address</span>} name="email">
                  <Input size="large" prefix={<MailOutlined />} disabled readOnly style={{ borderRadius: 10 }} />
                </Form.Item>
                <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                  <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 10, fontWeight: 700, width: '100%', maxWidth: 200 }}>
                    Update Profile
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card
              className="hissob-card"
              style={{ marginTop: 16, borderRadius: 16, boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}
              title={<span style={{ color: 'var(--color-text-primary)', fontWeight: 800 }}><KeyOutlined style={{ color: '#0EA5E9' }} /> Change Security Password</span>}
            >
              <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSave}>
                <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Current Password</span>} name="current_password" rules={[{ required: true, message: 'Enter current password' }]}>
                  <Input.Password size="large" prefix={<LockOutlined />} placeholder="Current Password" style={{ borderRadius: 10 }} />
                </Form.Item>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>New Password</span>} name="new_password" rules={[{ required: true, min: 8, message: 'Min 8 chars with uppercase, lowercase, digit & special' }]}>
                      <Input.Password size="large" prefix={<LockOutlined />} placeholder="New Password (min 8 chars)" style={{ borderRadius: 10 }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Confirm Password</span>} name="confirm_password" rules={[{ required: true, message: 'Confirm new password' }]}>
                      <Input.Password size="large" prefix={<LockOutlined />} placeholder="Confirm New Password" style={{ borderRadius: 10 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                  <Button type="primary" size="large" htmlType="submit" loading={passwordLoading} icon={<SafetyCertificateOutlined />} style={{ background: '#0EA5E9', borderColor: '#0EA5E9', borderRadius: 10, fontWeight: 700, width: '100%', maxWidth: 220 }}>
                    Change Password
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card
              className="hissob-card"
              style={{ marginTop: 16, borderRadius: 16, boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}
              title={<span style={{ color: 'var(--color-text-primary)', fontWeight: 800 }}><SafetyCertificateOutlined style={{ color: totpEnabled ? '#16A34A' : '#E11D48' }} /> Two-Factor Authentication (2FA TOTP)</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    {totpEnabled ? (
                      <Tag color="success" style={{ fontWeight: 800, padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                        ✅ 2FA Active (Google Authenticator)
                      </Tag>
                    ) : (
                      <Tag color="error" style={{ fontWeight: 800, padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                        🛡️ 2FA Disabled (Unprotected)
                      </Tag>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', lineHeight: 1.5 }}>
                    Protect your account with Google Authenticator or Authy. When enabled, signing in requires a 6-digit code generated on your phone.
                  </Text>
                </div>
                <div>
                  {totpEnabled ? (
                    <Button danger size="large" icon={<DeleteOutlined />} onClick={handleDisable2FA} loading={totpLoading} style={{ borderRadius: 10, fontWeight: 700, width: '100%', maxWidth: 200 }}>
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button type="primary" size="large" icon={<SafetyOutlined />} onClick={handleStart2FASetup} loading={totpLoading} style={{ background: '#16A34A', borderColor: '#16A34A', borderRadius: 10, fontWeight: 700, width: '100%', maxWidth: 200 }}>
                      Enable 2FA
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
    ...(canManageOrg ? [{
      key: 'org',
      label: <span><SettingOutlined /> Organization & Printing Preferences</span>,
      children: <OrganizationSettingsTab />,
    }] : []),
  ];

  return (
    <div className="settings-module animate-fadeIn" style={{ paddingBottom: 32 }}>
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: 'calc(1.1rem + 0.5vw)' }}>
                User Profile & Settings
              </Title>
              <Tag color="orange" icon={<SettingOutlined />} style={{ borderRadius: 12, fontWeight: 700, margin: 0 }}>
                CONTROL CENTER
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
              Manage account security, assigned roles, organization profile, branding, and printing preferences.
            </Text>
          </div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="profile"
        items={tabItems}
        size="large"
        style={{
          background: 'transparent',
        }}
      />

      <Modal
        title={<span><SafetyCertificateOutlined style={{ color: '#2563EB' }} /> Enable Two-Factor Authentication</span>}
        open={totpModalOpen}
        onCancel={() => setTotpModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setTotpModalOpen(false)}>Cancel</Button>,
          <Button key="confirm" type="primary" onClick={handleConfirm2FASetup} loading={totpLoading} style={{ background: '#2563EB', fontWeight: 700 }}>
            Activate 2FA
          </Button>,
        ]}
        width={480}
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Text style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
            1. Open <strong>Google Authenticator</strong> or <strong>Authy</strong> on your phone.
            <br />
            2. Scan the QR code below:
          </Text>

          {totpData?.qr_code_base64 && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
              <img src={totpData.qr_code_base64} alt="2FA QR Code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
          )}

          <div style={{ background: '#F1F5F9', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', marginBottom: 20 }}>
            Manual Key: <strong>{totpData?.secret}</strong>
          </div>

          <div style={{ textAlign: 'left', marginBottom: 8 }}>
            <Text style={{ fontWeight: 700, fontSize: 13 }}>3. Enter 6-digit test code to confirm:</Text>
          </div>
          <Input
            placeholder="000000"
            maxLength={6}
            value={totpCodeInput}
            onChange={(e) => setTotpCodeInput(e.target.value)}
            style={{ letterSpacing: 6, fontWeight: 800, fontSize: 20, textAlign: 'center', borderRadius: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
