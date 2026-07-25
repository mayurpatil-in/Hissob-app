import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  DatePicker, Card, Row, Col, Typography, App, Select
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, StarOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinancialYears, createFinancialYear, setFYActive, getFestivals, createFestival } from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

const FinancialYearPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isFyModalOpen, setIsFyModalOpen] = useState(false);
  const [isFestModalOpen, setIsFestModalOpen] = useState(false);

  const [fyForm] = Form.useForm();
  const [festForm] = Form.useForm();

  const { data: fiscalYears = [], isLoading: isFyLoading } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

  const { data: festivals = [], isLoading: isFestLoading } = useQuery({
    queryKey: ['festivals'],
    queryFn: () => getFestivals(),
  });

  const fyMutation = useMutation({
    mutationFn: createFinancialYear,
    onSuccess: () => {
      message.success('Financial Year created!');
      setIsFyModalOpen(false);
      fyForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['financialYears'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create Financial Year');
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: setFYActive,
    onSuccess: () => {
      message.success('Active Financial Year updated!');
      queryClient.invalidateQueries({ queryKey: ['financialYears'] });
    },
  });

  const festivalMutation = useMutation({
    mutationFn: createFestival,
    onSuccess: () => {
      message.success('Festival created!');
      setIsFestModalOpen(false);
      festForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create Festival');
    },
  });

  const handleFySubmit = (values: any) => {
    fyMutation.mutate({
      ...values,
      start_date: values.date_range[0].format('YYYY-MM-DD'),
      end_date: values.date_range[1].format('YYYY-MM-DD'),
    });
  };

  const handleFestSubmit = (values: any) => {
    festivalMutation.mutate({
      ...values,
      start_date: values.date_range[0].format('YYYY-MM-DD'),
      end_date: values.date_range[1].format('YYYY-MM-DD'),
    });
  };

  const fyColumns = [
    { title: 'Fiscal Year', dataIndex: 'name', key: 'name', render: (t: string, r: any) => <b>{t} {r.is_current && <Tag color="gold">ACTIVE</Tag>}</b> },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date' },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date' },
    {
      title: 'Opening Balance (₹)',
      dataIndex: 'opening_balance',
      key: 'opening_balance',
      render: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}`,
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (st: string) => <Tag color={st === 'active' ? 'green' : 'blue'}>{st.toUpperCase()}</Tag> },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: any) => !r.is_current && (
        <Button size="small" icon={<StarOutlined />} onClick={() => setActiveMutation.mutate(r.id)}>
          Set Active
        </Button>
      ),
    },
  ];

  const festColumns = [
    { title: 'Festival Name', dataIndex: 'name', key: 'name', render: (t: string) => <b>{t}</b> },
    { title: 'Deity / Entity', dataIndex: 'deity', key: 'deity', render: (d: string) => d || 'N/A' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date' },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date' },
    {
      title: 'Budget (₹)',
      dataIndex: 'budget',
      key: 'budget',
      render: (b: number) => <span style={{ fontWeight: 700, color: '#F97316' }}>₹ {Number(b || 0).toLocaleString('en-IN')}</span>,
    },
  ];

  return (
    <div className="financial-year-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Financial Years & Festivals</Title>
          <Text type="secondary">Manage accounting cycles and setup festival event budgets</Text>
        </div>
        <Space>
          <Button icon={<CalendarOutlined />} onClick={() => setIsFyModalOpen(true)}>
            Add Financial Year
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsFestModalOpen(true)}
            style={{ background: '#F97316', borderColor: '#F97316' }}
          >
            Create Festival
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Financial Years" className="hissob-card">
            <Table dataSource={fiscalYears} columns={fyColumns} rowKey="id" loading={isFyLoading} pagination={false} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Festivals Directory" className="hissob-card">
            <Table dataSource={festivals} columns={festColumns} rowKey="id" loading={isFestLoading} pagination={false} />
          </Card>
        </Col>
      </Row>

      {/* Add FY Modal */}
      <Modal title="Add Financial Year" open={isFyModalOpen} onCancel={() => setIsFyModalOpen(false)} footer={null} destroyOnHidden>
        <Form form={fyForm} layout="vertical" onFinish={handleFySubmit} initialValues={{ opening_balance: 0 }}>
          <Form.Item name="name" label="Financial Year Name" rules={[{ required: true, message: 'e.g. 2025-26' }]}>
            <Input placeholder="e.g. 2025-26" />
          </Form.Item>
          <Form.Item name="date_range" label="Duration (Start & End Date)" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="opening_balance" label="Opening Cash Balance (₹)">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsFyModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={fyMutation.isPending} style={{ background: '#F97316' }}>Create FY</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Festival Modal */}
      <Modal title="Create Festival" open={isFestModalOpen} onCancel={() => setIsFestModalOpen(false)} footer={null} destroyOnHidden>
        <Form form={festForm} layout="vertical" onFinish={handleFestSubmit}>
          <Form.Item name="financial_year_id" label="Financial Year" rules={[{ required: true }]}>
            <Select placeholder="Select Financial Year">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>{fy.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Festival Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Ganesh Utsav 2025" />
          </Form.Item>
          <Form.Item name="deity" label="Deity / Entity">
            <Input placeholder="e.g. Lord Ganesha" />
          </Form.Item>
          <Form.Item name="date_range" label="Festival Duration" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="budget" label="Festival Budget (₹)">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Target Budget" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsFestModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={festivalMutation.isPending} style={{ background: '#F97316' }}>Create Festival</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FinancialYearPage;
