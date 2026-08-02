import React from 'react';
import { Modal, Button, Typography, Row, Col, Tag, Divider, Space } from 'antd';
import { PrinterOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface Tax80GData {
  certificateNumber: string;
  donorName: string;
  panNumber?: string;
  address?: string;
  financialYear: string;
  totalDonationAmount: number;
  receiptNumbers: string[];
  trustName: string;
  trustPan?: string;
  registrationNumber?: string;
  approval80GNumber?: string;
  issueDate: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: Tax80GData | null;
}

const Tax80GCertificateModal: React.FC<Props> = ({ open, onClose, data }) => {
  if (!data) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#F97316' }} />
          <span>Section 80G Tax Exemption Certificate</span>
        </Space>
      }
      width={720}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          style={{ background: '#F97316', borderColor: '#F97316' }}
          onClick={() => window.print()}
        >
          Print Certificate
        </Button>,
      ]}
    >
      <div style={{ padding: 24, border: '3px double #0B2347', borderRadius: 10, background: '#FFF' }}>
        {/* Certificate Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Tag color="gold" style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, marginBottom: 8 }}>
            INCOME TAX ACT 1961 • SECTION 80G DEDUCTION
          </Tag>
          <Title level={3} style={{ color: '#0B2347', margin: '4px 0', fontWeight: 900 }}>
            {data.trustName || 'HISSOB CHARITABLE & CULTURAL TRUST'}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Trust Reg No: <b>{data.registrationNumber || 'REG/80G/2024/7741'}</b> • PAN: <b>{data.trustPan || 'AAATH1234F'}</b>
          </Text><br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Income Tax 80G Approval No: <b>{data.approval80GNumber || 'CIT(E)/80G/MUMBAI/2024-25/A-1092'}</b>
          </Text>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Certificate Body */}
        <div style={{ margin: '20px 0', lineHeight: 1.8, fontSize: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ textDecoration: 'underline', color: '#0B2347' }}>
              DONATION RECEIPT & TAX EXEMPTION CERTIFICATE
            </Title>
            <Text type="secondary">Certificate No: <b>{data.certificateNumber}</b> | Date: <b>{data.issueDate}</b></Text>
          </div>

          <p>
            This is to certify that <b>{data.donorName}</b> (PAN: <b>{data.panNumber || 'NOT PROVIDED'}</b>), 
            residing at <i>{data.address || 'India'}</i>, has donated a total sum of 
            <b style={{ fontSize: 16, color: '#22C55E' }}> ₹ {Number(data.totalDonationAmount).toLocaleString('en-IN')}</b> 
            to {data.trustName} during the Financial Year <b>{data.financialYear}</b>.
          </p>

          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, margin: '16px 0', border: '1px solid #E2E8F0' }}>
            <Row gutter={[12, 8]}>
              <Col span={12}><b>Financial Year:</b> {data.financialYear}</Col>
              <Col span={12}><b>Total Contribution:</b> ₹ {Number(data.totalDonationAmount).toLocaleString('en-IN')}</Col>
              <Col span={24}><b>Receipt Numbers:</b> {data.receiptNumbers.join(', ')}</Col>
            </Row>
          </div>

          <p style={{ fontSize: 12, color: '#64748B' }}>
            * This donation is eligible for deduction under Section 80G of the Income Tax Act, 1961 in the hands of the donor. 
            No goods or services were provided in exchange for this contribution.
          </p>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Signatures & Verification Stamp */}
        <Row justify="space-between" align="bottom" style={{ marginTop: 30 }}>
          <Col>
            <div style={{ textAlign: 'center', padding: 8, background: '#EFF6FF', borderRadius: 8, border: '1px dashed #3B82F6' }}>
              <CheckCircleOutlined style={{ fontSize: 20, color: '#2563EB' }} /><br />
              <Text style={{ fontSize: 11, color: '#1E40AF', fontWeight: 700 }}>
                Digitally Verified & Validated
              </Text>
            </div>
          </Col>
          <Col style={{ textAlign: 'right' }}>
            <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 6, width: 180, textAlign: 'center' }}>
              <Text style={{ fontWeight: 700, fontSize: 12, color: '#0B2347' }}>Authorized Trustee</Text><br />
              <Text type="secondary" style={{ fontSize: 10 }}>For {data.trustName}</Text>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default Tax80GCertificateModal;
