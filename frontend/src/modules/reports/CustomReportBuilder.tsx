import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Select, Checkbox, DatePicker,
  InputNumber, Button, Table, Tag, Space, Segmented, Modal, Form, Input, App
} from 'antd';
import {
  FilterOutlined, PlayCircleOutlined, DownloadOutlined,
  TrophyOutlined, DollarOutlined, UserOutlined, FileTextOutlined,
  ThunderboltOutlined, MailOutlined
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { runCustomReport, exportCustomReport, emailFinancialReport } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export const CustomReportBuilder: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [entity, setEntity] = useState<string>('receipts');
  const [dimensions, setDimensions] = useState<string[]>(['date', 'collector', 'payment_mode']);
  const [metrics, setMetrics] = useState<string[]>(['total_amount', 'count']);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [minAmount, setMinAmount] = useState<number | null>(null);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string | undefined>(undefined);

  // Custom Report Query Mutation
  const reportQueryMutation = useMutation({
    mutationFn: (payload: any) => runCustomReport(payload),
  });

  const getQueryPayload = () => ({
    entity,
    dimensions,
    metrics,
    date_from: dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
    date_to: dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
    min_amount: minAmount || undefined,
    max_amount: maxAmount || undefined,
    payment_mode: paymentModeFilter || undefined,
  });

  const handleRunQuery = () => {
    reportQueryMutation.mutate(getQueryPayload());
  };

  // Run initial query on load
  useEffect(() => {
    handleRunQuery();
  }, [entity]);

  // Preset Template Handler
  const applyPreset = (presetType: string) => {
    if (presetType === 'collectors') {
      setEntity('receipts');
      setDimensions(['collector', 'payment_mode']);
      setMetrics(['total_amount', 'count', 'avg_amount']);
    } else if (presetType === 'expenses') {
      setEntity('expenses');
      setDimensions(['category', 'festival']);
      setMetrics(['total_amount', 'count']);
    } else if (presetType === 'payment_modes') {
      setEntity('receipts');
      setDimensions(['payment_mode', 'date']);
      setMetrics(['total_amount', 'count']);
    } else if (presetType === 'donors') {
      setEntity('donors');
      setDimensions(['category', 'collector']);
      setMetrics(['total_amount', 'count', 'max_amount']);
    }
  };

  const handleExportCSV = () => {
    exportCustomReport(getQueryPayload());
  };

  const handleSendEmailReport = async (values: any) => {
    const rawEmails = values.recipients || '';
    const recipientsList = rawEmails.split(/[,;\n]+/).map((e: string) => e.trim()).filter((e: string) => e.includes('@'));

    if (recipientsList.length === 0) {
      message.error('Please enter at least one valid recipient email address.');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await emailFinancialReport({
        recipients: recipientsList,
        report_title: `Custom ${entity.toUpperCase()} Aggregation Statement`,
        report_type: 'custom',
        custom_message: values.custom_message,
        custom_report_request: getQueryPayload(),
      });

      if (res.sent_count > 0) {
        message.success(`Successfully dispatched custom report to ${res.sent_count} recipient(s)!`);
        setEmailModalOpen(false);
        form.resetFields();
      } else {
        message.error(`Failed to dispatch email. ${res.message}`);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to email report');
    } finally {
      setSendingEmail(false);
    }
  };

  const reportResult = reportQueryMutation.data;
  const isLoading = reportQueryMutation.isPending;

  // Build Dynamic Table Columns
  const tableColumns = [
    {
      title: 'Date / Period',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => <b>{val || 'N/A'}</b>,
    },
    {
      title: entity === 'expenses' ? 'Expense Category' : entity === 'donors' ? 'City / Area' : 'Donation Category',
      dataIndex: 'category',
      key: 'category',
      render: (val: string) => <Tag color="blue" style={{ fontWeight: 700 }}>{val || 'General'}</Tag>,
    },
    {
      title: entity === 'expenses' ? 'Requested By' : entity === 'donors' ? 'Donor Name' : 'Collector Name',
      dataIndex: 'collector',
      key: 'collector',
      render: (val: string) => <span style={{ fontWeight: 700, color: '#0F172A' }}>👤 {val || 'System Admin'}</span>,
    },
    {
      title: 'Festival Event',
      dataIndex: 'festival',
      key: 'festival',
      render: (val: string) => <Tag color="orange" style={{ fontWeight: 600 }}>{val || 'General'}</Tag>,
    },
    {
      title: 'Payment Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (val: string) => {
        const colors: Record<string, string> = { CASH: 'green', UPI: 'orange', CHEQUE: 'blue' };
        return <Tag color={colors[val] || 'default'} style={{ fontWeight: 800 }}>{val}</Tag>;
      },
    },
    {
      title: 'Total Amount (₹)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      sorter: (a: any, b: any) => a.total_amount - b.total_amount,
      render: (val: number) => (
        <span style={{ fontSize: 14, fontWeight: 900, color: entity === 'expenses' ? '#DC2626' : '#16A34A' }}>
          ₹ {val.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Count (#)',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
      render: (val: number) => <Tag color="purple" style={{ fontWeight: 700 }}>{val} entries</Tag>,
    },
    {
      title: 'Avg Amount (₹)',
      dataIndex: 'avg_amount',
      key: 'avg_amount',
      render: (val: number) => val ? `₹ ${val.toLocaleString('en-IN')}` : '-',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── 1-CLICK PRESET TEMPLATES ── */}
      <Card
        className="hissob-card"
        style={{ borderRadius: 16, border: '1px solid #E2E8F0', background: '#F8FAFC' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#F97316', fontSize: 18 }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>1-Click Report Preset Templates</span>
          </div>
        }
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="default"
              icon={<TrophyOutlined style={{ color: '#F59E0B' }} />}
              onClick={() => applyPreset('collectors')}
              style={{ fontWeight: 700, height: 44, borderRadius: 10, textAlign: 'left' }}
            >
              🏆 Collector Performance
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="default"
              icon={<DollarOutlined style={{ color: '#EC4899' }} />}
              onClick={() => applyPreset('expenses')}
              style={{ fontWeight: 700, height: 44, borderRadius: 10, textAlign: 'left' }}
            >
              💸 Festival Expenses
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="default"
              icon={<FileTextOutlined style={{ color: '#10B981' }} />}
              onClick={() => applyPreset('payment_modes')}
              style={{ fontWeight: 700, height: 44, borderRadius: 10, textAlign: 'left' }}
            >
              💳 Payment Modes
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="default"
              icon={<UserOutlined style={{ color: '#3B82F6' }} />}
              onClick={() => applyPreset('donors')}
              style={{ fontWeight: 700, height: 44, borderRadius: 10, textAlign: 'left' }}
            >
              👤 Donor Geography
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── REPORT BUILDER CONTROLS ── */}
      <Card
        className="hissob-card"
        style={{ borderRadius: 16, border: '1px solid #E2E8F0' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FilterOutlined style={{ color: '#0EA5E9', fontSize: 18 }} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>Custom Report Builder Controls</span>
            </div>
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleRunQuery}
                loading={isLoading}
                style={{ background: '#F97316', borderColor: '#F97316', fontWeight: 800, borderRadius: 10 }}
              >
                Run Custom Query
              </Button>
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
                style={{ fontWeight: 700, borderRadius: 10 }}
              >
                Export CSV
              </Button>
              <Button
                type="dashed"
                icon={<MailOutlined />}
                onClick={() => setEmailModalOpen(true)}
                style={{ borderColor: '#2563EB', color: '#2563EB', fontWeight: 700, borderRadius: 10 }}
              >
                Email Report
              </Button>
            </Space>
          </div>
        }
      >
        <Row gutter={[20, 20]}>
          {/* Entity Picker */}
          <Col xs={24} md={6}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              1. Data Entity
            </Text>
            <Segmented
              value={entity}
              onChange={(val) => setEntity(val as string)}
              options={[
                { label: '🧾 Receipts', value: 'receipts' },
                { label: '💸 Expenses', value: 'expenses' },
                { label: '👤 Donors', value: 'donors' },
              ]}
              block
              style={{ border: '1px solid #CBD5E1', padding: 2 }}
            />
          </Col>

          {/* Group-by Dimensions */}
          <Col xs={24} md={10}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              2. Dimensions (Group By)
            </Text>
            <Checkbox.Group
              value={dimensions}
              onChange={(vals) => setDimensions(vals as string[])}
              options={[
                { label: 'Date', value: 'date' },
                { label: 'Collector', value: 'collector' },
                { label: 'Category', value: 'category' },
                { label: 'Festival', value: 'festival' },
                { label: 'Payment Mode', value: 'payment_mode' },
              ]}
            />
          </Col>

          {/* Aggregation Metrics */}
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              3. Calculated Metrics
            </Text>
            <Checkbox.Group
              value={metrics}
              onChange={(vals) => setMetrics(vals as string[])}
              options={[
                { label: 'Total Amount (₹)', value: 'total_amount' },
                { label: 'Count (#)', value: 'count' },
                { label: 'Average (₹)', value: 'avg_amount' },
                { label: 'Max (₹)', value: 'max_amount' },
              ]}
            />
          </Col>

          {/* Filters Row */}
          <Col xs={24}>
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                🔍 Query Filters
              </Text>
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} sm={8} md={6}>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates as any)}
                  />
                </Col>
                <Col xs={12} sm={8} md={5}>
                  <InputNumber
                    placeholder="Min Amount (₹)"
                    style={{ width: '100%' }}
                    value={minAmount}
                    onChange={(val) => setMinAmount(val)}
                  />
                </Col>
                <Col xs={12} sm={8} md={5}>
                  <InputNumber
                    placeholder="Max Amount (₹)"
                    style={{ width: '100%' }}
                    value={maxAmount}
                    onChange={(val) => setMaxAmount(val)}
                  />
                </Col>
                <Col xs={24} sm={8} md={5}>
                  <Select
                    placeholder="Payment Mode"
                    allowClear
                    style={{ width: '100%' }}
                    value={paymentModeFilter}
                    onChange={(val) => setPaymentModeFilter(val)}
                  >
                    <Select.Option value="CASH">CASH</Select.Option>
                    <Select.Option value="UPI">UPI</Select.Option>
                    <Select.Option value="CHEQUE">CHEQUE</Select.Option>
                  </Select>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ── QUERY RESULTS DISPLAY ── */}
      {reportResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary Metric Header Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card className="hissob-card" style={{ borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Matching Aggregates
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#0F172A' }}>
                  {reportResult.total_records} Groups
                </Title>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="hissob-card" style={{ borderRadius: 14, border: '1px solid #E2E8F0', background: '#F0FDF4' }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#166534' }}>
                  Grand Cumulative Total (₹)
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#15803D' }}>
                  ₹ {reportResult.grand_total_amount.toLocaleString('en-IN')}
                </Title>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="hissob-card" style={{ borderRadius: 14, border: '1px solid #E2E8F0', background: '#FEF3C7' }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#92400E' }}>
                  Active Query Entity
                </Text>
                <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#B45309' }}>
                  {reportResult.entity.toUpperCase()}
                </Title>
              </Card>
            </Col>
          </Row>

          {/* Results Table */}
          <Card className="hissob-card" style={{ borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <Table
              dataSource={reportResult.data}
              columns={tableColumns}
              rowKey={(r) => `${r.collector}_${r.date}_${r.category}_${r.payment_mode}`}
              loading={isLoading}
              pagination={{ pageSize: 15 }}
              scroll={{ x: 700 }}
            />
          </Card>
        </div>
      )}

      {/* ── EMAIL CUSTOM REPORT MODAL ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MailOutlined style={{ color: '#2563EB' }} />
            <span>Email Custom {entity.toUpperCase()} Aggregation Statement</span>
          </div>
        }
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSendEmailReport} style={{ marginTop: 16 }}>
          <Form.Item
            name="recipients"
            label="Recipient Email Address(es)"
            rules={[{ required: true, message: 'Please enter target email address' }]}
            tooltip="Separate multiple emails with commas (e.g. auditor@gmail.com, treasurer@mandal.org)"
          >
            <Input placeholder="e.g. auditor@gmail.com, treasurer@mandal.org" />
          </Form.Item>

          <Form.Item name="custom_message" label="Custom Note / Message for Recipients (Optional)">
            <Input.TextArea rows={3} placeholder="Add a short explanation or context for board members or auditor..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setEmailModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<MailOutlined />} loading={sendingEmail} style={{ background: '#2563EB', fontWeight: 700 }}>
                Send Email Report
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomReportBuilder;
