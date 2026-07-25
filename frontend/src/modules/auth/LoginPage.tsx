import React, { useState } from 'react';
import { Form, Input, Button, App, Checkbox, Divider } from 'antd';
import {
  UserOutlined, LockOutlined, CrownOutlined, BankOutlined,
  SafetyCertificateOutlined, RobotOutlined, ThunderboltOutlined,
  KeyOutlined, ArrowRightOutlined, TeamOutlined, GlobalOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../auth/authService';
import './login.css';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

const DEMO_CREDENTIALS = [
  {
    role: 'Super Admin',
    email: 'admin@hissob.app',
    password: 'Admin@123',
    icon: <CrownOutlined />,
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.3)',
  },
  {
    role: 'Org Admin',
    email: 'admin@lalbaug.org',
    password: 'Admin@123',
    icon: <BankOutlined />,
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.3)',
  },
  {
    role: 'Treasurer',
    email: 'treasurer@lalbaug.org',
    password: 'Treasury@123',
    icon: <ThunderboltOutlined />,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.3)',
  },
  {
    role: 'Collector',
    email: 'collector@lalbaug.org',
    password: 'Collector@123',
    icon: <UserOutlined />,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.3)',
  },
];

const TRUST_STATS = [
  { icon: <TeamOutlined />, value: '500+', label: 'Organizations' },
  { icon: <TrophyOutlined />, value: '₹10Cr+', label: 'Managed' },
  { icon: <GlobalOutlined />, value: '99.9%', label: 'Uptime' },
];

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginForm>();
  const { message } = App.useApp();

  const handleQuickFill = (cred: typeof DEMO_CREDENTIALS[0]) => {
    form.setFieldsValue({ email: cred.email, password: cred.password });
    message.info({ content: `Credentials filled for ${cred.role}`, duration: 1.5 });
  };

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const res = await authService.login({ email: values.email, password: values.password });
      message.success(`Welcome back, ${res.user?.full_name || 'User'}! 👋`);
      if (res.user?.is_super_admin) {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Login failed. Please check your credentials.';
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ── Left Hero Branding Panel ── */}
      <div className="login-hero">
        <div className="login-hero-inner">

          {/* Logo */}
          <div className="login-brand">
            <div className="login-brand-icon">H</div>
            <div>
              <div className="login-brand-name">HISSOB ERP</div>
              <div className="login-brand-tag">Enterprise SaaS Platform</div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="login-hero-title">
            Next-Gen Festival<br />
            <span className="login-hero-title-accent">Financial Management</span>
          </h1>
          <p className="login-hero-desc">
            Streamlining collections, donation receipts, cash settlements, and audit trails for Ganapati Mandals, Temples, Trusts & Non-Profits.
          </p>

          {/* Trust Stats */}
          <div className="login-trust-stats">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="login-trust-stat">
                <div className="login-trust-icon">{s.icon}</div>
                <div className="login-trust-value">{s.value}</div>
                <div className="login-trust-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="login-features-grid">
            <div className="login-feature-card">
              <SafetyCertificateOutlined className="login-feature-icon" />
              <div>
                <h4>Bank-Grade Security</h4>
                <p>Dynamic RBAC, encrypted tokens & global diff audit trail</p>
              </div>
            </div>
            <div className="login-feature-card">
              <RobotOutlined className="login-feature-icon" />
              <div>
                <h4>AI Voice Parser</h4>
                <p>Natural language receipt entry & financial risk insights</p>
              </div>
            </div>
          </div>

          {/* 1-Click Demo Credentials */}
          <div className="login-demo-box">
            <div className="login-demo-header">
              <KeyOutlined />
              <span>Quick Test Login</span>
            </div>
            <div className="login-demo-chips">
              {DEMO_CREDENTIALS.map((cred) => (
                <div
                  key={cred.role}
                  className="login-demo-chip"
                  style={{
                    '--chip-color': cred.color,
                    '--chip-bg': cred.bg,
                    '--chip-border': cred.border,
                  } as React.CSSProperties}
                  onClick={() => handleQuickFill(cred)}
                >
                  <span style={{ color: cred.color }}>{cred.icon}</span>
                  <span>{cred.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ambient glows */}
        <div className="login-glow login-glow-1" />
        <div className="login-glow login-glow-2" />
        <div className="login-glow login-glow-3" />
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-form-panel">
        <div className="login-card">

          {/* Card Logo */}
          <div className="login-card-logo">
            <div className="login-card-logo-icon">H</div>
          </div>

          <div className="login-card-header">
            <h2>Welcome back 👋</h2>
            <p>Sign in to continue to Hissob ERP</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            className="login-form"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="login-input-icon" />}
                placeholder="you@organization.org"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="login-input-icon" />}
                placeholder="Enter your password"
                className="login-input"
              />
            </Form.Item>

            <div className="login-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="login-remember">Remember me</Checkbox>
              </Form.Item>
              <a href="#" className="login-forgot">Forgot password?</a>
            </div>

            <Form.Item style={{ marginTop: 20, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="login-submit-btn"
                icon={!loading && <ArrowRightOutlined />}
                iconPosition="end"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '20px 0', borderColor: '#E2E8F0' }} />

          {/* Security Footer */}
          <div className="login-security-badge">
            <SafetyCertificateOutlined style={{ color: '#22C55E', fontSize: 14 }} />
            <span>256-bit SSL Encrypted &nbsp;•&nbsp; ISO 27001 Certified &nbsp;•&nbsp; Multi-Tenant SaaS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
