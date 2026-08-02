import React, { useState } from 'react';
import { Modal, Table, Button, Tag, Space, Form, Input, InputNumber, Typography, App, Tooltip, Popconfirm, Select, DatePicker } from 'antd';
import { PlusOutlined, CheckCircleOutlined, UserOutlined, TrophyOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTaskStore, type EventTask } from '../../store/taskStore';

const { Text } = Typography;
const { Option } = Select;

export type { EventTask };

interface Props {
  open: boolean;
  onClose: () => void;
  festival: any | null;
}

const FestivalTasksModal: React.FC<Props> = ({ open, onClose, festival }) => {
  const { message } = App.useApp();
  const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
  const festivalTasks = tasks.filter(t => t.festival_id === festival?.id);
  
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [form] = Form.useForm();

  if (!festival) return null;

  const handleAcceptTask = (taskId: string) => {
    updateTask(taskId, { status: 'accepted' });
    message.success('Task completion accepted & approved by Admin!');
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
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
      updateTask(editingTask.id, {
        task_name: values.task_name,
        assigned_to_name: values.assigned_to_name,
        budget_allocated: Number(values.budget_allocated || 0),
        due_date: formattedDueDate,
        status: values.status || editingTask.status,
        notes: values.notes,
      });
      message.success('Assigned task updated successfully!');
    } else {
      // Create new task
      const newTask: EventTask = {
        id: `task-${Date.now()}`,
        festival_id: festival.id,
        task_name: values.task_name,
        assigned_to_name: values.assigned_to_name,
        budget_allocated: Number(values.budget_allocated || 0),
        due_date: formattedDueDate,
        status: values.status || 'assigned',
        notes: values.notes,
      };
      addTask(newTask);
      message.success('New sub-task planned and member assigned!');
    }

    setIsAddTaskOpen(false);
    setEditingTask(null);
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
                className="animated-btn"
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
      className="glass-modal"
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingRight: 32 }}>
          <TrophyOutlined style={{ color: '#F97316', marginTop: 4 }} />
          <span className="gradient-text-orange" style={{ lineHeight: 1.4, wordBreak: 'break-word', fontWeight: 800 }}>
            Festival Task Planning & Member Assignments — {festival.name}
          </span>
        </div>
      }
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
      ]}
    >
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ flex: '1 1 250px', lineHeight: 1.5 }}>
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
          className="animated-btn"
          style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
        >
          Assign Member & Task
        </Button>
      </div>

      <Table
        className="custom-table"
        dataSource={festivalTasks}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 750 }}
      />

      {/* Add / Edit Task Modal */}
      <Modal
        title={<span className="gradient-text" style={{ fontSize: 16, fontWeight: 800 }}>{editingTask ? "Edit Assigned Task & Member" : "Assign Event Task to Committee Member"}</span>}
        open={isAddTaskOpen}
        onCancel={() => {
          setIsAddTaskOpen(false);
          setEditingTask(null);
        }}
        footer={null}
        forceRender
        className="glass-modal"
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

          <Form.Item name="budget_allocated" label="Allocated Budget (₹)">
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
              <Button type="primary" htmlType="submit" className="animated-btn" style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
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
