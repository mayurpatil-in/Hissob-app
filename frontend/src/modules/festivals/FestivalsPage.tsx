import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  Select, DatePicker, Card, Row, Col, Typography, App, Tooltip
} from 'antd';
import {
  PlusOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFestivals, createFestival, getFinancialYears } from '../../api/services';
import FestivalTasksModal from './FestivalTasksModal';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  planning: { color: 'gold', label: 'PLANNING' },
  active: { color: 'green', label: 'ACTIVE' },
  completed: { color: 'blue', label: 'COMPLETED' },
  closed: { color: 'default', label: 'CLOSED' },
};

const FestivalsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFy, setSelectedFy] = useState<string | undefined>(undefined);
  const [selectedTasksFestival, setSelectedTasksFestival] = useState<any | null>(null);

  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

  const { data: festivals = [], isLoading } = useQuery({
    queryKey: ['festivals', selectedFy],
    queryFn: () => getFestivals(selectedFy),
  });

  const createMutation = useMutation({
    mutationFn: createFestival,
    onSuccess: () => {
      message.success('Festival created successfully!');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create festival');
    },
  });

  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      start_date: values.date_range[0].format('YYYY-MM-DD'),
      end_date: values.date_range[1].format('YYYY-MM-DD'),
    });
  };

  const totalBudget = festivals.reduce((acc: number, f: any) => acc + Number(f.budget || 0), 0);

  const columns = [
    {
      title: 'Festival Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <b>{name}</b>,
    },
    {
      title: 'Deity / Entity',
      dataIndex: 'deity',
      key: 'deity',
      render: (d: string) => d ? <Tag color="orange">{d}</Tag> : 'N/A',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string) => loc || 'Main Mandap',
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, r: any) => `${r.start_date} to ${r.end_date}`,
    },
    {
      title: 'Target Budget (₹)',
      dataIndex: 'budget',
      key: 'budget',
      render: (b: number) => <span style={{ fontWeight: 700, color: '#F97316' }}>₹ {Number(b || 0).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const tag = STATUS_TAGS[st] || { color: 'processing', label: st?.toUpperCase() || 'ACTIVE' };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Tooltip title="Manage Event Tasks & Member Assignments">
          <Button
            type="primary"
            icon={<UnorderedListOutlined />}
            size="small"
            style={{ background: '#0B2347', borderColor: '#0B2347', borderRadius: 6, fontWeight: 600 }}
            onClick={() => setSelectedTasksFestival(record)}
          >
            Plan Tasks & Assign
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="festivals-module animate-fadeIn">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Festival Management</Title>
          <Text type="secondary">Setup event mandates, deity details, duration, and target budgets</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#F97316', borderColor: '#F97316' }}
        >
          Create New Festival
        </Button>
      </div>

      {/* ── Summary Stats ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Total Festivals</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347' }}>{festivals.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Active Festivals</Text>
            <Title level={3} style={{ margin: 0, color: '#22C55E' }}>
              {festivals.filter((f: any) => f.status === 'active' || f.is_active).length}
            </Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card">
            <Text type="secondary">Total Combined Budget</Text>
            <Title level={3} style={{ margin: 0, color: '#F97316' }}>₹ {totalBudget.toLocaleString('en-IN')}</Title>
          </Card>
        </Col>
      </Row>

      {/* ── Data Table Card ── */}
      <Card className="hissob-card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Select
            placeholder="Filter by Financial Year"
            allowClear
            style={{ width: 220 }}
            onChange={(val) => setSelectedFy(val)}
          >
            {fiscalYears.map((fy: any) => (
              <Option key={fy.id} value={fy.id}>{fy.name}</Option>
            ))}
          </Select>
        </div>

        <Table
          dataSource={festivals}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* ── Create Festival Modal ── */}
      <Modal
        title="Create New Festival Event"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="financial_year_id"
            label="Financial Year"
            rules={[{ required: true, message: 'Select Financial Year' }]}
          >
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name} {fy.is_current ? '(Active)' : ''}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Festival Name"
            rules={[{ required: true, message: 'e.g. Ganesh Utsav 2025' }]}
          >
            <Input placeholder="e.g. Ganesh Utsav 2025" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deity" label="Deity / Entity">
                <Input placeholder="e.g. Lord Ganesha" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location / Mandap">
                <Input placeholder="e.g. Main Chowk Mandap" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="date_range"
            label="Festival Duration (Start & End Date)"
            rules={[{ required: true, message: 'Select duration' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="budget" label="Target Budget (₹)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 500000" />
          </Form.Item>

          <Form.Item name="description" label="Description / Notes">
            <Input.TextArea rows={2} placeholder="Event notes or vendor guidelines" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Save Festival
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Festival Event Tasks & Assignments Modal ── */}
      <FestivalTasksModal
        open={Boolean(selectedTasksFestival)}
        onClose={() => setSelectedTasksFestival(null)}
        festival={selectedTasksFestival}
      />
    </div>
  );
};

export default FestivalsPage;
