import React, { useState } from 'react';
import {
  Modal, Form, Input, Select, Button, Typography,
  Space, App, Alert, Row, Col
} from 'antd';
import {
  LinkOutlined, CopyOutlined, CheckCircleOutlined,
  WhatsAppOutlined, QrcodeOutlined, DollarOutlined,
  SendOutlined
} from '@ant-design/icons';
import QRCode from 'qrcode';
import { createRazorpayPaymentLink, formatErrorMessage } from '../../api/services';

const { Title, Text } = Typography;

const AMOUNT_PRESETS = [101, 251, 501, 1001, 2501, 5001];

const PURPOSES = [
  'General Donation',
  'Festival & Utsav Campaign',
  'Annadaan & Mahaprasad',
  'Mandir / Building Fund',
  'Social Welfare & Charity',
];

interface Props {
  open: boolean;
  onClose: () => void;
  orgSlug?: string;
  orgName?: string;
}

export const PaymentLinkModal: React.FC<Props> = ({
  open,
  onClose,
  orgSlug,
  orgName = 'Hissob Organization',
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeImgUrl, setQrCodeImgUrl] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(501);
  const [customAmount, setCustomAmount] = useState<string>('');

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleGenerateLink = async (values: any) => {
    if (effectiveAmount <= 0) {
      message.error('Donation amount must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const res = await createRazorpayPaymentLink({
        amount: effectiveAmount,
        donor_name: values.donor_name,
        donor_phone: values.donor_phone,
        donor_email: values.donor_email,
        purpose: values.purpose || 'General Donation',
        description: values.description,
        slug_or_id: orgSlug,
      });

      setGeneratedResult(res);
      message.success('Payment Link created successfully!');

      // Generate QR Code for short URL
      if (res.short_url) {
        QRCode.toDataURL(res.short_url, { margin: 1, width: 220 })
          .then((url) => setQrCodeImgUrl(url))
          .catch(() => setQrCodeImgUrl(null));
      }
    } catch (err: any) {
      message.error(formatErrorMessage(err?.response?.data?.detail, 'Failed to create Razorpay payment link'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedResult?.short_url) {
      navigator.clipboard.writeText(generatedResult.short_url);
      setCopiedLink(true);
      message.success('Payment link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleReset = () => {
    setGeneratedResult(null);
    setQrCodeImgUrl(null);
    setCopiedLink(false);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        handleReset();
        onClose();
      }}
      footer={null}
      width={600}
      destroyOnHidden
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#F97316', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
            <LinkOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, fontWeight: 900 }}>
              Razorpay Payment Link Generator
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Generate shareable online donation links for {orgName} via WhatsApp & SMS
            </Text>
          </div>
        </div>
      }
    >
      {!generatedResult ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerateLink}
          initialValues={{
            purpose: 'General Donation',
          }}
          style={{ marginTop: 16 }}
        >
          {/* Preset Amounts */}
          <Text style={{ fontWeight: 800, fontSize: 13, display: 'block', marginBottom: 8 }}>
            1. Select Amount (₹)
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {AMOUNT_PRESETS.map((amt) => {
              const isSelected = selectedAmount === amt && !customAmount;
              return (
                <Button
                  key={amt}
                  type={isSelected ? 'primary' : 'default'}
                  onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                  style={{
                    height: 38,
                    fontWeight: 800,
                    borderRadius: 8,
                    background: isSelected ? '#F97316' : undefined,
                    borderColor: isSelected ? '#F97316' : undefined,
                  }}
                >
                  ₹ {amt}
                </Button>
              );
            })}
          </div>

          <Input
            prefix={<DollarOutlined style={{ color: '#F97316' }} />}
            placeholder="Or enter custom amount in ₹"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            style={{ borderRadius: 8, marginBottom: 16 }}
          />

          {/* Purpose */}
          <Form.Item name="purpose" label={<span style={{ fontWeight: 700 }}>2. Purpose / Seva</span>} style={{ marginBottom: 14 }}>
            <Select style={{ borderRadius: 8 }}>
              {PURPOSES.map((p) => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="donor_name" label={<span style={{ fontWeight: 700 }}>Donor Name (Optional)</span>} style={{ marginBottom: 14 }}>
                <Input placeholder="e.g. Ramesh Patel" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="donor_phone" label={<span style={{ fontWeight: 700 }}>Donor Mobile (Optional)</span>} style={{ marginBottom: 14 }}>
                <Input placeholder="e.g. 9876543210" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<span style={{ fontWeight: 700 }}>Custom Message / Note (Optional)</span>} style={{ marginBottom: 16 }}>
            <Input.TextArea rows={2} placeholder="Add a personalized message or note for the donor..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            icon={<SendOutlined />}
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              borderColor: '#F97316',
              height: 46,
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            Create Shareable Payment Link (₹{effectiveAmount.toLocaleString('en-IN')})
          </Button>
        </Form>
      ) : (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Alert
            type={generatedResult.is_mock ? 'warning' : 'success'}
            showIcon
            message={
              <span style={{ fontWeight: 800 }}>
                {generatedResult.is_mock ? 'Demo Payment Link Generated' : 'Official Razorpay Payment Link Live'}
              </span>
            }
            description={`Amount: ₹${generatedResult.amount?.toLocaleString('en-IN')} • ID: ${generatedResult.payment_link_id}`}
            style={{ marginBottom: 16, textAlign: 'left', borderRadius: 10 }}
          />

          {/* QR Code Container */}
          <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0', display: 'inline-block', marginBottom: 16 }}>
            {qrCodeImgUrl ? (
              <img src={qrCodeImgUrl} alt="Payment Link QR Code" style={{ width: 180, height: 180, borderRadius: 8 }} />
            ) : (
              <QrcodeOutlined style={{ fontSize: 120, color: '#94A3B8' }} />
            )}
            <Text style={{ fontSize: 11, display: 'block', color: '#64748B', marginTop: 4, fontWeight: 700 }}>
              Scan QR to Pay Online
            </Text>
          </div>

          {/* Short URL Box */}
          <div style={{ background: '#0F172A', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <Text copyable style={{ color: '#38BDF8', fontWeight: 800, fontSize: 13, wordBreak: 'break-all' }}>
              {generatedResult.short_url}
            </Text>
            <Button
              type={copiedLink ? 'primary' : 'default'}
              icon={copiedLink ? <CheckCircleOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
              size="small"
              style={{ fontWeight: 700 }}
            >
              {copiedLink ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* WhatsApp Button */}
          <Space size="middle" style={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<WhatsAppOutlined style={{ fontSize: 20 }} />}
              href={generatedResult.whatsapp_link}
              target="_blank"
              style={{
                background: '#25D366',
                borderColor: '#25D366',
                height: 46,
                borderRadius: 10,
                fontWeight: 800,
                padding: '0 24px',
              }}
            >
              Send Link via WhatsApp
            </Button>
            <Button
              onClick={handleReset}
              size="large"
              style={{ height: 46, borderRadius: 10, fontWeight: 700 }}
            >
              Create Another Link
            </Button>
          </Space>
        </div>
      )}
    </Modal>
  );
};
