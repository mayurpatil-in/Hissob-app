import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, InputNumber,
  DatePicker, Card, Row, Col, Typography, App, Select, Popconfirm
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, StarOutlined, CheckCircleOutlined,
  DollarOutlined, TrophyOutlined, BankOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinancialYears, createFinancialYear, setFYActive, getFestivals, createFestival } from '../../api/services';
import './financial-year.css';

const { Text } = Typography;
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
      message.success('Financial Year created successfully! 🎉');
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
      message.success('Festival Campaign created! 🌺');
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

  const activeFy = fiscalYears.find((fy: any) => fy.is_current);
  const totalBudget = festivals.reduce((acc: number, f: any) => acc + (Number(f.budget) || 0), 0);
  const totalOpeningBalance = fiscalYears.reduce((acc: number, fy: any) => acc + (Number(fy.opening_balance) || 0), 0);

  const fyColumns = [
    {
      title: 'Fiscal Year',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (t: string, r: any) => (
        <Space>
          <CalendarOutlined style={{ color: r.is_current ? '#F97316' : '#94A3B8' }} />
          <b style={{ color: '#0B2347', fontSize: 14 }}>{t}</b>
          {r.is_current && (
            <Tag color="gold" style={{ borderRadius: 12, fontWeight: 700 }}>
              👑 ACTIVE
            </Tag>
          )}
        </Space>
      ),
    },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', width: 110 },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', width: 110 },
    {
      title: 'Opening Balance',
      dataIndex: 'opening_balance',
      key: 'opening_balance',
      width: 140,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: '#16A34A' }}>
          ₹ {Number(v || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (st: string) => (
        <Tag color={st === 'active' ? 'success' : 'processing'} style={{ borderRadius: 10 }}>
          {(st || 'active').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      render: (_: any, r: any) =>
        !r.is_current ? (
          <Popconfirm
            title="Set as Active Financial Year?"
            description={`Switch active accounting period to ${r.name}?`}
            onConfirm={() => setActiveMutation.mutate(r.id)}
            okText="Yes, Switch"
            cancelText="Cancel"
          >
            <Button size="small" icon={<StarOutlined />} style={{ borderRadius: 8 }}>
              Set Active
            </Button>
          </Popconfirm>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
        ),
    },
  ];

  const festColumns = [
    {
      title: 'Festival Name',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (t: string) => <b style={{ color: '#0B2347' }}>🌺 {t}</b>,
    },
    {
      title: 'Deity / Mandap',
      dataIndex: 'deity',
      key: 'deity',
      width: 140,
      render: (d: string) => d || 'General Mandal',
    },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', width: 110 },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', width: 110 },
    {
      title: 'Budget Target',
      dataIndex: 'budget',
      key: 'budget',
      width: 130,
      render: (b: number) => (
        <span style={{ fontWeight: 800, color: '#F97316' }}>
          ₹ {Number(b || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (st: string) => {
        const color = st === 'ACTIVE' ? 'orange' : st === 'COMPLETED' ? 'green' : 'blue';
        return <Tag color={color} style={{ borderRadius: 10 }}>{(st || 'PLANNING').toUpperCase()}</Tag>;
      },
    },
  ];

  return (
    <div className="financial-year-module animate-fadeIn">
      {/* ── Responsive Page Header ── */}
      <div className="financial-year-header-wrapper">
        <div className="financial-year-header-title">
          <h3>Financial Years & Festival Mandates</h3>
          <p>Manage accounting cycles, fiscal opening balances, and festival budget targets</p>
        </div>
        <div className="financial-year-actions">
          <Button
            icon={<CalendarOutlined />}
            size="large"
            className="fy-action-btn"
            onClick={() => setIsFyModalOpen(true)}
          >
            Add Financial Year
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="fy-action-btn"
            onClick={() => setIsFestModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderColor: '#F97316' }}
          >
            Create Festival
          </Button>
        </div>
      </div>

      {/* ── Responsive Overview Summary Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="hissob-card" style={{ borderLeft: '4px solid #F97316' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Active Financial Year</Text>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0B2347', marginTop: 4 }}>
                  {activeFy?.name || 'FY 2025-26'}
                </div>
              </div>
              <Tag color="gold" style={{ fontSize: 16, padding: '4px 10px', borderRadius: 12 }}>👑</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="hissob-card" style={{ borderLeft: '4px solid #22C55E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Total Opening Balance</Text>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#16A34A', marginTop: 4 }}>
                  ₹ {totalOpeningBalance.toLocaleString('en-IN')}
                </div>
              </div>
              <DollarOutlined style={{ fontSize: 24, color: '#22C55E' }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="hissob-card" style={{ borderLeft: '4px solid #3B82F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Configured Festivals</Text>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1E3A8A', marginTop: 4 }}>
                  {festivals.length} Events
                </div>
              </div>
              <TrophyOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="hissob-card" style={{ borderLeft: '4px solid #A855F7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Total Festival Budget</Text>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>
                  ₹ {totalBudget.toLocaleString('en-IN')}
                </div>
              </div>
              <BankOutlined style={{ fontSize: 24, color: '#A855F7' }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Main Master Tables Grid ── */}
      <Row gutter={[20, 20]}>
        {/* Financial Years Table */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CalendarOutlined style={{ color: '#F97316' }} />
                <span style={{ fontWeight: 800, color: '#0B2347' }}>Financial Years Master</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => setIsFyModalOpen(true)} style={{ color: '#F97316', fontWeight: 600 }}>
                + Add FY
              </Button>
            }
            className="hissob-card"
          >
            <Table
              dataSource={fiscalYears}
              columns={fyColumns}
              rowKey="id"
              loading={isFyLoading}
              pagination={false}
              size="middle"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>

        {/* Festivals Directory Table */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: '#F97316' }} />
                <span style={{ fontWeight: 800, color: '#0B2347' }}>Festivals Directory</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => setIsFestModalOpen(true)} style={{ color: '#F97316', fontWeight: 600 }}>
                + Add Festival
              </Button>
            }
            className="hissob-card"
          >
            <Table
              dataSource={festivals}
              columns={festColumns}
              rowKey="id"
              loading={isFestLoading}
              pagination={false}
              size="middle"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Modal 1: Add Financial Year ── */}
      <Modal
        title={<b>📅 Create New Financial Year</b>}
        open={isFyModalOpen}
        onCancel={() => setIsFyModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={fyForm} layout="vertical" onFinish={handleFySubmit} initialValues={{ opening_balance: 0 }}>
          <Form.Item
            name="name"
            label="Financial Year Name"
            rules={[{ required: true, message: 'Please enter Financial Year name' }]}
          >
            <Input placeholder="e.g. 2025-26" size="large" />
          </Form.Item>

          <Form.Item
            name="date_range"
            label="Fiscal Duration (Start & End Date)"
            rules={[{ required: true, message: 'Please select duration' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item name="opening_balance" label="Opening Cash Balance (₹)">
            <InputNumber style={{ width: '100%' }} min={0} size="large" placeholder="0.00" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 24 }}>
            <Space wrap>
              <Button onClick={() => setIsFyModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={fyMutation.isPending}
                style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
              >
                Create Financial Year
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal 2: Create Festival ── */}
      <Modal
        title={<b>🌺 Create Festival Campaign</b>}
        open={isFestModalOpen}
        onCancel={() => setIsFestModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={festForm} layout="vertical" onFinish={handleFestSubmit}>
          <Form.Item
            name="financial_year_id"
            label="Financial Year Mandate"
            rules={[{ required: true, message: 'Select Financial Year' }]}
          >
            <Select placeholder="Select Financial Year" size="large">
              {fiscalYears.map((fy: any) => (
                <Option key={fy.id} value={fy.id}>
                  {fy.name} {fy.is_current ? '(Active FY)' : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Festival Event Name"
            rules={[{ required: true, message: 'Please enter festival name' }]}
          >
            <Input placeholder="e.g. Ganesh Utsav 2025" size="large" />
          </Form.Item>

          <Form.Item name="deity" label="Deity / Mandap Location">
            <Input placeholder="e.g. Lord Ganesha • Lalbaug Mandap" size="large" />
          </Form.Item>

          <Form.Item
            name="date_range"
            label="Festival Event Duration"
            rules={[{ required: true, message: 'Select duration' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item name="budget" label="Target Collection Budget (₹)">
            <InputNumber style={{ width: '100%' }} min={0} size="large" placeholder="Target Budget in ₹" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 24 }}>
            <Space wrap>
              <Button onClick={() => setIsFestModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={festivalMutation.isPending}
                style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
              >
                Create Festival
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FinancialYearPage;
