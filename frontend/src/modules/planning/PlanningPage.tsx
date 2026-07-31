import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Select, Tabs, Table, Button, Tag, Space,
  Modal, Form, Input, InputNumber, DatePicker, App, Progress,
  Statistic, Badge, Popconfirm, Grid, QRCode, Radio, Segmented
} from 'antd';
import {
  CalendarOutlined, CheckCircleOutlined, DollarOutlined, UserOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined,
  TeamOutlined, ScheduleOutlined, ProjectOutlined, QrcodeOutlined,
  ShareAltOutlined, CopyOutlined, UnorderedListOutlined, AppstoreOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type {
  FestivalTask,
  FestivalBudgetAllocation,
  VolunteerShift,
  FestivalEventSchedule
} from '../../api/services';
import {
  getFestivals,
  getPlanningSummary,
  getFestivalTasks, createFestivalTask, updateFestivalTask, deleteFestivalTask,
  getFestivalBudgets, createFestivalBudget, updateFestivalBudget, deleteFestivalBudget,
  getVolunteerShifts, createVolunteerShift, updateVolunteerShift, deleteVolunteerShift,
  getEventSchedules, createEventSchedule, updateEventSchedule, deleteEventSchedule,
  getUsers
} from '../../api/services';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

const EVENT_TYPE_TAGS: Record<string, { label: string; color: string; icon: string }> = {
  aarti: { label: 'Aarti', color: 'orange', icon: '🪔' },
  pooja: { label: 'Special Pooja', color: 'gold', icon: '🌸' },
  cultural: { label: 'Cultural Program', color: 'purple', icon: '🎭' },
  blood_donation: { label: 'Social Drive', color: 'red', icon: '🩸' },
  annoutsav: { label: 'Mahaprasad', color: 'green', icon: '🍲' },
  other: { label: 'Event', color: 'blue', icon: '🎪' },
};

const PlanningPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('tasks');

  // Modals visibility
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<FestivalTask | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [editingBudget, setEditingBudget] = useState<FestivalBudgetAllocation | null>(null);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<VolunteerShift | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<FestivalEventSchedule | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(isMobile ? 'grid' : 'table');

  // Separate forms for each modal
  const [taskForm] = Form.useForm();
  const [budgetForm] = Form.useForm();
  const [shiftForm] = Form.useForm();
  const [scheduleForm] = Form.useForm();

  // Queries
  const { data: festivals = [] } = useQuery<any[]>({
    queryKey: ['festivals'],
    queryFn: () => getFestivals(),
  });

  // Auto select first active festival if none selected
  React.useEffect(() => {
    if (!selectedFestivalId && festivals.length > 0) {
      setSelectedFestivalId(festivals[0].id);
    }
  }, [festivals, selectedFestivalId]);

  // Sync form fields when editing modals open
  React.useEffect(() => {
    if (isTaskModalOpen) {
      if (editingTask) {
        taskForm.setFieldsValue({
          ...editingTask,
          due_date: editingTask.due_date ? dayjs(editingTask.due_date) : undefined,
        });
      }
    }
  }, [isTaskModalOpen, editingTask, taskForm]);

  React.useEffect(() => {
    if (isBudgetModalOpen) {
      if (editingBudget) {
        budgetForm.setFieldsValue(editingBudget);
      }
    }
  }, [isBudgetModalOpen, editingBudget, budgetForm]);

  React.useEffect(() => {
    if (isShiftModalOpen) {
      if (editingShift) {
        shiftForm.setFieldsValue({
          ...editingShift,
          time_range: editingShift.start_time && editingShift.end_time ? [dayjs(editingShift.start_time), dayjs(editingShift.end_time)] : undefined,
        });
      }
    }
  }, [isShiftModalOpen, editingShift, shiftForm]);

  React.useEffect(() => {
    if (isScheduleModalOpen) {
      if (editingSchedule) {
        scheduleForm.setFieldsValue({
          title: editingSchedule.title,
          event_type: editingSchedule.event_type,
          event_date: editingSchedule.event_date ? dayjs(editingSchedule.event_date) : undefined,
          start_time: editingSchedule.start_time,
          location: editingSchedule.location,
          yajman_name: editingSchedule.yajman_name,
          description: editingSchedule.description,
        });
      }
    }
  }, [isScheduleModalOpen, editingSchedule, scheduleForm]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: summary } = useQuery({
    queryKey: ['planning-summary', selectedFestivalId],
    queryFn: () => getPlanningSummary(selectedFestivalId),
    enabled: !!selectedFestivalId,
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['festival-tasks', selectedFestivalId],
    queryFn: () => getFestivalTasks({ festival_id: selectedFestivalId }),
    enabled: !!selectedFestivalId,
  });

  const { data: budgets = [], isLoading: isBudgetsLoading } = useQuery({
    queryKey: ['festival-budgets', selectedFestivalId],
    queryFn: () => getFestivalBudgets(selectedFestivalId),
    enabled: !!selectedFestivalId,
  });

  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery({
    queryKey: ['volunteer-shifts', selectedFestivalId],
    queryFn: () => getVolunteerShifts({ festival_id: selectedFestivalId }),
    enabled: !!selectedFestivalId,
  });

  const { data: schedules = [], isLoading: isSchedulesLoading } = useQuery({
    queryKey: ['event-schedules', selectedFestivalId],
    queryFn: () => getEventSchedules({ festival_id: selectedFestivalId }),
    enabled: !!selectedFestivalId,
  });

  // Task Mutations
  const taskMutation = useMutation({
    mutationFn: (values: any) =>
      editingTask
        ? updateFestivalTask(editingTask.id, values)
        : createFestivalTask({ ...values, festival_id: selectedFestivalId }),
    onSuccess: () => {
      message.success(`Task ${editingTask ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['festival-tasks', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Operation failed'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteFestivalTask,
    onSuccess: () => {
      message.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['festival-tasks', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
    },
  });

  // Budget Mutations
  const budgetMutation = useMutation({
    mutationFn: (values: any) =>
      editingBudget
        ? updateFestivalBudget(editingBudget.id, values)
        : createFestivalBudget({ ...values, festival_id: selectedFestivalId }),
    onSuccess: () => {
      message.success(`Category budget ${editingBudget ? 'updated' : 'allocated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['festival-budgets', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
      setIsBudgetModalOpen(false);
      setEditingBudget(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Operation failed'),
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: deleteFestivalBudget,
    onSuccess: () => {
      message.success('Category budget allocation deleted');
      queryClient.invalidateQueries({ queryKey: ['festival-budgets', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
    },
  });

  // Shift Mutations
  const shiftMutation = useMutation({
    mutationFn: (values: any) =>
      editingShift
        ? updateVolunteerShift(editingShift.id, values)
        : createVolunteerShift({ ...values, festival_id: selectedFestivalId }),
    onSuccess: () => {
      message.success(`Volunteer shift ${editingShift ? 'updated' : 'scheduled'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['volunteer-shifts', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
      setIsShiftModalOpen(false);
      setEditingShift(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Operation failed'),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteVolunteerShift,
    onSuccess: () => {
      message.success('Volunteer shift deleted');
      queryClient.invalidateQueries({ queryKey: ['volunteer-shifts', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
    },
  });

  // Schedule Mutations
  const scheduleMutation = useMutation({
    mutationFn: (values: any) =>
      editingSchedule
        ? updateEventSchedule(editingSchedule.id, values)
        : createEventSchedule({ ...values, festival_id: selectedFestivalId }),
    onSuccess: () => {
      message.success(`Event schedule ${editingSchedule ? 'updated' : 'added'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['event-schedules', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
      setIsScheduleModalOpen(false);
      setEditingSchedule(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Operation failed'),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteEventSchedule,
    onSuccess: () => {
      message.success('Event schedule deleted');
      queryClient.invalidateQueries({ queryKey: ['event-schedules', selectedFestivalId] });
      queryClient.invalidateQueries({ queryKey: ['planning-summary', selectedFestivalId] });
    },
  });

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Page Header Bar (Ultra Responsive) ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 12 : 16,
        marginBottom: 20
      }}>
        <div>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: '#0B2347', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProjectOutlined style={{ color: '#F97316' }} /> Festival Planning & Execution
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14, display: 'block', marginTop: 2 }}>
            Coordinate pre-event setup tasks, category budget allocations, volunteer shifts, and daily ritual schedules.
          </Text>
        </div>

        {/* Festival Selector Block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: isMobile ? '100%' : 'auto' }}>
          <Text strong style={{ color: '#0B2347', fontSize: 13, whiteSpace: 'nowrap' }}>Select Festival:</Text>
          <Select
            value={selectedFestivalId}
            onChange={setSelectedFestivalId}
            style={{ width: isMobile ? '100%' : 280 }}
            size={isMobile ? 'middle' : 'large'}
            placeholder="Select a festival"
          >
            {festivals.map((f: any) => (
              <Option key={f.id} value={f.id}>
                {f.name} ({dayjs(f.start_date).format('MMM YYYY')})
              </Option>
            ))}
          </Select>
        </div>
      </div>

      {/* ── Summary Cards Bar (Compact Responsive Grid) ── */}
      {summary && (
        <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={12} md={6}>
            <Card
              style={{ borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', borderLeft: '4px solid #F97316' }}
              styles={{ body: { padding: isMobile ? '10px 12px' : '16px' } }}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}><CheckCircleOutlined /> Tasks</Text>}
                value={summary.completed_tasks}
                suffix={`/ ${summary.total_tasks}`}
                styles={{ content: { color: '#0B2347', fontWeight: 'bold', fontSize: isMobile ? 18 : 22 } }}
              />
              <Progress
                percent={summary.task_completion_percentage}
                size="small"
                strokeColor="#F97316"
                style={{ marginTop: 4 }}
              />
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card
              style={{ borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', borderLeft: '4px solid #10B981' }}
              styles={{ body: { padding: isMobile ? '10px 12px' : '16px' } }}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}><DollarOutlined /> Spend</Text>}
                value={summary.total_spent_budget}
                prefix="₹ "
                precision={0}
                styles={{ content: { color: '#0B2347', fontWeight: 'bold', fontSize: isMobile ? 18 : 22 } }}
              />
              <Text type="secondary" style={{ fontSize: 10, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Allocated: ₹ {summary.total_allocated_budget.toLocaleString()}
              </Text>
              <Progress
                percent={summary.budget_utilization_percentage}
                size="small"
                strokeColor={summary.budget_utilization_percentage > 90 ? '#EF4444' : '#10B981'}
                style={{ marginTop: 2 }}
              />
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card
              style={{ borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', borderLeft: '4px solid #3B82F6' }}
              styles={{ body: { padding: isMobile ? '10px 12px' : '16px' } }}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}><TeamOutlined /> Shifts</Text>}
                value={summary.filled_shifts}
                suffix={`/ ${summary.total_shifts}`}
                styles={{ content: { color: '#0B2347', fontWeight: 'bold', fontSize: isMobile ? 18 : 22 } }}
              />
              <Progress
                percent={summary.total_shifts > 0 ? Math.round((summary.filled_shifts / summary.total_shifts) * 100) : 0}
                size="small"
                strokeColor="#3B82F6"
                style={{ marginTop: 4 }}
              />
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card
              style={{ borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', borderLeft: '4px solid #8B5CF6' }}
              styles={{ body: { padding: isMobile ? '10px 12px' : '16px' } }}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}><ScheduleOutlined /> Events</Text>}
                value={summary.total_events}
                suffix="Program(s)"
                styles={{ content: { color: '#0B2347', fontWeight: 'bold', fontSize: isMobile ? 18 : 22 } }}
              />
              <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block' }}>
                Aarti & Cultural
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── Main Tabbed Suite Interface ── */}
      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: isMobile ? '12px 8px' : '24px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="line"
          size={isMobile ? 'small' : 'middle'}
          tabBarGutter={isMobile ? 8 : 24}
          items={[
            {
              key: 'tasks',
              label: <span><CheckCircleOutlined /> Tasks ({tasks.length})</span>,
              children: (
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    marginBottom: 16,
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Operational Tasks</Title>
                      <Radio.Group
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                        buttonStyle="solid"
                        size="small"
                      >
                        <Radio.Button value="all">All ({tasks.length})</Radio.Button>
                        <Radio.Button value="active">Active Pending</Radio.Button>
                        <Radio.Button value="completed">Completed History 🟢 ({tasks.filter(t => t.status === 'completed').length})</Radio.Button>
                      </Radio.Group>
                    </div>

                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size={isMobile ? 'middle' : 'medium'}
                      style={{ backgroundColor: '#F97316', borderColor: '#F97316', width: isMobile ? '100%' : 'auto' }}
                      onClick={() => {
                        setEditingTask(null);
                        taskForm.resetFields();
                        setIsTaskModalOpen(true);
                      }}
                    >
                      Add Task
                    </Button>
                  </div>

                  <Table
                    dataSource={tasks.filter((t: FestivalTask) => {
                      if (taskFilter === 'active') return t.status !== 'completed' && t.status !== 'cancelled';
                      if (taskFilter === 'completed') return t.status === 'completed';
                      return true;
                    })}
                    rowKey="id"
                    loading={isTasksLoading}
                    pagination={{ pageSize: 8, size: 'small' }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    columns={[
                      {
                        title: 'Task Title',
                        dataIndex: 'title',
                        key: 'title',
                        render: (text, record: FestivalTask) => (
                          <div>
                            <Text strong style={{ textDecoration: record.status === 'completed' ? 'line-through' : 'none' }}>
                              {text}
                            </Text>
                            {record.description && (
                              <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }} ellipsis={{ rows: 1 }}>
                                {record.description}
                              </Paragraph>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Category',
                        dataIndex: 'category',
                        key: 'category',
                        render: (cat) => <Tag color="blue">{cat}</Tag>,
                      },
                      {
                        title: 'Priority',
                        dataIndex: 'priority',
                        key: 'priority',
                        render: (p) => <Tag color={PRIORITY_COLOR[p]}>{p.toUpperCase()}</Tag>,
                      },
                      {
                        title: 'Assigned To',
                        dataIndex: 'assigned_to_name',
                        key: 'assigned_to_name',
                        render: (name) => name ? <Badge status="processing" text={name} /> : <Text type="secondary">Unassigned</Text>,
                      },
                      {
                        title: 'Due Date',
                        dataIndex: 'due_date',
                        key: 'due_date',
                        render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '-',
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status, record: FestivalTask) => (
                          <Select
                            value={status}
                            size="small"
                            style={{ width: 120 }}
                            onChange={(newStatus) => taskMutation.mutateAsync({ ...record, status: newStatus })}
                          >
                            <Option value="todo">TODO</Option>
                            <Option value="in_progress">IN PROGRESS</Option>
                            <Option value="completed">COMPLETED</Option>
                            <Option value="cancelled">CANCELLED</Option>
                          </Select>
                        ),
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 90,
                        render: (_, record: FestivalTask) => (
                          <Space>
                            <Button
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => {
                                setEditingTask(record);
                                taskForm.setFieldsValue({
                                  ...record,
                                  due_date: record.due_date ? dayjs(record.due_date) : null,
                                });
                                setIsTaskModalOpen(true);
                              }}
                            />
                            <Popconfirm title="Delete task?" onConfirm={() => deleteTaskMutation.mutate(record.id)}>
                              <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'budgets',
              label: <span><DollarOutlined /> Budgets ({budgets.length})</span>,
              children: (
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    marginBottom: 16,
                    gap: 10
                  }}>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Category Budget Allocations</Title>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ backgroundColor: '#F97316', borderColor: '#F97316', width: isMobile ? '100%' : 'auto' }}
                      onClick={() => {
                        setEditingBudget(null);
                        budgetForm.resetFields();
                        setIsBudgetModalOpen(true);
                      }}
                    >
                      Allocate Budget
                    </Button>
                  </div>

                  <Table
                    dataSource={budgets}
                    rowKey="id"
                    loading={isBudgetsLoading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    columns={[
                      {
                        title: 'Category Head',
                        dataIndex: 'category_name',
                        key: 'category_name',
                        render: (name) => <Text strong style={{ color: '#0B2347' }}>{name}</Text>,
                      },
                      {
                        title: 'Allocated',
                        dataIndex: 'allocated_amount',
                        key: 'allocated_amount',
                        render: (amt) => <Text strong>₹ {amt.toLocaleString()}</Text>,
                      },
                      {
                        title: 'Actual Spent',
                        dataIndex: 'actual_spent',
                        key: 'actual_spent',
                        render: (spent) => <Text style={{ color: '#10B981', fontWeight: 600 }}>₹ {spent.toLocaleString()}</Text>,
                      },
                      {
                        title: 'Utilization',
                        key: 'utilization',
                        render: (_, record: FestivalBudgetAllocation) => {
                          const pct = record.allocated_amount > 0 ? Math.round((record.actual_spent / record.allocated_amount) * 100) : 0;
                          return (
                            <div style={{ width: 130 }}>
                              <Progress
                                percent={pct}
                                size="small"
                                strokeColor={pct > 90 ? '#EF4444' : '#10B981'}
                              />
                            </div>
                          );
                        },
                      },
                      {
                        title: 'Notes',
                        dataIndex: 'notes',
                        key: 'notes',
                        render: (n) => n || '-',
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 90,
                        render: (_, record: FestivalBudgetAllocation) => (
                          <Space>
                            <Button
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => {
                                setEditingBudget(record);
                                budgetForm.setFieldsValue(record);
                                setIsBudgetModalOpen(true);
                              }}
                            />
                            <Popconfirm title="Delete budget?" onConfirm={() => deleteBudgetMutation.mutate(record.id)}>
                              <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'shifts',
              label: <span><TeamOutlined /> Roster ({shifts.length})</span>,
              children: (
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    marginBottom: 16,
                    gap: 10
                  }}>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Volunteer Shifts</Title>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ backgroundColor: '#F97316', borderColor: '#F97316', width: isMobile ? '100%' : 'auto' }}
                      onClick={() => {
                        setEditingShift(null);
                        shiftForm.resetFields();
                        setIsShiftModalOpen(true);
                      }}
                    >
                      Schedule Shift
                    </Button>
                  </div>

                  <Table
                    dataSource={shifts}
                    rowKey="id"
                    loading={isShiftsLoading}
                    pagination={{ pageSize: 8, size: 'small' }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    columns={[
                      {
                        title: 'Shift Name',
                        dataIndex: 'shift_name',
                        key: 'shift_name',
                        render: (name) => <Text strong>{name}</Text>,
                      },
                      {
                        title: 'Duty Zone',
                        dataIndex: 'duty_zone',
                        key: 'duty_zone',
                        render: (zone) => <Tag color="purple">{zone}</Tag>,
                      },
                      {
                        title: 'Time Window',
                        key: 'time',
                        render: (_, record: VolunteerShift) => (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined /> {dayjs(record.start_time).format('DD MMM, HH:mm')} - {dayjs(record.end_time).format('HH:mm')}
                          </Text>
                        ),
                      },
                      {
                        title: 'Assigned Volunteer',
                        dataIndex: 'assigned_user_name',
                        key: 'assigned_user_name',
                        render: (user) => user ? <Tag color="cyan"><UserOutlined /> {user}</Tag> : <Tag color="gold">VACANT</Tag>,
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (s) => <Tag color={s === 'completed' ? 'green' : s === 'scheduled' ? 'blue' : 'default'}>{s.toUpperCase()}</Tag>,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 90,
                        render: (_, record: VolunteerShift) => (
                          <Space>
                            <Button
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => {
                                setEditingShift(record);
                                shiftForm.setFieldsValue({
                                  ...record,
                                  time_range: [dayjs(record.start_time), dayjs(record.end_time)],
                                });
                                setIsShiftModalOpen(true);
                              }}
                            />
                            <Popconfirm title="Delete shift?" onConfirm={() => deleteShiftMutation.mutate(record.id)}>
                              <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'schedules',
              label: <span><ScheduleOutlined /> Schedule ({schedules.length})</span>,
              children: (
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    marginBottom: 16,
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Daily Aarti & Events</Title>
                      <Radio.Group
                        value={scheduleFilter}
                        onChange={(e) => setScheduleFilter(e.target.value)}
                        buttonStyle="solid"
                        size="small"
                      >
                        <Radio.Button value="all">All ({schedules.length})</Radio.Button>
                        <Radio.Button value="upcoming">Upcoming Programs</Radio.Button>
                        <Radio.Button value="completed">Completed History 📜 ({schedules.filter(s => dayjs(s.event_date).isBefore(dayjs(), 'day')).length})</Radio.Button>
                      </Radio.Group>
                    </div>

                    <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
                      <Segmented
                        value={viewMode}
                        onChange={(val) => setViewMode(val as 'table' | 'grid')}
                        options={[
                          { value: 'table', icon: <UnorderedListOutlined /> },
                          { value: 'grid', icon: <AppstoreOutlined /> },
                        ]}
                        size="small"
                      />

                      <Button
                        type="default"
                        icon={<QrcodeOutlined />}
                        style={{ borderColor: '#F97316', color: '#F97316', fontWeight: 600 }}
                        onClick={() => setIsQrModalOpen(true)}
                      >
                        QR Code & Public Link 🔗
                      </Button>

                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        style={{ backgroundColor: '#F97316', borderColor: '#F97316', width: isMobile ? '100%' : 'auto' }}
                        onClick={() => {
                          setEditingSchedule(null);
                          scheduleForm.resetFields();
                          setIsScheduleModalOpen(true);
                        }}
                      >
                        Add Event Program
                      </Button>
                    </Space>
                  </div>

                  {viewMode === 'grid' ? (
                    <Row gutter={[12, 12]}>
                      {schedules.filter((s: FestivalEventSchedule) => {
                        const isPast = dayjs(s.event_date).isBefore(dayjs(), 'day');
                        if (scheduleFilter === 'upcoming') return !isPast;
                        if (scheduleFilter === 'completed') return isPast;
                        return true;
                      }).map((item: FestivalEventSchedule) => {
                        const tagInfo = EVENT_TYPE_TAGS[item.event_type] || EVENT_TYPE_TAGS.other;
                        const isPast = dayjs(item.event_date).isBefore(dayjs(), 'day');
                        return (
                          <Col xs={24} sm={12} md={8} key={item.id}>
                            <Card
                              size="small"
                              style={{
                                borderRadius: 12,
                                border: isPast ? '1px solid #E2E8F0' : '1px solid #FED7AA',
                                borderLeft: isPast ? '4px solid #94A3B8' : '4px solid #F97316',
                                backgroundColor: isPast ? '#F8FAFC' : '#FFFFFF',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <div>
                                  <Text strong style={{ fontSize: 15, color: isPast ? '#64748B' : '#0B2347' }}>
                                    {tagInfo.icon} {item.title}
                                  </Text>
                                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                    <CalendarOutlined /> {dayjs(item.event_date).format('DD MMM YYYY')} ({item.start_time || 'All Day'})
                                  </div>
                                </div>
                                <Tag color={isPast ? 'default' : tagInfo.color}>{tagInfo.label}</Tag>
                              </div>

                              {item.yajman_name ? (
                                <div style={{ backgroundColor: isPast ? '#F1F5F9' : '#FEF3C7', padding: '5px 8px', borderRadius: 8, margin: '6px 0', border: isPast ? '1px solid #E2E8F0' : '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={{ color: isPast ? '#475569' : '#D97706', fontSize: 12, fontWeight: 700 }}>
                                    👑 Yajman: {item.yajman_name}
                                  </Text>
                                  <Tag color={isPast ? 'default' : 'green'} style={{ margin: 0, fontSize: 10 }}>{isPast ? 'CONCLUDED' : 'BOOKED'}</Tag>
                                </div>
                              ) : isPast ? (
                                <div style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: 6, margin: '6px 0' }}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>✓ Event Concluded</Text>
                                </div>
                              ) : (
                                <div style={{ backgroundColor: '#F8FAFC', padding: '4px 8px', borderRadius: 6, margin: '6px 0', border: '1px dashed #CBD5E1' }}>
                                  <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>✨ Open for Sponsorship</Text>
                                </div>
                              )}

                              {item.description && (
                                <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 8px 0' }} ellipsis={{ rows: 2 }}>
                                  {item.description}
                                </Paragraph>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  <EnvironmentOutlined /> {item.location || 'Main Stage'}
                                </Text>
                                <Space>
                                  <Button
                                    icon={<EditOutlined />}
                                    size="small"
                                    onClick={() => {
                                      setEditingSchedule(item);
                                      setIsScheduleModalOpen(true);
                                    }}
                                  />
                                  <Popconfirm title="Delete event?" onConfirm={() => deleteScheduleMutation.mutate(item.id)}>
                                    <Button icon={<DeleteOutlined />} size="small" danger />
                                  </Popconfirm>
                                </Space>
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                  <Table
                    dataSource={schedules.filter((s: FestivalEventSchedule) => {
                      const isPast = dayjs(s.event_date).isBefore(dayjs(), 'day');
                      if (scheduleFilter === 'upcoming') return !isPast;
                      if (scheduleFilter === 'completed') return isPast;
                      return true;
                    })}
                    rowKey="id"
                    loading={isSchedulesLoading}
                    pagination={{ pageSize: 8, size: 'small' }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    columns={[
                      {
                        title: 'Program Title',
                        dataIndex: 'title',
                        key: 'title',
                        render: (title, record: FestivalEventSchedule) => (
                          <div>
                            <Text strong style={{ color: '#0B2347' }}>
                              {EVENT_TYPE_TAGS[record.event_type]?.icon} {title}
                            </Text>
                            {record.description && (
                              <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                                {record.description}
                              </Paragraph>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Event Type',
                        dataIndex: 'event_type',
                        key: 'event_type',
                        render: (type) => {
                          const tag = EVENT_TYPE_TAGS[type] || EVENT_TYPE_TAGS.other;
                          return <Tag color={tag.color}>{tag.label}</Tag>;
                        },
                      },
                      {
                        title: 'Date & Time',
                        key: 'datetime',
                        render: (_, record: FestivalEventSchedule) => (
                          <Text style={{ fontSize: 12 }}>
                            <CalendarOutlined /> {dayjs(record.event_date).format('DD MMM YYYY')} ({record.start_time || 'All Day'})
                          </Text>
                        ),
                      },
                      {
                        title: 'Yajman / Sponsor',
                        dataIndex: 'yajman_name',
                        key: 'yajman_name',
                        render: (name) => name ? <Text strong style={{ color: '#F97316' }}>{name}</Text> : '-',
                      },
                      {
                        title: 'Location',
                        dataIndex: 'location',
                        key: 'location',
                        render: (loc) => loc || 'Main Stage',
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 90,
                        render: (_, record: FestivalEventSchedule) => (
                          <Space>
                            <Button
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => {
                                setEditingSchedule(record);
                                scheduleForm.setFieldsValue({
                                  ...record,
                                  event_date: dayjs(record.event_date),
                                });
                                setIsScheduleModalOpen(true);
                              }}
                            />
                            <Popconfirm title="Delete event?" onConfirm={() => deleteScheduleMutation.mutate(record.id)}>
                              <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ── Modal 1: Task Modal ── */}
      <Modal
        title={editingTask ? 'Edit Task' : 'Add New Task'}
        open={isTaskModalOpen}
        destroyOnHidden
        width={isMobile ? '95%' : 600}
        onCancel={() => setIsTaskModalOpen(false)}
        onOk={() => {
          taskForm.validateFields().then(values => {
            const formatted = {
              ...values,
              due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
            };
            taskMutation.mutate(formatted);
          });
        }}
        confirmLoading={taskMutation.isPending}
      >
        <Form form={taskForm} layout="vertical" preserve={false}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input placeholder="e.g. Obtain Police & Fire Clearance NOC" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="category" label="Phase / Category" initialValue="General">
                <Select>
                  <Option value="Pre-Festival Setup">Pre-Festival Setup</Option>
                  <Option value="Legal & Approvals">Legal & Approvals</Option>
                  <Option value="Daily Operations">Daily Operations</Option>
                  <Option value="Visarjan & Teardown">Visarjan & Teardown</Option>
                  <Option value="General">General</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="urgent">Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="assigned_to_user_id" label="Assign To User">
                <Select placeholder="Select assignee" allowClear>
                  {users.map((u: any) => (
                    <Option key={u.id} value={u.id}>{u.full_name} ({u.email})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Task Description / Checklist">
            <Input.TextArea rows={3} placeholder="Detailed instructions or reference numbers..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal 2: Budget Allocation Modal ── */}
      <Modal
        title={editingBudget ? 'Edit Category Budget' : 'Allocate Category Budget'}
        open={isBudgetModalOpen}
        destroyOnHidden
        width={isMobile ? '95%' : 600}
        onCancel={() => setIsBudgetModalOpen(false)}
        onOk={() => {
          budgetForm.validateFields().then(values => {
            budgetMutation.mutate(values);
          });
        }}
        confirmLoading={budgetMutation.isPending}
      >
        <Form form={budgetForm} layout="vertical" preserve={false}>
          <Form.Item name="category_name" label="Expense Category Head" rules={[{ required: true, message: 'Category is required' }]}>
            <Select placeholder="Select or type category">
              <Option value="Pandal & Stage Construction">Pandal & Stage Construction</Option>
              <Option value="Sound & Electrical Lighting">Sound & Electrical Lighting</Option>
              <Option value="Mahaprasad & Catering">Mahaprasad & Catering</Option>
              <Option value="Security & Crowd Management">Security & Crowd Management</Option>
              <Option value="Daily Pooja & Flowers">Daily Pooja & Flowers</Option>
              <Option value="Media, Printing & Banners">Media, Printing & Banners</Option>
            </Select>
          </Form.Item>

          <Form.Item name="allocated_amount" label="Allocated Budget Amount (₹)" rules={[{ required: true, message: 'Amount is required' }]}>
            <InputNumber style={{ width: '100%' }} min={0} prefix="₹" placeholder="100000" />
          </Form.Item>

          <Form.Item name="notes" label="Notes / Supplier Scope">
            <Input.TextArea rows={2} placeholder="Included vendor quotes or target limit details..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal 3: Volunteer Shift Modal ── */}
      <Modal
        title={editingShift ? 'Edit Volunteer Shift' : 'Schedule Volunteer Shift'}
        open={isShiftModalOpen}
        destroyOnHidden
        width={isMobile ? '95%' : 600}
        onCancel={() => setIsShiftModalOpen(false)}
        onOk={() => {
          shiftForm.validateFields().then(values => {
            const formatted = {
              shift_name: values.shift_name,
              duty_zone: values.duty_zone,
              assigned_user_id: values.assigned_user_id,
              status: values.status || 'scheduled',
              notes: values.notes,
              start_time: values.time_range[0].toISOString(),
              end_time: values.time_range[1].toISOString(),
            };
            shiftMutation.mutate(formatted);
          });
        }}
        confirmLoading={shiftMutation.isPending}
      >
        <Form form={shiftForm} layout="vertical" preserve={false}>
          <Form.Item name="shift_name" label="Shift Title" rules={[{ required: true, message: 'Shift title required' }]}>
            <Input placeholder="e.g. Morning Aarti Duty Shift" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="duty_zone" label="Duty Zone" initialValue="Main Gate Security">
                <Select>
                  <Option value="Main Gate Security">Main Gate Security</Option>
                  <Option value="VIP Hospitality Stage">VIP Hospitality Stage</Option>
                  <Option value="Mahaprasad Distribution">Mahaprasad Distribution</Option>
                  <Option value="Cash Receipt Counter">Cash Receipt Counter</Option>
                  <Option value="Parking & Traffic Control">Parking & Traffic Control</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="assigned_user_id" label="Assign Volunteer / User">
                <Select placeholder="Select volunteer" allowClear>
                  {users.map((u: any) => (
                    <Option key={u.id} value={u.id}>{u.full_name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="time_range" label="Shift Date & Time Window" rules={[{ required: true, message: 'Time range required' }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>

          <Form.Item name="notes" label="Special Instructions">
            <Input.TextArea rows={2} placeholder="e.g. Wear mandatory volunteer badge & report 15 mins early" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal 4: Event Schedule Modal ── */}
      <Modal
        title={editingSchedule ? 'Edit Event Schedule' : 'Add Event / Aarti Schedule'}
        open={isScheduleModalOpen}
        destroyOnHidden
        width={isMobile ? '95%' : 640}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        afterOpenChange={(open) => {
          if (open && editingSchedule) {
            scheduleForm.setFieldsValue({
              title: editingSchedule.title,
              event_type: editingSchedule.event_type || 'aarti',
              event_date: editingSchedule.event_date ? dayjs(editingSchedule.event_date) : undefined,
              start_time: editingSchedule.start_time || '',
              location: editingSchedule.location || '',
              yajman_name: editingSchedule.yajman_name || '',
              description: editingSchedule.description || '',
            });
          }
        }}
        onOk={() => {
          scheduleForm.validateFields().then(values => {
            const formatted = {
              ...values,
              event_date: values.event_date.format('YYYY-MM-DD'),
            };
            scheduleMutation.mutate(formatted);
          });
        }}
        confirmLoading={scheduleMutation.isPending}
      >
        {/* Quick Title & Category Preset Chips */}
        <div style={{ marginBottom: 16, backgroundColor: '#FFF7ED', padding: '10px 14px', borderRadius: 10, border: '1px solid #FFEDD5' }}>
          <Text strong style={{ fontSize: 12, color: '#C2410C', display: 'block', marginBottom: 6 }}>
            ✨ Quick Preset Shortcuts (One-tap fill):
          </Text>
          <Space wrap size={[6, 6]}>
            <Tag
              color="orange"
              style={{ cursor: 'pointer', borderRadius: 8, padding: '3px 8px' }}
              onClick={() => {
                scheduleForm.setFieldsValue({
                  title: 'Morning Kakad Aarti',
                  event_type: 'aarti',
                  start_time: '07:30 AM',
                });
              }}
            >
              🪔 Morning Aarti (07:30 AM)
            </Tag>

            <Tag
              color="volcano"
              style={{ cursor: 'pointer', borderRadius: 8, padding: '3px 8px' }}
              onClick={() => {
                scheduleForm.setFieldsValue({
                  title: 'Grand Evening Maha Aarti',
                  event_type: 'aarti',
                  start_time: '07:30 PM',
                });
              }}
            >
              🪔 Evening Maha Aarti (07:30 PM)
            </Tag>

            <Tag
              color="green"
              style={{ cursor: 'pointer', borderRadius: 8, padding: '3px 8px' }}
              onClick={() => {
                scheduleForm.setFieldsValue({
                  title: 'Mahaprasad Annoutsav',
                  event_type: 'annoutsav',
                  start_time: '01:00 PM',
                });
              }}
            >
              🍲 Mahaprasad (01:00 PM)
            </Tag>

            <Tag
              color="purple"
              style={{ cursor: 'pointer', borderRadius: 8, padding: '3px 8px' }}
              onClick={() => {
                scheduleForm.setFieldsValue({
                  title: 'Bhakti Sangeet & Cultural Program',
                  event_type: 'cultural',
                  start_time: '08:30 PM',
                });
              }}
            >
              🎭 Cultural Show (08:30 PM)
            </Tag>
          </Space>
        </div>

        <Form
          form={scheduleForm}
          layout="vertical"
          initialValues={editingSchedule ? {
            title: editingSchedule.title,
            event_type: editingSchedule.event_type || 'aarti',
            event_date: editingSchedule.event_date ? dayjs(editingSchedule.event_date) : undefined,
            start_time: editingSchedule.start_time || '',
            location: editingSchedule.location || '',
            yajman_name: editingSchedule.yajman_name || '',
            description: editingSchedule.description || '',
          } : { event_type: 'aarti' }}
        >
          <Form.Item name="title" label="Program / Aarti Title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input placeholder="e.g. Grand Evening Maha Aarti" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="event_type" label="Program Type" initialValue="aarti">
                <Select>
                  <Option value="aarti">🪔 Aarti</Option>
                  <Option value="pooja">🌸 Special Pooja</Option>
                  <Option value="cultural">🎭 Cultural Show</Option>
                  <Option value="annoutsav">🍲 Mahaprasad</Option>
                  <Option value="blood_donation">🩸 Social Drive</Option>
                  <Option value="other">📌 Other Event</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="event_date" label="Event Date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="start_time" label="Start Time (e.g. 07:30 PM)">
                <Input placeholder="07:30 PM" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 4, marginTop: -12, marginBottom: 12 }}>
                {['07:30 AM', '01:00 PM', '07:30 PM', '10:00 PM'].map((t) => (
                  <Tag
                    key={t}
                    style={{ cursor: 'pointer', fontSize: 10 }}
                    onClick={() => scheduleForm.setFieldValue('start_time', t)}
                  >
                    {t}
                  </Tag>
                ))}
              </div>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="location" label="Location / Venue Stage">
                <Input placeholder="e.g. Main Aarti Mandap / Stage 1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="yajman_name" label="Yajman / Sponsor Name">
            <Input placeholder="e.g. Shri Ramesh Patil & Family (Leave blank if open for public sponsorship)" />
          </Form.Item>

          <Form.Item name="description" label="Description / Highlights">
            <Input.TextArea rows={2} placeholder="e.g. Orchestra performance by local artists / Dhol Tasha Pathak..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal 5: Public Schedule QR Code & Share Modal ── */}
      <Modal
        title="Public Festival Event Schedule & QR Code"
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => {
            const publicUrl = `${window.location.origin}/public/schedule/${selectedFestivalId}`;
            navigator.clipboard.writeText(publicUrl);
            message.success('Public Link copied!');
          }}>
            Copy Link
          </Button>,
          <Button key="whatsapp" icon={<ShareAltOutlined />} style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#FFF' }} onClick={() => {
            const publicUrl = `${window.location.origin}/public/schedule/${selectedFestivalId}`;
            const text = `🪔 *Festival Event & Aarti Schedule*\nCheck today's Aarti times & live events:\n${publicUrl}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
          }}>
            Share WhatsApp
          </Button>,
          <Button key="open" type="primary" style={{ backgroundColor: '#F97316', borderColor: '#F97316' }} onClick={() => {
            const publicUrl = `${window.location.origin}/public/schedule/${selectedFestivalId}`;
            window.open(publicUrl, '_blank');
          }}>
            Open Page 🔗
          </Button>,
        ]}
        width={480}
        destroyOnHidden
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
            Scan or print this QR code for entrance posters, banners, or WhatsApp announcements so devotees can track daily Aarti times and events.
          </Paragraph>

          <div style={{ display: 'inline-block', padding: 16, borderRadius: 16, backgroundColor: '#FFF', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', marginBottom: 16 }}>
            <QRCode
              value={`${window.location.origin}/public/schedule/${selectedFestivalId}`}
              size={200}
            />
          </div>

          <Text copyable style={{ fontSize: 12, color: '#0B2347', display: 'block', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: 8 }}>
            {`${window.location.origin}/public/schedule/${selectedFestivalId}`}
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default PlanningPage;
