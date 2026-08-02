import React, { useState, useRef, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Badge, Drawer, Tag, Typography, Tooltip, Select, Input, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, FileTextOutlined, UserOutlined,
  BankOutlined, CalendarOutlined, TeamOutlined, BarChartOutlined,
  SettingOutlined, BellOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, AuditOutlined, GlobalOutlined, SafetyOutlined, CrownOutlined, RobotOutlined,
  MenuOutlined, CheckOutlined, CloseOutlined, RocketOutlined, ToolOutlined, ProjectOutlined, MailOutlined,
  StarOutlined, StarFilled, SearchOutlined, PlusOutlined, SunOutlined, MoonOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getOrganizations } from '../api/services';
import type { NotificationItem } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authService } from '../auth/authService';
import packageJson from '../../package.json';
import './AppShell.css';

const APP_VERSION = packageJson.version || '1.0.0';
const { Sider, Header, Content, Footer } = Layout;

const RupeeIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span style={{ fontWeight: 800, fontSize: 15, lineHeight: 1, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, ...style }}>
    ₹
  </span>
);

export type NavCategory = 'Core' | 'Festival & Events' | 'Finance & Operations' | 'Analytics' | 'Administration';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  module?: string;
  category: NavCategory;
  badge?: React.ReactNode;
}

const SUPER_ADMIN_NAV: NavItem[] = [
  { key: '/dashboard',   label: 'Dashboard',         icon: <DashboardOutlined />, category: 'Core' },
  { key: '/ai-insights', label: 'AI Insights',       icon: <RobotOutlined style={{ color: '#F97316' }} />, category: 'Core', badge: <Tag color="orange" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4, fontWeight: 800, margin: 0 }}>AI</Tag> },
  { key: '/super-admin', label: 'Organizations',     icon: <CrownOutlined />, category: 'Administration' },
  { key: '/audit',       label: 'Global Audit Log',  icon: <AuditOutlined />, category: 'Administration' },
  { key: '/users',       label: 'Platform Users',    icon: <UserOutlined />, category: 'Administration' },
  { key: '/settings',    label: 'Global Settings',   icon: <SettingOutlined />, category: 'Administration' },
];

const ORG_NAV: NavItem[] = [
  // Core
  { key: '/dashboard',      label: 'Dashboard',       icon: <DashboardOutlined />, category: 'Core' },
  { key: '/ai-insights',    label: 'AI Insights',     icon: <RobotOutlined style={{ color: '#F97316' }} />, category: 'Core', badge: <Tag color="orange" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4, fontWeight: 800, margin: 0 }}>✨ AI</Tag> },
  
  // Festival & Events
  { key: '/financial-year', label: 'Financial Year',  icon: <CalendarOutlined />, module: 'financial_year', category: 'Festival & Events' },
  { key: '/festivals',      label: 'Festivals',       icon: <GlobalOutlined />,   module: 'festivals', category: 'Festival & Events' },
  { key: '/planning',       label: 'Festival Planning', icon: <ProjectOutlined style={{ color: '#F97316' }} />, module: 'festivals', category: 'Festival & Events' },
  { key: '/invitations',    label: 'Invitations & RSVP', icon: <MailOutlined style={{ color: '#3B82F6' }} />, module: 'users', category: 'Festival & Events', badge: <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4, margin: 0 }}>RSVP</Tag> },
  
  // Finance & Operations
  { key: '/donors',         label: 'Donors',          icon: <TeamOutlined />,     module: 'donors', category: 'Finance & Operations' },
  { key: '/receipts',       label: 'Receipts',        icon: <FileTextOutlined />, module: 'receipts', category: 'Finance & Operations' },
  { key: '/settlements',    label: 'Cash Settlement', icon: <BankOutlined />,     module: 'cash_settlement', category: 'Finance & Operations', badge: <Tag color="green" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4, margin: 0 }}>CASH</Tag> },
  { key: '/expenses',       label: 'Expenses',        icon: <RupeeIcon />,        module: 'expenses', category: 'Finance & Operations' },
  { key: '/inventory',      label: 'Inventory & Assets', icon: <ToolOutlined />,  module: 'inventory', category: 'Finance & Operations' },
  
  // Analytics
  { key: '/reports',        label: 'Reports',         icon: <BarChartOutlined />, module: 'reports', category: 'Analytics' },
  
  // Administration
  { key: '/users',          label: 'Users',           icon: <UserOutlined />,     module: 'users', category: 'Administration' },
  { key: '/rbac',           label: 'Roles & Access',  icon: <SafetyOutlined />,   module: 'rbac', category: 'Administration' },
  { key: '/audit',          label: 'Audit Trail',     icon: <AuditOutlined />,    module: 'audit', category: 'Administration' },
  { key: '/settings',       label: 'Settings',        icon: <SettingOutlined />,  module: 'settings', category: 'Administration' },
];

