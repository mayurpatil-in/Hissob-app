import React from 'react';
import { Modal, Button, Typography, Row, Col, Divider, Tag } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface HandoverSlipData {
  settlementNumber: string;
  settlementDate: string;
  collectorName: string;
  treasurerName?: string;
  totalAmount: number;
  receiptCount: number;
  notes?: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: HandoverSlipData | null;
}

const PrintHandoverSlipModal: React.FC<Props> = ({ open, onClose, data }) => {
  if (!data) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Print Cash Handover Receipt Slip"
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          style={{ background: '#F97316', borderColor: '#F97316' }}
          onClick={() => window.print()}
        >
          Print Handover Slip
        </Button>,
      ]}
    >
      <div style={{ padding: 20, border: '2px solid #0B2347', borderRadius: 8, background: '#FFF' }}>
        <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '1px dashed #CCC', paddingBottom: 12 }}>
          <Title level={4} style={{ color: '#0B2347', margin: 0, fontWeight: 900 }}>
            HISSOB ERP — CASH HANDOVER VOUCHER
          </Title>
          <Text type="secondary">Physical Cash Settlement Verification Slip</Text>
        </div>

        <Row style={{ marginBottom: 12 }}>
          <Col span={12}><b>Batch No:</b> {data.settlementNumber}</Col>
          <Col span={12} style={{ textAlign: 'right' }}><b>Date:</b> {data.settlementDate}</Col>
        </Row>

        <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 8, margin: '14px 0', border: '1px solid #E2E8F0' }}>
          <Row gutter={[12, 8]}>
            <Col span={12}><b>Collector Name:</b> {data.collectorName}</Col>
            <Col span={12}><b>Receipts Handed Over:</b> {data.receiptCount}</Col>
            <Col span={24}>
              <b>Total Cash Amount:</b>{' '}
              <span style={{ fontSize: 18, color: '#22C55E', fontWeight: 900 }}>
                ₹ {Number(data.totalAmount).toLocaleString('en-IN')}
              </span>
            </Col>
            {data.notes && <Col span={24}><b>Notes / Denominations:</b> {data.notes}</Col>}
          </Row>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text>Status: <Tag color={data.status === 'approved' ? 'success' : 'warning'}>{data.status.toUpperCase()}</Tag></Text>
          <Text type="secondary" style={{ fontSize: 11 }}>System Timestamped & Audit Verified</Text>
        </div>

        <Divider style={{ margin: '20px 0 10px 0' }} />

        <Row justify="space-between" align="bottom" style={{ marginTop: 30 }}>
          <Col>
            <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 4, width: 140, textAlign: 'center' }}>
              <Text style={{ fontWeight: 700, fontSize: 11 }}>Collector Signature</Text><br />
              <Text type="secondary" style={{ fontSize: 10 }}>({data.collectorName})</Text>
            </div>
          </Col>
          <Col>
            <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 4, width: 140, textAlign: 'center' }}>
              <Text style={{ fontWeight: 700, fontSize: 11 }}>Treasurer Signature</Text><br />
              <Text type="secondary" style={{ fontSize: 10 }}>(Verified & Received)</Text>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default PrintHandoverSlipModal;
