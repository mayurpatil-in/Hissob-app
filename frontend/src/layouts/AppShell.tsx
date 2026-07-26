import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Drawer, List, Empty, Tag, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, FileTextOutlined, DollarOutlined, UserOutlined,
  BankOutlined, CalendarOutlined, TeamOutlined, BarChartOutlined,
  SettingOutlined, BellOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, AuditOutlined, GlobalOutlined, SafetyOutlined, CrownOutlined, RobotOutlined,
  MenuOutlined, CheckOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/services';
import type { NotificationItem } from '../api/services';
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
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasModule } = useAuthStore();
  const queryClient = useQueryClient();

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

  // Live notifications (poll every 30s)
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifData?.unread_count ?? 0;
  const notifications: NotificationItem[] = notifData?.notifications ?? [];

  const NOTIF_TYPE_COLOR: Record<string, string> = {
    success: 'success', error: 'error', warning: 'warning',
    settlement: 'blue', expense: 'purple', info: 'default',
  };

  const notifDropdown = (
    <div style={{ width: 360, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: '#0B2347', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          🔔 Notifications {unreadCount > 0 && <Tag color="orange" style={{ marginLeft: 6, fontWeight: 700 }}>{unreadCount} New</Tag>}
        </Typography.Text>
        {unreadCount > 0 && (
          <Button
            size="small"
            icon={<CheckOutlined />}
            style={{ color: '#F97316', borderColor: '#F97316', fontSize: 11 }}
            onClick={() => markAllMutation.mutate()}
          >
            Mark All Read
          </Button>
        )}
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty description="No notifications yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: '10px 16px',
                  background: item.is_read ? '#fff' : '#FFF7ED',
                  cursor: 'pointer',
                  borderLeft: item.is_read ? 'none' : '3px solid #F97316',
                }}
                onClick={() => {
                  if (!item.is_read) markReadMutation.mutate(item.id);
                  if (item.related_module) navigate(`/${item.related_module}`);
                  setNotifOpen(false);
                }}
                extra={!item.is_read && (
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(item.id); }}
                    style={{ color: '#999', fontSize: 10 }}
                  />
                )}
              >
                <List.Item.Meta
                  title={
                    <span style={{ fontSize: 13, fontWeight: item.is_read ? 500 : 700, color: '#0B2347' }}>
                      {item.title}
                    </span>
                  }
                  description={
                    <div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 3, lineHeight: 1.4 }}>{item.message}</div>
                      <Tag color={NOTIF_TYPE_COLOR[item.notification_type] || 'default'} style={{ fontSize: 10 }}>
                        {item.notification_type}
                      </Tag>
                      <span style={{ fontSize: 10, color: '#aaa', marginLeft: 6 }}>
                        {new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );


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
        styles={{
          wrapper: { width: '280px' },
          body: { padding: 0, background: '#0B2347' },
          header: { background: '#FFF' },
        }}
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
            <Dropdown
              open={notifOpen}
              onOpenChange={setNotifOpen}
              popupRender={() => notifDropdown}
              placement="bottomRight"
              trigger={['click']}
            >
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="header-icon-btn"
                  style={unreadCount > 0 ? { color: '#F97316' } : {}}
                />
              </Badge>
            </Dropdown>

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
