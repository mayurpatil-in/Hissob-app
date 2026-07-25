import React, { useState } from 'react';
import { Form, Input, Button, App, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../auth/authService';
import './login.css';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginForm>();
  const { message } = App.useApp();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const res = await authService.login({ email: values.email, password: values.password });
      message.success('Welcome to Hissob ERP!');
      if (res.user?.is_super_admin) {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Login failed. Please try again.';
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left branding panel */}
      <div className="login-branding">
        <div className="login-branding-inner animate-fadeIn">
          <div className="login-logo">
            <div className="logo-icon">H</div>
            <span className="logo-text">Hissob ERP</span>
          </div>
          <h1 className="branding-title">
            Festival Collection &<br />Financial Management
          </h1>
          <p className="branding-sub">
            A complete ERP platform for Ganapati Mandals, Temples, Trusts & Community Organizations.
          </p>
          <div className="branding-features">
            {['Multi-Tenant SaaS', 'Full RBAC', 'Donation Receipts', 'Cash Settlement', 'Audit Trail', 'PDF Reports'].map(f => (
              <div key={f} className="feature-chip">✓ {f}</div>
            ))}
          </div>
        </div>
        <div className="branding-glow" />
      </div>

      {/* Right login form */}
      <div className="login-form-panel">
        <div className="login-form-inner animate-fadeIn">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to your Hissob ERP account</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            className="login-form"
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin@organization.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <div className="login-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="login-btn"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <p>© 2026 Hissob ERP. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
