import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Input, Button, Form, Segmented,
  Tag, App, Modal, Result, Avatar, Spin
} from 'antd';
import {
  SafetyOutlined, CheckCircleOutlined,
  CopyOutlined, HeartFilled,
  DollarOutlined, LockOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPublicOrgInfo, submitPublicDonation, lookupPublicDonor } from '../../api/services';
import QRCode from 'qrcode';

const { Title, Text } = Typography;

const AMOUNT_PRESETS = [101, 251, 501, 1001, 2501, 5001];

const PURPOSES = [
  'General Donation',
  'Festival & Utsav Campaign',
  'Annadaan & Mahaprasad',
  'Mandir / Building Fund',
  'Social Welfare & Charity',
];

const UpiPaymentPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [selectedAmount, setSelectedAmount] = useState<number>(501);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('General Donation');
  const [completedReceipt, setCompletedReceipt] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [existingDonorInfo, setExistingDonorInfo] = useState<any>(null);

  // Fetch Public Organization Info
  const { data: org } = useQuery({
    queryKey: ['publicOrgInfo', slug],
    queryFn: () => getPublicOrgInfo(slug),
  });

  const handlePhoneBlur = async (phoneVal: string) => {
    const val = phoneVal.trim();
    if (val.length >= 10) {
      try {
        const info = await lookupPublicDonor(val, slug || org?.slug);
        if (info && info.exists) {
          setExistingDonorInfo(info);
          form.setFieldsValue({
            full_name: info.full_name || form.getFieldValue('full_name'),
            email: info.email || form.getFieldValue('email'),
            pan_number: info.pan_number || form.getFieldValue('pan_number'),
            city: info.city || form.getFieldValue('city'),
          });
          message.success(`Verified existing donor: ${info.full_name} (${info.donor_number})`);
        } else {
          setExistingDonorInfo(null);
        }
      } catch (err) {
        setExistingDonorInfo(null);
      }
    }
  };

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  // Form submit mutation
  const submitMutation = useMutation({
    mutationFn: submitPublicDonation,
    onSuccess: (data) => {
      setCompletedReceipt(data);
      setIsSuccessModalOpen(true);
      message.success('Donation submitted successfully! Receipt generated.');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to submit payment details');
    },
  });

  const upiId = org?.upi_id || '8275831212@upi';
  const orgName = org?.name || 'Festival Trust / Mandal';
  const apiHost = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
  const logoUrl = org?.logo_url ? (org.logo_url.startsWith('http') ? org.logo_url : apiHost + org.logo_url) : null;

  // Construct standard UPI Payment URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(orgName)}&am=${effectiveAmount}&tn=${encodeURIComponent(purpose)}&cu=INR`;
  const [qrCodeImgUrl, setQrCodeImgUrl] = useState<string | null>(null);

  React.useEffect(() => {
    QRCode.toDataURL(upiUri, { margin: 1, width: 250 })
      .then((url: string) => setQrCodeImgUrl(url))
      .catch(() => setQrCodeImgUrl(null));
  }, [upiUri]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    message.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleOpenUpiApp = (appScheme?: string) => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      const targetUri = appScheme ? `${appScheme}pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(orgName)}&am=${effectiveAmount}&tn=${encodeURIComponent(purpose)}&cu=INR` : upiUri;
      window.location.href = targetUri;
    } else {
      message.info('📱 You are on a desktop device. Please scan the QR code above with Google Pay, PhonePe, or Paytm on your mobile phone!');
    }
  };

  const handleFormFinish = (values: any) => {
    if (effectiveAmount <= 0) {
      message.warning('Please select or enter a valid donation amount');
      return;
    }

    submitMutation.mutate({
      slug_or_id: slug || org?.slug,
      full_name: values.full_name,
      phone: values.phone,
      email: values.email,
      pan_number: values.pan_number,
      city: values.city,
      amount: effectiveAmount,
      payment_mode: 'upi',
      upi_reference: values.upi_reference,
      purpose: purpose,
      notes: values.notes,
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      padding: '24px 16px 48px 16px',
      color: '#F8FAFC',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* ── Top Header Brand ── */}
      <div style={{ maxWidth: 840, margin: '0 auto 24px auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {logoUrl ? (
            <Avatar src={logoUrl} size={54} style={{ border: '2px solid #F97316' }} />
          ) : (
            <Avatar size={54} style={{ backgroundColor: '#F97316', fontWeight: 900, fontSize: 24 }}>
              {(orgName[0] || 'H').toUpperCase()}
            </Avatar>
          )}
          <div style={{ textAlign: 'left' }}>
            <Title level={3} style={{ color: '#FFFFFF', margin: 0, fontWeight: 900, letterSpacing: '-0.5px' }}>
              {orgName}
            </Title>
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              {org?.city ? `${org.city}, ${org.state || 'India'}` : 'Official Public Donation Portal'}
            </Text>
          </div>
        </div>

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag color="orange" icon={<SafetyOutlined />}>Verified Non-Profit / Trust</Tag>
          {org?.pan && <Tag color="blue">PAN: {org.pan}</Tag>}
          {org?.registration_number && <Tag color="purple">Reg: {org.registration_number}</Tag>}
          <Tag color="green" icon={<CheckCircleOutlined />}>Instant 80G Receipt</Tag>
        </div>
      </div>

      {/* ── Main Payment Container Card ── */}
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <Card style={{
          borderRadius: 20,
          background: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          border: 'none',
          overflow: 'hidden'
        }}>
          <Row gutter={[24, 24]}>
            {/* ── LEFT COL: Amount & QR Code ── */}
            <Col xs={24} md={11} style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9', paddingRight: 20 }}>
              <div style={{ background: '#FFF7ED', borderRadius: 16, padding: '16px 12px', marginBottom: 16, border: '1px solid #FFEDD5' }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Scan to Pay via Any UPI App
                </Text>
                
                {/* Live Scannable QR Code */}
                <div style={{ margin: '12px auto', width: 210, height: 210, padding: 8, background: '#FFF', borderRadius: 14, boxShadow: '0 4px 14px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {qrCodeImgUrl ? (
                    <img
                      src={qrCodeImgUrl}
                      alt="UPI Payment QR Code"
                      style={{ width: '100%', height: '100%', borderRadius: 8 }}
                    />
                  ) : (
                    <Spin size="large" />
                  )}
                </div>

                <Title level={3} style={{ margin: '4px 0', color: '#EA580C', fontWeight: 900 }}>
                  ₹ {effectiveAmount.toLocaleString('en-IN')}
                </Title>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Purpose: <b>{purpose}</b></Text>
              </div>

              {/* UPI ID & Copy Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F8FAFC', padding: '8px 12px', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  UPI ID: <b>{upiId}</b>
                </Text>
                <Button
                  size="small"
                  type={copiedUpi ? 'primary' : 'default'}
                  icon={copiedUpi ? <CheckCircleOutlined /> : <CopyOutlined />}
                  onClick={handleCopyUpi}
                  style={{ fontSize: 11 }}
                >
                  {copiedUpi ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Mobile Quick Intent Buttons */}
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, fontWeight: 700 }}>
                📱 Tap to Open Direct UPI App (Mobile Only)
              </Text>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  onClick={() => handleOpenUpiApp('gpay://')}
                  type="primary"
                  style={{ background: '#4285F4', borderColor: '#4285F4', borderRadius: 8, fontWeight: 700, fontSize: 12 }}
                >
                  Google Pay
                </Button>
                <Button
                  onClick={() => handleOpenUpiApp('phonepe://')}
                  type="primary"
                  style={{ background: '#5F259F', borderColor: '#5F259F', borderRadius: 8, fontWeight: 700, fontSize: 12 }}
                >
                  PhonePe
                </Button>
                <Button
                  onClick={() => handleOpenUpiApp('paytmmp://')}
                  type="primary"
                  style={{ background: '#00B9F1', borderColor: '#00B9F1', borderRadius: 8, fontWeight: 700, fontSize: 12 }}
                >
                  Paytm
                </Button>
                <Button
                  onClick={() => handleOpenUpiApp()}
                  style={{ background: '#0F172A', color: '#FFF', borderRadius: 8, fontWeight: 700, fontSize: 12 }}
                >
                  BHIM UPI
                </Button>
              </div>
            </Col>

            {/* ── RIGHT COL: Presets, Purpose & Donor Details Form ── */}
            <Col xs={24} md={13}>
              <Form form={form} layout="vertical" onFinish={handleFormFinish} initialValues={{ purpose: 'General Donation' }}>
                {/* 1. Select Donation Amount */}
                <Text style={{ fontWeight: 800, color: '#0F172A', fontSize: 13, display: 'block', marginBottom: 8 }}>
                  1. Select Donation Amount (₹)
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {AMOUNT_PRESETS.map((amt) => (
                    <Button
                      key={amt}
                      type={selectedAmount === amt && !customAmount ? 'primary' : 'default'}
                      onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                      style={{
                        height: 38,
                        fontWeight: 800,
                        fontSize: 13,
                        borderRadius: 8,
                        background: selectedAmount === amt && !customAmount ? '#F97316' : '#FFFFFF',
                        borderColor: selectedAmount === amt && !customAmount ? '#F97316' : '#CBD5E1'
                      }}
                    >
                      ₹ {amt}
                    </Button>
                  ))}
                </div>

                <Input
                  prefix={<DollarOutlined style={{ color: '#F97316' }} />}
                  placeholder="Or enter custom amount in ₹"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  style={{ borderRadius: 8, marginBottom: 16 }}
                />

                {/* 2. Select Purpose */}
                <Text style={{ fontWeight: 800, color: '#0F172A', fontSize: 13, display: 'block', marginBottom: 8 }}>
                  2. Select Purpose / Seva
                </Text>
                <Segmented
                  options={PURPOSES}
                  value={purpose}
                  onChange={(val) => setPurpose(val as string)}
                  block
                  style={{ marginBottom: 16, border: '1px solid #E2E8F0' }}
                />

                {/* 3. Donor Details */}
                <Text style={{ fontWeight: 800, color: '#0F172A', fontSize: 13, display: 'block', marginBottom: 8 }}>
                  3. Donor Information (For Official Receipt)
                </Text>

                {existingDonorInfo && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '8px 12px', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#16A34A', fontSize: 16 }} />
                    <div>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: '#15803D', display: 'block' }}>
                        Welcome back, {existingDonorInfo.full_name}! ({existingDonorInfo.donor_number})
                      </Text>
                      <Text style={{ fontSize: 11, color: '#166534' }}>
                        Verified Existing Donor • Total Lifetime Donations: ₹{existingDonorInfo.total_donations?.toLocaleString('en-IN')}
                      </Text>
                    </div>
                  </div>
                )}

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="full_name" rules={[{ required: true, message: 'Donor name required' }]} style={{ marginBottom: 10 }}>
                      <Input placeholder="Full Name *" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" rules={[{ required: true, message: 'Mobile required for WhatsApp receipt' }]} style={{ marginBottom: 10 }}>
                      <Input
                        placeholder="Mobile Number *"
                        onBlur={(e) => handlePhoneBlur(e.target.value)}
                        onChange={(e) => {
                          if (e.target.value.trim().length >= 10) {
                            handlePhoneBlur(e.target.value);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="pan_number" style={{ marginBottom: 10 }}>
                      <Input placeholder="PAN Number (For 80G Tax)" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="city" style={{ marginBottom: 10 }}>
                      <Input placeholder="City / Area" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="upi_reference" label={<span style={{ fontSize: 12, fontWeight: 700 }}>UPI Reference / UTR Number (Post Payment)</span>} style={{ marginBottom: 16 }}>
                  <Input placeholder="e.g. 123456789012 (12-digit UTR)" prefix={<LockOutlined style={{ color: '#22C55E' }} />} />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={submitMutation.isPending}
                  icon={<HeartFilled />}
                  style={{
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    borderColor: '#F97316',
                    height: 48,
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: 16,
                    boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)'
                  }}
                >
                  Submit & Download Official Receipt
                </Button>
              </Form>
            </Col>
          </Row>
        </Card>
      </div>

      {/* ── SUCCESS MODAL WITH INSTANT DIGITAL RECEIPT ── */}
      <Modal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        {completedReceipt && (
          <Result
            status="success"
            title={<span style={{ color: '#0F172A', fontWeight: 900 }}>Donation Submitted Successfully!</span>}
            subTitle={`Official Receipt #${completedReceipt.receipt_number} generated for ${completedReceipt.donor?.full_name || 'Donor'} (₹${completedReceipt.amount})`}
            extra={[
              <Button
                key="verify"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => navigate(`/verify/${completedReceipt.id}`)}
                style={{ background: '#0B2347', borderColor: '#0B2347', borderRadius: 8 }}
              >
                View Online Digital Receipt
              </Button>,
              <Button
                key="new"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  form.resetFields();
                }}
                style={{ borderRadius: 8 }}
              >
                Make Another Donation
              </Button>,
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default UpiPaymentPage;
