import React from 'react';
import { Card, Row, Col, Typography, Button, Tag, Space } from 'antd';
import {
  BankOutlined,
  FileTextOutlined, ThunderboltOutlined,
  AuditOutlined, SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

interface Props {
  metrics: {
    total_collections: number;
    total_receipts: number;
    pending_amount: number;
    pending_count: number;
    settled_amount: number;
    cash_amount: number;
    digital_amount: number;
    active_donors: number;
    vip_donors: number;
    settlement_pct?: number;
  };
  onOpenCustomizer: () => void;
}

export const RoleQuickStatsWidget: React.FC<Props> = ({ metrics, onOpenCustomizer }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Determine user role archetype
  const userRoles = (user?.roles || []).map(r => (r.name || r.slug || '').toLowerCase());
  const isSuperAdmin = user?.is_super_admin;
  const isOrgAdmin = isSuperAdmin || userRoles.some(r => r.includes('admin') || r.includes('org'));
  const isTreasurer = userRoles.some(r => r.includes('treasurer') || r.includes('cashier'));
  const isPresident = userRoles.some(r => r.includes('president') || r.includes('trustee') || r.includes('secretary'));
  const isCollector = userRoles.some(r => r.includes('collector') || r.includes('volunteer'));
  const isAuditor = userRoles.some(r => r.includes('audit'));

  let roleTitle = 'Organization Member';
  let badgeColor = 'blue';

  if (isSuperAdmin) { roleTitle = 'Super Platform Admin'; badgeColor = 'gold'; }
  else if (isOrgAdmin) { roleTitle = 'Organization Admin'; badgeColor = 'orange'; }
  else if (isPresident) { roleTitle = 'President / Trustee'; badgeColor = 'purple'; }
  else if (isTreasurer) { roleTitle = 'Treasurer'; badgeColor = 'green'; }
  else if (isCollector) { roleTitle = 'Field Cash Collector'; badgeColor = 'cyan'; }
  else if (isAuditor) { roleTitle = 'Internal Auditor'; badgeColor = 'red'; }

  return (
    <Card
      style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, #0B2347 0%, #1E5AA8 100%)',
        color: '#FFFFFF',
        marginBottom: 20,
        boxShadow: '0 4px 14px rgba(11, 35, 71, 0.15)',
        border: 'none',
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} lg={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Tag color={badgeColor} style={{ fontSize: 11, fontWeight: 700, borderRadius: 12, padding: '2px 10px' }}>
              {roleTitle.toUpperCase()} VIEW
            </Tag>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Welcome back, <strong style={{ color: '#FFF' }}>{user?.full_name || 'User'}</strong>
            </Text>
          </div>

          <Title level={3} style={{ color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
            {isCollector && '📍 Field Collection Dashboard'}
            {isTreasurer && '🏦 Treasury & Cash Settlement Hub'}
            {isPresident && '👑 Executive Leadership Overview'}
            {isAuditor && '🛡️ Audit Trail & Compliance Monitor'}
            {isOrgAdmin && '⚙️ Organization Control Panel'}
            {!isCollector && !isTreasurer && !isPresident && !isAuditor && !isOrgAdmin && '📊 Financial Workspace'}
          </Title>

          <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '6px 0 0 0' }}>
            {isCollector && `You have ₹ ${metrics.pending_amount.toLocaleString()} in ${metrics.pending_count} pending receipts ready to settle with the Treasurer.`}
            {isTreasurer && `₹ ${metrics.pending_amount.toLocaleString()} (${metrics.pending_count} receipts) awaiting cash verification & cash book settlement.`}
            {isPresident && `Total festival collections stand at ₹ ${metrics.total_collections.toLocaleString()} from ${metrics.active_donors} active donors (${metrics.vip_donors} VIPs).`}
            {isAuditor && `All mutations logged in system audit trail. Verified settled ratio: ${metrics.settlement_pct}%.`}
            {isOrgAdmin && `Full administrative control. Manage users, assign roles, setup festivals, and customize dashboard widgets.`}
            {!isCollector && !isTreasurer && !isPresident && !isAuditor && !isOrgAdmin && `Track daily donations, receipts, and festival campaign progress.`}
          </Paragraph>
        </Col>

        <Col xs={24} lg={10} style={{ textAlign: 'right' }}>
          <Space wrap style={{ justifyContent: 'flex-end' }}>
            {isCollector && (
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                size="large"
                style={{ backgroundColor: '#F97316', borderColor: '#F97316', fontWeight: 600 }}
                onClick={() => navigate('/receipts')}
              >
                + Issue Receipt
              </Button>
            )}

            {isTreasurer && (
              <Button
                type="primary"
                icon={<BankOutlined />}
                size="large"
                style={{ backgroundColor: '#22C55E', borderColor: '#22C55E', fontWeight: 600 }}
                onClick={() => navigate('/settlements')}
              >
                Verify Cash ({metrics.pending_count})
              </Button>
            )}

            {isPresident && (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                size="large"
                style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6', fontWeight: 600 }}
                onClick={() => navigate('/ai-insights')}
              >
                AI Executive Insights
              </Button>
            )}

            {isAuditor && (
              <Button
                type="primary"
                icon={<AuditOutlined />}
                size="large"
                style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6', fontWeight: 600 }}
                onClick={() => navigate('/audit')}
              >
                Audit Log Trail
              </Button>
            )}

            {(isOrgAdmin || isSuperAdmin) && (
              <Button
                type="default"
                icon={<SettingOutlined />}
                size="large"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 600 }}
                onClick={onOpenCustomizer}
              >
                Customize Widgets ⚙️
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};
