import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, App, Row, Col, Upload, Spin, Divider } from 'antd';
import { SaveOutlined, UploadOutlined, BankOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyOrganization, updateMyOrganization, uploadFile } from '../../api/services';

const { Title, Text } = Typography;

const OrganizationSettingsTab: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [logoUploading, setLogoUploading] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  useEffect(() => {
    if (org) {
      form.setFieldsValue({
        name: org.name,
        upi_id: org.upi_id,
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
    });
  };

  if (isLoading) return <Spin style={{ margin: '40px auto', display: 'block' }} />;

  return (
    <Card className="hissob-card" style={{ maxWidth: 800 }}>
      <Title level={5} style={{ color: '#F97316', marginTop: 0 }}><BankOutlined /> Organization Profile</Title>
      <Text type="secondary">Update your organization details and printing settings here.</Text>
      <Divider style={{ margin: '16px 0' }} />

      <Row gutter={[24, 24]}>
        <Col span={12}>
          <div style={{ marginBottom: 24 }}>
            <Text strong>Organization Logo</Text>
            <div style={{ marginTop: 8 }}>
              {org?.logo_url && (
                <img src={import.meta.env.VITE_API_URL?.replace('/api/v1', '') + org.logo_url} alt="Logo" style={{ height: 80, objectFit: 'contain', marginBottom: 12, border: '1px solid #eee', padding: 4, borderRadius: 8 }} />
              )}
              <Upload customRequest={handleLogoUpload} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} loading={logoUploading}>Upload New Logo</Button>
              </Upload>
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div style={{ marginBottom: 24 }}>
            <Text strong>Payment QR Code (Optional)</Text>
            <div style={{ marginTop: 8 }}>
              {org?.qr_code_url && (
                <img src={import.meta.env.VITE_API_URL?.replace('/api/v1', '') + org.qr_code_url} alt="QR Code" style={{ height: 80, objectFit: 'contain', marginBottom: 12, border: '1px solid #eee', padding: 4, borderRadius: 8 }} />
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
          <Col span={12}>
            <Form.Item label="Organization / Mandal Name" name="name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Hissob Ganesh Utsav Trust" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="UPI ID (For dynamic QR generation)" name="upi_id">
              <Input placeholder="e.g. yourbank@upi" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ textAlign: 'right', marginTop: 16, marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
            Save Preferences
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default OrganizationSettingsTab;
