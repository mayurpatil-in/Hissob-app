import React, { useState } from 'react';
import {
  Modal, Row, Col, Card, Typography, Tag, Table, Button, DatePicker, Spin, Empty
} from 'antd';
import {
  BankOutlined, PrinterOutlined, RocketOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getCollectorDailySummary } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSettlementWithReceipts?: (receiptIds: string[]) => void;
}

const CollectorDailySummaryModal: React.FC<Props> = ({
  open,
  onClose,
  onOpenSettlementWithReceipts
}) => {
  const [targetDate, setTargetDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['collectorDailySummary', targetDate.format('YYYY-MM-DD')],
    queryFn: () => getCollectorDailySummary({ target_date: targetDate.format('YYYY-MM-DD') }),
    enabled: open,
  });

  const receipts = data?.receipts || [];
  const unsettledCashAmount = data?.unsettled_cash_amount || 0;
  const unsettledReceiptIds = data?.unsettled_receipt_ids || [];

  const handlePrintEODHandover = () => {
    if (!data) return;
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>EOD Cash Handover Slip — ${data.collector_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; padding: 24px; background: #fff; }
    .header { border-bottom: 2px solid #0B2347; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
    .header h1 { color: #0B2347; font-size: 20px; font-weight: 900; }
    .header p { color: #666; font-size: 12px; }
    .meta-box { background: #f8f9fc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
    .meta-item label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .meta-item value { font-size: 14px; font-weight: 700; color: #0f172a; display: block; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; }
    .stat-card label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .stat-card val { font-size: 16px; font-weight: 900; color: #0B2347; display: block; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    th { background: #0B2347; color: #fff; text-align: left; padding: 8px 10px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 10px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; border-top: 1px dashed #94a3b8; }
    .sig-box { text-align: center; }
    .sig-line { width: 160px; border-bottom: 1px solid #334155; height: 36px; margin: 0 auto 6px; }
    .sig-label { font-size: 11px; color: #475569; font-weight: 600; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>HISSOB ERP — EOD COLLECTOR CASH HANDOVER SLIP</h1>
    <p>Official End-of-Day Collection & Cash Handover Summary Statement</p>
  </div>

  <div class="meta-box">
    <div class="meta-item"><label>Collector Name</label><value>${data.collector_name}</value></div>
    <div class="meta-item"><label>Collection Date</label><value>${data.date}</value></div>
    <div class="meta-item"><label>Total Receipts</label><value>${data.receipts_count}</value></div>
    <div class="meta-item"><label>Handover Cash</label><value style="color:#15803D;">₹ ${Number(data.unsettled_cash_amount).toLocaleString('en-IN')}</value></div>
  </div>

  <div class="summary-grid">
    <div class="stat-card"><label>Total Collected</label><val>₹ ${Number(data.total_collected).toLocaleString('en-IN')}</val></div>
    <div class="stat-card"><label>Total Cash</label><val style="color:#F97316;">₹ ${Number(data.cash_collected).toLocaleString('en-IN')}</val></div>
    <div class="stat-card"><label>Total Digital</label><val style="color:#2563EB;">₹ ${Number(data.digital_collected).toLocaleString('en-IN')}</val></div>
    <div class="stat-card"><label>Cash Awaiting Handover</label><val style="color:#15803D;">₹ ${Number(data.unsettled_cash_amount).toLocaleString('en-IN')}</val></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Receipt #</th>
        <th>Donor Name</th>
        <th>Amount (₹)</th>
        <th>Mode</th>
        <th>Purpose</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.receipts.map((r: any) => `
        <tr>
          <td><b>${r.receipt_number}</b></td>
          <td>${r.donor_name}</td>
          <td><b>₹ ${Number(r.amount).toLocaleString('en-IN')}</b></td>
          <td>${r.payment_mode.toUpperCase()}</td>
          <td>${r.purpose}</td>
          <td>${r.status.toUpperCase()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Collector Signature (${data.collector_name})</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Treasurer / Trustee Receiving Physical Cash</div>
    </div>
  </div>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  const columns = [
    { title: 'Receipt #', dataIndex: 'receipt_number', key: 'receipt_number', render: (num: string) => <b style={{ whiteSpace: 'nowrap' }}>{num}</b> },
    { title: 'Donor', dataIndex: 'donor_name', key: 'donor_name' },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#0B2347', whiteSpace: 'nowrap' }}>₹ {Number(val).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => (
        <Tag color={mode.toLowerCase() === 'cash' ? 'orange' : 'blue'}>
          {mode.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'settled' ? 'success' : st === 'pending_settlement' ? 'warning' : 'processing'}>
          {st.toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 28 }}>
          <RocketOutlined style={{ color: '#F97316', fontSize: 22, flexShrink: 0 }} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#0B2347', fontSize: 16 }}>Collector EOD Daily Summary & Cash Handover</Title>
            <Text type="secondary" style={{ fontSize: 11 }}>Daily collections report & physical cash handover</Text>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={840}
      style={{ top: 12, maxWidth: 'calc(100vw - 16px)', margin: '0 auto' }}
      styles={{ body: { padding: '16px 12px' } }}
      destroyOnHidden
    >
      <div style={{ marginBottom: 20, background: '#F8F9FC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
        <Row gutter={[12, 12]} align="bottom">
          <Col xs={12} sm={6}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Collector</Text>
            <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
              <Text style={{ fontWeight: 800, color: '#0B2347', fontSize: 13, whiteSpace: 'nowrap' }}>👤 {data?.collector_name || 'Collector'}</Text>
            </div>
          </Col>

          <Col xs={12} sm={unsettledCashAmount > 0 ? 6 : 8}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Summary Date</Text>
            <DatePicker
              value={targetDate}
              onChange={(date) => date && setTargetDate(date)}
              format="DD MMM YYYY"
              allowClear={false}
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={unsettledCashAmount > 0 ? 12 : 24} sm={unsettledCashAmount > 0 ? 6 : 10}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>EOD Slip</Text>
            <Button icon={<PrinterOutlined />} onClick={handlePrintEODHandover} block>
              Print EOD Slip
            </Button>
          </Col>

          {unsettledCashAmount > 0 && onOpenSettlementWithReceipts && (
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Treasurer Handover</Text>
              <Button
                type="primary"
                icon={<BankOutlined />}
                style={{ background: '#22C55E', borderColor: '#22C55E', fontWeight: 700 }}
                onClick={() => {
                  onClose();
                  onOpenSettlementWithReceipts(unsettledReceiptIds);
                }}
                block
              >
                Handover ₹{unsettledCashAmount.toLocaleString('en-IN')} <ArrowRightOutlined />
              </Button>
            </Col>
          )}
        </Row>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : (
        <div>
          {/* Summary Stat Cards */}
          <Row gutter={[16, 16]} className="hissob-stat-row" style={{ marginBottom: 20 }}>
            <Col xs={12} sm={6} className="hissob-stat-col">
              <Card
                className="hissob-stat-card"
                style={{
                  background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
                  border: '1px solid #E2E8F0',
                  borderTop: '4px solid #0B2347',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#0B2347', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  💰 Today's Collection
                </Text>
                <div style={{ marginTop: 4, color: '#0B2347', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>
                  ₹ {Number(data?.total_collected || 0).toLocaleString('en-IN')}
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} className="hissob-stat-col">
              <Card
                className="hissob-stat-card"
                style={{
                  background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)',
                  border: '1px solid #FFEDD5',
                  borderTop: '4px solid #F97316',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  💵 Cash Collected
                </Text>
                <div style={{ marginTop: 4, color: '#EA580C', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>
                  ₹ {Number(data?.cash_collected || 0).toLocaleString('en-IN')}
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} className="hissob-stat-col">
              <Card
                className="hissob-stat-card"
                style={{
                  background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)',
                  border: '1px solid #DBEAFE',
                  borderTop: '4px solid #2563EB',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  📱 Digital (UPI/Cheque)
                </Text>
                <div style={{ marginTop: 4, color: '#2563EB', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>
                  ₹ {Number(data?.digital_collected || 0).toLocaleString('en-IN')}
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} className="hissob-stat-col">
              <Card
                className="hissob-stat-card"
                style={{
                  background: 'linear-gradient(180deg, #ECFDF5 0%, #FFFFFF 100%)',
                  border: '1px solid #BBF7D0',
                  borderTop: '4px solid #10B981',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  🤝 Awaiting Handover
                </Text>
                <div style={{ marginTop: 4, color: '#15803D', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>
                  ₹ {Number(data?.unsettled_cash_amount || 0).toLocaleString('en-IN')}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Today's Receipts Table */}
          <Card className="hissob-card" title={`Receipts Collected Today (${receipts.length})`}>
            {receipts.length === 0 ? (
              <Empty description="No receipts recorded on this date" />
            ) : (
              <Table
                dataSource={receipts}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
              />
            )}
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default CollectorDailySummaryModal;
