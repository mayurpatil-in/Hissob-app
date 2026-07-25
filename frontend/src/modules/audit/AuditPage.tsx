import React, { useState } from 'react';
import { Table, Tag, Card, Select, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

const AuditPage: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string | undefined>(undefined);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', selectedModule],
    queryFn: () => getAuditLogs(selectedModule),
  });

  const columns = [
    { title: 'Timestamp', dataIndex: 'created_at', key: 'created_at', render: (t: string) => <b>{new Date(t).toLocaleString('en-IN')}</b> },
    { title: 'User Email', dataIndex: 'user_email', key: 'user_email', render: (u: string) => u || 'System' },
    { title: 'Module', dataIndex: 'module', key: 'module', render: (m: string) => <Tag color="blue">{m.toUpperCase()}</Tag> },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (a: string) => <Tag color={a === 'delete' ? 'red' : 'green'}>{a.toUpperCase()}</Tag> },
    { title: 'Record Label', dataIndex: 'record_label', key: 'record_label', render: (r: string) => r || 'N/A' },
    { title: 'IP Address', dataIndex: 'ip_address', key: 'ip_address', render: (ip: string) => ip || '127.0.0.1' },
  ];

  return (
    <div className="audit-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>System Audit Trail</Title>
          <Text type="secondary">Trace security events, user mutations, and system changes</Text>
        </div>
        <Select
          placeholder="Filter by Module"
          allowClear
          style={{ width: 200 }}
          onChange={(val) => setSelectedModule(val)}
        >
          <Option value="receipts">RECEIPTS</Option>
          <Option value="expenses">EXPENSES</Option>
          <Option value="donors">DONORS</Option>
          <Option value="financial_year">FINANCIAL YEAR</Option>
          <Option value="users">USERS</Option>
        </Select>
      </div>

      <Card className="hissob-card">
        <Table dataSource={auditLogs} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
};

export default AuditPage;
