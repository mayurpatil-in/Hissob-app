import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Checkbox,
  Card, Row, Col, Typography, App
} from 'antd';
import {
  PlusOutlined, SearchOutlined, CrownOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDonors, createDonor } from '../../api/services';

const { Title, Text } = Typography;

const DonorsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ['donors', searchQuery],
    queryFn: () => getDonors(searchQuery || undefined),
  });

  const createMutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => {
      message.success('Donor registered successfully!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create donor');
    },
  });

  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    createMutation.mutate(values);
  };

  const columns = [
    { title: 'Donor #', dataIndex: 'donor_number', key: 'donor_number', render: (t: string) => <b>{t || 'N/A'}</b> },
    {
      title: 'Full Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string, record: any) => (
        <Space>
          <span>{name}</span>
          {record.is_vip && <Tag color="gold" icon={<CrownOutlined />}>VIP</Tag>}
          {record.is_80g_eligible && <Tag color="green">80G</Tag>}
        </Space>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (p: string) => p || 'N/A' },
    { title: 'City', dataIndex: 'city', key: 'city', render: (c: string) => c || 'N/A' },
    {
      title: 'Total Contribution',
      dataIndex: 'total_donations',
      key: 'total_donations',
      render: (val: number) => <span style={{ fontWeight: 700, color: '#22C55E' }}>₹ {Number(val || 0).toLocaleString('en-IN')}</span>,
    },
  ];

  return (
    <div className="donors-module animate-fadeIn">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Donor Directory</Title>
          <Text type="secondary">Manage profiles, track historical contributions and 80G eligibility</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#F97316', borderColor: '#F97316' }}
        >
          Add New Donor
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary">Total Registered Donors</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347' }}>{donors.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary">VIP Donors</Text>
            <Title level={3} style={{ margin: 0, color: '#FF9F1C' }}>
              {donors.filter(d => d.is_vip).length}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card className="hissob-card">
        <div style={{ marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search donors by name or phone..."
            style={{ width: 300 }}
            allowClear
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Table
          dataSource={donors}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 600 }}
        />
      </Card>

      <Modal
        title="Register New Donor"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Full address" />
          </Form.Item>

          <Space style={{ marginBottom: 16 }}>
            <Form.Item name="is_vip" valuePropName="checked" noStyle>
              <Checkbox>Mark as VIP Donor</Checkbox>
            </Form.Item>
            <Form.Item name="is_80g_eligible" valuePropName="checked" noStyle>
              <Checkbox>80G Tax Exempt Eligible</Checkbox>
            </Form.Item>
          </Space>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316' }}>
                Save Donor
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DonorsPage;
