import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Tooltip, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, FileTextOutlined, DollarOutlined, UserOutlined,
  BankOutlined, CalendarOutlined, TeamOutlined, BarChartOutlined,
  SettingOutlined, BellOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, AuditOutlined, GlobalOutlined, SafetyOutlined, CrownOutlined, RobotOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { authService } from '../auth/authService';
import './AppShell.css';

const { Sider, Header, Content } = Layout;

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  module?: string;
}

const SUPER_ADMIN_NAV: NavItem[] = [
  { key: '/dashboard',   label: 'Platform Overview', icon: <DashboardOutlined /> },
  { key: '/ai-insights', label: 'AI Insights',       icon: <RobotOutlined style={{ color: '#F97316' }} /> },
  { key: '/super-admin', label: 'Organizations',     icon: <CrownOutlined /> },
  { key: '/audit',       label: 'Global Audit Log',  icon: <AuditOutlined /> },
  { key: '/users',       label: 'Platform Users',    icon: <UserOutlined /> },
  { key: '/settings',    label: 'Global Settings',   icon: <SettingOutlined /> },
];

const ORG_NAV: NavItem[] = [
  { key: '/dashboard',      label: 'Dashboard',       icon: <DashboardOutlined /> },
  { key: '/ai-insights',    label: 'AI Insights',     icon: <RobotOutlined style={{ color: '#F97316' }} /> },
  { key: '/financial-year', label: 'Financial Year',  icon: <CalendarOutlined />, module: 'financial_year' },
  { key: '/festivals',      label: 'Festivals',       icon: <GlobalOutlined />,   module: 'festivals' },
  { key: '/donors',         label: 'Donors',          icon: <TeamOutlined />,     module: 'donors' },
  { key: '/receipts',       label: 'Receipts',        icon: <FileTextOutlined />, module: 'receipts' },
  { key: '/settlements',    label: 'Cash Settlement', icon: <BankOutlined />,     module: 'cash_settlement' },
  { key: '/expenses',       label: 'Expenses',        icon: <DollarOutlined />,   module: 'expenses' },
  { key: '/reports',        label: 'Reports',         icon: <BarChartOutlined />, module: 'reports' },
  { key: '/users',          label: 'Users',           icon: <UserOutlined />,     module: 'users' },
  { key: '/rbac',           label: 'Roles & Access',  icon: <SafetyOutlined />,   module: 'rbac' },
  { key: '/audit',          label: 'Audit Trail',     icon: <AuditOutlined />,    module: 'audit' },
  { key: '/settings',       label: 'Settings',        icon: <SettingOutlined />,  module: 'settings' },
];

interface Props {
  children: React.ReactNode;
}

const AppShell: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasModule } = useAuthStore();

  React.useEffect(() => {
    authService.me().then((freshUser) => {
      useAuthStore.setState((state) => {
        const savedLogo = state.user?.avatar_url || localStorage.getItem('hissob_org_logo');
        return {
          ...state,
          user: {
            ...freshUser,
            avatar_url: freshUser.avatar_url || savedLogo || null,
          },
        };
      });
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const visibleNavItems = user?.is_super_admin
    ? SUPER_ADMIN_NAV
    : ORG_NAV.filter((item) => !item.module || hasModule(item.module));

  const userMenuItems: any[] = [
    {
      key: 'profile',
      label: user?.is_super_admin ? 'Super Admin Profile' : 'User Profile & Settings',
      icon: <UserOutlined />,
      onClick: () => navigate('/settings'),
    },
  ];

  if (user?.is_super_admin) {
    userMenuItems.push({
      key: 'superadmin',
      label: 'Super Admin Center',
      icon: <CrownOutlined />,
      onClick: () => navigate('/super-admin'),
    });
  }

  userMenuItems.push(
    { key: 'divider', type: 'divider' as const },
    { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, danger: true, onClick: handleLogout }
  );

  const userMenu = { items: userMenuItems };

  const handleToggleMenu = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(true);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <Layout className="app-shell">
      {/* ── Mobile Navigation Drawer ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}>
            <div className="sidebar-logo-icon">H</div>
            <span style={{ color: '#0B2347', fontWeight: 800, fontSize: 18 }}>Hissob ERP</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        width={280}
        styles={{ body: { padding: 0, background: '#0B2347' }, header: { background: '#FFF' } }}
      >
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          className="sidebar-menu"
          items={visibleNavItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => {
              setMobileOpen(false);
              navigate(item.key);
            },
          }))}
        />
      </Drawer>

      {/* ── Desktop Sidebar ── */}
      <Sider
        className="app-sidebar hide-mobile-sider"
        width={260}
        collapsedWidth={64}
        collapsed={collapsed}
        breakpoint="md"
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
          <div className="sidebar-logo-icon">H</div>
          {!collapsed && <span className="sidebar-logo-text">Hissob ERP</span>}
        </div>

        {/* Navigation */}
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          className="sidebar-menu"
          items={visibleNavItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.key),
          }))}
        />

        {/* Collapse toggle */}
        <div className="sidebar-collapse-btn">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          />
        </div>
      </Sider>

      {/* ── Main Layout ── */}
      <Layout className="app-main">
        {/* Header */}
        <Header className="app-header">
          <div className="header-left">
            <Button
              type="text"
              className="header-menu-btn"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuOutlined />}
              onClick={handleToggleMenu}
            />
          </div>

          <div className="header-right">
            {/* Notifications */}
            <Tooltip title="Notifications">
              <Badge count={3} size="small">
                <Button type="text" icon={<BellOutlined />} className="header-icon-btn" />
              </Badge>
            </Tooltip>

            {/* User Menu */}
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div className="header-user">
                <Avatar
                  src={(user as any)?.avatar_url}
                  style={{ backgroundColor: '#F97316', cursor: 'pointer', flexShrink: 0 }}
                >
                  {user?.full_name?.charAt(0)}
                </Avatar>
                <span className="header-user-name hide-mobile">{user?.full_name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="app-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppShell;
