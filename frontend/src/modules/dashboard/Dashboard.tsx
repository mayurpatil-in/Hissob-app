import React, { useState } from 'react';
import { Row, Col, Table, Tag, Progress, Segmented, Button, Tooltip, Avatar, Spin } from 'antd';
import {
  ArrowUpOutlined, DollarOutlined, FileTextOutlined,
  TeamOutlined, CheckCircleOutlined, CrownOutlined, BankOutlined,
  PlusOutlined, AuditOutlined, ThunderboltOutlined,
  SwapOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getDashboardSummary, getFinancialYears } from '../../api/services';
import SuperAdminPage from '../super-admin/SuperAdminPage';
import FinancialAnalyticsWidget from './FinancialAnalyticsWidget';
import FestivalManagementWidget from './FestivalManagementWidget';
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
  const { user, can } = useAuthStore();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<string>(user?.is_super_admin ? 'platform' : 'org');

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    staleTime: 30_000,
  });

  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

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

  const getTimeOfDayTheme = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Good morning',
        icon: '🌅',
        themeClass: 'banner-theme-morning',
        glow1: 'rgba(245, 158, 11, 0.35)',
        glow2: 'rgba(234, 88, 12, 0.3)',
        subText: 'Sunrise Accounting Shift',
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        greeting: 'Good afternoon',
        icon: '☀️',
        themeClass: 'banner-theme-afternoon',
        glow1: 'rgba(14, 165, 233, 0.35)',
        glow2: 'rgba(249, 115, 22, 0.25)',
        subText: 'Midday Operations & Treasury Monitor',
      };
    } else {
      return {
        greeting: 'Good evening',
        icon: '🌙',
        themeClass: 'banner-theme-evening',
        glow1: 'rgba(139, 92, 246, 0.35)',
        glow2: 'rgba(99, 102, 241, 0.3)',
        subText: 'Evening Settlement & Cash Audit',
      };
    }
  };

  const timeTheme = getTimeOfDayTheme();

  const columns = [
    {
      title: 'Receipt #',
      dataIndex: 'receipt',
      key: 'receipt',
      render: (v: string) => <b style={{ color: '#0B2347' }}>{v}</b>,
    },
    { title: 'Donor', dataIndex: 'donor', key: 'donor' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: string) => <span style={{ fontWeight: 700, color: '#16A34A' }}>{v}</span>,
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (m: string) => (
        <span>
          {MODE_ICON[m] || '💳'} {m}
        </span>
      ),
    },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] || 'default'}>
          {s.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
  ];

  if (user?.is_super_admin && viewMode === 'platform') {
    return (
      <div className="dashboard-container animate-fadeIn">
        <div className="super-admin-bar">
          <Tag color="gold" style={{ fontSize: 13, padding: '4px 14px', borderRadius: 20 }}>
            <CrownOutlined /> SUPER ADMIN PLATFORM MODE
          </Tag>
          <Segmented
            options={[
              { label: 'Platform Command Center', value: 'platform', icon: <CrownOutlined /> },
              { label: 'Organization View', value: 'org', icon: <BankOutlined /> },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as string)}
          />
        </div>
        <SuperAdminPage />
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fadeIn">
      {user?.is_super_admin && (
        <div className="super-admin-switcher">
          <Segmented
            options={[
              { label: 'Platform Command Center', value: 'platform', icon: <CrownOutlined /> },
              { label: 'Organization View', value: 'org', icon: <BankOutlined /> },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as string)}
          />
        </div>
      )}

      {/* ── Glassmorphic Dynamic Time-of-Day Hero Banner ── */}
      <div className={`dashboard-hero-banner ${timeTheme.themeClass}`}>
        <div className="hero-banner-content">
          <div className="hero-user-profile">
            <Avatar
              size={56}
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                fontWeight: 800,
                fontSize: 22,
                flexShrink: 0,
                width: 56,
                height: 56,
                minWidth: 56,
                minHeight: 56,
                borderRadius: '50%',
              }}
              src={(user as any)?.avatar_url}
            >
              {user?.full_name?.charAt(0) || 'U'}
            </Avatar>
            <div>
              <div className="hero-greeting">
                {timeTheme.greeting}, {user?.full_name?.split(' ')[0]} {timeTheme.icon}
              </div>
              <div className="hero-subtext">
                <span className="hero-subtext-item"><BankOutlined /> Organization Portal</span>
                <span className="subtext-dot">•</span>
                <span className="hero-subtext-item"><CalendarOutlined /> Active FY: <Tag color="gold" style={{ marginLeft: 4, fontWeight: 700, borderRadius: 10 }}>{activeFy?.name || '2026'} 👑</Tag></span>
                <span className="subtext-dot">•</span>
                <span className="hero-subtext-item status-text">{timeTheme.subText}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
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
          </div>
        </div>

        {/* Ambient background glows tailored for time of day */}
        <div className="banner-glow banner-glow-1" style={{ background: timeTheme.glow1 }} />
        <div className="banner-glow banner-glow-2" style={{ background: timeTheme.glow2 }} />
      </div>

      {/* ── Dynamic Live Stat Cards Grid ── */}
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

      {/* ── Festival & Event Campaigns Widget ── */}
      <FestivalManagementWidget selectedFyId={activeFy?.id} />

      {/* ── Financial Analytics & Payment Distribution Widget ── */}
      <FinancialAnalyticsWidget
        totalCollections={metrics.total_collections}
        cashAmount={metrics.cash_amount}
        digitalAmount={metrics.digital_amount}
        settledAmount={metrics.settled_amount}
        pendingAmount={metrics.pending_amount}
      />

      {/* ── Main Content Split Grid ── */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Left Column: Recent Receipts Table */}
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
              scroll={{ x: 600 }}
              style={{ marginTop: 12 }}
            />
          </div>
        </Col>

        {/* Right Column: Active Festival Campaigns & Settlement Breakdown */}
        <Col xs={24} xl={9}>
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
              {festivals.map((f: any) => (
                <div key={f.name} className="campaign-item">
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
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
