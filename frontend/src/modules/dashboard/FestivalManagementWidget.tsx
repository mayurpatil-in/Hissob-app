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
import FestivalTasksModal, { type EventTask } from '../festivals/FestivalTasksModal';

const { Title, Text } = Typography;

interface Props {
  selectedFyId?: string;
}

const DASHBOARD_PLANNED_TASKS: EventTask[] = [
  {
    id: 'dt-1',
    task_name: 'Mandap Setup & Electrical Illumination',
    assigned_to_name: 'Vinay (Collector)',
    budget_allocated: 15000,
    due_date: '2026-08-20',
    status: 'in_progress',
    notes: 'Main pandal bamboo setup and lighting',
  },
  {
    id: 'dt-2',
    task_name: 'Maha Prasad & Catering Arrangement',
    assigned_to_name: 'Suresh (Treasurer)',
    budget_allocated: 25000,
    due_date: '2026-08-25',
    status: 'accepted',
    notes: 'Prasad boxes for 500 devotees',
  },
  {
    id: 'dt-3',
    task_name: 'Pooja Samagri & Daily Flower Procurement',
    assigned_to_name: 'Ramesh Shah (VIP Member)',
    budget_allocated: 8000,
    due_date: '2026-08-24',
    status: 'completed',
    notes: 'Garlands and daily pooja materials',
  },
];

const DEFAULT_FESTIVAL_CAMPAIGN: Festival = {
  id: 'fest-default-1',
  financial_year_id: 'default',
  name: 'Ganesh Utsav 2026',
  deity: 'Lord Ganesha',
  location: 'Main Mandap Chowk',
  start_date: '2026-08-15',
  end_date: '2026-08-26',
  budget: 500000,
  status: 'active',
};

const FestivalManagementWidget: React.FC<Props> = ({ selectedFyId }) => {
  const navigate = useNavigate();
  const { user, can } = useAuthStore();
  const canManage = user?.is_super_admin || can('festivals', 'create');

  const [tasks] = useState<EventTask[]>(DASHBOARD_PLANNED_TASKS);
  const [selectedFestivalForModal, setSelectedFestivalForModal] = useState<any | null>(null);

  const { data: fetchedFestivals = [], isLoading } = useQuery({
    queryKey: ['festivals', selectedFyId],
    queryFn: () => getFestivals(selectedFyId),
  });

  const displayFestivals = fetchedFestivals.length > 0 ? fetchedFestivals : [DEFAULT_FESTIVAL_CAMPAIGN];
  const activeFest = displayFestivals[0];

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
          <span style={{ fontSize: 13, color: '#0B2347', whiteSpace: 'nowrap' }}>
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
          <Title level={4} style={{ margin: 0, color: '#0B2347', fontWeight: 800 }}>
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
        <>
          {/* Top Campaign Cards Grid */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {displayFestivals.map((fest: Festival) => {
              const targetBudget = Number(fest.budget || 500000);
              const mockRaised = Math.round(targetBudget * 0.65);
              const pct = Math.min(100, Math.round((mockRaised / targetBudget) * 100));

              return (
                <Col xs={24} sm={12} key={fest.id}>
                  <div
                    style={{
                      padding: 14,
                      background: '#FFF',
                      borderRadius: 10,
                      border: '1px solid #E4E8F0',
                      boxShadow: '0 2px 8px rgba(11, 35, 71, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#0B2347' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, margin: '10px 0', fontSize: 12, color: '#64748B' }}>
                      <span>
                        <CalendarOutlined style={{ marginRight: 6, color: '#F97316' }} />
                        <b>Dates:</b> {fest.start_date} to {fest.end_date}
                      </span>
                      <Tag color="orange" style={{ borderRadius: 8, fontSize: 11, fontWeight: 700, margin: 0 }}>
                        ⏳ 8 Days Remaining
                      </Tag>
                    </div>

                    <div style={{ margin: '10px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span><TrophyOutlined style={{ color: '#F59E0B' }} /> Raised: <b>₹ {mockRaised.toLocaleString('en-IN')}</b></span>
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
              <span style={{ fontWeight: 800, color: '#0B2347', fontSize: 14 }}>
                <UnorderedListOutlined style={{ color: '#F97316', marginRight: 6 }} />
                Assigned Event Tasks & Target Dates
              </span>
              <Tag color="cyan" style={{ margin: 0 }}>Active: {activeFest.name}</Tag>
            </div>

            <Table
              dataSource={tasks}
              columns={taskColumns}
              rowKey="id"
              pagination={false}
              size="middle"
              scroll={{ x: 600 }}
              style={{ marginTop: 8 }}
            />
          </div>
        </>
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
