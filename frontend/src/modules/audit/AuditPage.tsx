import React, { useState } from 'react';
import { Table, Tag, Card, Select, Typography, Row, Col, Input, Segmented } from 'antd';
import {
  SearchOutlined, SafetyCertificateOutlined, ClockCircleOutlined,
  ThunderboltOutlined, TableOutlined, DollarCircleOutlined, LockOutlined,
  FilterOutlined, UserOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/services';
import ActivityTimelineWidget from '../dashboard/ActivityTimelineWidget';

const { Title, Text } = Typography;
const { Option } = Select;

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  approve: 'success',
  reject: 'volcano',
  delete: 'red',
  login: 'gold',
  settle: 'cyan',
};

const MODULE_COLORS: Record<string, string> = {
  receipts: 'orange',
  expenses: 'magenta',
  cash_settlement: 'purple',
  donors: 'blue',
  financial_year: 'geekblue',
  users: 'cyan',
  auth: 'gold',
  rbac: 'red',
};

const AuditPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'feed' | 'table'>('table');
  const [selectedModule, setSelectedModule] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', selectedModule],
    queryFn: () => getAuditLogs(selectedModule),
  });

  const filteredLogs = auditLogs.filter((log: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.user_email || '').toLowerCase().includes(q) ||
      (log.record_label || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.module || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t: string) => (
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          <ClockCircleOutlined style={{ color: '#F97316', marginRight: 6 }} />
          <b>{new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</b>
        </span>
      ),
    },
    {
      title: 'User / Actor',
      dataIndex: 'user_email',
      key: 'user_email',
      width: 170,
      render: (u: string) => (
        <Tag color="geekblue" style={{ fontWeight: 600, borderRadius: 10, padding: '2px 8px', fontSize: 12, wordBreak: 'break-all' }}>
          <UserOutlined style={{ marginRight: 4 }} /> {u || 'System Event'}
        </Tag>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (m: string) => {
        const color = MODULE_COLORS[m] || 'blue';
        return <Tag color={color} style={{ fontWeight: 700, borderRadius: 6 }}>{(m || '').toUpperCase().replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (a: string) => {
        const color = ACTION_COLORS[a] || 'default';
        return <Tag color={color} style={{ fontWeight: 800, borderRadius: 6 }}>{(a || '').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Record & Event Details',
      dataIndex: 'record_label',
      key: 'record_label',
      width: 220,
      render: (r: string, record: any) => (
        <div>
          <b style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{r || 'N/A'}</b>
          {record.notes && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>Note: {record.notes}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 110,
      render: (ip: string) => <Text type="secondary" style={{ fontSize: 12 }}><code>{ip || '127.0.0.1'}</code></Text>,
    },
  ];

  return (
    <div className="audit-module animate-fadeIn" style={{ paddingBottom: 32 }}>
      {/* ── Page Header Banner ── */}
      <div
        className="page-header"
        style={{
          marginBottom: 20,
          background: 'var(--color-bg-card)',
          padding: '16px 20px',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: 'calc(1.1rem + 0.5vw)' }}>
              <SafetyCertificateOutlined style={{ color: '#F97316', marginRight: 6 }} />
              System Audit Trail & Compliance Monitor
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
            Trace security events, user mutations, receipt issuances, and financial settlement approvals.
          </Text>
        </div>

        <Segmented
          value={viewMode}
          onChange={(val) => setViewMode(val as 'feed' | 'table')}
          options={[
            { label: <span><ThunderboltOutlined style={{ color: '#F97316' }} /> Activity Feed</span>, value: 'feed' },
            { label: <span><TableOutlined /> Technical Audit Table</span>, value: 'table' },
          ]}
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', padding: 3, borderRadius: 12 }}
          size="middle"
        />
      </div>

      {/* ── KPI Stat Cards ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card
            className="hissob-card"
            style={{
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Audit Events
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: 'var(--color-text-primary)', fontWeight: 900 }}>
                  {auditLogs.length}
                </Title>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.12)', padding: 12, borderRadius: 12 }}>
                <SafetyCertificateOutlined style={{ fontSize: 24, color: '#F97316' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="hissob-card"
            style={{
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Financial Mutations
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#22C55E', fontWeight: 900 }}>
                  {auditLogs.filter((l: any) => ['receipts', 'expenses', 'cash_settlement'].includes(l.module)).length}
                </Title>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.12)', padding: 12, borderRadius: 12 }}>
                <DollarCircleOutlined style={{ fontSize: 24, color: '#22C55E' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="hissob-card"
            style={{
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Security & Auth Trail
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#3B82F6', fontWeight: 900 }}>
                  {auditLogs.filter((l: any) => l.module === 'auth' || l.action === 'login').length}
                </Title>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.12)', padding: 12, borderRadius: 12 }}>
                <LockOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {viewMode === 'feed' ? (
        <ActivityTimelineWidget limit={50} showFilters={true} />
      ) : (
        <Card
          className="hissob-card"
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* ── Search & Filter Control Bar ── */}
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={14} md={16}>
                <Input
                  size="large"
                  prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                  placeholder="Search audit logs by user email, record, or action..."
                  allowClear
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ borderRadius: 10 }}
                />
              </Col>
              <Col xs={24} sm={10} md={8}>
                <Select
                  size="large"
                  placeholder="Filter by Module"
                  allowClear
                  suffixIcon={<FilterOutlined />}
                  style={{ width: '100%', borderRadius: 10 }}
                  onChange={(val) => setSelectedModule(val)}
                >
                  <Option value="receipts">RECEIPTS</Option>
                  <Option value="expenses">EXPENSES</Option>
                  <Option value="cash_settlement">CASH SETTLEMENT</Option>
                  <Option value="donors">DONORS</Option>
                  <Option value="financial_year">FINANCIAL YEAR</Option>
                  <Option value="users">USERS</Option>
                  <Option value="auth">AUTH & SECURITY</Option>
                </Select>
              </Col>
            </Row>
          </div>

          <Table
            dataSource={filteredLogs}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10, responsive: true }}
            scroll={{ x: 800 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: 14, background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                  <Text style={{ fontWeight: 800, fontSize: 12, color: 'var(--color-text-primary)' }}>
                    🔍 Event Payload & State Mutation Details:
                  </Text>
                  <pre
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(
                      {
                        id: record.id,
                        user_email: record.user_email,
                        module: record.module,
                        action: record.action,
                        record_label: record.record_label,
                        old_values: record.old_values || null,
                        new_values: record.new_values || null,
                        ip_address: record.ip_address,
                        created_at: record.created_at,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              ),
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default AuditPage;
