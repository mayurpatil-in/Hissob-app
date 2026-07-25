import React, { useState } from 'react';
import { Modal, InputNumber, Row, Col, Typography, Card, Button, Space, Tag } from 'antd';
import { CalculatorOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  targetTotal: number;
  onConfirmNotes: (notesSummary: string) => void;
}

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5];

const CashDenominationModal: React.FC<Props> = ({ open, onClose, targetTotal, onConfirmNotes }) => {
  const [counts, setCounts] = useState<Record<number, number>>({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0
  });

  const handleCountChange = (denom: number, val: number | null) => {
    setCounts(prev => ({
      ...prev,
      [denom]: Math.max(0, val || 0)
    }));
  };

  const calculatedTotal = Object.entries(counts).reduce((sum, [denom, count]) => {
    return sum + (Number(denom) * Number(count || 0));
  }, 0);

  const isMatch = calculatedTotal === targetTotal;

  const handleSave = () => {
    const breakdown = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([denom, count]) => `₹${denom} x ${count}`)
      .join(', ');

    const summaryStr = breakdown ? `Denominations: ${breakdown}` : 'Physical Cash Handover';
    onConfirmNotes(summaryStr);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <CalculatorOutlined style={{ color: '#F97316' }} />
          <span>Physical Cash Denomination Calculator</span>
        </Space>
      }
      width={560}
      footer={[
        <Button key="close" onClick={onClose}>Cancel</Button>,
        <Button
          key="confirm"
          type="primary"
          icon={<CheckCircleOutlined />}
          style={{ background: isMatch ? '#22C55E' : '#F97316', borderColor: isMatch ? '#22C55E' : '#F97316', borderRadius: 8, fontWeight: 700 }}
          onClick={handleSave}
        >
          Attach Denominations ({isMatch ? 'Exact Match ✅' : 'Use Count'})
        </Button>
      ]}
    >
      <div style={{ padding: 12, background: '#FFF7ED', borderRadius: 8, marginBottom: 16, border: '1px solid #FFEDD5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>TARGET SETTLEMENT BATCH</Text><br />
          <span style={{ fontSize: 18, fontWeight: 900, color: '#0B2347' }}>₹ {targetTotal.toLocaleString('en-IN')}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>COUNTED TOTAL</Text><br />
          <span style={{ fontSize: 18, fontWeight: 900, color: isMatch ? '#22C55E' : '#EF4444' }}>
            ₹ {calculatedTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {!isMatch && targetTotal > 0 && (
        <Tag color="warning" style={{ marginBottom: 16, width: '100%', padding: '6px 12px', borderRadius: 6 }}>
          ⚠️ Difference: ₹ {Math.abs(targetTotal - calculatedTotal).toLocaleString('en-IN')} {calculatedTotal > targetTotal ? 'Surplus' : 'Shortfall'}
        </Tag>
      )}

      <Card className="hissob-card" style={{ background: '#F8FAFC' }}>
        {DENOMINATIONS.map(denom => (
          <Row key={denom} align="middle" style={{ marginBottom: 10 }}>
            <Col span={8}>
              <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px', width: 70, textAlign: 'center' }}>
                ₹ {denom}
              </Tag>
            </Col>
            <Col span={8}>
              <InputNumber
                min={0}
                value={counts[denom]}
                onChange={(val) => handleCountChange(denom, val)}
                placeholder="0"
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={8} style={{ textAlign: 'right', fontWeight: 700, color: '#0B2347' }}>
              = ₹ {(denom * (counts[denom] || 0)).toLocaleString('en-IN')}
            </Col>
          </Row>
        ))}
      </Card>
    </Modal>
  );
};

export default CashDenominationModal;
