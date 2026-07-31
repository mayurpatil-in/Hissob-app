import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Select, Progress, Button, Tag, Space, Spin } from 'antd';
import {
  ProjectOutlined, CheckCircleOutlined, DollarOutlined, TeamOutlined,
  ScheduleOutlined, ArrowRightOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getFestivals,
  getPlanningSummary,
  getEventSchedules
} from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

export const FestivalPlanningWidget: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');

  const { data: festivals = [], isLoading: isFestivalsLoading } = useQuery<any[]>({
    queryKey: ['festivals'],
    queryFn: () => getFestivals(),
  });

  useEffect(() => {
    if (!selectedFestivalId && festivals.length > 0) {
      setSelectedFestivalId(festivals[0].id);
    }
  }, [festivals, selectedFestivalId]);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['planning-summary', selectedFestivalId],
    queryFn: () => getPlanningSummary(selectedFestivalId),
    enabled: !!selectedFestivalId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['event-schedules', selectedFestivalId],
    queryFn: () => getEventSchedules({ festival_id: selectedFestivalId }),
    enabled: !!selectedFestivalId,
  });

  return (
    <Card
      style={{
        borderRadius: 14,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        marginTop: 20,
        border: '1px solid #E2E8F0',
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: '#FFF7ED',
            color: '#F97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: '1px solid #FFEDD5',
          }}>
            <ProjectOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0B2347' }}>
              Festival Planning & Execution Progress
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Track tasks, category budget utilization, volunteer shift coverage, and daily event schedules.
            </Text>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <Select
            value={selectedFestivalId}
            onChange={setSelectedFestivalId}
            style={{ flex: 1, minWidth: 150, maxWidth: 220 }}
            size="middle"
            placeholder="Select Festival"
            loading={isFestivalsLoading}
          >
            {festivals.map((f: any) => (
              <Option key={f.id} value={f.id}>{f.name}</Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            style={{ backgroundColor: '#F97316', borderColor: '#F97316', fontWeight: 600 }}
            onClick={() => navigate('/planning')}
          >
            Open Suite →
          </Button>
        </div>
      </div>

      <Spin spinning={isSummaryLoading}>
        {summary ? (
          <Row gutter={[12, 12]}>
            {/* Stat 1: Tasks */}
            <Col xs={12} sm={12} lg={6}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: '#FAFAFA',
                border: '1px solid #F1F5F9',
                borderLeft: '4px solid #F97316',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><CheckCircleOutlined /> Tasks</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0B2347', margin: '2px 0' }}>
                  {summary.completed_tasks} / {summary.total_tasks}
                </div>
                <Progress percent={summary.task_completion_percentage} size="small" strokeColor="#F97316" />
              </div>
            </Col>

            {/* Stat 2: Category Budget */}
            <Col xs={12} sm={12} lg={6}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: '#FAFAFA',
                border: '1px solid #F1F5F9',
                borderLeft: '4px solid #10B981',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><DollarOutlined /> Budget Spend</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0B2347', margin: '2px 0' }}>
                  ₹ {summary.total_spent_budget.toLocaleString()}
                </div>
                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                  Allocated: ₹ {summary.total_allocated_budget.toLocaleString()}
                </Text>
                <Progress percent={summary.budget_utilization_percentage} size="small" strokeColor="#10B981" style={{ marginTop: 2 }} />
              </div>
            </Col>

            {/* Stat 3: Volunteer Shifts */}
            <Col xs={12} sm={12} lg={6}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: '#FAFAFA',
                border: '1px solid #F1F5F9',
                borderLeft: '4px solid #3B82F6',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><TeamOutlined /> Shifts Roster</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0B2347', margin: '2px 0' }}>
                  {summary.filled_shifts} / {summary.total_shifts}
                </div>
                <Progress
                  percent={summary.total_shifts > 0 ? Math.round((summary.filled_shifts / summary.total_shifts) * 100) : 0}
                  size="small"
                  strokeColor="#3B82F6"
                />
              </div>
            </Col>

            {/* Stat 4: Upcoming Events */}
            <Col xs={12} sm={12} lg={6}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: '#FAFAFA',
                border: '1px solid #F1F5F9',
                borderLeft: '4px solid #8B5CF6',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><ScheduleOutlined /> Events</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0B2347', margin: '2px 0' }}>
                  {summary.total_events} Program(s)
                </div>
                <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px' }}>Daily Aarti & Shows</Tag>
              </div>
            </Col>
          </Row>
        ) : (
          <Text type="secondary">No active festival selected or configured.</Text>
        )}

        {/* Mini Preview of Upcoming Schedule Programs */}
        {schedules.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
            <Text strong style={{ color: '#0B2347', fontSize: 13, marginBottom: 8, display: 'block' }}>
              <CalendarOutlined style={{ color: '#F97316' }} /> Upcoming Programs & Ritual Schedule:
            </Text>
            <Space wrap size={[8, 8]}>
              {schedules.slice(0, 4).map((s: any) => (
                <Tag key={s.id} color="orange" style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12 }}>
                  <strong>{s.title}</strong> • {dayjs(s.event_date).format('DD MMM')} ({s.start_time || 'All Day'}) {s.yajman_name && `• Sponsor: ${s.yajman_name}`}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Spin>
    </Card>
  );
};
