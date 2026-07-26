import React, { useState, useEffect } from 'react';
import { Form, Input, Button, App, Checkbox } from 'antd';
import {
  UserOutlined, LockOutlined, CrownOutlined, BankOutlined,
  SafetyCertificateOutlined, RobotOutlined, ThunderboltOutlined,
  KeyOutlined, ArrowRightOutlined, TeamOutlined, GlobalOutlined,
  TrophyOutlined, CheckCircleFilled, StarFilled, BarChartOutlined,
  WifiOutlined, SafetyOutlined,
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
    email: 'admin@hisob.app',
    password: 'Admin@123',
    icon: <CrownOutlined />,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    role: 'Org Admin',
    email: 'admin@lalbaug.org',
    password: 'Admin@123',
    icon: <BankOutlined />,
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
  },
  {
    role: 'Treasurer',
    email: 'treasurer@lalbaug.org',
    password: 'Treasury@123',
    icon: <ThunderboltOutlined />,
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.25)',
  },
  {
    role: 'Collector',
    email: 'collector@lalbaug.org',
    password: 'Collector@123',
    icon: <UserOutlined />,
    color: '#34D399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.25)',
  },
];

const TRUST_STATS = [
  { icon: <TeamOutlined />, value: '50+', label: 'Organizations' },
  { icon: <TrophyOutlined />, value: '₹1Cr+', label: 'Managed' },
  { icon: <GlobalOutlined />, value: '99.9%', label: 'Uptime' },
];

const FEATURES = [
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Bank-Grade Security',
    desc: 'RBAC, encrypted tokens & diff audit trail',
    color: '#34D399',
  },
  {
    icon: <RobotOutlined />,
    title: 'AI Voice Parser',
    desc: 'Natural language receipt entry & insights',
    color: '#60A5FA',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Real-time Analytics',
    desc: 'Live dashboards for collections & settlements',
    color: '#F59E0B',
  },
  {
    icon: <StarFilled />,
    title: 'Multi-Tenant SaaS',
    desc: 'Isolated orgs, shared infra, instant onboard',
    color: '#A78BFA',
  },
];

const TESTIMONIAL = {
  quote: "Hisob ERP transformed how we manage Ganapati collections. The AI parser alone saved us 40+ hours per festival.",
  name: "Mayur Patil",
  role: "Treasurer, Vighnaharta Group Mandal",
  avatar: "MP",
  avatarColor: "#F59E0B",
};

