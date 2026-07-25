import React, { useState } from 'react';
import { Row, Col, Table, Tag, Progress, Segmented } from 'antd';
import {
  ArrowUpOutlined, DollarOutlined, FileTextOutlined,
  TeamOutlined, CheckCircleOutlined, CrownOutlined, BankOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import SuperAdminPage from '../super-admin/SuperAdminPage';
import './dashboard.css';

// Placeholder stats — will be replaced with real API data in Phase 2
const STATS = [
  { title: 'Total Collections', value: '₹ 4,82,500', sub: '+12.5% this month', color: 'orange', icon: <DollarOutlined /> },
  { title: 'Total Receipts',    value: '1,243',       sub: '47 pending settlement', color: 'blue', icon: <FileTextOutlined /> },
  { title: 'Active Donors',     value: '386',         sub: '12 new this week', color: 'navy', icon: <TeamOutlined /> },
  { title: 'Settled Amount',    value: '₹ 3,91,200',  sub: '81% settlement rate', color: 'gold', icon: <CheckCircleOutlined /> },
];

const RECENT_RECEIPTS = [
  { key: '1', receipt: 'RC-2025-001', donor: 'Ramesh Sharma', amount: '₹ 5,000', mode: 'Cash', status: 'settled' },
  { key: '2', receipt: 'RC-2025-002', donor: 'Priya Patel',   amount: '₹ 11,000', mode: 'UPI',  status: 'pending_settlement' },
  { key: '3', receipt: 'RC-2025-003', donor: 'Anil Desai',    amount: '₹ 2,100',  mode: 'Cash', status: 'issued' },
  { key: '4', receipt: 'RC-2025-004', donor: 'Sunita Joshi',  amount: '₹ 21,000', mode: 'Cheque', status: 'settled' },
  { key: '5', receipt: 'RC-2025-005', donor: 'Vijay Kumar',   amount: '₹ 500',    mode: 'Cash', status: 'pending_settlement' },
];

const STATUS_COLOR: Record<string, string> = {
  settled: 'success',
  pending_settlement: 'warning',
  issued: 'blue',
  cancelled: 'error',
};

const COLUMNS = [
  { title: 'Receipt #', dataIndex: 'receipt', key: 'receipt', render: (v: string) => <b>{v}</b> },
  { title: 'Donor', dataIndex: 'donor', key: 'donor' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount' },
  { title: 'Mode', dataIndex: 'mode', key: 'mode' },
  {
    title: 'Status', dataIndex: 'status', key: 'status',
    render: (s: string) => (
      <Tag color={STATUS_COLOR[s]}>{s.replace('_', ' ').toUpperCase()}</Tag>
    ),
  },
];

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<string>(user?.is_super_admin ? 'platform' : 'org');

  if (user?.is_super_admin && viewMode === 'platform') {
    return (
      <div className="dashboard animate-fadeIn">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Tag color="gold" style={{ fontSize: 13, padding: '4px 12px' }}>
            <CrownOutlined /> SUPER ADMIN MODE
          </Tag>
          <Segmented
            options={[
              { label: 'Platform Overview', value: 'platform', icon: <CrownOutlined /> },
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
    <div className="dashboard animate-fadeIn">
      {user?.is_super_admin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Segmented
            options={[
              { label: 'Platform Overview', value: 'platform', icon: <CrownOutlined /> },
              { label: 'Organization View', value: 'org', icon: <BankOutlined /> },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as string)}
          />
        </div>
      )}
      {/* ── Welcome ── */}
      <div className="dashboard-welcome">
        <div>
          <h1 className="welcome-title">Good morning, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="welcome-sub">Here's what's happening with your festival collections today.</p>
        </div>
        <div className="welcome-date">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <Row gutter={[16, 16]} className="stats-row">
        {STATS.map((stat) => (
          <Col xs={24} sm={12} xl={6} key={stat.title}>
            <div className={`stat-card ${stat.color}`}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-title">{stat.title}</div>
              <div className="stat-sub">
                <ArrowUpOutlined /> {stat.sub}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* ── Recent Receipts ── */}
        <Col xs={24} xl={16}>
          <div className="hissob-card">
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h3 className="card-title">Recent Receipts</h3>
            </div>
            <Table
              columns={COLUMNS}
              dataSource={RECENT_RECEIPTS}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </div>
        </Col>

        {/* ── Collection Progress ── */}
        <Col xs={24} xl={8}>
          <div className="hissob-card" style={{ height: '100%' }}>
            <h3 className="card-title" style={{ marginBottom: 20 }}>Festival Progress</h3>
            <div className="festival-progress">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Ganesh Festival 2025</span>
                  <span>₹4.8L / ₹6L</span>
                </div>
                <Progress percent={80} strokeColor="#F97316" railColor="#F3F4F6" />
              </div>
              <div className="progress-item">
                <div className="progress-label">
                  <span>Navratri 2025</span>
                  <span>₹1.2L / ₹5L</span>
                </div>
                <Progress percent={24} strokeColor="#1E5AA8" railColor="#F3F4F6" />
              </div>
              <div className="progress-item">
                <div className="progress-label">
                  <span>Diwali 2025</span>
                  <span>Planning</span>
                </div>
                <Progress percent={0} strokeColor="#FF9F1C" railColor="#F3F4F6" />
              </div>
            </div>

            <h3 className="card-title" style={{ marginBottom: 16, marginTop: 24 }}>Settlement Status</h3>
            <div className="settlement-stats">
              {[
                { label: 'Settled', value: '₹3,91,200', pct: 81, color: '#22C55E' },
                { label: 'Pending', value: '₹91,300',   pct: 19, color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} className="settlement-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: s.color }}>{s.label}</span>
                    <span style={{ fontWeight: 600 }}>{s.value}</span>
                  </div>
                  <Progress percent={s.pct} strokeColor={s.color} showInfo={false} railColor="#F3F4F6" />
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
