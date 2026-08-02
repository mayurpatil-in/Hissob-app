import React, { useState } from 'react';
import { Row, Col, Table, Tag, Progress, Button, Tooltip, Spin } from 'antd';
import {
  ArrowUpOutlined, DollarOutlined, FileTextOutlined,
  TeamOutlined, CheckCircleOutlined, BankOutlined,
  PlusOutlined, AuditOutlined, ThunderboltOutlined,
  SwapOutlined, CalendarOutlined, QrcodeOutlined,
  SafetyOutlined, SafetyCertificateFilled, SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getDashboardSummary, getFinancialYears, getOrganizations } from '../../api/services';
import FinancialAnalyticsWidget from './FinancialAnalyticsWidget';
import FestivalManagementWidget from './FestivalManagementWidget';
import ActivityTimelineWidget from './ActivityTimelineWidget';
import { FestivalPlanningWidget } from './FestivalPlanningWidget';
import type { WidgetPreferences } from './DashboardCustomizerModal';
import { DashboardCustomizerModal, DEFAULT_WIDGET_PREFERENCES } from './DashboardCustomizerModal';
import './dashboard.css';

const STATUS_COLOR: Record<string, string> = {
  settled: 'success',
  pending_settlement: 'warning',
  issued: 'processing',
  cancelled: 'error',
};

const MODE_ICON: Record<string, string> = {
  CASH: '💵',
  UPI: '📱',
  CHEQUE: '🏦',
  NEFT: '⚡',
};