import CollectorDailySummaryModal from '../modules/settlements/CollectorDailySummaryModal';
import AIChatWidget from '../modules/ai/AIChatWidget';

interface Props {
  children: React.ReactNode;
}

const AppShell: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [eodModalOpen, setEodModalOpen] = useState(false);

  // Sidebar enhanced features state
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<any>(null);
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hissob_pinned_nav');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { user, can, hasModule, selectedTenantId, setSelectedTenantId } = useAuthStore();
  const { effectiveTheme, toggleTheme } = useThemeStore();
  const queryClient = useQueryClient();

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
    enabled: !!user?.is_super_admin,
  });

  // Global Keyboard Shortcuts (Ctrl+B to collapse/expand sidebar, Ctrl+/ to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (collapsed) setCollapsed(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  const togglePin = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedKeys((prev) => {
      const updated = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      try {
        localStorage.setItem('hissob_pinned_nav', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

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

  const userRolesList = (user as any)?.roles || [];
  const roleSlugs = userRolesList.map((r: any) => (r.slug || r.name || '').toLowerCase());
  
  // Check if current user is authorized to view audit logs & activity trail
  const canViewAudit = !!user?.is_super_admin ||
    can('audit', 'read') ||
    can('audit_log', 'read') ||
    roleSlugs.some((r: string) => r.includes('admin') || r.includes('auditor') || r.includes('president') || r.includes('treasurer') || r.includes('secretary'));

  const primaryRoleName = user?.is_super_admin 
    ? '👑 SUPER ADMIN' 
    : (userRolesList[0]?.name || userRolesList[0]?.slug || (user as any)?.role || 'MEMBER');

  const visibleNavItems: NavItem[] = user?.is_super_admin
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
                {primaryRoleName}
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

        {canViewAudit && (
          <Button
            type="text"
            block
            icon={<AuditOutlined style={{ color: '#059669', fontSize: 16 }} />}
            style={{ textAlign: 'left', height: 40, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', borderRadius: 8 }}
            onClick={() => { setUserOpen(false); navigate('/audit'); }}
          >
            Audit Logs & Activity
          </Button>
        )}

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

  const handleNavClick = (key: string) => {
    setMobileOpen(false);
    navigate(key);
  };

  // Quick Action menu items definition
  const quickActionMenuItems = [
    {
      key: 'receipt',
      label: '💰 Issue Receipt',
      onClick: () => handleNavClick('/receipts'),
    },
    {
      key: 'expense',
      label: '🧾 Record Expense',
      onClick: () => handleNavClick('/expenses'),
    },
    {
      key: 'settlement',
      label: '🤝 Cash Settlement',
      onClick: () => handleNavClick('/settlements'),
    },
    {
      key: 'invite',
      label: '📩 Send Invitations',
      onClick: () => handleNavClick('/invitations'),
    },
    {
      key: 'festival',
      label: '🎪 Festival Planning',
      onClick: () => handleNavClick('/planning'),
    },
  ];

  // Custom Item Label Renderer for Menu
  const renderItemLabel = (item: NavItem) => {
    const isPinned = pinnedKeys.includes(item.key);
    return (
      <div className="sidebar-nav-item-inner">
        <span className="sidebar-nav-item-title">{item.label}</span>
        <div className="sidebar-nav-item-meta">
          {item.badge}
          {!collapsed && (
            <span
              className={`sidebar-star-btn ${isPinned ? 'pinned' : ''}`}
              onClick={(e) => togglePin(item.key, e)}
              title={isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
            >
              {isPinned ? <StarFilled style={{ color: '#F59E0B' }} /> : <StarOutlined />}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Filter items by search query
  const filteredNavItems = visibleNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Construct Ant Design Menu Items
  const buildMenuItems = () => {
    if (collapsed) {
      return filteredNavItems.map((item) => ({
        key: item.key,
        icon: (
          <Tooltip title={item.label} placement="right">
            {item.icon}
          </Tooltip>
        ),
        label: item.label,
        onClick: () => handleNavClick(item.key),
      }));
    }

    // Active Search View
    if (searchQuery.trim().length > 0) {
      if (filteredNavItems.length === 0) {
        return [
          {
            key: 'no-results',
            disabled: true,
            label: (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', padding: '12px 0', fontSize: 12 }}>
                No pages matching "{searchQuery}"
              </div>
            ),
          },
        ];
      }
      return filteredNavItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: renderItemLabel(item),
        onClick: () => handleNavClick(item.key),
      }));
    }

    const items: any[] = [];

    // 1. Favorites Pinned Section
    const pinnedItems = visibleNavItems.filter((item) => pinnedKeys.includes(item.key));
    if (pinnedItems.length > 0) {
      items.push({
        type: 'group',
        key: 'group-favorites',
        label: <span className="sidebar-group-heading">⭐ FAVORITES</span>,
        children: pinnedItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: renderItemLabel(item),
          onClick: () => handleNavClick(item.key),
        })),
      });
    }

    // 2. Categorized Groups
    const CATEGORY_LABELS: Record<NavCategory, string> = {
      'Core': '⚡ CORE',
      'Festival & Events': '🎪 FESTIVALS & EVENTS',
      'Finance & Operations': '💳 FINANCE & OPERATIONS',
      'Analytics': '📊 ANALYTICS & REPORTS',
      'Administration': '🛡️ ADMINISTRATION',
    };

    const categories: NavCategory[] = ['Core', 'Festival & Events', 'Finance & Operations', 'Analytics', 'Administration'];
    categories.forEach((cat) => {
      const catItems = visibleNavItems.filter((item) => item.category === cat);
      if (catItems.length > 0) {
        items.push({
          type: 'group',
          key: `group-${cat}`,
          label: <span className="sidebar-group-heading">{CATEGORY_LABELS[cat]}</span>,
          children: catItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: renderItemLabel(item),
            onClick: () => handleNavClick(item.key),
          })),
        });
      }
    });

    return items;
  };

  const currentPageItem = visibleNavItems.find((item) => item.key === location.pathname);

  return (
    <Layout className="app-shell">
      {/* ── Mobile Navigation Drawer ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}>
            <div className="sidebar-logo-icon" style={{ flexShrink: 0 }}>H</div>
            <span style={{ color: '#0B2347', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', flexShrink: 0 }}>Hisob ERP</span>
            <Tag color="orange" style={{ fontSize: 9, padding: '0 4px', lineHeight: '14px', borderRadius: 4, fontWeight: 800, margin: 0, flexShrink: 0 }}>PRO</Tag>
            <Tag color="blue" style={{ fontSize: 9, padding: '0 4px', lineHeight: '14px', borderRadius: 4, fontWeight: 800, margin: 0, flexShrink: 0 }}>v{APP_VERSION}</Tag>
          </div>
        }
        placement="left"
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        styles={{
          wrapper: { width: '300px' },
          body: { padding: 0, background: '#0B2347' },
          header: { background: '#FFF', padding: '12px 16px' },
        }}
      >
        <div style={{ padding: '12px 12px 4px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            style={{
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(30,64,175,0.4)',
            }}
            block
            onClick={() => {
              setMobileOpen(false);
              window.dispatchEvent(new CustomEvent('open-ai-chat'));
            }}
          >
            🤖 Ask Hisob AI Assistant
          </Button>
          <Input
            placeholder="Search menu..."
            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="small"
            className="sidebar-search-input"
          />
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          className="sidebar-menu"
          items={buildMenuItems()}
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
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span className="sidebar-logo-text">Hisob ERP</span>
              <Tag color="orange" style={{ fontSize: 9, padding: '0 4px', lineHeight: '14px', borderRadius: 4, fontWeight: 800, margin: 0 }}>PRO</Tag>
              <Tag color="blue" style={{ fontSize: 9, padding: '0 4px', lineHeight: '14px', borderRadius: 4, fontWeight: 800, margin: 0 }}>v{APP_VERSION}</Tag>
            </div>
          )}
        </div>

        {/* Quick Actions & Search Bar Utility Header */}
        <div className="sidebar-utility-section">
          {!collapsed ? (
            <>
              <Dropdown menu={{ items: quickActionMenuItems }} placement="bottomLeft" trigger={['click']}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="sidebar-quick-action-btn"
                  block
                >
                  Quick Action
                </Button>
              </Dropdown>
              <div className="sidebar-search-wrapper">
                <Input
                  ref={searchInputRef}
                  placeholder="Search menu (Ctrl+/)"
                  prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  size="small"
                  className="sidebar-search-input"
                />
              </div>
            </>
          ) : (
            <Dropdown menu={{ items: quickActionMenuItems }} placement="rightTop" trigger={['click']}>
              <Tooltip title="Quick Action" placement="right">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<PlusOutlined />}
                  className="sidebar-quick-action-btn-collapsed"
                />
              </Tooltip>
            </Dropdown>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          className="sidebar-menu"
          items={buildMenuItems()}
        />

        {/* Compact User Profile Footer Card */}
        {!collapsed && user && (
          <div className="sidebar-user-footer" onClick={() => navigate('/settings')} title="View Account Settings">
            <Avatar
              src={(user as any)?.avatar_url}
              style={{ backgroundColor: '#F97316', color: '#fff', fontWeight: 800, flexShrink: 0 }}
              size={30}
            >
              {user?.full_name?.charAt(0) || 'U'}
            </Avatar>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.full_name || 'User'}</span>
              <span className="sidebar-user-role">{primaryRoleName} • v{APP_VERSION}</span>
            </div>
            <SettingOutlined className="sidebar-user-cog" />
          </div>
        )}

        {/* Collapse toggle */}
        <div className="sidebar-collapse-btn">
          <Tooltip title={collapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"} placement="right">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-btn"
            />
          </Tooltip>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hide-mobile">
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
                HISOB ERP
              </span>
              {currentPageItem && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                  <span>/</span>
                  <span style={{ color: '#F97316', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {currentPageItem.icon} {currentPageItem.label}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Search Pill Button */}
            <Button
              type="text"
              icon={<SearchOutlined style={{ color: '#94A3B8' }} />}
              className="header-search-btn hide-mobile"
              onClick={() => {
                if (collapsed) setCollapsed(false);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
            >
              <span style={{ color: '#64748B', fontSize: 12, fontWeight: 600 }}>Search...</span>
              <Tag style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: '0 4px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#64748B' }}>Ctrl + /</Tag>
            </Button>

            {user?.is_super_admin && (
              <Select
                style={{ minWidth: 240, marginLeft: 12 }}
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

            {/* Theme Toggle Button */}
            <Tooltip title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} Mode`}>
              <Button
                type="text"
                icon={effectiveTheme === 'dark' ? <SunOutlined style={{ color: '#F59E0B' }} /> : <MoonOutlined style={{ color: '#475569' }} />}
                className="header-bell-btn"
                onClick={toggleTheme}
              />
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
                  if (user) {
                    setUserOpen(!userOpen);
                    setNotifOpen(false);
                  }
                }}
              >
                <Avatar
                  src={(user as any)?.avatar_url}
                  style={{ backgroundColor: '#F97316', cursor: 'pointer', flexShrink: 0, fontWeight: 700 }}
                  size="small"
                >
                  {user?.full_name?.charAt(0) || 'U'}
                </Avatar>
                <span className="header-user-name hide-mobile">{user?.full_name || ''}</span>
              </div>
              {userOpen && user && (
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

        {/* Global App Footer */}
        <Footer style={{ textAlign: 'center', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '12px 16px', color: '#64748B', fontSize: 12 }}>
          Powered by <strong style={{ color: '#0B2347' }}>Hisob ERP</strong> • Designed & Developed by{' '}
          <a href="https://www.mayurpatil.in" target="_blank" rel="noopener noreferrer" style={{ color: '#F97316', fontWeight: 600, textDecoration: 'none' }}>
            www.mayurpatil.in
          </a>
        </Footer>
      </Layout>

      {/* EOD Collector Daily Summary & Handover Modal */}
      <CollectorDailySummaryModal
        open={eodModalOpen}
        onClose={() => setEodModalOpen(false)}
        onOpenSettlementWithReceipts={(receiptIds) => {
          navigate('/settlements', { state: { preselectedReceiptIds: receiptIds } });
        }}
      />

      {/* Global Floating AI Financial Chatbot Widget */}
      <AIChatWidget />

      {/* ── Mobile Sticky Bottom Navigation Bar (RBAC Filtered) ── */}
      <div className="mobile-bottom-nav">
        {(() => {
          let navTabs: any[] = [];
          if (user?.is_super_admin) {
            navTabs = [
              { key: '/dashboard', label: 'Home', icon: <DashboardOutlined /> },
              { key: '/super-admin', label: 'Orgs', icon: <CrownOutlined /> },
              { key: '/audit', label: 'Audit', icon: <AuditOutlined /> },
              { key: '/users', label: 'Users', icon: <UserOutlined /> },
            ];
          } else {
            const candidateTabs = [
              { key: '/dashboard', label: 'Home', icon: <DashboardOutlined /> },
              { key: '/receipts', label: 'Receipts', icon: <FileTextOutlined />, module: 'receipts' },
              { key: '/expenses', label: 'Expenses', icon: <RupeeIcon />, module: 'expenses' },
              { key: '/donors', label: 'Donors', icon: <TeamOutlined />, module: 'donors' },
              { key: '/settlements', label: 'Settlements', icon: <BankOutlined />, module: 'cash_settlement' },
              { key: '/festivals', label: 'Festivals', icon: <GlobalOutlined />, module: 'festivals' },
              { key: '/inventory', label: 'Inventory', icon: <ToolOutlined />, module: 'inventory' },
              { key: '/reports', label: 'Reports', icon: <BarChartOutlined />, module: 'reports' },
            ];
            navTabs = candidateTabs.filter((tab) => !tab.module || hasModule(tab.module)).slice(0, 4);
          }

          const fullNavList = [
            ...navTabs,
            { key: 'menu-more', label: 'Menu', icon: <MenuOutlined />, action: () => setMobileOpen(true) },
          ];

          return fullNavList.map((nav) => {
            const isActive = location.pathname === nav.key;
            return (
              <div
                key={nav.key}
                className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (nav.action) {
                    nav.action();
                  } else {
                    navigate(nav.key);
                  }
                }}
              >
                <span className="mobile-bottom-nav-icon">{nav.icon}</span>
                <span className="mobile-bottom-nav-label">{nav.label}</span>
              </div>
            );
          });
        })()}
      </div>
    </Layout>
  );
};

export default AppShell;
