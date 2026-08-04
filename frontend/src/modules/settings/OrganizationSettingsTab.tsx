import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, App, Row, Col, Upload, Spin, Divider, Select, Switch, Modal, Table, Tag, Alert, Tooltip } from 'antd';
import { SaveOutlined, UploadOutlined, BankOutlined, QrcodeOutlined, MailOutlined, RobotOutlined, ApiOutlined, HistoryOutlined, RedoOutlined, CheckCircleOutlined, CloseCircleOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyOrganization, updateMyOrganization, uploadFile, testSmtpConnection, getEmailLogs, resendEmailLog, type EmailLogItem } from '../../api/services';

const { Title, Text } = Typography;

const OrganizationSettingsTab: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [logoUploading, setLogoUploading] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpDiagnostic, setSmtpDiagnostic] = useState<{ success: boolean; message: string; smtp_host: string; smtp_port: number; error?: string } | null>(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [testSmtpModalOpen, setTestSmtpModalOpen] = useState(false);

  const openTestSmtpModal = () => {
    const digest = form.getFieldValue('digest_recipients') || '';
    const list = digest.split(/[,;\n]+/).map((e: string) => e.trim()).filter((e: string) => e.includes('@'));
    setTestTargetEmail(list.length > 0 ? list[0] : (org?.email || ''));
    setTestSmtpModalOpen(true);
  };

  const handleTestSmtp = async (overrideTarget?: string) => {
    const target = overrideTarget || testTargetEmail;
    if (!target || !target.includes('@')) {
      message.error('Please enter a valid target recipient email address for SMTP test.');
      return;
    }
    setTestingSmtp(true);
    setSmtpDiagnostic(null);
    try {
      const res = await testSmtpConnection(target);
      setSmtpDiagnostic(res);
      if (res.success) {
        message.success(res.message);
        setTestSmtpModalOpen(false);
      } else {
        message.error(res.message);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'SMTP test connection failed');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleFetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await getEmailLogs({ limit: 50 });
      setEmailLogs(data);
    } catch (err: any) {
      message.error('Failed to load email delivery logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenLogs = () => {
    setLogsModalOpen(true);
    handleFetchLogs();
  };

  const handleResendLog = async (id: string) => {
    setResendingId(id);
    try {
      const res = await resendEmailLog(id);
      message.success(res.message);
      handleFetchLogs();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to resend email');
    } finally {
      setResendingId(null);
    }
  };

  const { data: org, isLoading } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  useEffect(() => {
    if (org) {
      form.setFieldsValue({
        name: org.name,
        upi_id: org.upi_id,
        receipt_template: org.receipt_template || 'modern',
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        registration_number: org.registration_number,
        enable_email_receipts: org.enable_email_receipts ?? true,
        enable_daily_digest: org.enable_daily_digest ?? true,
        enable_welcome_email: org.enable_welcome_email ?? true,
        digest_recipients: org.digest_recipients || '',
        ai_provider: org.ai_provider || 'gemini',
        razorpay_key_id: org.razorpay_key_id || '',
        razorpay_key_secret: org.razorpay_key_secret || '',
        razorpay_webhook_secret: org.razorpay_webhook_secret || '',
      });
    }
  }, [org, form]);

  const updateMutation = useMutation({
    mutationFn: updateMyOrganization,
    onSuccess: () => {
      message.success('Organization settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-organization'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update organization');
    }
  });

  const handleLogoUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setLogoUploading(true);
    try {
      const res = await uploadFile(file as File);
      await updateMyOrganization({ logo_url: res.url });
      queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      message.success('Logo uploaded successfully!');
      onSuccess?.(res, file as any);
    } catch (err: any) {
      onError?.(err);
      message.error('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleQrUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setQrUploading(true);
    try {
      const res = await uploadFile(file as File);
      await updateMyOrganization({ qr_code_url: res.url });
      queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      message.success('QR Code uploaded successfully!');
      onSuccess?.(res, file as any);
    } catch (err: any) {
      onError?.(err);
      message.error('QR Code upload failed');
    } finally {
      setQrUploading(false);
    }
  };

  const handleSave = (values: any) => {
    updateMutation.mutate({
      name: values.name,
      upi_id: values.upi_id,
      receipt_template: values.receipt_template,
      address: values.address,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      registration_number: values.registration_number,
      enable_email_receipts: values.enable_email_receipts,
      enable_daily_digest: values.enable_daily_digest,
      enable_welcome_email: values.enable_welcome_email,
      digest_recipients: values.digest_recipients,
      ai_provider: values.ai_provider,
      razorpay_key_id: values.razorpay_key_id,
      razorpay_key_secret: values.razorpay_key_secret,
      razorpay_webhook_secret: values.razorpay_webhook_secret,
    });
  };

  if (isLoading) return <Spin style={{ margin: '40px auto', display: 'block' }} />;

  return (
    <Card className="hissob-card" style={{ width: '100%', borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <Title level={5} style={{ color: '#F97316', marginTop: 0 }}><BankOutlined /> Organization Profile & Address</Title>
      <Text type="secondary">Update your organization address, registration details, and print settings here.</Text>

      <Divider style={{ margin: '16px 0' }} />

      <Row gutter={[20, 20]}>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Organization Logo</Text>
            <div style={{ marginTop: 8 }}>
              {org?.logo_url && (
                <img src={import.meta.env.VITE_API_URL?.replace('/api/v1', '') + org.logo_url} alt="Logo" style={{ height: 80, objectFit: 'contain', marginBottom: 12, border: '1px solid #eee', padding: 4, borderRadius: 8, display: 'block' }} />
              )}
              <Upload customRequest={handleLogoUpload} showUploadList={false} accept="image/*">
                <Button size="middle" icon={<UploadOutlined />} loading={logoUploading} style={{ borderRadius: 8 }}>Upload New Logo</Button>
              </Upload>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Payment QR Code (Optional)</Text>
            <div style={{ marginTop: 8 }}>
              {org?.qr_code_url && (
                <img src={import.meta.env.VITE_API_URL?.replace('/api/v1', '') + org.qr_code_url} alt="QR Code" style={{ height: 80, objectFit: 'contain', marginBottom: 12, border: '1px solid #eee', padding: 4, borderRadius: 8, display: 'block' }} />
              )}
              <Upload customRequest={handleQrUpload} showUploadList={false} accept="image/*">
                <Button size="middle" icon={<QrcodeOutlined />} loading={qrUploading} style={{ borderRadius: 8 }}>Upload Custom QR Code</Button>
              </Upload>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>If not uploaded, we will generate one dynamically using your UPI ID.</div>
            </div>
          </div>
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Organization / Mandal Name</span>} name="name" rules={[{ required: true, message: 'Please enter Organization Name' }]}>
              <Input size="large" placeholder="e.g. Vighnaharta Ganesh Utsav Mandal" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>UPI ID (For dynamic QR generation)</span>} name="upi_id">
              <Input size="large" placeholder="e.g. yourbank@upi" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col xs={24}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Street Address / Location</span>} name="address">
              <Input.TextArea rows={2} placeholder="e.g. Station Road, Near Main Temple, Kolhapur" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col xs={24} sm={8}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>City / District</span>} name="city">
              <Input size="large" placeholder="e.g. Kolhapur" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>State</span>} name="state">
              <Input size="large" placeholder="e.g. Maharashtra" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Pincode</span>} name="pincode">
              <Input size="large" placeholder="e.g. 416001" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Trust / Society Reg. No.</span>} name="registration_number">
              <Input size="large" placeholder="e.g. Reg. No. MAH/1234/2020" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Receipt Print Template</span>} name="receipt_template" tooltip="Choose how your receipts look when printed.">
              <Select size="large" style={{ width: '100%', borderRadius: 10 }}>
                <Select.Option value="modern">Modern English (Default)</Select.Option>
                <Select.Option value="marathi_traditional">Traditional Marathi (Classic Maroon)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '20px 0 16px 0' }} />

        {/* ── Email & Notification Control Section ── */}
        <Title level={5} style={{ color: '#3B82F6', marginTop: 0 }}><MailOutlined /> Automated Email & Notification Controls</Title>
        <Text type="secondary">Manage automated email receipts and daily executive financial digests.</Text>

        <div style={{ marginTop: 16, background: 'var(--color-bg)', padding: '16px 14px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={18} sm={19}>
              <Text strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Send Instant Email Receipts to Donors</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Automatically email electronic receipt cards to donors when an email ID is provided.</Text>
            </Col>
            <Col xs={6} sm={5} style={{ textAlign: 'right' }}>
              <Form.Item name="enable_email_receipts" valuePropName="checked" noStyle>
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={18} sm={19}>
              <Text strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Send Welcome Email to New Donors</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Automatically email a welcome greeting card & official Donor ID to newly registered donors.</Text>
            </Col>
            <Col xs={6} sm={5} style={{ textAlign: 'right' }}>
              <Form.Item name="enable_welcome_email" valuePropName="checked" noStyle>
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={18} sm={19}>
              <Text strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Enable Daily Financial Digest Email (9:00 PM)</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Send daily 9:00 PM summary of total collections, expenses, and pending cash handovers.</Text>
            </Col>
            <Col xs={6} sm={5} style={{ textAlign: 'right' }}>
              <Form.Item name="enable_daily_digest" valuePropName="checked" noStyle>
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Custom Daily Digest Recipient Emails (Optional)</span>} name="digest_recipients" tooltip="Separate multiple emails with commas. If left empty, all active Org Admins & Committee members will receive the digest automatically.">
            <Input.TextArea rows={2} placeholder="e.g. president@mandal.org, treasurer@gmail.com, secretary@mandal.org" style={{ borderRadius: 10 }} />
          </Form.Item>

          <Divider style={{ margin: '14px 0' }} />

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12}>
              <Button
                type="dashed"
                size="large"
                icon={<ApiOutlined />}
                loading={testingSmtp}
                onClick={openTestSmtpModal}
                style={{ width: '100%', borderColor: '#3B82F6', color: '#3B82F6', fontWeight: 700, borderRadius: 10 }}
              >
                Test SMTP Connection
              </Button>
            </Col>
            <Col xs={24} sm={12}>
              <Button
                size="large"
                icon={<HistoryOutlined />}
                onClick={handleOpenLogs}
                style={{ width: '100%', fontWeight: 700, borderRadius: 10 }}
              >
                View Email Delivery Logs
              </Button>
            </Col>
          </Row>

          {smtpDiagnostic && (
            <div style={{ marginTop: 14 }}>
              <Alert
                type={smtpDiagnostic.success ? 'success' : 'error'}
                showIcon
                icon={smtpDiagnostic.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                message={<Text strong>{smtpDiagnostic.message}</Text>}
                description={
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <div>SMTP Host: <code>{smtpDiagnostic.smtp_host}:{smtpDiagnostic.smtp_port}</code></div>
                    {smtpDiagnostic.error && <div style={{ color: '#DC2626', marginTop: 2 }}>Error Detail: {smtpDiagnostic.error}</div>}
                  </div>
                }
              />
            </div>
          )}
        </div>

        <Divider style={{ margin: '24px 0 16px 0' }} />

        {/* ── Razorpay Online Payment Gateway Section ── */}
        <Title level={5} style={{ color: '#0284C7', marginTop: 0 }}><CreditCardOutlined /> Razorpay Online Payment Gateway Integration</Title>
        <Text type="secondary">Configure your Mandal's dedicated Razorpay Merchant account keys for online donations, payment links, and instant WhatsApp receipts.</Text>

        <div style={{ marginTop: 16, background: 'var(--color-bg)', padding: '16px 14px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Razorpay Merchant Key ID</span>} name="razorpay_key_id" tooltip="Your Razorpay Key ID (e.g. rzp_live_xxx or rzp_test_xxx). Found in Razorpay Dashboard → Settings → API Keys.">
                <Input size="large" placeholder="e.g. rzp_live_9a8b7c6d5e4f3a" style={{ borderRadius: 10 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Razorpay Key Secret</span>} name="razorpay_key_secret" tooltip="Your secret key for signature verification. Keep this confidential.">
                <Input.Password size="large" placeholder="••••••••••••••••••••••••" style={{ borderRadius: 10 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Dedicated Webhook Secret (Optional)</span>} name="razorpay_webhook_secret" tooltip="Webhook Secret configured in Razorpay Dashboard → Settings → Webhooks for server-to-server payment verification.">
                <Input.Password size="large" placeholder="••••••••••••••••••••••••" style={{ borderRadius: 10 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Your Webhook Endpoint URL</Text>
                <div style={{ marginTop: 6, background: '#F1F5F9', padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #CBD5E1', color: '#0F172A', wordBreak: 'break-all' }}>
                  {window.location.origin}/api/v1/payments/razorpay/webhook
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Add this URL in Razorpay Dashboard → Settings → Webhooks for events: <code>payment.captured</code> and <code>refund.processed</code>.
                </Text>
              </div>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '24px 0 16px 0' }} />

        {/* ── AI LLM Engine Provider Selection Section ── */}
        <Title level={5} style={{ color: '#3B82F6', marginTop: 0 }}><RobotOutlined /> AI Assistant & LLM Intelligence Engine</Title>
        <Text type="secondary">Choose which Large Language Model (LLM) powers your organization's AI financial chatbot, voice parser & audit intelligence.</Text>

        <div style={{ marginTop: 16, background: 'var(--color-bg)', padding: '16px 14px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
          <Form.Item label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Preferred AI Engine Model Provider</span>} name="ai_provider" tooltip="Select between Google Gemini 2.0 Flash (Recommended, Ultra Fast) and OpenAI GPT-4o-Mini. Both support context-aware financial Q&A.">
            <Select size="large" style={{ width: '100%', borderRadius: 10 }}>
              <Select.Option value="gemini">✨ Google Gemini 2.0 Flash (Recommended • Fast & High Accuracy)</Select.Option>
              <Select.Option value="openai">🤖 OpenAI GPT-4o-Mini (Powerful Natural Language Reasoning)</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
          <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 10, fontWeight: 700, width: '100%', maxWidth: 220 }}>
            Save Preferences
          </Button>
        </Form.Item>
      </Form>

      {/* ── Test SMTP Connection Target Email Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ApiOutlined style={{ color: '#2563EB' }} />
            <span>Test SMTP Connection & Dispatch</span>
          </div>
        }
        open={testSmtpModalOpen}
        onCancel={() => setTestSmtpModalOpen(false)}
        onOk={() => handleTestSmtp()}
        confirmLoading={testingSmtp}
        okText="Send Test Email"
        okButtonProps={{ style: { background: '#2563EB', fontWeight: 700 } }}
        destroyOnHidden
      >
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            Enter a valid email address to deliver the diagnostic test email card and verify your SMTP server configuration:
          </Text>
          <Form layout="vertical">
            <Form.Item label="Target Test Email Address" required>
              <Input
                placeholder="e.g. ai.bestmayur@gmail.com"
                value={testTargetEmail}
                onChange={(e) => setTestTargetEmail(e.target.value)}
                onPressEnter={() => handleTestSmtp()}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* ── Email Delivery Audit Logs Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryOutlined style={{ color: '#2563EB' }} />
            <span>Email Delivery & Dispatch Audit History</span>
          </div>
        }
        open={logsModalOpen}
        onCancel={() => setLogsModalOpen(false)}
        footer={[
          <Button key="refresh" icon={<HistoryOutlined />} onClick={handleFetchLogs} loading={logsLoading}>
            Refresh Logs
          </Button>,
          <Button key="close" type="primary" onClick={() => setLogsModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={850}
        style={{ maxWidth: '95vw', top: 16 }}
        destroyOnHidden
      >
        <Table
          dataSource={emailLogs}
          rowKey="id"
          loading={logsLoading}
          pagination={{ pageSize: 8, responsive: true }}
          scroll={{ x: 750 }}
          columns={[
            {
              title: 'Date & Time',
              dataIndex: 'sent_at',
              key: 'sent_at',
              width: 140,
              render: (val: string) => (
                <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              ),
            },
            {
              title: 'Type',
              dataIndex: 'email_type',
              key: 'email_type',
              width: 110,
              render: (val: string) => {
                const colorMap: Record<string, string> = { RECEIPT: 'blue', WELCOME: 'purple', DAILY_DIGEST: 'orange', REPORT: 'cyan', TEST: 'geekblue' };
                return <Tag color={colorMap[val] || 'default'} style={{ margin: 0 }}>{val}</Tag>;
              },
            },
            {
              title: 'Recipient Email',
              dataIndex: 'recipient',
              key: 'recipient',
              width: 190,
              render: (val: string) => <strong style={{ fontSize: 12, wordBreak: 'break-all' }}>{val}</strong>,
            },
            {
              title: 'Subject',
              dataIndex: 'subject',
              key: 'subject',
              width: 180,
              ellipsis: true,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 100,
              render: (statusVal: string, record: EmailLogItem) => (
                <Tooltip title={record.error_message || 'Delivered successfully'}>
                  <Tag color={statusVal === 'SENT' ? 'success' : 'error'} style={{ margin: 0 }}>
                    {statusVal === 'SENT' ? '✓ SENT' : '✕ FAILED'}
                  </Tag>
                </Tooltip>
              ),
            },
            {
              title: 'Action',
              key: 'action',
              width: 90,
              render: (_: any, record: EmailLogItem) => (
                <Button
                  size="small"
                  icon={<RedoOutlined />}
                  loading={resendingId === record.id}
                  onClick={() => handleResendLog(record.id)}
                >
                  Resend
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </Card>
  );
};

export default OrganizationSettingsTab;
