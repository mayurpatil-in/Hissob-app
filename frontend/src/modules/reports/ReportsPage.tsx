import React, { useState } from 'react';
import {
  Table, Button, Tabs, Card, Row, Col, Typography, Tag, Space, Select
} from 'antd';
import {
  PrinterOutlined, BarChartOutlined,
  BookOutlined, DollarOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getDailyCollectionReport, getCashBookReport, getIncomeExpenseReport, getFinancialYears
} from '../../api/services';

const { Title, Text } = Typography;
const { Option } = Select;

const ReportsPage: React.FC = () => {
  const [selectedFy, setSelectedFy] = useState<string | undefined>(undefined);

  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['financialYears'],
    queryFn: getFinancialYears,
  });

  const { data: dailyData = [], isLoading: isDailyLoading } = useQuery({
    queryKey: ['dailyCollectionReport'],
    queryFn: getDailyCollectionReport,
  });

  const { data: cashBookData = [], isLoading: isCashBookLoading } = useQuery({
    queryKey: ['cashBookReport', selectedFy],
    queryFn: () => getCashBookReport(selectedFy),
  });

  const { data: incomeExpenseData } = useQuery({
    queryKey: ['incomeExpenseReport', selectedFy],
    queryFn: () => getIncomeExpenseReport(selectedFy),
  });

  const dailyColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => <b>{d}</b> },
    { title: 'Receipts Count', dataIndex: 'receipt_count', key: 'receipt_count' },
    { title: 'Cash (₹)', dataIndex: 'cash_amount', key: 'cash_amount', render: (v: number) => `₹ ${Number(v).toLocaleString('en-IN')}` },
    { title: 'UPI (₹)', dataIndex: 'upi_amount', key: 'upi_amount', render: (v: number) => `₹ ${Number(v).toLocaleString('en-IN')}` },
    { title: 'Cheque (₹)', dataIndex: 'cheque_amount', key: 'cheque_amount', render: (v: number) => `₹ ${Number(v).toLocaleString('en-IN')}` },
    {
      title: 'Total Collection (₹)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (v: number) => <span style={{ fontWeight: 700, color: '#0B2347' }}>₹ {Number(v).toLocaleString('en-IN')}</span>,
    },
  ];

  const cashBookColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Voucher #', dataIndex: 'voucher_number', key: 'voucher_number', render: (v: string) => <b>{v}</b> },
    { title: 'Type', dataIndex: 'entry_type', key: 'entry_type', render: (t: string) => <Tag color={t.includes('Receipt') ? 'green' : 'red'}>{t}</Tag> },
    { title: 'Particulars', dataIndex: 'particulars', key: 'particulars' },
    { title: 'Debit (Inflow ₹)', dataIndex: 'debit_amount', key: 'debit_amount', render: (v: number) => v > 0 ? <span style={{ color: '#22C55E', fontWeight: 600 }}>+ ₹ {Number(v).toLocaleString('en-IN')}</span> : '-' },
    { title: 'Credit (Outflow ₹)', dataIndex: 'credit_amount', key: 'credit_amount', render: (v: number) => v > 0 ? <span style={{ color: '#EF4444', fontWeight: 600 }}>- ₹ {Number(v).toLocaleString('en-IN')}</span> : '-' },
    { title: 'Balance (₹)', dataIndex: 'running_balance', key: 'running_balance', render: (v: number) => <b>₹ {Number(v).toLocaleString('en-IN')}</b> },
  ];

  const tabItems = [
    {
      key: 'daily',
      label: <span><BarChartOutlined /> Daily Collection Summary</span>,
      children: (
        <Card className="hissob-card">
          <Table dataSource={dailyData} columns={dailyColumns} rowKey="date" loading={isDailyLoading} pagination={{ pageSize: 10 }} />
        </Card>
      ),
    },
    {
      key: 'cashbook',
      label: <span><BookOutlined /> Cash Book Ledger</span>,
      children: (
        <Card className="hissob-card">
          <Table dataSource={cashBookData} columns={cashBookColumns} rowKey="voucher_number" loading={isCashBookLoading} pagination={{ pageSize: 10 }} />
        </Card>
      ),
    },
    {
      key: 'statement',
      label: <span><DollarOutlined /> Income & Expenditure Statement</span>,
      children: (
        <Card className="hissob-card">
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col span={8}>
              <Card style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <Text type="secondary">Total Income</Text>
                <Title level={3} style={{ color: '#059669', margin: 0 }}>₹ {Number(incomeExpenseData?.total_income || 0).toLocaleString('en-IN')}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <Text type="secondary">Total Expenditure</Text>
                <Title level={3} style={{ color: '#DC2626', margin: 0 }}>₹ {Number(incomeExpenseData?.total_expenses || 0).toLocaleString('en-IN')}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Text type="secondary">Net Surplus / Deficit</Text>
                <Title level={3} style={{ color: '#2563EB', margin: 0 }}>₹ {Number(incomeExpenseData?.net_surplus_deficit || 0).toLocaleString('en-IN')}</Title>
              </Card>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

  return (
    <div className="reports-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Financial Reports & Statements</Title>
          <Text type="secondary">Real-time daily collection breakdown, Cash Book ledger, and Income statements</Text>
        </div>
        <Space>
          <Select
            placeholder="All Financial Years"
            allowClear
            style={{ width: 180 }}
            onChange={(val) => setSelectedFy(val)}
          >
            {fiscalYears.map((fy: any) => (
              <Option key={fy.id} value={fy.id}>{fy.name}</Option>
            ))}
          </Select>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print Report</Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="daily" items={tabItems} />
    </div>
  );
};

export default ReportsPage;
