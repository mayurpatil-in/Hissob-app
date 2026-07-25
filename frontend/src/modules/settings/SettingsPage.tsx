import React from 'react';
import { Card, Form, Input, Button, Typography, App, Select, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [form] = Form.useForm();

  const handleSave = () => {
    message.success('Settings saved successfully!');
  };

  return (
    <div className="settings-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>System Settings & Preferences</Title>
          <Text type="secondary">Manage organization profile, currency, printing defaults, and SMS/WhatsApp notifications</Text>
        </div>
      </div>

      <Card className="hissob-card" style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ name: user?.full_name, currency: 'INR', timezone: 'Asia/Kolkata' }}>
          <Title level={5} style={{ color: '#F97316', marginTop: 0 }}>Organization Info</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="User / Admin Name" name="name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Default Currency" name="currency">
                <Select>
                  <Select.Option value="INR">INR (₹)</Select.Option>
                  <Select.Option value="USD">USD ($)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ color: '#0B2347', marginTop: 12 }}>Receipt & Printing Defaults</Title>
          <Form.Item label="Receipt Header Text" name="header_text">
            <Input placeholder="e.g. Official Festival Donation Receipt" defaultValue="Official Festival Donation Receipt" />
          </Form.Item>
          <Form.Item label="Footer Terms / Tax Note" name="footer_note">
            <Input.TextArea rows={2} defaultValue="Thank you for your generous contribution. 80G tax receipt valid for IT deduction." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} style={{ background: '#F97316', borderColor: '#F97316' }}>
              Save Preferences
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