// Deterministic floating particles — avoids hydration mismatch
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 47 + 13) % 100}%`,
  top:  `${(i * 37 + 7)  % 100}%`,
  size: (i % 3 === 0) ? 3 : (i % 3 === 1) ? 2 : 1.5,
  delay: `${(i * 0.4) % 4}s`,
  duration: `${5 + (i % 5)}s`,
  opacity: 0.06 + (i % 4) * 0.025,
}));

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeStatIdx, setActiveStatIdx] = useState(0);
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginForm>();
  const { message } = App.useApp();

  // Cycle active stat highlight every 2.5s
  useEffect(() => {
    const t = setInterval(() => {
      setActiveStatIdx((p) => (p + 1) % TRUST_STATS.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

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
    <div className="lp-root">

      {/* ── Left Branding Panel ── */}
      <div className="lp-left">
        {/* Dot-grid overlay */}
        <div className="lp-grid-overlay" />

        {/* Floating particles */}
        <div className="lp-particles" aria-hidden>
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="lp-particle"
              style={{
                left: p.left, top: p.top,
                width: p.size, height: p.size,
                opacity: p.opacity,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        {/* Ambient blobs */}
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />

        <div className="lp-left-inner">

          {/* Logo */}
          <div className="lp-logo lp-fade-in" style={{ '--delay': '0ms' } as React.CSSProperties}>
            <div className="lp-logo-icon">
              <img src="/hisob.png" alt="Hisob ERP" className="lp-logo-img" />
            </div>
            <div>
              <div className="lp-logo-name">
                हिशोब
                <span className="lp-logo-erp">ERP</span>
              </div>
              <div className="lp-logo-tag">Ganapati Mandal · Temple · Trust</div>
            </div>
          </div>

          {/* Hero text */}
          <div className="lp-hero-text lp-fade-in" style={{ '--delay': '80ms' } as React.CSSProperties}>
            <div className="lp-status-badge">
              <CheckCircleFilled style={{ color: '#34D399', fontSize: 11 }} />
              <span>Trusted by 500+ organizations across India</span>
            </div>
            <h1 className="lp-headline">
              Festival Finance,<br />
              <span className="lp-headline-grad">Reimagined.</span>
            </h1>
            <p className="lp-subline">
              Streamline collections, donation receipts, cash settlements &
              audit trails — built for Ganapati Mandals, Temples & Trusts.
            </p>
          </div>

          {/* Stats row */}
          <div className="lp-stats lp-fade-in" style={{ '--delay': '160ms' } as React.CSSProperties}>
            {TRUST_STATS.map((s, i) => (
              <div
                key={s.label}
                className={`lp-stat${i === activeStatIdx ? ' lp-stat--active' : ''}`}
              >
                <div className="lp-stat-icon">{s.icon}</div>
                <div className="lp-stat-value">{s.value}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="lp-features lp-fade-in" style={{ '--delay': '240ms' } as React.CSSProperties}>
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature">
                <span
                  className="lp-feature-icon"
                  style={{ color: f.color, background: `${f.color}15` }}
                >
                  {f.icon}
                </span>
                <div>
                  <div className="lp-feature-title">{f.title}</div>
                  <div className="lp-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="lp-testimonial lp-fade-in" style={{ '--delay': '320ms' } as React.CSSProperties}>
            <div className="lp-testimonial-quote">"{TESTIMONIAL.quote}"</div>
            <div className="lp-testimonial-author">
              <div
                className="lp-testimonial-avatar"
                style={{ background: `${TESTIMONIAL.avatarColor}25`, color: TESTIMONIAL.avatarColor }}
              >
                {TESTIMONIAL.avatar}
              </div>
              <div>
                <div className="lp-testimonial-name">{TESTIMONIAL.name}</div>
                <div className="lp-testimonial-role">{TESTIMONIAL.role}</div>
              </div>
            </div>
          </div>

          {/* Quick test demo chips */}
          <div className="lp-demo-box lp-fade-in" style={{ '--delay': '400ms' } as React.CSSProperties}>
            <div className="lp-demo-label">
              <KeyOutlined />
              <span>Quick Test Login</span>
            </div>
            <div className="lp-demo-chips">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  className="lp-chip"
                  style={{
                    '--chip-color': cred.color,
                    '--chip-bg': cred.bg,
                    '--chip-border': cred.border,
                  } as React.CSSProperties}
                  onClick={() => handleQuickFill(cred)}
                >
                  <span style={{ color: cred.color }}>{cred.icon}</span>
                  <span>{cred.role}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="lp-right">

        {/* Mobile-only top bar (hidden on desktop) */}
        <div className="lp-mobile-bar">
          <div className="lp-mobile-logo-icon">
            <img src="/hisob.png" alt="Hisob ERP" className="lp-logo-img" />
          </div>
          <div>
            <div className="lp-mobile-logo-name">
              हिशोब
              <span className="lp-logo-erp">ERP</span>
            </div>
            <div className="lp-mobile-logo-tag">Ganapati Mandal · Temple · Trust</div>
          </div>
        </div>

        <div className="lp-card">
          {/* Animated shimmer border */}
          <div className="lp-card-border" aria-hidden />

          {/* Card top brand mark */}
          <div className="lp-card-top">
            <div className="lp-card-icon">
              <img src="/hisob.png" alt="Hisob ERP" className="lp-logo-img" />
            </div>
            <div className="lp-card-brand-title">
              हिशोब
              
            </div>
          </div>
          <div className="lp-card-heading">
            {/* Marathi Tagline — shifted upper */}
            <div className="lp-marathi-tagline">
              सोपा हिशोब <span className="lp-tagline-sep">|</span> पारदर्शक व्यवहार <span className="lp-tagline-sep">|</span> विश्वासाची साथ
            </div>
            {/* Live status — below tagline */}
            <div className="lp-live-badge" style={{ margin: '8px auto 14px' }}>
              <span className="lp-live-dot" />
              <span>System Online</span>
            </div>
            <h2>Welcome back 👋</h2>
            <p>Sign in to your <strong style={{color:'rgba(249,115,22,0.9)', fontFamily:"'Noto Sans Devanagari', sans-serif", fontWeight:700}}>हिशोब</strong> workspace</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            className="lp-form"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="email"
              label="Work Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="lp-input-icon" />}
                placeholder="you@organization.org"
                className="lp-input"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="lp-input-icon" />}
                placeholder="Enter your password"
                className="lp-input"
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="lp-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="lp-remember">Remember me</Checkbox>
              </Form.Item>
              <a href="#" className="lp-forgot">Forgot password?</a>
            </div>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="lp-submit-btn"
                icon={!loading && <ArrowRightOutlined />}
                iconPlacement="end"
              >
                {loading ? 'Authenticating…' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          {/* Divider */}
          <div className="lp-divider">
            <span />
            <small>Secured with 256-bit SSL</small>
            <span />
          </div>

          {/* Security badges row */}
          <div className="lp-badges">
            <div className="lp-badge-item">
              <SafetyCertificateOutlined style={{ color: '#34D399' }} />
              <span>SSL Encrypted</span>
            </div>
            <div className="lp-badge-item">
              <SafetyOutlined style={{ color: '#F59E0B' }} />
              <span>100% Secure</span>
            </div>
            <div className="lp-badge-item">
              <WifiOutlined style={{ color: '#60A5FA' }} />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="lp-footer">
          © {new Date().getFullYear()} ArcNeuron.ai &nbsp;•&nbsp; Designed by{' '}
          <a
            href="https://www.mayurpatil.in"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-link"
          >
            Mayur Patil
          </a>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
