import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Segmented, Button, Modal, Input, Divider } from 'antd';
import {
  SafetyCertificateOutlined, CrownOutlined, UserOutlined, BankOutlined,
  WalletOutlined, FileTextOutlined, AuditOutlined, SearchOutlined,
  CheckCircleOutlined, LockOutlined, EyeOutlined, TeamOutlined,
  SafetyOutlined, TableOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface SystemRoleDef {
  key: string;
  role: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
  badgeBg: string;
  scope: string;
  userCount: number;
  description: string;
  allowedModules: string[];
  permissionsList: string[];
}

const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    key: '1',
    role: 'Super Admin',
    slug: 'super_admin',
    icon: <CrownOutlined style={{ color: '#EAB308' }} />,
    color: 'gold',
    badgeBg: 'rgba(234, 179, 8, 0.12)',
    scope: 'Platform Wide',
    userCount: 2,
    description: 'System owner with unlimited root privileges across all multi-tenant organizations.',
    allowedModules: ['All System Modules', 'Super Admin Dashboard', 'Global Tenant Management', 'Audit System'],
    permissionsList: [
      'tenant:create', 'tenant:update', 'tenant:delete', 'user:super_admin',
      'system:audit_logs', 'system:health', 'database:migrate', 'all:unrestricted'
    ],
  },
  {
    key: '2',
    role: 'Organization Admin',
    slug: 'org_admin',
    icon: <SafetyOutlined style={{ color: '#A855F7' }} />,
    color: 'purple',
    badgeBg: 'rgba(168, 85, 247, 0.12)',
    scope: 'Tenant Wide',
    userCount: 5,
    description: 'Full administrative control over tenant settings, user roles, financial years & members.',
    allowedModules: ['Users & Roles', 'Organization Settings', 'Financials', 'Donors', 'Festivals', 'Reports'],
    permissionsList: [
      'organization:manage', 'user:create', 'user:update', 'user:delete',
      'role:assign', 'financial_year:manage', 'receipts:manage', 'settlements:manage'
    ],
  },
  {
    key: '3',
    role: 'President',
    slug: 'president',
    icon: <BankOutlined style={{ color: '#DC2626' }} />,
    color: 'crimson',
    badgeBg: 'rgba(220, 38, 38, 0.12)',
    scope: 'Tenant Wide',
    userCount: 3,
    description: 'Executive committee lead with approval authority over major settlements & expenses.',
    allowedModules: ['Executive Dashboard', 'Cash Settlements', 'Expenses', 'Donors', 'Festivals', 'Reports'],
    permissionsList: [
      'settlement:approve', 'expense:approve', 'receipt:view_all',
      'donor:view_all', 'reports:export', 'audit:view'
    ],
  },
  {
    key: '4',
    role: 'Treasurer',
    slug: 'treasurer',
    icon: <WalletOutlined style={{ color: '#16A34A' }} />,
    color: 'green',
    badgeBg: 'rgba(22, 163, 74, 0.12)',
    scope: 'Tenant Wide',
    userCount: 4,
    description: 'Chief financial officer managing daily cash collection verification, ledger, and bank handovers.',
    allowedModules: ['Cash Settlements', 'Receipts', 'Expenses', 'Financial Year', 'Reports'],
    permissionsList: [
      'settlement:verify', 'settlement:approve', 'receipt:create', 'receipt:cancel',
      'expense:create', 'expense:approve', 'financial_year:close'
    ],
  },
  {
    key: '5',
    role: 'Secretary',
    slug: 'secretary',
    icon: <FileTextOutlined style={{ color: '#2563EB' }} />,
    color: 'blue',
    badgeBg: 'rgba(37, 99, 235, 0.12)',
    scope: 'Tenant Wide',
    userCount: 6,
    description: 'Administrative secretary handling festival event schedules, VIP invitations & donor records.',
    allowedModules: ['Festivals', 'VIP Invitations', 'Donors', 'Receipts', 'Inventory'],
    permissionsList: [
      'festival:manage', 'invitation:manage', 'donor:create', 'donor:update',
      'receipt:create', 'inventory:manage'
    ],
  },
  {
    key: '6',
    role: 'Collector',
    slug: 'collector',
    icon: <UserOutlined style={{ color: '#F97316' }} />,
    color: 'orange',
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    scope: 'Assigned Area',
    userCount: 18,
    description: 'On-ground member responsible for issuing instant receipts to donors & submitting cash handovers.',
    allowedModules: ['Receipt Issuance', 'Cash Handover Submission', 'Donor Search'],
    permissionsList: [
      'receipt:create', 'donor:search', 'donor:create', 'settlement:submit_own'
    ],
  },
  {
    key: '7',
    role: 'Auditor',
    slug: 'auditor',
    icon: <AuditOutlined style={{ color: '#0891B2' }} />,
    color: 'cyan',
    badgeBg: 'rgba(8, 145, 178, 0.12)',
    scope: 'Tenant Wide',
    userCount: 2,
    description: 'Independent financial inspector with read-only audit access across all books & logs.',
    allowedModules: ['Audit Trail', 'Financial Reports', 'Receipt Ledgers', 'Settlement History'],
    permissionsList: [
      'audit:view', 'receipt:read_all', 'expense:read_all', 'settlement:read_all', 'reports:export'
    ],
  },
];

