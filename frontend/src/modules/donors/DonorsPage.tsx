import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Checkbox,
  Card, Row, Col, Typography, App, Tooltip
} from 'antd';
import {
  PlusOutlined, SearchOutlined, CrownOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDonors, createDonor } from '../../api/services';
import Tax80GCertificateModal, { type Tax80GData } from '../reports/Tax80GCertificateModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const DonorsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected80GData, setSelected80GData] = useState<Tax80GData | null>(null);

  const [form] = Form.useForm();

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ['donors', searchQuery],
    queryFn: () => getDonors(searchQuery || undefined),
  });

  const createMutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => {
      message.success('Donor registered successfully!');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to register donor');
    },
  });

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
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Tooltip title="Generate Section 80G Tax Certificate">
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            size="small"
            style={{ background: '#2563EB', borderColor: '#2563EB', borderRadius: 6 }}
            onClick={() => {
              setSelected80GData({
                certificateNumber: `80G-2025-${record.donor_number || record.id.slice(0, 6)}`,
                donorName: record.full_name,
                panNumber: record.pan_number || 'PAN-NOT-PROVIDED',
                address: record.city ? `${record.city}, India` : 'India',
                financialYear: '2025-26',
                totalDonationAmount: Number(record.total_donations || 5000),
                receiptNumbers: [`RC-2026-${record.id.slice(0, 4)}`],
                trustName: 'HISSOB GANESH UTSAV CHARITABLE TRUST',
                issueDate: dayjs().format('DD MMM YYYY'),
              });
            }}
          >
            80G Certificate
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="donors-module animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>Donor Directory</Title>
          <Text type="secondary">Manage profiles, track historical contributions and Section 80G tax certificates</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
        >
          Register Donor
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary">Total Registered Donors</Text>
            <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>{donors.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="hissob-card">
            <Text type="secondary">VIP Donors (80G Eligible)</Text>
            <Title level={3} style={{ margin: 0, color: '#FF9F1C', fontWeight: 900 }}>
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
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        title="Register New Donor"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true, message: 'Enter donor full name' }]}>
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="Email" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="pan_number" label="PAN Number (80G)">
                <Input placeholder="ABCDE1234F" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_vip" valuePropName="checked">
                <Checkbox>VIP Donor</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_80g_eligible" valuePropName="checked">
                <Checkbox defaultChecked>80G Tax Eligible</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} style={{ background: '#F97316', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}>
                Save Donor
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 80G Tax Exemption Certificate Modal */}
      <Tax80GCertificateModal
        open={Boolean(selected80GData)}
        onClose={() => setSelected80GData(null)}
        data={selected80GData}
      />
    </div>
  );
};

export default DonorsPage;
