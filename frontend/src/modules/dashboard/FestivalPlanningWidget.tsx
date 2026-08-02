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
  getFestivalTasks,
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

  const { data: tasks = [] } = useQuery({
    queryKey: ['festival-tasks', selectedFestivalId],
    queryFn: () => getFestivalTasks({ festival_id: selectedFestivalId }),
    enabled: !!selectedFestivalId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['event-schedules', selectedFestivalId],
    queryFn: () => getEventSchedules({ festival_id: selectedFestivalId }),
    enabled: !!selectedFestivalId,
  });

  return (
    <Card
      className="hissob-card"
      style={{
        borderRadius: 14,
        marginTop: 20,
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
            backgroundColor: 'rgba(249,115,22,0.12)',
            color: '#F97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: '1px solid rgba(249,115,22,0.25)',
          }}>
            <ProjectOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
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
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderLeft: '4px solid #F97316',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><CheckCircleOutlined /> Tasks</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0' }}>
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
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderLeft: '4px solid #10B981',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><DollarOutlined /> Budget Spend</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0' }}>
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
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderLeft: '4px solid #3B82F6',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><TeamOutlined /> Shifts Roster</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0' }}>
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
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderLeft: '4px solid #8B5CF6',
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis><ScheduleOutlined /> Events</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0' }}>
                  {summary.total_events} Program(s)
                </div>
                <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px' }}>Daily Aarti & Shows</Tag>
              </div>
            </Col>
          </Row>
        ) : (
          <Text type="secondary">No active festival selected or configured.</Text>
        )}

        {/* Mini Preview of Active Setup Tasks & Ritual Schedule */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
          <Row gutter={[16, 16]}>
            {/* Section 1: Active Tasks Preview */}
            <Col xs={24} md={12}>
              <Text strong style={{ color: 'var(--color-text-primary)', fontSize: 13, marginBottom: 8, display: 'block' }}>
                <CheckCircleOutlined style={{ color: '#F97316' }} /> Mandap Setup & Volunteer Tasks ({tasks.length}):
              </Text>
              {tasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tasks.slice(0, 3).map((t: any) => {
                    const isDone = t.status === 'completed' || t.status === 'done';
                    return (
                      <div
                        key={t.id}
                        style={{
                          backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.04))',
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12
                        }}
                      >
                        <span style={{ color: isDone ? 'var(--color-text-secondary, #94A3B8)' : 'var(--color-text-primary)', textDecoration: isDone ? 'line-through' : 'none', fontWeight: 600 }}>
                          {t.title}
                        </span>
                        <Space size={4}>
                          {t.assigned_to_name && (
                            <Tag color="blue" style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>
                              👤 {t.assigned_to_name}
                            </Tag>
                          )}
                          <Tag color={isDone ? 'success' : t.status === 'in_progress' ? 'processing' : 'warning'} style={{ fontSize: 10, margin: 0, borderRadius: 6, fontWeight: 700 }}>
                            {t.status?.toUpperCase()}
                          </Tag>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>No setup tasks created yet.</Text>
              )}
            </Col>

            {/* Section 2: Ritual Schedule Preview */}
            <Col xs={24} md={12}>
              <Text strong style={{ color: 'var(--color-text-primary)', fontSize: 13, marginBottom: 8, display: 'block' }}>
                <CalendarOutlined style={{ color: '#3B82F6' }} /> Upcoming Programs & Ritual Schedule:
              </Text>
              {schedules.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {schedules.slice(0, 3).map((s: any) => (
                    <div
                      key={s.id}
                      style={{
                        backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.04))',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12
                      }}
                    >
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                        🪔 {s.title}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary, #94A3B8)', fontSize: 11 }}>
                        {dayjs(s.event_date).format('DD MMM')} ({s.start_time || 'All Day'})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>No event programs scheduled yet.</Text>
              )}
            </Col>
          </Row>
        </div>
      </Spin>
    </Card>
  );
};
