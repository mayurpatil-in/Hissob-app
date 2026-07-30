import React, { useState } from 'react';
import {
  Table, Button, Tabs, Card, Row, Col, Typography, Tag, Space, Select, Dropdown, Input, Segmented, Avatar, DatePicker, Alert, Progress, Modal, Form, App, type MenuProps
} from 'antd';
import {
  BarChartOutlined, BookOutlined, DollarOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined,
  SearchOutlined, UnorderedListOutlined, AppstoreOutlined, RiseOutlined, FallOutlined, WalletOutlined,
  CalendarOutlined, PieChartOutlined, AuditOutlined, PrinterOutlined, WarningOutlined, CheckCircleOutlined, FileDoneOutlined, MailOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getDailyCollectionReport, getCashBookReport, getIncomeExpenseReport, getFinancialYears, getReceipts, getExpenses, emailFinancialReport
} from '../../api/services';
import { exportToCSV, exportToExcel, printTable } from '../../utils/exportTable';
import dayjs from 'dayjs';
import CustomReportBuilder from './CustomReportBuilder';

const { Title, Text } = Typography;
const { Option } = Select;

const DAILY_COLS = [
  { key: 'date', title: 'Date' },
  { key: 'receipt_count', title: 'Receipts Count' },
  { key: 'cash_amount', title: 'Cash (₹)', format: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
  { key: 'upi_amount', title: 'UPI (₹)', format: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
  { key: 'cheque_amount', title: 'Cheque (₹)', format: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
  { key: 'total_amount', title: 'Total Collection (₹)', format: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
];

const CASHBOOK_COLS = [
  { key: 'date', title: 'Date' },
  { key: 'voucher_number', title: 'Voucher #' },
  { key: 'entry_type', title: 'Type' },
  { key: 'particulars', title: 'Particulars' },
  { key: 'debit_amount', title: 'Debit Inflow (₹)', format: (v: number) => v > 0 ? `+ ₹ ${Number(v).toLocaleString('en-IN')}` : '-' },
  { key: 'credit_amount', title: 'Credit Outflow (₹)', format: (v: number) => v > 0 ? `- ₹ ${Number(v).toLocaleString('en-IN')}` : '-' },
  { key: 'running_balance', title: 'Balance (₹)', format: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
];

const EmailReportModal: React.FC<{
  open: boolean;
  onCancel: () => void;
  reportTitle: string;
  reportType: string;
  startDate?: string;
  endDate?: string;
  fyId?: string;
  customReportRequest?: any;
}> = ({ open, onCancel, reportTitle, reportType, startDate, endDate, fyId, customReportRequest }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);

  const handleSend = async (values: any) => {
    const rawEmails = values.recipients || '';
    const recipientsList = rawEmails.split(/[,;\n]+/).map((e: string) => e.trim()).filter((e: string) => e.includes('@'));

    if (recipientsList.length === 0) {
      message.error('Please enter at least one valid recipient email address.');
      return;
    }

    setSending(true);
    try {
      const res = await emailFinancialReport({
        recipients: recipientsList,
        report_title: reportTitle,
        report_type: reportType,
        custom_message: values.custom_message,
        custom_report_request: customReportRequest,
        start_date: startDate,
        end_date: endDate,
        fy_id: fyId,
      });

      if (res.sent_count > 0) {
        message.success(`Successfully dispatched report to ${res.sent_count} recipient(s)!`);
        onCancel();
        form.resetFields();
      } else {
        message.error(`Failed to dispatch email. ${res.message}`);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to email report');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined style={{ color: '#2563EB' }} />
          <span>Email Statement: {reportTitle}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSend} style={{ marginTop: 16 }}>
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
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={<MailOutlined />} loading={sending} style={{ background: '#2563EB', fontWeight: 700 }}>
              Send Email Report
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

const ExportButtons: React.FC<{
  data: any[];
  columns: typeof DAILY_COLS;
  baseName: string;
  title: string;
  reportType?: string;
  startDate?: string;
  endDate?: string;
  fyId?: string;
}> = ({ data, columns, baseName, title, reportType = 'custom', startDate, endDate, fyId }) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const filename = `${baseName}_${dayjs().format('YYYYMMDD')}`;

  const menuItems: MenuProps['items'] = [
    {
      key: 'csv',
      icon: <DownloadOutlined />,
      label: 'Export CSV',
      onClick: () => exportToCSV(data, filename, columns),
    },
    {
      key: 'excel',
      icon: <FileExcelOutlined style={{ color: '#22C55E' }} />,
      label: 'Export Excel (.xlsx)',
      onClick: () => exportToExcel(data, filename, columns),
    },
    {
      key: 'print',
      icon: <FilePdfOutlined style={{ color: '#EF4444' }} />,
      label: 'Print / Save as PDF',
      onClick: () => printTable(data, title, columns),
    },
    {
      type: 'divider',
    },
    {
      key: 'email',
      icon: <MailOutlined style={{ color: '#2563EB' }} />,
      label: 'Email Report Statement',
      onClick: () => setEmailModalOpen(true),
    },
  ];

  return (
    <>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Button icon={<DownloadOutlined />} size="small" style={{ fontWeight: 600 }}>
          Export ▾
        </Button>
      </Dropdown>
      <EmailReportModal
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        reportTitle={title}
        reportType={reportType}
        startDate={startDate}
        endDate={endDate}
        fyId={fyId}
      />
    </>
  );
};

const ReportsPage: React.FC = () => {
  const [selectedFy, setSelectedFy] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchText, setSearchText] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Trust Dossier Generator state
  const [dossierModalVisible, setDossierModalVisible] = useState(false);
  const [dossierOrgName, setDossierOrgName] = useState('Shri Maharaj Trust / Temple Committee');
  const [dossierNotes, setDossierNotes] = useState('Periodic Financial Audit & Ledger Review');

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

  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => getReceipts(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => getExpenses(),
  });

  // Date Range matching utility
  const isDateInRange = (dateStr: string | undefined) => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return true;
    if (!dateStr) return false;
    const d = dayjs(dateStr);
    if (!d.isValid()) return true;
    if (dateRange[0] && d.isBefore(dateRange[0].startOf('day'))) return false;
    if (dateRange[1] && d.isAfter(dateRange[1].endOf('day'))) return false;
    return true;
  };

  const filteredDailyData = dailyData.filter((d: any) => {
    if (!isDateInRange(d.date)) return false;
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      (d.date && String(d.date).toLowerCase().includes(lower)) ||
      (d.total_amount && String(d.total_amount).includes(lower)) ||
      (d.cash_amount && String(d.cash_amount).includes(lower)) ||
      (d.upi_amount && String(d.upi_amount).includes(lower))
    );
  });

  const filteredCashBookData = cashBookData.filter((c: any) => {
    if (!isDateInRange(c.date)) return false;
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      (c.date && String(c.date).toLowerCase().includes(lower)) ||
      (c.voucher_number && String(c.voucher_number).toLowerCase().includes(lower)) ||
      (c.particulars && String(c.particulars).toLowerCase().includes(lower)) ||
      (c.entry_type && String(c.entry_type).toLowerCase().includes(lower))
    );
  });

  // Feature #2: Digital vs Physical Collection Ratio calculations
  const totalCash = filteredDailyData.reduce((acc, d: any) => acc + Number(d.cash_amount || 0), 0);
  const totalUpi = filteredDailyData.reduce((acc, d: any) => acc + Number(d.upi_amount || 0), 0);
  const totalCheque = filteredDailyData.reduce((acc, d: any) => acc + Number(d.cheque_amount || 0), 0);
  const totalCollected = totalCash + totalUpi + totalCheque;
  const cashPct = totalCollected > 0 ? Math.round((totalCash / totalCollected) * 100) : 0;
  const upiPct = totalCollected > 0 ? Math.round((totalUpi / totalCollected) * 100) : 0;
  const chequePct = totalCollected > 0 ? 100 - (cashPct + upiPct) : 0;

  // Feature #3: Category-wise Accounting Schedules
  const incomeByCategory: Record<string, number> = {};
  (receipts as any[]).filter(r => r.status !== 'cancelled' && isDateInRange(r.created_at || r.receipt_date)).forEach(r => {
    const cat = r.category || 'General Fund & Donations';
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(r.amount || 0);
  });
  const totalCategoryIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);

  const expenseByCategory: Record<string, number> = {};
  (expenses as any[]).filter(e => e.status !== 'rejected' && isDateInRange(e.expense_date)).forEach(e => {
    const cat = e.category || 'General Operations & Maintenance';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount || 0);
  });
  const totalCategoryExpense = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);

  // Overall Totals
  const totalIncome = Number(incomeExpenseData?.total_income || totalCollected || 0);
  const totalExpenditure = Number(incomeExpenseData?.total_expenses || 0);
  const netSurplus = Number(incomeExpenseData?.net_surplus_deficit || (totalIncome - totalExpenditure) || 0);

  // Feature #4: Formal Trust Financial Dossier PDF Generator
  const generateOfficialDossierPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const periodLabel = dateRange && dateRange[0] && dateRange[1]
      ? `${dateRange[0].format('DD MMM YYYY')} to ${dateRange[1].format('DD MMM YYYY')}`
      : 'Full Fiscal Year / Selected Range';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official Trust Financial Dossier - ${dayjs().format('DD-MMM-YYYY')}</title>
        <style>
          body { font-family: 'Times New Roman', serif, Arial; padding: 35px; color: #1e293b; background: #fff; line-height: 1.5; }
          .header-box { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 25px; }
          .org-title { font-size: 26px; font-weight: bold; text-transform: uppercase; margin: 0; color: #0b2347; letter-spacing: 1px; }
          .sub-title { font-size: 15px; font-weight: bold; color: #475569; margin: 6px 0 0 0; text-transform: uppercase; }
          .meta-info { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 25px; background: #f8fafc; padding: 12px 16px; border: 1px solid #e2e8f0; }
          .section-header { font-size: 15px; font-weight: bold; color: #0f172a; background: #f1f5f9; padding: 8px 12px; border-left: 5px solid #0b2347; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; }
          .summary-table, .schedule-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          .summary-table th, .summary-table td, .schedule-table th, .schedule-table td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: left; }
          .summary-table th, .schedule-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; color: #334155; }
          .amount-col { text-align: right !important; font-weight: bold; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
          .signature-box { display: flex; justify-content: space-between; margin-top: 70px; padding-top: 20px; }
          .sig-line { width: 220px; border-top: 1px dashed #475569; text-align: center; font-weight: bold; font-size: 13px; padding-top: 8px; color: #0f172a; }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1 class="org-title">${dossierOrgName}</h1>
          <p class="sub-title">Official Trust Financial Audit & Ledger Dossier</p>
        </div>

        <div class="meta-info">
          <div><span>Audit Period:</span> <strong>${periodLabel}</strong></div>
          <div><span>Generated On:</span> <strong>${dayjs().format('DD MMMM YYYY, hh:mm A')}</strong></div>
          <div><span>Remarks:</span> <strong>${dossierNotes || 'Standard Review'}</strong></div>
        </div>

        <div class="section-header">1. Executive Financial Summary</div>
        <table class="summary-table">
          <thead>
            <tr><th>Financial Metric</th><th class="amount-col">Amount (₹)</th><th>Remarks & Liquidity Standing</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total Collected Inflows & Revenue</strong></td>
              <td class="amount-col positive">₹ ${Number(totalIncome || 0).toLocaleString('en-IN')}</td>
              <td>Cumulative revenue from all recorded donations & vouchers</td>
            </tr>
            <tr>
              <td><strong>Total Operational Outflows & Expenditure</strong></td>
              <td class="amount-col negative">₹ ${Number(totalExpenditure || 0).toLocaleString('en-IN')}</td>
              <td>Verified bills, vendor maintenance, & settlement payouts</td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td><strong>Net Surplus / (Deficit)</strong></td>
              <td class="amount-col ${netSurplus >= 0 ? 'positive' : 'negative'}">₹ ${Number(netSurplus || 0).toLocaleString('en-IN')}</td>
              <td>${netSurplus >= 0 ? 'Surplus Liquidity Retained in Trust Reserves' : 'Deficit Recorded for Period'}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">2. Payment Modes & Digital Transformation Ratios</div>
        <table class="summary-table">
          <thead>
            <tr><th>Collection Method / Channel</th><th class="amount-col">Volume Collected (₹)</th><th>Percentage Share</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>💵 Physical Cash Collections (Verified by Treasurer)</td>
              <td class="amount-col">₹ ${totalCash.toLocaleString('en-IN')}</td>
              <td><strong>${cashPct}%</strong></td>
            </tr>
            <tr>
              <td>📱 UPI & Digital Bank Transfers (Real-time credits)</td>
              <td class="amount-col">₹ ${totalUpi.toLocaleString('en-IN')}</td>
              <td><strong>${upiPct}%</strong></td>
            </tr>
            <tr>
              <td>🏦 Cheque Deposits & NEFT/RTGS Transfers</td>
              <td class="amount-col">₹ ${totalCheque.toLocaleString('en-IN')}</td>
              <td><strong>${chequePct}%</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">3. Itemized Accounting Schedules (By Category)</div>
        <table class="schedule-table">
          <thead>
            <tr><th colspan="2">Income Schedule (By Donation Category)</th><th colspan="2">Expenditure Schedule (By Expense Category)</th></tr>
            <tr><th>Donation / Fund Category</th><th class="amount-col">Total (₹)</th><th>Operational Category</th><th class="amount-col">Total (₹)</th></tr>
          </thead>
          <tbody>
            ${(() => {
              const incKeys = Object.keys(incomeByCategory);
              const expKeys = Object.keys(expenseByCategory);
              const maxLen = Math.max(incKeys.length, expKeys.length, 1);
              let rows = '';
              for (let i = 0; i < maxLen; i++) {
                const iKey = incKeys[i];
                const eKey = expKeys[i];
                const iVal = iKey ? `₹ ${Number(incomeByCategory[iKey]).toLocaleString('en-IN')}` : '-';
                const eVal = eKey ? `₹ ${Number(expenseByCategory[eKey]).toLocaleString('en-IN')}` : '-';
                rows += `<tr>
                  <td>${iKey || '-'}</td>
                  <td class="amount-col positive">${iVal}</td>
                  <td>${eKey || '-'}</td>
                  <td class="amount-col negative">${eVal}</td>
                </tr>`;
              }
              return rows;
            })()}
          </tbody>
        </table>

        <div class="section-header">4. Cash Book Extract & Ledger Log (${filteredCashBookData.slice(0, 15).length} Recent Transactions)</div>
        <table class="schedule-table">
          <thead>
            <tr><th>Date</th><th>Voucher #</th><th>Type</th><th>Particulars</th><th class="amount-col">Inflow (+)</th><th class="amount-col">Outflow (-)</th><th class="amount-col">Balance (₹)</th></tr>
          </thead>
          <tbody>
            ${filteredCashBookData.slice(0, 15).map((c: any) => `
              <tr>
                <td>${c.date}</td>
                <td><strong>${c.voucher_number}</strong></td>
                <td>${c.entry_type}</td>
                <td>${c.particulars}</td>
                <td class="amount-col positive">${c.debit_amount > 0 ? '+ ₹ ' + Number(c.debit_amount).toLocaleString('en-IN') : '-'}</td>
                <td class="amount-col negative">${c.credit_amount > 0 ? '- ₹ ' + Number(c.credit_amount).toLocaleString('en-IN') : '-'}</td>
                <td class="amount-col"><strong>₹ ${Number(c.running_balance || 0).toLocaleString('en-IN')}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signature-box">
          <div class="sig-line">Prepared By<br/><span style="font-size: 11px; font-weight: normal; color: #64748B;">Accountant / Cashier</span></div>
          <div class="sig-line">Verified By<br/><span style="font-size: 11px; font-weight: normal; color: #64748B;">Hon. Treasurer</span></div>
          <div class="sig-line">Approved By<br/><span style="font-size: 11px; font-weight: normal; color: #64748B;">Trustee / President</span></div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setDossierModalVisible(false);
  };

  const dailyColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => <b>{d}</b> },
    { title: 'Receipts Count', dataIndex: 'receipt_count', key: 'receipt_count' },
    { title: 'Cash (₹)', dataIndex: 'cash_amount', key: 'cash_amount', render: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'UPI (₹)', dataIndex: 'upi_amount', key: 'upi_amount', render: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Cheque (₹)', dataIndex: 'cheque_amount', key: 'cheque_amount', render: (v: number) => `₹ ${Number(v || 0).toLocaleString('en-IN')}` },
    {
      title: 'Total Collection (₹)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (v: number) => <span style={{ fontWeight: 700, color: '#0B2347' }}>₹ {Number(v || 0).toLocaleString('en-IN')}</span>,
    },
  ];

  const cashBookColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Voucher #', dataIndex: 'voucher_number', key: 'voucher_number', render: (v: string) => <b>{v}</b> },
    { title: 'Type', dataIndex: 'entry_type', key: 'entry_type', render: (t: string) => <Tag color={t.includes('Receipt') ? 'green' : 'red'}>{t}</Tag> },
    { title: 'Particulars', dataIndex: 'particulars', key: 'particulars' },
    { title: 'Debit (Inflow ₹)', dataIndex: 'debit_amount', key: 'debit_amount', render: (v: number) => v > 0 ? <span style={{ color: '#22C55E', fontWeight: 600 }}>+ ₹ {Number(v).toLocaleString('en-IN')}</span> : '-' },
    { title: 'Credit (Outflow ₹)', dataIndex: 'credit_amount', key: 'credit_amount', render: (v: number) => v > 0 ? <span style={{ color: '#EF4444', fontWeight: 600 }}>- ₹ {Number(v).toLocaleString('en-IN')}</span> : '-' },
    { title: 'Balance (₹)', dataIndex: 'running_balance', key: 'running_balance', render: (v: number) => <b>₹ {Number(v || 0).toLocaleString('en-IN')}</b> },
  ];

  const tabItems = [
    {
      key: 'daily',
      label: <span><BarChartOutlined /> Daily Collection Summary</span>,
      children: (
        <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <ExportButtons data={filteredDailyData} columns={DAILY_COLS} baseName="DailyCollection" title="Daily Collection Summary" />
          </div>
          {viewMode === 'table' ? (
            <Table dataSource={filteredDailyData} columns={dailyColumns} rowKey="date" loading={isDailyLoading} pagination={{ pageSize: 15, showSizeChanger: true }} scroll={{ x: 700 }} />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredDailyData.map((record: any) => (
                <Col xs={24} sm={12} md={8} lg={6} key={record.date}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                    }}
                    styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 900, color: '#1E40AF', fontSize: 15 }}>
                        📅 {record.date}
                      </span>
                      <Tag color="blue" style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                        📦 {record.receipt_count} Receipts
                      </Tag>
                    </div>

                    <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <Text type="secondary">Cash:</Text>
                        <span style={{ fontWeight: 700 }}>₹ {Number(record.cash_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <Text type="secondary">UPI:</Text>
                        <span style={{ fontWeight: 700, color: '#2563EB' }}>₹ {Number(record.upi_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <Text type="secondary">Cheque:</Text>
                        <span style={{ fontWeight: 700 }}>₹ {Number(record.cheque_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total Collection</Text>
                      <span style={{ fontWeight: 900, fontSize: 17, color: '#059669' }}>
                        ₹ {Number(record.total_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'cashbook',
      label: <span><BookOutlined /> Cash Book Ledger</span>,
      children: (
        <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <ExportButtons data={filteredCashBookData} columns={CASHBOOK_COLS} baseName="CashBook" title="Cash Book Ledger" />
          </div>
          {viewMode === 'table' ? (
            <Table dataSource={filteredCashBookData} columns={cashBookColumns} rowKey="voucher_number" loading={isCashBookLoading} pagination={{ pageSize: 15, showSizeChanger: true }} scroll={{ x: 800 }} />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredCashBookData.map((record: any, idx: number) => {
                const isReceipt = record.entry_type?.includes('Receipt') || Number(record.debit_amount || 0) > 0;
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={record.voucher_number || idx}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: 14,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 14px rgba(11,35,71,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace', fontSize: 14 }}>
                          {record.voucher_number || 'VOUCHER'}
                        </span>
                        <Tag color={isReceipt ? 'success' : 'error'} style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                          {record.entry_type || (isReceipt ? 'INFLOW' : 'OUTFLOW')}
                        </Tag>
                      </div>

                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>
                        📅 Date: {record.date}
                      </div>

                      <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9', marginBottom: 12, flexGrow: 1 }}>
                        <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 600, marginBottom: 8 }}>
                          {record.particulars || 'No description provided'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Amount:</Text>
                          {isReceipt ? (
                            <span style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>+ ₹ {Number(record.debit_amount || 0).toLocaleString('en-IN')}</span>
                          ) : (
                            <span style={{ fontWeight: 800, color: '#DC2626', fontSize: 15 }}>- ₹ {Number(record.credit_amount || 0).toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Running Balance</Text>
                        <span style={{ fontWeight: 900, fontSize: 16, color: '#0F172A' }}>
                          ₹ {Number(record.running_balance || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'statement',
      label: <span><DollarOutlined /> Income & Expenditure Statement</span>,
      children: (
        <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <ExportButtons
              data={[
                { label: 'Total Income', value: `₹ ${Number(totalIncome || 0).toLocaleString('en-IN')}` },
                { label: 'Total Expenditure', value: `₹ ${Number(totalExpenditure || 0).toLocaleString('en-IN')}` },
                { label: 'Net Surplus / Deficit', value: `₹ ${Number(netSurplus || 0).toLocaleString('en-IN')}` },
              ]}
              columns={[
                { key: 'label', title: 'Particulars' } as any,
                { key: 'value', title: 'Amount (₹)' } as any
              ]}
              baseName="IncomeExpenseStatement"
              title="Income & Expenditure Statement"
            />
          </div>
          <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1px solid #A7F3D0', borderRadius: 16, padding: '8px 4px', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.08)' }}>
                <Text type="secondary" style={{ fontWeight: 800, color: '#065F46', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Total Income</Text>
                <Title level={2} style={{ color: '#059669', margin: '8px 0 0 0', fontWeight: 900 }}>₹ {Number(totalIncome || 0).toLocaleString('en-IN')}</Title>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', border: '1px solid #FECACA', borderRadius: 16, padding: '8px 4px', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)' }}>
                <Text type="secondary" style={{ fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Total Expenditure</Text>
                <Title level={2} style={{ color: '#DC2626', margin: '8px 0 0 0', fontWeight: 900 }}>₹ {Number(totalExpenditure || 0).toLocaleString('en-IN')}</Title>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE', borderRadius: 16, padding: '8px 4px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)' }}>
                <Text type="secondary" style={{ fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Net Surplus / Deficit</Text>
                <Title level={2} style={{ color: '#2563EB', margin: '8px 0 0 0', fontWeight: 900 }}>₹ {Number(netSurplus || 0).toLocaleString('en-IN')}</Title>
              </Card>
            </Col>
          </Row>

          {/* ── Feature #3: Itemized Accounting Schedules (By Category) ── */}
          <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card
                title={<span><RiseOutlined style={{ color: '#059669', marginRight: 8 }} /> Income Schedule (By Donation Category)</span>}
                style={{ borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(11,35,71,0.03)', height: '100%' }}
              >
                <Table
                  dataSource={Object.entries(incomeByCategory).map(([cat, amt]) => ({ category: cat, amount: amt, pct: totalCategoryIncome > 0 ? Math.round((amt / totalCategoryIncome) * 100) : 0 }))}
                  columns={[
                    { title: 'Category', dataIndex: 'category', key: 'category', render: (c) => <span style={{ fontWeight: 700, color: '#0F172A' }}>{c}</span> },
                    { title: 'Amount (₹)', dataIndex: 'amount', key: 'amount', render: (a) => <span style={{ color: '#059669', fontWeight: 800 }}>₹ {Number(a).toLocaleString('en-IN')}</span> },
                    { title: 'Share (%)', dataIndex: 'pct', key: 'pct', width: 120, render: (p) => <Progress percent={p} size="small" strokeColor="#059669" /> },
                  ]}
                  rowKey="category"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No categorized income recorded in selected period' }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={<span><FallOutlined style={{ color: '#DC2626', marginRight: 8 }} /> Expenditure Schedule (By Operational Category)</span>}
                style={{ borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(11,35,71,0.03)', height: '100%' }}
              >
                <Table
                  dataSource={Object.entries(expenseByCategory).map(([cat, amt]) => ({ category: cat, amount: amt, pct: totalCategoryExpense > 0 ? Math.round((amt / totalCategoryExpense) * 100) : 0 }))}
                  columns={[
                    { title: 'Category', dataIndex: 'category', key: 'category', render: (c) => <span style={{ fontWeight: 700, color: '#0F172A' }}>{c}</span> },
                    { title: 'Amount (₹)', dataIndex: 'amount', key: 'amount', render: (a) => <span style={{ color: '#DC2626', fontWeight: 800 }}>₹ {Number(a).toLocaleString('en-IN')}</span> },
                    { title: 'Share (%)', dataIndex: 'pct', key: 'pct', width: 120, render: (p) => <Progress percent={p} size="small" strokeColor="#DC2626" /> },
                  ]}
                  rowKey="category"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No categorized expenses recorded in selected period' }}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      ),
    },
    {
      key: 'custom',
      label: <span><BarChartOutlined style={{ color: '#F97316' }} /> Custom Report Builder</span>,
      children: <CustomReportBuilder />,
    },
  ];

  return (
    <div className="reports-module animate-fadeIn" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24, maxWidth: '100%' }}>
        <div style={{ flex: '1 1 280px', maxWidth: '100%' }}>
          <Title level={3} style={{ margin: 0, color: '#0F172A', fontWeight: 900 }}>
            Financial Reports & Statements
          </Title>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 4 }}>
            Real-time daily collection breakdown, Cash Book ledger, and Trustee accounting schedules
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: '1 1 auto', alignItems: 'center', maxWidth: '100%', width: '100%' }}>
          {/* ── Feature #1: Interactive Date Range Picker with Quick Presets ── */}
          <DatePicker.RangePicker
            allowClear
            size="middle"
            value={dateRange as any}
            onChange={(dates) => setDateRange(dates as any)}
            presets={[
              { label: 'Today', value: [dayjs(), dayjs()] },
              { label: 'This Week', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
              { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              { label: 'Last 90 Days', value: [dayjs().subtract(90, 'days'), dayjs()] },
            ]}
            style={{ flex: '1 1 230px', minWidth: '210px', maxWidth: '100%', borderRadius: 8, fontWeight: 600, border: '1px solid #CBD5E1' }}
          />

          <Select
            placeholder="All Financial Years"
            allowClear
            size="middle"
            style={{ flex: '1 1 150px', minWidth: '140px', maxWidth: '100%', fontWeight: 600 }}
            onChange={(val) => setSelectedFy(val)}
            suffixIcon={<CalendarOutlined style={{ color: '#2563EB' }} />}
          >
            {fiscalYears.map((fy: any) => (
              <Option key={fy.id} value={fy.id}>{fy.name}</Option>
            ))}
          </Select>

          {/* ── Feature #4: Trustee Dossier Generator Button ── */}
          <Button
            type="primary"
            size="middle"
            icon={<AuditOutlined />}
            onClick={() => setDossierModalVisible(true)}
            style={{
              flex: '1 1 auto',
              minWidth: '180px',
              maxWidth: '100%',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              borderRadius: 8,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            Generate Trust Dossier
          </Button>
        </div>
      </div>

      {/* ── Feature #5: Cash Book Running Reconciliation Alert ── */}
      {netSurplus >= 0 ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined style={{ fontSize: 18 }} />}
          title="✅ Ledger Reconciliation & Liquidity Status: Normal & Verified"
          description="Total recorded collections & inflows fully cover all operational expenses and outflows. Physical cash balances and digital accounts are operating within positive solvency margins."
          style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5', fontWeight: 500 }}
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined style={{ fontSize: 18 }} />}
          title="⚠️ Attention Required: Operational Outflows Exceed Recorded Inflows"
          description="The selected audit range indicates a net fiscal deficit where disbursements exceed collections. Please ensure adequate bank reserve balances are maintained."
          style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #FCD34D', backgroundColor: '#FFFBEB', fontWeight: 500 }}
        />
      )}

      {/* ── Feature #2: Collection Methods Ratios & Analytics Bar ── */}
      <Card style={{ marginBottom: 20, borderRadius: 14, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#fff', border: 'none', boxShadow: '0 8px 20px rgba(15,23,42,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
              💳 Digital vs Physical Collection Ratio
            </span>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F8FAFC', marginTop: 2 }}>
              Total Volume Analyzed: ₹ {totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
          <Space size="middle" wrap>
            <Tag color="success" style={{ padding: '4px 10px', borderRadius: 8, fontWeight: 800, fontSize: 13 }}>
              💵 Cash: ₹ {totalCash.toLocaleString('en-IN')} ({cashPct}%)
            </Tag>
            <Tag color="processing" style={{ padding: '4px 10px', borderRadius: 8, fontWeight: 800, fontSize: 13 }}>
              📱 UPI / Digital: ₹ {totalUpi.toLocaleString('en-IN')} ({upiPct}%)
            </Tag>
            <Tag color="warning" style={{ padding: '4px 10px', borderRadius: 8, fontWeight: 800, fontSize: 13 }}>
              🏦 Cheque: ₹ {totalCheque.toLocaleString('en-IN')} ({chequePct}%)
            </Tag>
          </Space>
        </div>

        <Progress
          percent={100}
          success={{ percent: cashPct, strokeColor: '#22C55E' }}
          strokeColor={upiPct > 0 ? '#3B82F6' : '#F59E0B'}
          showInfo={false}
          size={['100%' as any, 12]}
          style={{ borderRadius: 6, overflow: 'hidden', margin: 0 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#CBD5E1', marginTop: 6, fontWeight: 600 }}>
          <span>Green: Cash Collections ({cashPct}%)</span>
          <span>Blue: Real-time Digital / UPI Transfers ({upiPct}%)</span>
          <span>Amber: Bank Cheques ({chequePct}%)</span>
        </div>
      </Card>

      {/* ── Quick Overview Metric Cards ── */}
      <div className="hissob-stat-row" style={{ marginBottom: 20 }}>
        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #059669', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL INCOME
              </Text>
              <Avatar style={{ backgroundColor: '#D1FAE5', color: '#059669', flexShrink: 0 }} icon={<RiseOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#059669', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {Number(totalIncome || 0).toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Total Inflows & Collections</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #DC2626', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                TOTAL EXPENDITURE
              </Text>
              <Avatar style={{ backgroundColor: '#FEE2E2', color: '#DC2626', flexShrink: 0 }} icon={<FallOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#DC2626', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {Number(totalExpenditure || 0).toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Total Outflows & Expenses</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #2563EB', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                NET SURPLUS / DEFICIT
              </Text>
              <Avatar style={{ backgroundColor: '#DBEAFE', color: '#2563EB', flexShrink: 0 }} icon={<WalletOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: netSurplus >= 0 ? '#2563EB' : '#DC2626', fontWeight: 900, whiteSpace: 'nowrap' }}>
              ₹ {Number(netSurplus || 0).toLocaleString('en-IN')}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Current Fiscal Standing</Text>
          </Card>
        </div>

        <div className="hissob-stat-col">
          <Card className="hissob-stat-card" style={{ borderTop: '4px solid #8B5CF6', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                LEDGER ENTRIES
              </Text>
              <Avatar style={{ backgroundColor: '#EDE9FE', color: '#8B5CF6', flexShrink: 0 }} icon={<PieChartOutlined />} size="small" />
            </div>
            <Title level={4} style={{ margin: '4px 0 0 0', color: '#8B5CF6', fontWeight: 900 }}>
              {filteredCashBookData.length}
            </Title>
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Recorded Transactions</Text>
          </Card>
        </div>
      </div>

      {/* ── Directory Controls Bar ── */}
      <Card className="hissob-card" style={{ borderRadius: 14, boxShadow: '0 4px 16px rgba(11,35,71,0.06)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <Input
            placeholder="Search date, voucher number, particulars, or amount..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            allowClear
            style={{ flex: '1 1 240px', minWidth: 180, maxWidth: '100%', borderRadius: 8 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="middle"
          />

          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={[
              { label: 'Table', value: 'table', icon: <UnorderedListOutlined /> },
              { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
            ]}
            style={{ fontWeight: 700, flexShrink: 0 }}
          />
        </div>
      </Card>

      <Tabs defaultActiveKey="daily" items={tabItems} />

      {/* ── Feature #4: Trustee Financial Dossier Customization Modal ── */}
      <Modal
        title={
          <Space>
            <FileDoneOutlined style={{ color: '#2563EB', fontSize: 20 }} />
            <span style={{ fontWeight: 800 }}>Generate Formal Trust Financial Dossier</span>
          </Space>
        }
        open={dossierModalVisible}
        onCancel={() => setDossierModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDossierModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            style={{ background: '#2563EB', fontWeight: 700 }}
            onClick={generateOfficialDossierPDF}
          >
            🖨️ Generate & Print PDF Dossier
          </Button>,
        ]}
        width={540}
      >
        <div style={{ padding: '12px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Customize the trust header details and remarks for the official printed dossier. The generated document includes signature lines for the Accountant, Treasurer, and President/Trustee.
          </Text>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Trust / Temple Committee Name:</label>
            <Input
              size="large"
              value={dossierOrgName}
              onChange={(e) => setDossierOrgName(e.target.value)}
              placeholder="e.g., Shri Ganesh Utsav Trust"
              style={{ borderRadius: 8 }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Audit Notes / Meeting Remarks:</label>
            <Input.TextArea
              rows={3}
              value={dossierNotes}
              onChange={(e) => setDossierNotes(e.target.value)}
              placeholder="e.g., Q3 Financial Evaluation for Board of Trustees"
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportsPage;
