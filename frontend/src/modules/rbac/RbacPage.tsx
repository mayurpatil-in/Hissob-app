import React from 'react';
import { Card, Table, Tag, Typography } from 'antd';

const { Title, Text } = Typography;

const SYSTEM_ROLES = [
  { key: '1', role: 'Super Admin', slug: 'super_admin', perms: 'All 144 System Permissions', scope: 'Platform Wide' },
  { key: '2', role: 'Organization Admin', slug: 'org_admin', perms: 'All Organization Modules (Users, FY, Festivals, Financials)', scope: 'Tenant Wide' },
  { key: '3', role: 'President', slug: 'president', perms: 'View, Create, Update, Approve across all tenant modules', scope: 'Tenant Wide' },
  { key: '4', role: 'Treasurer', slug: 'treasurer', perms: 'Financial Year, Receipts, Cash Settlement Verification, Expenses', scope: 'Tenant Wide' },
  { key: '5', role: 'Secretary', slug: 'secretary', perms: 'Festivals, Donors, Areas, Receipt Issuance, Reports', scope: 'Tenant Wide' },
  { key: '6', role: 'Collector', slug: 'collector', perms: 'Receipt Creation, Cash Settlement Submission, Donor Search', scope: 'Assigned Area' },
  { key: '7', role: 'Auditor', slug: 'auditor', perms: 'Read-only View & Export across all ledgers & audit logs', scope: 'Tenant Wide' },
];

const columns = [
  { title: 'Role Name', dataIndex: 'role', key: 'role', render: (r: string) => <b>{r}</b> },
  { title: 'Slug Identifier', dataIndex: 'slug', key: 'slug', render: (s: string) => <Tag color="geekblue">{s}</Tag> },
  { title: 'Permissions Access', dataIndex: 'perms', key: 'perms' },
  { title: 'Scope', dataIndex: 'scope', key: 'scope', render: (sc: string) => <Tag color="orange">{sc}</Tag> },
];

const RbacPage: React.FC = () => {
  return (
    <div className="rbac-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Roles & Permission Matrix</Title>
          <Text type="secondary">Enterprise Dynamic RBAC roles, permission boundaries, and scope enforcement</Text>
        </div>
      </div>

      <Card className="hissob-card">
        <Table dataSource={SYSTEM_ROLES} columns={columns} pagination={false} />
      </Card>
    </div>
  );
};

export default RbacPage;
