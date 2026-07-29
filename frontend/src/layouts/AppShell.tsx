import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Badge, Drawer, Tag, Typography, Tooltip, Select } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, FileTextOutlined, DollarOutlined, UserOutlined,
  BankOutlined, CalendarOutlined, TeamOutlined, BarChartOutlined,
  SettingOutlined, BellOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, AuditOutlined, GlobalOutlined, SafetyOutlined, CrownOutlined, RobotOutlined,
  MenuOutlined, CheckOutlined, CloseOutlined, RocketOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getOrganizations } from '../api/services';
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
  { key: '/dashboard',   label: 'Dashboard',         icon: <DashboardOutlined /> },
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

import CollectorDailySummaryModal from '../modules/settlements/CollectorDailySummaryModal';

interface Props {
  children: React.ReactNode;
}

const AppShell: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [eodModalOpen, setEodModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasModule, selectedTenantId, setSelectedTenantId } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
    enabled: !!user?.is_super_admin,
  });

  React.useEffect(() => {
    if (!notifOpen && !userOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const notifCard = document.getElementById('notif-popup-card');
      const userCard = document.getElementById('user-popup-card');
      const bellBtn = document.getElementById('header-bell-btn');
      const userBtn = document.getElementById('header-user-btn');

      if (
        notifOpen &&
        notifCard && !notifCard.contains(target) &&
        bellBtn && !bellBtn.contains(target)
      ) {
        setNotifOpen(false);
      }

      if (
        userOpen &&
        userCard && !userCard.contains(target) &&
        userBtn && !userBtn.contains(target)
      ) {
        setUserOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [notifOpen, userOpen]);

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

  // Live notifications (poll every 30s when authenticated)
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
    staleTime: 20_000,
    enabled: !!user && !!localStorage.getItem('hissob_token'),
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

  const NOTIF_ICONS: Record<string, string> = {
    settlement: '🤝',
    expense: '🧾',
    receipt: '💰',
    success: '✅',
    warning: '⚠️',
    error: '🚨',
    info: '🔔',
  };

  const notifDropdown = (
    <div className="notif-dropdown-menu" style={{ width: 360, maxWidth: 'calc(100vw - 20px)', background: '#fff', borderRadius: 12, boxShadow: '0 12px 36px rgba(11,35,71,0.2)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #0B2347 0%, #1E40AF 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
          🔔 Notifications {unreadCount > 0 && <Tag color="orange" style={{ marginLeft: 6, fontWeight: 800, borderRadius: 10 }}>{unreadCount} New</Tag>}
        </Typography.Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {unreadCount > 0 && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#EA580C', borderColor: '#FFEDD5', background: '#FFF7ED', fontSize: 11, fontWeight: 700 }}
              onClick={(e) => { e.stopPropagation(); markAllMutation.mutate(); }}
            >
              Mark Read
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined style={{ color: '#fff', fontSize: 14 }} />}
            onClick={(e) => { e.stopPropagation(); setNotifOpen(false); }}
          />
        </div>
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <Typography.Text style={{ fontWeight: 700, color: '#0B2347', display: 'block', fontSize: 14 }}>All Caught Up!</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>You have no unread system notifications right now.</Typography.Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 16px',
                  background: item.is_read ? '#fff' : '#FFF7ED',
                  cursor: 'pointer',
                  borderLeft: item.is_read ? '3px solid transparent' : '4px solid #F97316',
                  borderBottom: '1px solid #F1F5F9',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
                onClick={() => {
                  if (!item.is_read) markReadMutation.mutate(item.id);
                  if (item.related_module) navigate(`/${item.related_module}`);
                  setNotifOpen(false);
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                  <span style={{ fontSize: 20 }}>{NOTIF_ICONS[item.notification_type] || '🔔'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: item.is_read ? 600 : 800, color: '#0B2347', display: 'block' }}>
                      {item.title}
                    </span>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, lineHeight: 1.4 }}>{item.message}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag color={NOTIF_TYPE_COLOR[item.notification_type] || 'default'} style={{ fontSize: 10, borderRadius: 4 }}>
                        {item.notification_type.toUpperCase()}
                      </Tag>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        {new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                {!item.is_read && (
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(item.id); }}
                    style={{ color: '#F97316', fontSize: 12 }}
                  />
                )}
              </div>
            ))}
          </div>
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

  const userProfilePopup = (
    <div className="user-profile-menu" style={{ width: 280, maxWidth: 'calc(100vw - 20px)', background: '#fff', borderRadius: 14, boxShadow: '0 12px 36px rgba(11,35,71,0.18)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* User Header Profile Card */}
      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #0B2347 0%, #1E40AF 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            src={(user as any)?.avatar_url}
            style={{ backgroundColor: '#F97316', color: '#fff', fontWeight: 900, fontSize: 18, border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }}
            size={46}
          >
            {user?.full_name?.charAt(0)}
          </Avatar>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
              {user?.full_name || 'User Account'}
            </div>
            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag color={user?.is_super_admin ? 'gold' : 'blue'} style={{ fontSize: 10, fontWeight: 800, margin: 0, borderRadius: 4, textTransform: 'uppercase' }}>
                {user?.is_super_admin ? '👑 SUPER ADMIN' : (user as any)?.role ? (user as any).role : 'MEMBER'}
              </Tag>
            </div>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined style={{ color: '#fff', fontSize: 14 }} />}
          onClick={(e) => { e.stopPropagation(); setUserOpen(false); }}
        />
      </div>

      {/* Menu Options */}
      <div style={{ padding: '8px' }}>
        <Button
          type="text"
          block
          icon={<UserOutlined style={{ color: '#2563EB', fontSize: 16 }} />}
          style={{ textAlign: 'left', height: 40, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', borderRadius: 8 }}
          onClick={() => { setUserOpen(false); navigate('/settings'); }}
        >
          {user?.is_super_admin ? 'Super Admin Profile' : 'User Profile & Settings'}
        </Button>

        {user?.is_super_admin && (
          <Button
            type="text"
            block
            icon={<CrownOutlined style={{ color: '#D97706', fontSize: 16 }} />}
            style={{ textAlign: 'left', height: 40, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', borderRadius: 8 }}
            onClick={() => { setUserOpen(false); navigate('/super-admin'); }}
          >
            Super Admin Center
          </Button>
        )}

        <Button
          type="text"
          block
          icon={<AuditOutlined style={{ color: '#059669', fontSize: 16 }} />}
          style={{ textAlign: 'left', height: 40, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', borderRadius: 8 }}
          onClick={() => { setUserOpen(false); navigate('/audit'); }}
        >
          Audit Logs & Activity
        </Button>

        <div style={{ height: 1, background: '#F1F5F9', margin: '6px 0' }} />

        <Button
          type="text"
          danger
          block
          icon={<LogoutOutlined style={{ fontSize: 16 }} />}
          style={{ textAlign: 'left', height: 40, fontWeight: 700, display: 'flex', alignItems: 'center', borderRadius: 8 }}
          onClick={() => { setUserOpen(false); handleLogout(); }}
        >
          Logout Account
        </Button>
      </div>
    </div>
  );

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
            <span style={{ color: '#0B2347', fontWeight: 800, fontSize: 18 }}>Hisob ERP</span>
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
          {!collapsed && <span className="sidebar-logo-text">Hisob ERP</span>}
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
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0B2347', letterSpacing: '-0.3px' }} className="hide-mobile">
              HISOB ERP
            </span>

            {user?.is_super_admin && (
              <Select
                style={{ minWidth: 260, marginLeft: 16 }}
                placeholder="Select Organization View"
                value={selectedTenantId || 'all'}
                onChange={(val) => {
                  setSelectedTenantId(val === 'all' ? null : val);
                  queryClient.invalidateQueries();
                }}
                options={[
                  { label: '🌐 All Organizations (Global View)', value: 'all' },
                  ...organizations.map((org: any) => ({
                    label: `🏛️ ${org.name}`,
                    value: org.id,
                  })),
                ]}
              />
            )}
          </div>

          <div className="header-right">
            {/* Collector Daily EOD Summary Button */}
            <Tooltip title="Collector Daily Summary & EOD Handover" open={eodModalOpen ? false : undefined}>
              <Button
                type="text"
                icon={<RocketOutlined style={{ color: '#EA580C', fontSize: 16 }} />}
                className="header-eod-btn"
                onClick={() => setEodModalOpen(true)}
              >
                <span className="hide-mobile">Daily Summary</span>
              </Button>
            </Tooltip>

            {/* Notifications */}
            <div className="header-popup-wrapper">
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button
                  id="header-bell-btn"
                  type="text"
                  icon={<BellOutlined />}
                  className="header-bell-btn"
                  style={unreadCount > 0 ? { color: '#F97316', borderColor: '#FFEDD5', background: '#FFF7ED' } : {}}
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setUserOpen(false);
                  }}
                />
              </Badge>
              {notifOpen && (
                <div id="notif-popup-card" className="header-popup-card">
                  {notifDropdown}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="header-popup-wrapper">
              <div
                id="header-user-btn"
                className="header-user"
                onClick={() => {
                  setUserOpen(!userOpen);
                  setNotifOpen(false);
                }}
              >
                <Avatar
                  src={(user as any)?.avatar_url}
                  style={{ backgroundColor: '#F97316', cursor: 'pointer', flexShrink: 0, fontWeight: 700 }}
                  size="small"
                >
                  {user?.full_name?.charAt(0)}
                </Avatar>
                <span className="header-user-name hide-mobile">{user?.full_name}</span>
              </div>
              {userOpen && (
                <div id="user-popup-card" className="header-popup-card">
                  {userProfilePopup}
                </div>
              )}
            </div>
          </div>
        </Header>

        {/* Content */}
        <Content className="app-content">
          {children}
        </Content>
      </Layout>

      {/* EOD Collector Daily Summary & Handover Modal */}
      <CollectorDailySummaryModal
        open={eodModalOpen}
        onClose={() => setEodModalOpen(false)}
        onOpenSettlementWithReceipts={(receiptIds) => {
          navigate('/settlements', { state: { preselectedReceiptIds: receiptIds } });
        }}
      />
    </Layout>
  );
};

export default AppShell;
