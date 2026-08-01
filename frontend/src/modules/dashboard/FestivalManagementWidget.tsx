import React, { useState } from 'react';
import { Card, Row, Col, Typography, Tag, Progress, Button, Space, Spin, Table } from 'antd';
import {
  GlobalOutlined, CalendarOutlined, ArrowRightOutlined, TrophyOutlined,
  PlusOutlined, CheckCircleOutlined, UserOutlined, ClockCircleOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getFestivals, type Festival } from '../../api/services';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import FestivalTasksModal from '../festivals/FestivalTasksModal';

const { Title, Text } = Typography;

interface Props {
  selectedFyId?: string;
}

const FestivalManagementWidget: React.FC<Props> = ({ selectedFyId }) => {
  const navigate = useNavigate();
  const { user, can } = useAuthStore();
  const canManage = user?.is_super_admin || can('festivals', 'create');

  const [selectedFestivalForModal, setSelectedFestivalForModal] = useState<any | null>(null);

  const { data: fetchedFestivals = [], isLoading } = useQuery({
    queryKey: ['festivals', selectedFyId],
    queryFn: () => getFestivals(selectedFyId),
  });

  const displayFestivals = fetchedFestivals;
  const activeFest = displayFestivals[0];
  
  const { tasks } = useTaskStore();
  const festivalTasks = tasks.filter(t => t.festival_id === activeFest?.id);

  const taskColumns = [
    {
      title: 'Planned Event Task',
      dataIndex: 'task_name',
      key: 'task_name',
      width: 180,
      render: (t: string) => <b>{t}</b>,
    },
    {
      title: 'Assigned Member',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      width: 150,
      render: (name: string) => (
        <Tag color="orange" style={{ fontWeight: 600, borderRadius: 10, margin: 0 }}>
          <UserOutlined /> {name}
        </Tag>
      ),
    },
    {
      title: 'Target Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 130,
      render: (d: string) => (
        d ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
            <CalendarOutlined style={{ color: '#F97316', marginRight: 4 }} />
            {d}
          </span>
        ) : <Text type="secondary">N/A</Text>
      ),
    },
    {
      title: 'Budget (₹)',
      dataIndex: 'budget_allocated',
      key: 'budget_allocated',
      width: 110,
      render: (val: number) => <span style={{ fontWeight: 700, color: '#F97316', whiteSpace: 'nowrap' }}>₹ {val.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (st: string) => {
        if (st === 'accepted') return <Tag color="success" icon={<CheckCircleOutlined />}>ACCEPTED & APPROVED</Tag>;
        if (st === 'completed') return <Tag color="processing" icon={<ClockCircleOutlined />}>AWAITING ACCEPTANCE</Tag>;
        if (st === 'in_progress') return <Tag color="warning">IN PROGRESS</Tag>;
        return <Tag color="default">ASSIGNED</Tag>;
      },
    },
  ];

  return (
    <Card className="hissob-card animate-fadeIn" style={{ marginTop: 20 }}>
      {/* Widget Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 800 }}>
            <GlobalOutlined style={{ color: '#F97316', marginRight: 8 }} />
            Festival & Event Task Management
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Track active campaigns, target due dates, and assigned committee member status
          </Text>
        </div>
        {canManage && (
          <Space wrap size="small" style={{ width: '100%', maxWidth: 'fit-content' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setSelectedFestivalForModal(activeFest)}
              style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
            >
              Assign New Task
            </Button>
            <Button
              type="default"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/festivals')}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Manage All Festivals
            </Button>
          </Space>
        )}
      </div>

      <Spin spinning={isLoading}>
        {fetchedFestivals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--color-bg)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎪</div>
            <Title level={5} style={{ margin: 0, color: 'var(--color-text-primary)' }}>No Active Festivals or Event Campaigns</Title>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', margin: '4px 0 16px 0' }}>
              Create your organization's first festival (e.g. Ganesh Utsav, Navratri, Diwali) to track tasks, budgets, and collections.
            </Text>
            {canManage && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/festivals')}
                style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
              >
                Create Festival Campaign
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Top Campaign Cards Grid */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {displayFestivals.map((fest: Festival) => {
                const targetBudget = Number(fest.budget || 0);
                const raisedAmount = Number((fest as any).collected || 0);
                const pct = targetBudget > 0 ? Math.min(100, Math.round((raisedAmount / targetBudget) * 100)) : 0;

                return (
                  <Col xs={24} sm={12} key={fest.id}>
                    <div
                      style={{
                        padding: 14,
                        background: 'var(--color-bg)',
                        borderRadius: 10,
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            🌺 {fest.name}
                          </span>
                          {fest.deity && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              Deity: {fest.deity}
                            </Text>
                          )}
                        </div>
                        <Tag color={fest.status === 'active' ? 'success' : 'processing'} style={{ borderRadius: 10, fontWeight: 700, margin: 0 }}>
                          {fest.status ? fest.status.toUpperCase() : 'ACTIVE'}
                        </Tag>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, margin: '10px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <span>
                          <CalendarOutlined style={{ marginRight: 6, color: '#F97316' }} />
                          <b>Dates:</b> {fest.start_date} to {fest.end_date}
                        </span>
                      </div>

                      <div style={{ margin: '10px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span><TrophyOutlined style={{ color: '#F59E0B' }} /> Raised: <b>₹ {raisedAmount.toLocaleString('en-IN')}</b></span>
                          <span>Target: <b>₹ {targetBudget.toLocaleString('en-IN')}</b></span>
                        </div>
                        <Progress percent={pct} strokeColor="#F97316" size="small" />
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>

            {/* Dashboard Assigned Event Tasks Table */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: 14 }}>
                  <UnorderedListOutlined style={{ color: '#F97316', marginRight: 6 }} />
                  Assigned Event Tasks & Target Dates
                </span>
                {activeFest && <Tag color="cyan" style={{ margin: 0 }}>Active: {activeFest.name}</Tag>}
              </div>

              <Table
                dataSource={festivalTasks}
                columns={taskColumns}
                rowKey="id"
                pagination={false}
                size="middle"
                scroll={{ x: 600 }}
                style={{ marginTop: 8 }}
              />
            </div>
          </>
        )}
      </Spin>

      {/* Task Modal launcher */}
      {canManage && (
        <FestivalTasksModal
          open={Boolean(selectedFestivalForModal)}
          onClose={() => setSelectedFestivalForModal(null)}
          festival={selectedFestivalForModal}
        />
      )}
    </Card>
  );
};

export default FestivalManagementWidget;
