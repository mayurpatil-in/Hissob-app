import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, App, Row, Col, Upload, Spin, Divider, Select, Switch, Modal, Table, Tag, Alert, Tooltip } from 'antd';
import { SaveOutlined, UploadOutlined, BankOutlined, QrcodeOutlined, MailOutlined, RobotOutlined, ApiOutlined, HistoryOutlined, RedoOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
    });
  };

  if (isLoading) return <Spin style={{ margin: '40px auto', display: 'block' }} />;

  return (
    <Card className="hissob-card" style={{ maxWidth: 800 }}>
      <Title level={5} style={{ color: '#F97316', marginTop: 0 }}><BankOutlined /> Organization Profile & Address</Title>
      <Text type="secondary">Update your organization address, registration details, and print settings here.</Text>

      <Divider style={{ margin: '16px 0' }} />

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Organization Logo</Text>
            <div style={{ marginTop: 8 }}>
              {org?.logo_url && (
                <img src={import.meta.env.VITE_API_URL?.replace('/api/v1', '') + org.logo_url} alt="Logo" style={{ height: 80, objectFit: 'contain', marginBottom: 12, border: '1px solid #eee', padding: 4, borderRadius: 8, display: 'block' }} />
              )}
              <Upload customRequest={handleLogoUpload} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} loading={logoUploading}>Upload New Logo</Button>
              </Upload>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Payment QR Code (Optional)</Text>
            <div style={{ marginTop: 8 }}>
              {org?.qr_code_url && (
                <img src={import.meta.env.VITE_API_URL?.replace('/api/v1', '') + org.qr_code_url} alt="QR Code" style={{ height: 80, objectFit: 'contain', marginBottom: 12, border: '1px solid #eee', padding: 4, borderRadius: 8, display: 'block' }} />
              )}
              <Upload customRequest={handleQrUpload} showUploadList={false} accept="image/*">
                <Button icon={<QrcodeOutlined />} loading={qrUploading}>Upload Custom QR Code</Button>
              </Upload>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>If not uploaded, we will generate one dynamically using your UPI ID.</div>
            </div>
          </div>
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Organization / Mandal Name" name="name" rules={[{ required: true, message: 'Please enter Organization Name' }]}>
              <Input placeholder="e.g. Vighnaharta Ganesh Utsav Mandal" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="UPI ID (For dynamic QR generation)" name="upi_id">
              <Input placeholder="e.g. yourbank@upi" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label="Street Address / Location" name="address">
              <Input.TextArea rows={2} placeholder="e.g. Station Road, Near Main Temple, Kolhapur" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item label="City / District" name="city">
              <Input placeholder="e.g. Kolhapur" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="State" name="state">
              <Input placeholder="e.g. Maharashtra" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Pincode" name="pincode">
              <Input placeholder="e.g. 416001" />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Trust / Society Reg. No." name="registration_number">
              <Input placeholder="e.g. Reg. No. MAH/1234/2020" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Receipt Print Template" name="receipt_template" tooltip="Choose how your receipts look when printed.">
              <Select style={{ width: '100%' }}>
                <Select.Option value="modern">Modern English (Default)</Select.Option>
                <Select.Option value="marathi_traditional">Traditional Marathi (Classic Maroon)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '20px 0 16px 0' }} />

        {/* ── Email & Notification Control Section ── */}
        <Title level={5} style={{ color: '#2563EB', marginTop: 0 }}><MailOutlined /> Automated Email & Notification Controls</Title>
        <Text type="secondary">Manage automated email receipts and daily executive financial digests.</Text>

        <div style={{ marginTop: 16, background: '#F8FAFC', padding: '16px 12px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={18} sm={19}>
              <Text strong style={{ fontSize: 13 }}>Send Instant Email Receipts to Donors</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Automatically email electronic receipt cards to donors when an email ID is provided.</Text>
            </Col>
            <Col xs={6} sm={5} style={{ textAlign: 'right' }}>
              <Form.Item name="enable_email_receipts" valuePropName="checked" noStyle>
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={18} sm={19}>
              <Text strong style={{ fontSize: 13 }}>Send Welcome Email to New Donors</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Automatically email a welcome greeting card & official Donor ID to newly registered donors.</Text>
            </Col>
            <Col xs={6} sm={5} style={{ textAlign: 'right' }}>
              <Form.Item name="enable_welcome_email" valuePropName="checked" noStyle>
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={18} sm={19}>
              <Text strong style={{ fontSize: 13 }}>Enable Daily Financial Digest Email (9:00 PM)</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Send daily 9:00 PM summary of total collections, expenses, and pending cash handovers.</Text>
            </Col>
            <Col xs={6} sm={5} style={{ textAlign: 'right' }}>
              <Form.Item name="enable_daily_digest" valuePropName="checked" noStyle>
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Custom Daily Digest Recipient Emails (Optional)" name="digest_recipients" tooltip="Separate multiple emails with commas. If left empty, all active Org Admins & Committee members will receive the digest automatically.">
            <Input.TextArea rows={2} placeholder="e.g. president@mandal.org, treasurer@gmail.com, secretary@mandal.org" />
          </Form.Item>

          <Divider style={{ margin: '14px 0' }} />

          <Row gutter={12} align="middle">
            <Col xs={24} sm={12}>
              <Button
                type="dashed"
                icon={<ApiOutlined />}
                loading={testingSmtp}
                onClick={openTestSmtpModal}
                style={{ width: '100%', borderColor: '#2563EB', color: '#2563EB', fontWeight: 600 }}
              >
                Test SMTP Connection
              </Button>
            </Col>
            <Col xs={24} sm={12} style={{ marginTop: 8 }}>
              <Button
                icon={<HistoryOutlined />}
                onClick={handleOpenLogs}
                style={{ width: '100%', fontWeight: 600 }}
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

        {/* ── AI LLM Engine Provider Selection Section ── */}
        <Title level={5} style={{ color: '#0066FF', marginTop: 0 }}><RobotOutlined /> AI Assistant & LLM Intelligence Engine</Title>
        <Text type="secondary">Choose which Large Language Model (LLM) powers your organization's AI financial chatbot, voice parser & audit intelligence.</Text>

        <div style={{ marginTop: 16, background: '#F8FAFC', padding: '16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <Form.Item label="Preferred AI Engine Model Provider" name="ai_provider" tooltip="Select between Google Gemini 2.0 Flash (Recommended, Ultra Fast) and OpenAI GPT-4o-Mini. Both support context-aware financial Q&A.">
            <Select style={{ width: '100%' }}>
              <Select.Option value="gemini">✨ Google Gemini 2.0 Flash (Recommended • Fast & High Accuracy)</Select.Option>
              <Select.Option value="openai">🤖 OpenAI GPT-4o-Mini (Powerful Natural Language Reasoning)</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending} block={window.innerWidth < 576} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
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
        destroyOnClose
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
        destroyOnClose
      >
        <Table
          dataSource={emailLogs}
          rowKey="id"
          loading={logsLoading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Date & Time',
              dataIndex: 'sent_at',
              key: 'sent_at',
              render: (val: string) => new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            },
            {
              title: 'Type',
              dataIndex: 'email_type',
              key: 'email_type',
              render: (val: string) => {
                const colorMap: Record<string, string> = { RECEIPT: 'blue', WELCOME: 'purple', DAILY_DIGEST: 'orange', REPORT: 'cyan', TEST: 'geekblue' };
                return <Tag color={colorMap[val] || 'default'}>{val}</Tag>;
              },
            },
            {
              title: 'Recipient Email',
              dataIndex: 'recipient',
              key: 'recipient',
              render: (val: string) => <strong>{val}</strong>,
            },
            {
              title: 'Subject',
              dataIndex: 'subject',
              key: 'subject',
              ellipsis: true,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (statusVal: string, record: EmailLogItem) => (
                <Tooltip title={record.error_message || 'Delivered successfully'}>
                  <Tag color={statusVal === 'SENT' ? 'success' : 'error'}>
                    {statusVal === 'SENT' ? '✓ SENT' : '✕ FAILED'}
                  </Tag>
                </Tooltip>
              ),
            },
            {
              title: 'Action',
              key: 'action',
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
