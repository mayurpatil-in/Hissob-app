import React from 'react';
import { Modal, Switch, Typography, Button, Divider, Tag } from 'antd';
import {
  SettingOutlined, EyeOutlined, EyeInvisibleOutlined,
  ReloadOutlined, DollarOutlined, FileTextOutlined,
  BarChartOutlined, BankOutlined,
  ThunderboltOutlined, AuditOutlined, CrownOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export interface WidgetPreferences {
  role_quick_stats: boolean;
  kpi_metrics: boolean;
  quick_actions: boolean;
  planning_suite: boolean;
  festivals_widget: boolean;
  analytics_widget: boolean;
  recent_receipts: boolean;
  cash_settlement: boolean;
  activity_timeline: boolean;
}

export const DEFAULT_WIDGET_PREFERENCES: WidgetPreferences = {
  role_quick_stats: true,
  kpi_metrics: true,
  quick_actions: true,
  planning_suite: true,
  festivals_widget: true,
  analytics_widget: true,
  recent_receipts: true,
  cash_settlement: true,
  activity_timeline: true,
};

interface Props {
  open: boolean;
  onClose: () => void;
  preferences: WidgetPreferences;
  onSavePreferences: (newPrefs: WidgetPreferences) => void;
  onResetDefaults: () => void;
  userRoleLabel?: string;
}

export const DashboardCustomizerModal: React.FC<Props> = ({
  open,
  onClose,
  preferences,
  onSavePreferences,
  onResetDefaults,
  userRoleLabel = 'Organization Admin',
}) => {
  const toggleWidget = (key: keyof WidgetPreferences, value: boolean) => {
    onSavePreferences({
      ...preferences,
      [key]: value,
    });
  };

  const widgetDefinitions: Array<{
    key: keyof WidgetPreferences;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: string;
  }> = [
    {
      key: 'role_quick_stats',
      title: 'Role Focus & Quick Action Banner',
      description: 'Role-tailored metrics & daily action shortcuts (Collector / Treasurer / President / Auditor).',
      icon: <CrownOutlined style={{ color: '#F97316' }} />,
      category: 'Personalization',
    },
    {
      key: 'kpi_metrics',
      title: 'Financial KPI Metrics Grid',
      description: 'Total Collections, Receipts Count, Active Donors, and Cash in Hand stats.',
      icon: <DollarOutlined style={{ color: '#10B981' }} />,
      category: 'Overview',
    },
    {
      key: 'quick_actions',
      title: 'Quick Action Toolbar',
      description: 'One-click shortcuts to Issue Receipt, Record Expense, Reconcile Cash, & OCR Scan.',
      icon: <ThunderboltOutlined style={{ color: '#F59E0B' }} />,
      category: 'Operations',
    },
    {
      key: 'planning_suite',
      title: 'Festival Planning & Roster Progress',
      description: 'Pre-event tasks, category budgets spend, volunteer shift roster, & Aarti timetable.',
      icon: <BarChartOutlined style={{ color: '#F97316' }} />,
      category: 'Planning',
    },
    {
      key: 'festivals_widget',
      title: 'Festival & Event Campaigns Tracker',
      description: 'Active festival collection targets vs actual progress bars.',
      icon: <BarChartOutlined style={{ color: '#3B82F6' }} />,
      category: 'Campaigns',
    },
    {
      key: 'analytics_widget',
      title: 'Financial Analytics & Payment Split',
      description: 'Visual chart comparing Cash vs Digital UPI collections & verification status.',
      icon: <BarChartOutlined style={{ color: '#8B5CF6' }} />,
      category: 'Analytics',
    },
    {
      key: 'recent_receipts',
      title: 'Recent Receipts Table Stream',
      description: 'Live feed of latest issued collection receipts and donor verification status.',
      icon: <FileTextOutlined style={{ color: '#0B2347' }} />,
      category: 'Live Data',
    },
    {
      key: 'cash_settlement',
      title: 'Cash Book Settlement Status',
      description: 'Treasury verified vs pending cash verification progress gauge.',
      icon: <BankOutlined style={{ color: '#16A34A' }} />,
      category: 'Treasury',
    },
    {
      key: 'activity_timeline',
      title: 'Live Activity Audit Stream',
      description: 'Chronological timeline of system mutations, updates, and user activity.',
      icon: <AuditOutlined style={{ color: '#EF4444' }} />,
      category: 'Security',
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingOutlined style={{ color: '#F97316', fontSize: 20 }} />
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              Customize Dashboard Widgets
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Organization Admin Controls • Active Role: <Tag color="orange">{userRoleLabel}</Tag>
            </Text>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={onResetDefaults}>
          Reset to Role Defaults
        </Button>,
        <Button key="close" type="primary" style={{ backgroundColor: '#F97316', borderColor: '#F97316' }} onClick={onClose}>
          Done
        </Button>,
      ]}
      width={640}
      destroyOnHidden
    >
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        Control widget visibility for organization users (Collectors, Treasurers, Volunteers, Members). Widgets toggled OFF will be hidden from non-admin user dashboards.
      </Paragraph>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {widgetDefinitions.map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: 'var(--color-bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                border: '1px solid var(--color-border)',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>{item.title}</Text>
                  <Tag color="default" style={{ fontSize: 10, borderRadius: 10 }}>{item.category}</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{item.description}</Text>
              </div>
            </div>

            <Switch
              checked={preferences[item.key]}
              onChange={(checked) => toggleWidget(item.key, checked)}
              checkedChildren={<EyeOutlined />}
              unCheckedChildren={<EyeInvisibleOutlined />}
              style={{ flexShrink: 0, marginLeft: 12 }}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
};
