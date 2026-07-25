import React from 'react';
import { Card, Row, Col, Typography, Tag, Progress } from 'antd';
import {
  DollarOutlined, CreditCardOutlined, BankOutlined,
  RiseOutlined, FallOutlined, BarChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Props {
  totalCollections: number;
  cashAmount: number;
  digitalAmount: number;
  settledAmount: number;
  pendingAmount: number;
  totalExpenses?: number;
}

const FinancialAnalyticsWidget: React.FC<Props> = ({
  totalCollections,
  cashAmount,
  digitalAmount,
  settledAmount,
  pendingAmount,
  totalExpenses = 0,
}) => {
  const cashPct = totalCollections > 0 ? Math.round((cashAmount / totalCollections) * 100) : 0;
  const digitalPct = totalCollections > 0 ? Math.round((digitalAmount / totalCollections) * 100) : 0;
  const settledPct = totalCollections > 0 ? Math.round((settledAmount / totalCollections) * 100) : 0;
  const pendingPct = totalCollections > 0 ? Math.round((pendingAmount / totalCollections) * 100) : 0;
  const netSurplus = totalCollections - totalExpenses;

  return (
    <Card className="hissob-card animate-fadeIn" style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0B2347', fontWeight: 800 }}>
            <BarChartOutlined style={{ color: '#F97316', marginRight: 8 }} />
            Financial Analytics & Payment Distribution
          </Title>
          <Text type="secondary">Visual breakdown of collection channels, verification status, and cash flow</Text>
        </div>
        <Tag color="blue" style={{ borderRadius: 12, padding: '4px 12px', fontWeight: 600 }}>
          LIVE AUDIT ANALYTICS
        </Tag>
      </div>

      <Row gutter={[20, 20]}>
        {/* Payment Channels Visual Breakdown */}
        <Col xs={24} md={12}>
          <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', height: '100%' }}>
            <Text style={{ fontWeight: 700, fontSize: 14, color: '#0B2347' }}>
              Collection Channel Split (Cash vs UPI/Digital)
            </Text>

            <div style={{ margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span><DollarOutlined style={{ color: '#F97316' }} /> Cash Collections</span>
                <b>₹ {cashAmount.toLocaleString('en-IN')} ({cashPct}%)</b>
              </div>
              <Progress percent={cashPct} strokeColor="#F97316" showInfo={false} />
            </div>

            <div style={{ margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span><CreditCardOutlined style={{ color: '#0EA5E9' }} /> UPI / Digital Collections</span>
                <b>₹ {digitalAmount.toLocaleString('en-IN')} ({digitalPct}%)</b>
              </div>
              <Progress percent={digitalPct} strokeColor="#0EA5E9" showInfo={false} />
            </div>
          </div>
        </Col>

        {/* Audit Verification & Reserve Health */}
        <Col xs={24} md={12}>
          <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', height: '100%' }}>
            <Text style={{ fontWeight: 700, fontSize: 14, color: '#0B2347' }}>
              Treasury Settlement & Net Reserve Health
            </Text>

            <div style={{ margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span><BankOutlined style={{ color: '#22C55E' }} /> Settled & Ledger Posted</span>
                <b>₹ {settledAmount.toLocaleString('en-IN')} ({settledPct}%)</b>
              </div>
              <Progress percent={settledPct} strokeColor="#22C55E" showInfo={false} />
            </div>

            <div style={{ margin: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span><BarChartOutlined style={{ color: '#F59E0B' }} /> Pending Verification Queue</span>
                <b>₹ {pendingAmount.toLocaleString('en-IN')} ({pendingPct}%)</b>
              </div>
              <Progress percent={pendingPct} strokeColor="#F59E0B" showInfo={false} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, padding: 10, background: '#FFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>NET SURPLUS / RESERVE BALANCE</Text><br />
                <span style={{ fontSize: 18, fontWeight: 900, color: netSurplus >= 0 ? '#22C55E' : '#EF4444' }}>
                  ₹ {netSurplus.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                {netSurplus >= 0 ? (
                  <Tag color="success" icon={<RiseOutlined />}>SURPLUS RESERVES</Tag>
                ) : (
                  <Tag color="error" icon={<FallOutlined />}>DEFICIT</Tag>
                )}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default FinancialAnalyticsWidget;
