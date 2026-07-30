import React, { useState } from 'react';
import { Card, Avatar, Tag, Typography, Button, Spin, Segmented, Tooltip } from 'antd';
import {
  ClockCircleOutlined, ReloadOutlined, FileTextOutlined,
  DollarOutlined, SwapOutlined, SafetyOutlined, UserOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getActivityFeed, type ActivityFeedItem } from '../../api/services';

const { Text } = Typography;

const MODULE_ICONS: Record<string, React.ReactNode> = {
  receipts: <FileTextOutlined style={{ color: '#F97316' }} />,
  cash_settlement: <SwapOutlined style={{ color: '#10B981' }} />,
  expenses: <DollarOutlined style={{ color: '#EC4899' }} />,
  donors: <UserOutlined style={{ color: '#3B82F6' }} />,
  auth: <SafetyOutlined style={{ color: '#F59E0B' }} />,
};

const MODULE_BG: Record<string, string> = {
  receipts: '#FFF7ED',
  cash_settlement: '#ECFDF5',
  expenses: '#FDF2F8',
  donors: '#EFF6FF',
  auth: '#FEF3C7',
};

const MODULE_TAG_COLOR: Record<string, string> = {
  receipts: 'orange',
  cash_settlement: 'green',
  expenses: 'magenta',
  donors: 'blue',
  auth: 'gold',
};

interface ActivityTimelineWidgetProps {
  compact?: boolean;
  limit?: number;
  showFilters?: boolean;
}

export const ActivityTimelineWidget: React.FC<ActivityTimelineWidgetProps> = ({
  limit = 20,
  showFilters = true,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('all');

  const { data: feedItems = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['activityFeed', selectedModule, limit],
    queryFn: () => getActivityFeed(selectedModule === 'all' ? undefined : selectedModule, limit),
    refetchInterval: 20000, // Live refresh every 20s
  });

  return (
    <Card
      className="hissob-card animate-fadeIn"
      style={{
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #E2E8F0',
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#F97316', fontSize: 18 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Live Activity Feed</span>
            <Tag color="orange" style={{ borderRadius: 10, fontWeight: 700, fontSize: 11 }}>
              REAL-TIME
            </Tag>
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            size="small"
            style={{ color: '#64748B' }}
          >
            Refresh
          </Button>
        </div>
      }
    >
      {showFilters && (
        <div style={{ marginBottom: 16, overflowX: 'auto' }}>
          <Segmented
            value={selectedModule}
            onChange={(val) => setSelectedModule(val as string)}
            options={[
              { label: 'All Activity', value: 'all' },
              { label: '🧾 Receipts', value: 'receipts' },
              { label: '💰 Cash Balance', value: 'cash_settlement' },
              { label: '💸 Expenses', value: 'expenses' },
              { label: '🔐 Auth', value: 'auth' },
            ]}
            style={{ border: '1px solid #E2E8F0', background: '#F8FAFC' }}
          />
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
            Loading live activity timeline...
          </Text>
        </div>
      ) : feedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>No recent activity records found.</Text>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedItems.map((item: ActivityFeedItem) => {
            const icon = MODULE_ICONS[item.module] || <ThunderboltOutlined />;
            const bg = MODULE_BG[item.module] || '#F8FAFC';
            const tagColor = MODULE_TAG_COLOR[item.module] || 'default';

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: bg,
                  border: '1px solid rgba(226, 232, 240, 0.7)',
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {/* User Avatar */}
                <Avatar
                  src={item.user_avatar || undefined}
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {item.user_name?.charAt(0) || 'U'}
                </Avatar>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13, color: '#1E293B', fontWeight: 500, lineHeight: 1.4 }}>
                      <b style={{ color: '#0F172A', fontWeight: 800 }}>{item.user_name}</b>{' '}
                      <span style={{ color: '#64748B', fontSize: 11 }}>({item.user_email})</span>{' '}
                      <span>{item.story.replace(item.user_name, '').trim()}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Tag color={tagColor} style={{ fontSize: 10, fontWeight: 700, borderRadius: 8, margin: 0 }}>
                        {icon} {item.module.toUpperCase().replace('_', ' ')}
                      </Tag>
                      <Tooltip title={new Date(item.created_at).toLocaleString('en-IN')}>
                        <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                          <ClockCircleOutlined style={{ marginRight: 3, fontSize: 10 }} />
                          {item.time_ago}
                        </Text>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ActivityTimelineWidget;