interface MatrixRow {
  key: string;
  module: string;
  op: string;
  super_admin: boolean;
  org_admin: boolean;
  president: boolean;
  treasurer: boolean;
  secretary: boolean;
  collector: boolean;
  auditor: boolean;
}

const PERMISSION_MATRIX_DATA: MatrixRow[] = [
  { key: '1', module: 'Receipts', op: 'Create & Issue Receipt', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: true, collector: true, auditor: false },
  { key: '2', module: 'Receipts', op: 'Cancel / Void Receipt', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: false, collector: false, auditor: false },
  { key: '3', module: 'Cash Settlements', op: 'Submit Cash Handover', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: true, collector: true, auditor: false },
  { key: '4', module: 'Cash Settlements', op: 'Verify & Approve Settlement', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: false, collector: false, auditor: false },
  { key: '5', module: 'Donors', op: 'Add & Edit Donor Directory', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: true, collector: true, auditor: false },
  { key: '6', module: 'Expenses', op: 'Create Expense Voucher', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: true, collector: false, auditor: false },
  { key: '7', module: 'Expenses', op: 'Approve & Pay Expense', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: false, collector: false, auditor: false },
  { key: '8', module: 'Users & Roles', op: 'Manage Users & Assign Roles', super_admin: true, org_admin: true, president: false, treasurer: false, secretary: false, collector: false, auditor: false },
  { key: '9', module: 'Financial Year', op: 'Open / Close Fiscal Year', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: false, collector: false, auditor: false },
  { key: '10', module: 'Audit Logs', op: 'View System Audit Trail', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: true, collector: false, auditor: true },
  { key: '11', module: 'Financial Reports', op: 'Export Ledger & Tax PDFs', super_admin: true, org_admin: true, president: true, treasurer: true, secretary: true, collector: false, auditor: true },
];

const RbacPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'boundaries'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleForModal, setSelectedRoleForModal] = useState<SystemRoleDef | null>(null);

  const filteredRoles = SYSTEM_ROLES.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.role.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
  });

  const matrixColumns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 140,
      render: (m: string) => <Tag color="blue" style={{ fontWeight: 700 }}>{m}</Tag>,
    },
    {
      title: 'Operation / Action',
      dataIndex: 'op',
      key: 'op',
      width: 220,
      render: (op: string) => <strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{op}</strong>,
    },
    {
      title: 'Super Admin',
      dataIndex: 'super_admin',
      key: 'super_admin',
      width: 110,
      render: (val: boolean) => (val ? <Tag color="success">✓ Allowed</Tag> : <Tag color="default">—</Tag>),
    },
    {
      title: 'Org Admin',
      dataIndex: 'org_admin',
      key: 'org_admin',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="purple">✓ Allowed</Tag> : <Tag color="default">—</Tag>),
    },
    {
      title: 'President',
      dataIndex: 'president',
      key: 'president',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="red">✓ Allowed</Tag> : <Tag color="default">—</Tag>),
    },
    {
      title: 'Treasurer',
      dataIndex: 'treasurer',
      key: 'treasurer',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="green">✓ Allowed</Tag> : <Tag color="default">—</Tag>),
    },
    {
      title: 'Secretary',
      dataIndex: 'secretary',
      key: 'secretary',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="blue">✓ Allowed</Tag> : <Tag color="default">—</Tag>),
    },
    {
      title: 'Collector',
      dataIndex: 'collector',
      key: 'collector',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="orange">✓ Allowed</Tag> : <Tag color="default">— Restricted</Tag>),
    },
    {
      title: 'Auditor',
      dataIndex: 'auditor',
      key: 'auditor',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="cyan">✓ Read-Only</Tag> : <Tag color="default">— Restricted</Tag>),
    },
  ];

  return (
    <div className="rbac-module animate-fadeIn" style={{ paddingBottom: 32 }}>
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
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: 'calc(1.1rem + 0.5vw)' }}>
                <SafetyCertificateOutlined style={{ color: '#F97316', marginRight: 6 }} />
                Roles & Access Control Center (RBAC)
              </Title>
              <Tag color="orange" icon={<LockOutlined />} style={{ borderRadius: 12, fontWeight: 700, margin: 0 }}>
                ENTERPRISE SECURITY
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
              Multi-tenant permission matrix, system roles, boundary enforcement & role-based access control.
            </Text>
          </div>

          <Segmented
            block
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={[
              { label: <span><TeamOutlined /> Roles</span>, value: 'cards' },
              { label: <span><TableOutlined /> Matrix</span>, value: 'matrix' },
              { label: <span><SafetyOutlined /> Boundaries</span>, value: 'boundaries' },
            ]}
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', padding: 3, borderRadius: 12 }}
            size="middle"
          />
        </div>
      </div>

      {/* ── 1. Role Directory Cards View ── */}
      {viewMode === 'cards' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input
              size="large"
              prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
              placeholder="Search role by name, identifier, or permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', maxWidth: 360, borderRadius: 10 }}
              allowClear
            />
          </div>

          <Row gutter={[16, 16]}>
            {filteredRoles.map((r) => (
              <Col xs={24} sm={12} lg={8} key={r.key}>
                <Card
                  className="hissob-card"
                  styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '16px' } }}
                  style={{
                    borderRadius: 16,
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                    height: '100%',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: r.badgeBg, padding: '8px 12px', borderRadius: 12, fontSize: 20 }}>
                          {r.icon}
                        </div>
                        <div>
                          <Title level={4} style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--color-text-primary)' }}>
                            {r.role}
                          </Title>
                          <code style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.slug}</code>
                        </div>
                      </div>
                      <Tag color={r.color} style={{ fontWeight: 800, borderRadius: 8, margin: 0 }}>
                        {r.scope}
                      </Tag>
                    </div>

                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 14, minHeight: 36, lineHeight: 1.5 }}>
                      {r.description}
                    </Text>

                    <Divider style={{ margin: '12px 0' }} />

                    <div style={{ marginBottom: 14 }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                        ACCESSIBLE MODULES
                      </Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.allowedModules.map((m) => (
                          <Tag key={m} style={{ fontSize: 11, borderRadius: 6, margin: 0, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                            {m}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <TeamOutlined style={{ marginRight: 4 }} /> <b>{r.userCount}</b> Active Users
                      </Text>
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => setSelectedRoleForModal(r)}
                        style={{ color: '#F97316', fontWeight: 700, padding: 0 }}
                      >
                        View Rule Details
                      </Button>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* ── 2. Interactive Permission Matrix View ── */}
      {viewMode === 'matrix' && (
        <Card
          className="hissob-card"
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
              Detailed operation-level permission matrix enforced dynamically across backend API endpoints:
            </Text>
          </div>

          <Table
            dataSource={PERMISSION_MATRIX_DATA}
            columns={matrixColumns}
            rowKey="key"
            pagination={false}
            scroll={{ x: 850 }}
          />
        </Card>
      )}

      {/* ── 3. Security Scope & Boundaries View ── */}
      {viewMode === 'boundaries' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              className="hissob-card"
              style={{
                borderRadius: 16,
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
              title={<span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}><SafetyOutlined style={{ color: '#F97316' }} /> Multi-Tenant Row Isolation</span>}
            >
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6, display: 'block', marginBottom: 12 }}>
                Every database table (Receipts, Donors, Expenses, Cash Settlements, Users) automatically inherits the <code>TenantMixin</code> with mandatory <code>tenant_id</code> indexing.
              </Text>
              <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: '#16A34A', marginRight: 6 }} /> Cross-tenant data leaks are impossible at ORM & Repository layer.
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              className="hissob-card"
              style={{
                borderRadius: 16,
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
              title={<span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}><LockOutlined style={{ color: '#3B82F6' }} /> Account Lockout & Password Security</span>}
            >
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6, display: 'block', marginBottom: 12 }}>
                Brute-force protection automatically locks accounts after <b>5 consecutive failed login attempts</b> for 30 minutes. Password reset tokens expire in 1 hour.
              </Text>
              <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: '#16A34A', marginRight: 6 }} /> Passwords require uppercase, lowercase, numbers & special characters.
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── Granular Role Permissions Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedRoleForModal?.icon}
            <span>{selectedRoleForModal?.role} — Permission Boundaries</span>
          </div>
        }
        open={!!selectedRoleForModal}
        onCancel={() => setSelectedRoleForModal(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSelectedRoleForModal(null)} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
            Close Rule Inspector
          </Button>,
        ]}
        width={540}
        destroyOnHidden
      >
        {selectedRoleForModal && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Tag color={selectedRoleForModal.color} style={{ fontWeight: 800, borderRadius: 8 }}>
                {selectedRoleForModal.scope}
              </Tag>
              <code style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{selectedRoleForModal.slug}</code>
            </div>

            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
              {selectedRoleForModal.description}
            </Text>

            <Divider style={{ margin: '14px 0' }} />

            <Text style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
              ENFORCED PERMISSION STRINGS
            </Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedRoleForModal.permissionsList.map((p) => (
                <Tag key={p} color="geekblue" style={{ fontFamily: 'monospace', borderRadius: 6, padding: '4px 8px' }}>
                  {p}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RbacPage;
