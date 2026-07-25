import React, { useState } from 'react';
import { Table, Tag, Card, Select, Typography, Row, Col, Input } from 'antd';
import {
  SearchOutlined, SafetyCertificateOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/services';

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
      render: (t: string) => (
        <span>
          <ClockCircleOutlined style={{ color: '#F97316', marginRight: 6 }} />
          <b>{new Date(t).toLocaleString('en-IN')}</b>
        </span>
      ),
    },
    {
      title: 'User Email',
      dataIndex: 'user_email',
      key: 'user_email',
      render: (u: string) => (
        <Tag color="geekblue" style={{ fontWeight: 600, borderRadius: 10 }}>
          👤 {u || 'System Event'}
        </Tag>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (m: string) => {
        const color = MODULE_COLORS[m] || 'blue';
        return <Tag color={color} style={{ fontWeight: 700 }}>{m.toUpperCase().replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (a: string) => {
        const color = ACTION_COLORS[a] || 'default';
        return <Tag color={color} style={{ fontWeight: 700 }}>{a.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Record & Event Details',
      dataIndex: 'record_label',
      key: 'record_label',
      render: (r: string, record: any) => (
        <div>
          <b>{r || 'N/A'}</b>
          {record.notes && <><br /><Text type="secondary" style={{ fontSize: 11 }}>Note: {record.notes}</Text></>}
        </div>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip: string) => <Text type="secondary" style={{ fontSize: 12 }}><code>{ip || '127.0.0.1'}</code></Text>,
    },
  ];

  return (
    <div className="audit-module animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>
            <SafetyCertificateOutlined style={{ color: '#F97316', marginRight: 8 }} />
            System Audit Trail & Compliance Monitor
          </Title>
          <Text type="secondary">Trace security events, user mutations, receipt issuances, and financial settlement approvals</Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Total Audit Events</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>{auditLogs.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Financial Mutations</Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E', fontWeight: 900 }}>
              {auditLogs.filter((l: any) => ['receipts', 'expenses', 'cash_settlement'].includes(l.module)).length}
            </Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Security & Login Trail</Text>
            <Title level={3} style={{ margin: 0, color: '#3B82F6', fontWeight: 900 }}>
              {auditLogs.filter((l: any) => l.module === 'auth' || l.action === 'login').length}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card className="hissob-card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search audit logs by user, record, or action..."
            style={{ width: 340 }}
            allowClear
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            placeholder="Filter by Module"
            allowClear
            style={{ width: 220 }}
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
        </div>

        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <Text style={{ fontWeight: 700, fontSize: 12, color: '#0B2347' }}>Event Payload & State Details:</Text>
                <pre style={{ margin: '8px 0 0 0', fontSize: 11, background: '#FFF', padding: 10, borderRadius: 6, border: '1px solid #CBD5E1' }}>
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
    </div>
  );
};

export default AuditPage;
