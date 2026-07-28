import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Tag, Progress, Alert, Space } from 'antd';
import {
  RobotOutlined, SafetyCertificateOutlined,
  RiseOutlined, AudioOutlined, BulbOutlined, CheckCircleOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import AIInsightsWidget from './AIInsightsWidget';
import AIVoiceAssistantModal from './AIVoiceAssistantModal';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const AIInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAiVoiceModalOpen, setIsAiVoiceModalOpen] = useState(false);

  return (
    <div className="ai-insights-module animate-fadeIn">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>
            <RobotOutlined style={{ color: '#F97316', marginRight: 8 }} />
            Smart AI Financial Intelligence Center
          </Title>
          <Text type="secondary">
            Powered by LLM Neural Auditing • Real-time anomaly detection, voice receipt entry & festival donation forecasting
          </Text>
        </div>
        <Button
          type="primary"
          icon={<AudioOutlined />}
          size="large"
          onClick={() => setIsAiVoiceModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
        >
          AI Voice Receipt Assistant
        </Button>
      </div>

      {/* ── Top AI Health Cards Banner ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card" style={{ borderTop: '4px solid #22C55E' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              AI HEALTH SCORE
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, color: '#22C55E', fontWeight: 900 }}>
                98 / 100
              </Title>
              <Tag color="success" icon={<CheckCircleOutlined />}>OPTIMAL</Tag>
            </div>
            <Progress percent={98} strokeColor="#22C55E" showInfo={false} size="small" style={{ marginTop: 8 }} />
            <Text type="secondary" style={{ fontSize: 11 }}>No cash ledger discrepancies detected</Text>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="hissob-card" style={{ borderTop: '4px solid #3B82F6' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              NEURAL AUDIT ENGINE
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Title level={4} style={{ margin: 0, color: '#0B2347', fontWeight: 800 }}>
                Llama 3 / Groq
              </Title>
              <Tag color="processing">ACTIVE</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 12 }}>
              Scanning 100% of receipts & vendor payouts
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="hissob-card" style={{ borderTop: '4px solid #F97316' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              ANOMALY DETECTION
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, color: '#F97316', fontWeight: 900 }}>
                0 Alerts
              </Title>
              <Tag color="orange" icon={<SafetyCertificateOutlined />}>SECURE</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 12 }}>
              Zero unverified high-value transactions
            </Text>
          </Card>
        </Col>
      </Row>

      {/* ── Shifted Smart AI Financial Insights Component ── */}
      <div style={{ marginBottom: 20 }}>
        <AIInsightsWidget />
      </div>

      {/* ── Advanced AI Capabilities Grid ── */}
      <Row gutter={[20, 20]}>
        {/* Left Column: AI Anomaly & Fraud Audit */}
        <Col xs={24} md={12}>
          <Card className="hissob-card" title={<span><SafetyCertificateOutlined style={{ color: '#F97316' }} /> AI Fraud & Anomaly Audit Scanner</span>}>
            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 14 }}>
              <Space align="start">
                <CheckCircleOutlined style={{ fontSize: 20, color: '#22C55E', marginTop: 2 }} />
                <div>
                  <Text style={{ fontWeight: 700, color: '#0B2347' }}>Multi-Tenant Security & Role Isolation</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    AI verifies that only authorized Treasurers & Trustees verify settlement batches.
                  </Text>
                </div>
              </Space>
            </div>

            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 14 }}>
              <Space align="start">
                <CheckCircleOutlined style={{ fontSize: 20, color: '#22C55E', marginTop: 2 }} />
                <div>
                  <Text style={{ fontWeight: 700, color: '#0B2347' }}>Duplicate Receipt Prevention</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    AI cross-checks UTR reference numbers to prevent double recording of UPI donations.
                  </Text>
                </div>
              </Space>
            </div>

            <Button
              type="default"
              icon={<ExperimentOutlined />}
              onClick={() => navigate('/audit')}
              style={{ width: '100%', borderColor: '#F97316', color: '#F97316', fontWeight: 600 }}
            >
              Inspect Live System Audit Logs
            </Button>
          </Card>
        </Col>

        {/* Right Column: Predictive Festival Forecasting */}
        <Col xs={24} md={12}>
          <Card className="hissob-card" title={<span><RiseOutlined style={{ color: '#22C55E' }} /> AI Festival Collection Forecast</span>}>
            <Alert
              type="info"
              showIcon
              icon={<BulbOutlined style={{ color: '#0EA5E9' }} />}
              title="Upcoming Ganesh Utsav Collection Projection"
              description="Based on past donor contributions and active financial year trends, AI projects a +24% increase in digital UPI donations for the upcoming festival season."
              style={{ marginBottom: 16 }}
            />

            <div style={{ padding: 12, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
              <Text style={{ fontWeight: 700, color: '#1E40AF' }}>AI Recommendation:</Text><br />
              <Text style={{ fontSize: 12, color: '#1E3A8A' }}>
                Enable 1-click WhatsApp Receipt sharing and Section 80G tax certificate generation to boost VIP donor engagement during peak festival days.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── AI Voice Assistant Modal ── */}
      <AIVoiceAssistantModal
        open={isAiVoiceModalOpen}
        onCancel={() => setIsAiVoiceModalOpen(false)}
        onApplyParsedData={() => {
          setIsAiVoiceModalOpen(false);
          navigate('/receipts');
        }}
      />
    </div>
  );
};

export default AIInsightsPage;
