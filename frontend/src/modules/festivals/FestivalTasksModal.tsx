import React, { useState } from 'react';
import { Modal, Table, Button, Tag, Space, Form, Input, InputNumber, Typography, App, Tooltip, Popconfirm, Select, DatePicker } from 'antd';
import { PlusOutlined, CheckCircleOutlined, UserOutlined, TrophyOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

export interface EventTask {
  id: string;
  task_name: string;
  assigned_to_name: string;
  budget_allocated: number;
  due_date?: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'accepted';
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  festival: any | null;
}

const INITIAL_TASKS: Record<string, EventTask[]> = {
  default: [
    {
      id: 'task-1',
      task_name: 'Mandap Setup & Electricals',
      assigned_to_name: 'Vinay (Collector)',
      budget_allocated: 15000,
      due_date: '2026-08-20',
      status: 'in_progress',
      notes: 'Main pandal bamboo setup and lighting',
    },
    {
      id: 'task-2',
      task_name: 'Maha Prasad & Catering Arrangement',
      assigned_to_name: 'Suresh (Treasurer)',
      budget_allocated: 25000,
      due_date: '2026-08-25',
      status: 'accepted',
      notes: 'Prasad boxes for 500 devotees',
    },
    {
      id: 'task-3',
      task_name: 'Pooja Samagri & Flower Decoration',
      assigned_to_name: 'Ramesh Shah (VIP Member)',
      budget_allocated: 8000,
      due_date: '2026-08-24',
      status: 'completed',
      notes: 'Garlands and daily pooja materials',
    },
  ],
};

const FestivalTasksModal: React.FC<Props> = ({ open, onClose, festival }) => {
  const { message } = App.useApp();
  const [tasks, setTasks] = useState<EventTask[]>(INITIAL_TASKS.default);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [form] = Form.useForm();

  if (!festival) return null;

  const handleAcceptTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'accepted' as const } : t))
    );
    message.success('Task completion accepted & approved by Admin!');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    message.success('Assigned task deleted successfully');
  };

  const handleOpenEdit = (task: EventTask) => {
    setEditingTask(task);
    form.setFieldsValue({
      task_name: task.task_name,
      assigned_to_name: task.assigned_to_name,
      budget_allocated: task.budget_allocated,
      due_date: task.due_date ? dayjs(task.due_date) : undefined,
      status: task.status,
      notes: task.notes,
    });
    setIsAddTaskOpen(true);
  };

  const handleFormSubmit = (values: any) => {
    const formattedDueDate = values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined;

    if (editingTask) {
      // Update existing task
      setTasks(prev =>
        prev.map(t =>
          t.id === editingTask.id
            ? {
                ...t,
                task_name: values.task_name,
                assigned_to_name: values.assigned_to_name,
                budget_allocated: Number(values.budget_allocated || 0),
                due_date: formattedDueDate,
                status: values.status || t.status,
                notes: values.notes,
              }
            : t
        )
      );
      message.success('Assigned task updated successfully!');
    } else {
      // Create new task
      const newTask: EventTask = {
        id: `task-${Date.now()}`,
        task_name: values.task_name,
        assigned_to_name: values.assigned_to_name,
        budget_allocated: Number(values.budget_allocated || 0),
        due_date: formattedDueDate,
        status: values.status || 'assigned',
        notes: values.notes,
      };
      setTasks(prev => [newTask, ...prev]);
      message.success('New sub-task planned and member assigned!');
    }

    setIsAddTaskOpen(false);
    setEditingTask(null);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Task / Sub-Event Name',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (t: string) => <b>{t}</b>,
    },
    {
      title: 'Assigned Committee Member',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      render: (name: string) => (
        <Tag color="orange" style={{ fontWeight: 600, borderRadius: 10 }}>
          👤 {name}
        </Tag>
      ),
    },
    {
      title: 'Target Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (d: string) => (
        d ? (
          <span style={{ fontSize: 13, color: '#0B2347' }}>
            <CalendarOutlined style={{ color: '#F97316', marginRight: 4 }} />
            {d}
          </span>
        ) : <Text type="secondary">N/A</Text>
      ),
    },
    {
      title: 'Allocated Budget',
      dataIndex: 'budget_allocated',
      key: 'budget_allocated',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#F97316' }}>₹ {val.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        if (st === 'accepted') return <Tag color="success" icon={<CheckCircleOutlined />}>ACCEPTED & APPROVED</Tag>;
        if (st === 'completed') return <Tag color="processing" icon={<ClockCircleOutlined />}>AWAITING ACCEPTANCE</Tag>;
        if (st === 'in_progress') return <Tag color="warning">IN PROGRESS</Tag>;
        return <Tag color="default">ASSIGNED</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EventTask) => (
        <Space wrap>
          {record.status === 'completed' && (
            <Tooltip title="Accept & Approve Task Completion">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                style={{ background: '#22C55E', borderColor: '#22C55E', borderRadius: 6, fontWeight: 600 }}
                onClick={() => handleAcceptTask(record.id)}
              >
                Accept
              </Button>
            </Tooltip>
          )}

          {/* Edit Button */}
          <Tooltip title="Edit Task & Member Assignment">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>

          {/* Delete Button */}
          <Popconfirm
            title="Delete assigned task?"
            description="Are you sure you want to remove this assigned task?"
            onConfirm={() => handleDeleteTask(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Task">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <TrophyOutlined style={{ color: '#F97316' }} />
          <span>Festival Task Planning & Member Assignments — {festival.name}</span>
        </Space>
      }
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
      ]}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary">
          Assign sub-tasks to committee members, set target due dates, edit or delete tasks
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTask(null);
            form.resetFields();
            setIsAddTaskOpen(true);
          }}
          style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
        >
          Assign Member & Task
        </Button>
      </div>

      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 750 }}
      />

      {/* Add / Edit Task Modal */}
      <Modal
        title={editingTask ? "Edit Assigned Task & Member" : "Assign Event Task to Committee Member"}
        open={isAddTaskOpen}
        onCancel={() => {
          setIsAddTaskOpen(false);
          setEditingTask(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item name="task_name" label="Sub-Task / Activity Name" rules={[{ required: true, message: 'Enter task name' }]}>
            <Input placeholder="e.g. Mandap Lighting & Flower Decoration" />
          </Form.Item>

          <Form.Item name="assigned_to_name" label="Assign Committee Member" rules={[{ required: true, message: 'Select or type assigned member name' }]}>
            <Input placeholder="e.g. Vinay (Collector) or Suresh (Treasurer)" prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item name="due_date" label="Target Due Date">
            <DatePicker style={{ width: '100%' }} placeholder="Select Target Completion Date" />
          </Form.Item>

          <Form.Item name="budget_allocated" label="Allocated Budget (₹)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 15000" />
          </Form.Item>

          <Form.Item name="status" label="Current Task Status">
            <Select placeholder="Select Task Status">
              <Option value="assigned">ASSIGNED</Option>
              <Option value="in_progress">IN PROGRESS</Option>
              <Option value="completed">COMPLETED (Awaiting Acceptance)</Option>
              <Option value="accepted">ACCEPTED & APPROVED</Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Instructions / Notes">
            <Input.TextArea rows={2} placeholder="Optional guidelines for the assigned member" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsAddTaskOpen(false);
                setEditingTask(null);
              }}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
                {editingTask ? "Update Task" : "Save Assignment"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default FestivalTasksModal;
