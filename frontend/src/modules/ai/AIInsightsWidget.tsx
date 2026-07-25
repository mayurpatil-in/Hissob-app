import React from 'react';
import { Card, Tag, Typography, Space, Spin, Alert } from 'antd';
import { RobotOutlined, ThunderboltOutlined, BulbOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getAIInsights } from '../../api/services';

const { Text } = Typography;

const IMPACT_COLORS: Record<string, string> = {
  high: 'error',
  medium: 'warning',
  info: 'processing',
};

const AIInsightsWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: getAIInsights,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="hissob-card">
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin size="medium" />
          <p style={{ marginTop: 8, color: '#6B7280' }}>AI Assistant is analyzing financial patterns...</p>
        </div>
      </Card>
    );
  }

  const insights = data?.insights || [];

  return (
    <Card
      className="hissob-card"
      style={{ borderLeft: '4px solid #F97316' }}
      title={
        <Space>
          <RobotOutlined style={{ color: '#F97316', fontSize: 18 }} />
          <span style={{ fontWeight: 700, color: '#0B2347' }}>Smart AI Financial Insights</span>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insights.map((insight: any, idx: number) => (
          <Alert
            key={idx}
            type={insight.impact_level === 'high' ? 'warning' : 'info'}
            showIcon
            icon={<BulbOutlined style={{ color: '#F97316' }} />}
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: '#0B2347' }}>{insight.title}</b>
                <Tag color={IMPACT_COLORS[insight.impact_level] || 'default'}>
                  {insight.impact_level.toUpperCase()}
                </Tag>
              </div>
            }
            description={
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>{insight.description}</Text>
                <div style={{ marginTop: 6, fontWeight: 600, color: '#F97316', fontSize: 13 }}>
                  <ThunderboltOutlined /> Recommendation: {insight.action_suggestion}
                </div>
              </div>
            }
          />
        ))}
      </div>
    </Card>
  );
};

export default AIInsightsWidget;