const Dashboard: React.FC = () => {
  const { user, can, selectedTenantId } = useAuthStore();
  const navigate = useNavigate();

  const userRoles = (user?.roles || []).map(r => (r.name || r.slug || '').toLowerCase());
  const isOrgAdmin = user?.is_super_admin || can('organization', 'manage') || userRoles.some(r => r.includes('admin') || r.includes('org'));

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  
  // Organization-wide widget preference key per tenant
  const activeTenantId = selectedTenantId || user?.tenant_id || 'default_org';
  const storageKey = `hissob-org-dashboard-prefs-${activeTenantId}`;

  const [preferences, setPreferences] = useState<WidgetPreferences>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_WIDGET_PREFERENCES;
    } catch (e) {
      return DEFAULT_WIDGET_PREFERENCES;
    }
  });

  // Sync preferences whenever organization/tenant context changes
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setPreferences(JSON.parse(saved));
      } else {
        setPreferences(DEFAULT_WIDGET_PREFERENCES);
      }
    } catch (e) {
      setPreferences(DEFAULT_WIDGET_PREFERENCES);
    }
  }, [storageKey]);

  // Helper: Organization Admins see all widgets on their control panel, while non-admin users have disabled widgets hidden
  const showWidget = (key: keyof WidgetPreferences) => {
    if (isOrgAdmin) return true;
    return preferences[key] !== false;
  };

  const handleSavePreferences = (newPrefs: WidgetPreferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newPrefs));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDefaults = () => {
    setPreferences(DEFAULT_WIDGET_PREFERENCES);
    localStorage.removeItem(storageKey);
  };

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    staleTime: 30_000,
  });

  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
    enabled: !!user?.is_super_admin,
  });

  const activeOrg = organizations.find((o: any) => o.id === selectedTenantId);
  const activeFy = fiscalYears.find((fy: any) => fy.is_current) || fiscalYears[0];

  const metrics = summaryData?.metrics || {
    total_collections: 0,
    total_receipts: 0,
    active_donors: 0,
    new_donors_week: 0,
    vip_donors: 0,
    settled_amount: 0,
    pending_amount: 0,
    pending_count: 0,
    cash_amount: 0,
    digital_amount: 0,
    settlement_pct: 0,
  };

  const recentReceipts = summaryData?.recent_receipts || [];
  const festivals = summaryData?.festivals || [];

  const stats = [
    {
      title: 'Total Collections',
      value: `₹ ${metrics.total_collections.toLocaleString('en-IN')}`,
      sub: '+14.2% MoM growth',
      color: 'stat-gradient-orange',
      icon: <DollarOutlined />,
      progress: 80,
      footer: `Cash: ₹${metrics.cash_amount.toLocaleString('en-IN')} • Digital: ₹${metrics.digital_amount.toLocaleString('en-IN')}`,
    },
    {
      title: 'Receipts Issued',
      value: metrics.total_receipts.toLocaleString('en-IN'),
      sub: `${metrics.pending_count} pending settlement`,
      color: 'stat-gradient-blue',
      icon: <FileTextOutlined />,
      progress: 96,
      footer: `Avg: ₹${Math.round(metrics.total_collections / (metrics.total_receipts || 1))} / receipt`,
    },
    {
      title: 'Active Donors',
      value: metrics.active_donors.toLocaleString('en-IN'),
      sub: `${metrics.new_donors_week} registered this week`,
      color: 'stat-gradient-purple',
      icon: <TeamOutlined />,
      progress: 74,
      footer: `${metrics.vip_donors} VIP Donors (80G Tax)`,
    },
    {
      title: 'Verified & Settled Funds',
      value: `₹ ${metrics.settled_amount.toLocaleString('en-IN')}`,
      sub: `${metrics.settlement_pct}% verified in Cash Book`,
      color: 'stat-gradient-emerald',
      icon: <CheckCircleOutlined />,
      progress: metrics.settlement_pct,
      footer: `₹${metrics.pending_amount.toLocaleString('en-IN')} pending verification`,
    },
  ];

  // Dynamic time greeting & period theme
  const getTimeBasedTheme = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        key: 'morning',
        greeting: 'Good Morning',
        icon: '☀️',
        subText: 'Morning briefing of receipts, cash flow & active campaigns.',
        themeClass: 'banner-theme-morning',
        badgeColor: '#F59E0B',
        glow1: 'rgba(245, 158, 11, 0.25)',
        glow2: 'rgba(249, 115, 22, 0.2)',
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        key: 'afternoon',
        greeting: 'Good Afternoon',
        icon: '🌤️',
        subText: 'Mid-day overview of receipts, cash flow & active campaigns.',
        themeClass: 'banner-theme-afternoon',
        badgeColor: '#3B82F6',
        glow1: 'rgba(59, 130, 246, 0.25)',
        glow2: 'rgba(99, 102, 241, 0.2)',
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        key: 'evening',
        greeting: 'Good Evening',
        icon: '🌇',
        subText: 'Evening summary of receipts, cash flow & active campaigns.',
        themeClass: 'banner-theme-evening',
        badgeColor: '#8B5CF6',
        glow1: 'rgba(139, 92, 246, 0.25)',
        glow2: 'rgba(236, 72, 153, 0.2)',
      };
    } else {
      return {
        key: 'night',
        greeting: 'Good Night',
        icon: '🌙',
        subText: 'End-of-day summary & overnight financial reconciliation.',
        themeClass: 'banner-theme-night',
        badgeColor: '#6366F1',
        glow1: 'rgba(99, 102, 241, 0.25)',
        glow2: 'rgba(15, 23, 42, 0.35)',
      };
    }
  };

  const timeTheme = getTimeBasedTheme();

  const columns = [
    {
      title: 'Receipt #',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      width: 140,
      render: (text: string, record: any) => (
        <span className="cell-receipt-num">
          {text || record.receipt || record.id?.substring(0, 8) || 'RCP-000'}
        </span>
      ),
    },
    {
      title: 'Donor',
      dataIndex: 'donor_name',
      key: 'donor_name',
      minWidth: 160,
      render: (text: string, record: any) => {
        const name = text || record.donor || 'Anonymous Donor';
        return (
          <div>
            <span className="cell-donor-name">{name}</span>
            {record.is_vip && <Tag color="gold" style={{ marginLeft: 6, fontSize: 10 }}>VIP 🌟</Tag>}
          </div>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (val: any, record: any) => {
        const amt = typeof val === 'number' ? val : (parseFloat(val) || 0);
        return <span className="cell-amount">{record.amount_formatted || `₹ ${amt.toLocaleString('en-IN')}`}</span>;
      },
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      width: 110,
      render: (mode: string, record: any) => {
        const m = (mode || record.mode || 'CASH').toUpperCase();
        return <span>{MODE_ICON[m] || '💳'} {m}</span>;
      },
    },
    {
      title: 'Collector',
      dataIndex: 'collector_name',
      key: 'collector_name',
      width: 130,
      render: (text: string) => text || 'Self Service',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => {
        const st = status || 'issued';
        return (
          <Tag color={STATUS_COLOR[st] || 'default'} style={{ borderRadius: 10, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {st.replace('_', ' ')}
          </Tag>
        );
      },
    },
  ];

  // Determine user role archetype
  const isTreasurer = userRoles.some(r => r.includes('treasurer') || r.includes('cashier'));
  const isPresident = userRoles.some(r => r.includes('president') || r.includes('trustee') || r.includes('secretary'));
  const isCollector = userRoles.some(r => r.includes('collector') || r.includes('volunteer'));
  const isAuditor = userRoles.some(r => r.includes('audit'));

  let roleTitle = 'Organization Member';
  let roleBadgeColor = 'blue';

  if (user?.is_super_admin) { roleTitle = 'Super Platform Admin'; roleBadgeColor = 'gold'; }
  else if (isOrgAdmin) { roleTitle = 'Organization Admin'; roleBadgeColor = 'orange'; }
  else if (isPresident) { roleTitle = 'President / Trustee'; roleBadgeColor = 'purple'; }
  else if (isTreasurer) { roleTitle = 'Treasurer'; roleBadgeColor = 'green'; }
  else if (isCollector) { roleTitle = 'Field Cash Collector'; roleBadgeColor = 'cyan'; }
  else if (isAuditor) { roleTitle = 'Internal Auditor'; roleBadgeColor = 'red'; }

  return (
    <div className="dashboard-container" style={{ paddingBottom: 40 }}>
      {/* ── Single Unified Time-Aware & Role-Tailored Greeting Header ── */}
      <div className={`hissob-card dashboard-hero-banner ${timeTheme.themeClass}`}>
        <div className="hero-animated-bg-orb orb-1" />
        <div className="hero-animated-bg-orb orb-2" />
        <div className="hero-content-flex">
          <div className="hero-greeting-block">
            <div className="greeting-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="greeting-icon">{timeTheme.icon}</span>
              <span className="greeting-text">{timeTheme.greeting}</span>
              <Tag color={roleBadgeColor} style={{ fontSize: 10, fontWeight: 700, borderRadius: 12, padding: '1px 8px', margin: 0 }}>
                {roleTitle.toUpperCase()} VIEW
              </Tag>
            </div>

            <div className="user-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 className="hero-user-name">{user?.full_name || 'Organization Member'}</h1>

                {user?.is_super_admin && (
                  <Tooltip title="Platform Super Admin Role Active">
                    <Tag color="gold" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      <SafetyCertificateFilled /> Super Admin
                    </Tag>
                  </Tooltip>
                )}

                {user?.totp_enabled ? (
                  <Tooltip title="Two-Factor Authentication Active">
                    <Tag color="green" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      <SafetyOutlined /> 2FA Active
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tooltip title="Enable 2FA in Profile Settings for maximum security">
                    <Tag
                      color="volcano"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={() => navigate('/settings')}
                    >
                      2FA Off
                    </Tag>
                  </Tooltip>
                )}
              </div>

              {/* Customize Dashboard Button - Organization Admins Only */}
              {isOrgAdmin && (
                <Button
                  type="default"
                  icon={<SettingOutlined />}
                  style={{ borderRadius: 8, fontWeight: 600, borderColor: '#F97316', color: '#F97316' }}
                  onClick={() => setIsCustomizerOpen(true)}
                >
                  Customize Dashboard ⚙️
                </Button>
              )}
            </div>

            <div className="hero-subtext">
              <span className="hero-subtext-item">
                <BankOutlined />{' '}
                {activeOrg ? (
                  <span>Tenant: <Tag color="cyan" style={{ marginLeft: 4, fontWeight: 700, borderRadius: 10 }}>{activeOrg.name}</Tag></span>
                ) : user?.is_super_admin ? (
                  <span><Tag color="geekblue" style={{ marginLeft: 4, fontWeight: 700, borderRadius: 10 }}>All Organizations View</Tag></span>
                ) : (
                  'Organization Portal'
                )}
              </span>
              <span className="subtext-dot">•</span>
              <span className="hero-subtext-item"><CalendarOutlined /> Active FY: <Tag color="gold" style={{ marginLeft: 4, fontWeight: 700, borderRadius: 10 }}>{activeFy?.name || '2026'} 👑</Tag></span>
              <span className="subtext-dot">•</span>
              <span className="hero-subtext-item status-text">{timeTheme.subText}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        {showWidget('quick_actions') && (
          <div className="hero-quick-actions">
            {(user?.is_super_admin || can('receipts', 'create')) && (
              <Tooltip title="Create new donation receipt">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="hero-action-btn primary"
                  onClick={() => navigate('/receipts')}
                >
                  New Receipt
                </Button>
              </Tooltip>
            )}
            {(user?.is_super_admin || can('cash_settlement', 'create')) && (
              <Tooltip title="Submit or verify cash settlement batch">
                <Button
                  icon={<SwapOutlined />}
                  className="hero-action-btn glow-btn"
                  onClick={() => navigate('/settlements')}
                >
                  Settle Cash
                </Button>
              </Tooltip>
            )}
            {(user?.is_super_admin || can('expenses', 'create')) && (
              <Tooltip title="Create expense voucher request">
                <Button
                  icon={<AuditOutlined />}
                  className="hero-action-btn"
                  onClick={() => navigate('/expenses')}
                >
                  Expense Voucher
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Public QR Code UPI Payment & Donation Portal">
              <Button
                icon={<QrcodeOutlined style={{ color: '#F97316' }} />}
                className="hero-action-btn"
                onClick={() => navigate('/pay')}
              >
                UPI QR Portal
              </Button>
            </Tooltip>
          </div>
        )}

        {/* Ambient background glows tailored for time of day */}
        <div className="banner-glow banner-glow-1" style={{ background: timeTheme.glow1 }} />
        <div className="banner-glow banner-glow-2" style={{ background: timeTheme.glow2 }} />
      </div>

      {/* ── Dynamic Live Stat Cards Grid ── */}
      {showWidget('kpi_metrics') && (
        <Spin spinning={isLoading}>
          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            {stats.map((stat) => (
              <Col xs={12} sm={12} xl={6} key={stat.title} style={{ display: 'flex' }}>
                <div className={`premium-stat-card ${stat.color}`} style={{ width: '100%' }}>
                  <div className="stat-card-header">
                    <span className="stat-card-title">{stat.title}</span>
                    <div className="stat-card-icon">{stat.icon}</div>
                  </div>
                  <div className="stat-card-value">{stat.value}</div>
                  <div className="stat-card-sub">
                    <ArrowUpOutlined /> {stat.sub}
                  </div>
                  <Progress
                    percent={stat.progress}
                    showInfo={false}
                    strokeColor="rgba(255, 255, 255, 0.9)"
                    railColor="rgba(255, 255, 255, 0.2)"
                    size="small"
                    style={{ marginTop: 12 }}
                  />
                  <div className="stat-card-footer">{stat.footer}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Spin>
      )}

      {/* ── Festival Planning & Roster Progress Widget ── */}
      {showWidget('planning_suite') && (
        <FestivalPlanningWidget />
      )}

      {/* ── Festival & Event Campaigns Widget ── */}
      {showWidget('festivals_widget') && (
        <FestivalManagementWidget selectedFyId={activeFy?.id} />
      )}

      {/* ── Financial Analytics & Payment Distribution Widget ── */}
      {showWidget('analytics_widget') && (
        <FinancialAnalyticsWidget
          totalCollections={metrics.total_collections}
          cashAmount={metrics.cash_amount}
          digitalAmount={metrics.digital_amount}
          settledAmount={metrics.settled_amount}
          pendingAmount={metrics.pending_amount}
        />
      )}

      {/* ── Main Content Split Grid ── */}
      {(showWidget('recent_receipts') || showWidget('cash_settlement') || showWidget('activity_timeline')) && (
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          {/* Left Column: Recent Receipts Table */}
          {showWidget('recent_receipts') && (
            <Col xs={24} xl={15}>
              <div className="hissob-card dashboard-card">
                <div className="card-header-flex">
                  <div>
                    <h3 className="card-title-heading">Recent Receipts</h3>
                    <span className="card-subtitle-text">Latest collection entries & status</span>
                  </div>
                  <Button
                    type="link"
                    style={{ color: '#F97316', fontWeight: 600 }}
                    onClick={() => navigate('/receipts')}
                  >
                    View All Receipts →
                  </Button>
                </div>
                <Table
                  columns={columns}
                  dataSource={recentReceipts}
                  pagination={false}
                  size="middle"
                  loading={isLoading}
                  scroll={{ x: 'max-content' }}
                  style={{ marginTop: 12 }}
                />
              </div>
            </Col>
          )}

          {/* Right Column: Active Festival Campaigns & Settlement Breakdown & Activity */}
          {(showWidget('cash_settlement') || showWidget('activity_timeline')) && (
            <Col xs={24} xl={showWidget('recent_receipts') ? 9 : 24}>
              {showWidget('cash_settlement') && (
                <div className="hissob-card dashboard-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title-heading">Active Campaigns</h3>
                      <span className="card-subtitle-text">Budget target vs collection progress</span>
                    </div>
                    <Tag color="orange" style={{ borderRadius: 12 }}>
                      <ThunderboltOutlined /> Active FY
                    </Tag>
                  </div>

                  <div className="campaign-progress-list" style={{ marginTop: 16 }}>
                    {festivals.map((f: any, idx: number) => (
                      <div key={f.id || `festival-${idx}`} className="campaign-item">
                        <div className="campaign-info">
                          <span className="campaign-name">{f.name}</span>
                          <span className="campaign-stats">
                            ₹{(f.collected / 100000).toFixed(1)}L / ₹{(f.target / 100000).toFixed(1)}L
                          </span>
                        </div>
                        <Progress
                          percent={f.percent}
                          strokeColor="linear-gradient(90deg, #F97316, #FB923C)"
                          railColor="#F1F5F9"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="card-divider" />

                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title-heading">Cash Book Settlement</h3>
                      <span className="card-subtitle-text">Treasury verification status</span>
                    </div>
                  </div>

                  <div className="settlement-breakdown" style={{ marginTop: 14 }}>
                    <div className="settlement-bar-item">
                      <div className="settlement-bar-label">
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>Verified & Settled</span>
                        <span style={{ fontWeight: 800 }}>
                          ₹ {metrics.settled_amount.toLocaleString('en-IN')} ({metrics.settlement_pct}%)
                        </span>
                      </div>
                      <Progress percent={metrics.settlement_pct} strokeColor="#22C55E" showInfo={false} railColor="#F1F5F9" />
                    </div>

                    <div className="settlement-bar-item" style={{ marginTop: 12 }}>
                      <div className="settlement-bar-label">
                        <span style={{ color: '#D97706', fontWeight: 700 }}>Pending Verification</span>
                        <span style={{ fontWeight: 800 }}>
                          ₹ {metrics.pending_amount.toLocaleString('en-IN')} ({100 - metrics.settlement_pct}%)
                        </span>
                      </div>
                      <Progress percent={100 - metrics.settlement_pct} strokeColor="#F59E0B" showInfo={false} railColor="#F1F5F9" />
                    </div>
                  </div>
                </div>
              )}

              {showWidget('activity_timeline') && (
                <div style={{ marginTop: showWidget('cash_settlement') ? 20 : 0 }}>
                  <ActivityTimelineWidget limit={6} />
                </div>
              )}
            </Col>
          )}
        </Row>
      )}

      {/* ── Org Admin Dashboard Customizer Modal ── */}
      <DashboardCustomizerModal
        open={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
        onResetDefaults={handleResetDefaults}
      />
    </div>
  );
};

export default Dashboard;
