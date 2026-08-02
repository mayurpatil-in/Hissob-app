import React from 'react';
import {
  Modal, Form, Input, InputNumber, Select, Row, Col, Typography, Button, Space, Tag, Avatar, DatePicker
} from 'antd';
import { EditOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface ReceiptFormModalProps {
  open: boolean;
  editingReceipt: any | null;
  form: any;
  donors: any[];
  fiscalYears: any[];
  festivals: any[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  open,
  editingReceipt,
  form,
  donors,
  fiscalYears,
  festivals,
  isSubmitting,
  onCancel,
  onSubmit,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={580}
      styles={{ body: { padding: 0 } }}
    >
      {/* Sleek Gradient Header */}
      <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0B2347 0%, #1E40AF 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar style={{ backgroundColor: '#F97316', color: '#fff', fontWeight: 900 }} icon={editingReceipt ? <EditOutlined /> : <PrinterOutlined />} size={44} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 900 }}>
              {editingReceipt ? `Edit Receipt #${editingReceipt.receipt_number}` : 'Issue New Donation Receipt'}
            </Title>
            <Text style={{ color: '#93C5FD', fontSize: 12 }}>
              {editingReceipt ? 'Modify receipt details, amount, donor or receipt date' : 'Record donor contribution, select receipt date, and generate official voucher'}
            </Text>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <div style={{ padding: '24px' }}>
        <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ payment_mode: 'cash', receipt_date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="financial_year_id"
                label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Financial Year</span>}
                rules={[{ required: true, message: 'Select Financial Year' }]}
              >
                <Select size="large" style={{ borderRadius: 8 }} placeholder="Select Financial Year">
                  {fiscalYears.map((fy: any) => (
                    <Option key={fy.id} value={fy.id}>{fy.name} {fy.is_current ? '(Active)' : ''}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="receipt_date"
                label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Receipt Date</span>}
                rules={[{ required: true, message: 'Select receipt date' }]}
              >
                <DatePicker
                  size="large"
                  format="DD MMM YYYY"
                  style={{ width: '100%', borderRadius: 8 }}
                  allowClear={false}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="donor_id"
            label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Select Donor</span>}
            rules={[{ required: true, message: 'Please select or search a donor' }]}
          >
            <Select
              size="large"
              style={{ borderRadius: 8 }}
              placeholder="Search donor by name, phone or donor #..."
              showSearch
              optionFilterProp="children"
            >
              {donors.map((d: any) => (
                <Option key={d.id} value={d.id}>
                  👤 {d.full_name} {d.phone ? `(+91 ${d.phone})` : ''} {d.donor_number ? `[${d.donor_number}]` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="festival_id"
            label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Link to Festival Campaign (Optional)</span>}
          >
            <Select
              size="large"
              style={{ borderRadius: 8 }}
              placeholder="Select a festival campaign if this is a targeted donation..."
              allowClear
            >
              {festivals.map((f: any) => (
                <Option key={f.id} value={f.id}>
                  🎪 {f.name} {f.deity ? `(${f.deity})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="amount"
                label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Amount (₹)</span>}
                rules={[
                  { required: true, message: 'Enter donation amount' },
                  { type: 'number', min: 1, message: 'Amount must be at least ₹1' },
                  { type: 'number', max: 100000000, message: 'Amount cannot exceed ₹10 Crore' },
                ]}
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%', borderRadius: 8 }}
                  min={1}
                  max={100000000}
                  placeholder="e.g. 5100"
                  prefix={<span style={{ color: '#10B981', fontWeight: 800 }}>₹</span>}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="payment_mode"
                label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Payment Mode</span>}
                rules={[{ required: true }]}
              >
                <Select size="large" style={{ borderRadius: 8 }}>
                  <Option value="cash">💵 Cash</Option>
                  <Option value="upi">📱 UPI / QR Code</Option>
                  <Option value="cheque">📄 Cheque</Option>
                  <Option value="neft">🏦 NEFT / Net Banking</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Quick Amount Presets */}
          <div style={{ marginBottom: 16, marginTop: -8 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, marginRight: 8, color: 'var(--color-text-secondary)' }}>Quick Amounts:</Text>
            <Space size={4} wrap>
              {[500, 1000, 2100, 5100, 11000, 25000, 51000].map((amt) => (
                <Tag
                  key={amt}
                  color="green"
                  style={{ cursor: 'pointer', borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                  onClick={() => form.setFieldValue('amount', amt)}
                >
                  + ₹{amt.toLocaleString('en-IN')}
                </Tag>
              ))}
            </Space>
          </div>

          <Form.Item noStyle shouldUpdate={(prev, current) => prev.payment_mode !== current.payment_mode}>
            {({ getFieldValue }) => {
              const mode = getFieldValue('payment_mode');
              if (mode === 'upi') {
                return (
                  <Form.Item
                    name="upi_reference"
                    label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>UPI Reference / UTR Number</span>}
                    rules={[{ max: 50, message: 'UPI reference cannot exceed 50 characters' }]}
                  >
                    <Input size="large" placeholder="e.g. 420519847120 or UPI/998877665544" prefix={<Tag color="cyan">UPI UTR</Tag>} style={{ borderRadius: 8 }} maxLength={50} />
                  </Form.Item>
                );
              }
              if (mode === 'neft') {
                return (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="transaction_ref"
                        label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>NEFT / UTR Reference</span>}
                        rules={[{ max: 50, message: 'Reference cannot exceed 50 characters' }]}
                      >
                        <Input size="large" placeholder="e.g. NEFT/HDFC20260725" style={{ borderRadius: 8 }} maxLength={50} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="bank_name"
                        label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Remitting Bank</span>}
                        rules={[{ max: 100, message: 'Bank name cannot exceed 100 characters' }]}
                      >
                        <Input size="large" placeholder="e.g. HDFC Bank, SBI, ICICI" style={{ borderRadius: 8 }} maxLength={100} />
                      </Form.Item>
                    </Col>
                  </Row>
                );
              }
              if (mode === 'cheque') {
                return (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="cheque_number"
                        label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Cheque Number</span>}
                        rules={[{ max: 30, message: 'Cheque number cannot exceed 30 characters' }]}
                      >
                        <Input size="large" placeholder="e.g. CHQ-445566" style={{ borderRadius: 8 }} maxLength={30} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="bank_name"
                        label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Drawn Bank</span>}
                        rules={[{ max: 100, message: 'Bank name cannot exceed 100 characters' }]}
                      >
                        <Input size="large" placeholder="e.g. State Bank of India" style={{ borderRadius: 8 }} maxLength={100} />
                      </Form.Item>
                    </Col>
                  </Row>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="purpose"
            label={<span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Purpose / Cause</span>}
            rules={[{ max: 150, message: 'Purpose cannot exceed 150 characters' }]}
          >
            <Input size="large" placeholder="e.g. Festival Collection, Pooja, General Donation" style={{ borderRadius: 8 }} maxLength={150} />
          </Form.Item>

          {/* Quick Cause Presets */}
          <div style={{ marginBottom: 20, marginTop: -8 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, marginRight: 8, color: 'var(--color-text-secondary)' }}>Quick Causes:</Text>
            <Space size={4} wrap>
              {['Ganesh Utsav 2025', 'Annadaanam', 'Temple Construction', 'Pooja Seva', 'General Donation'].map((cause) => (
                <Tag
                  key={cause}
                  color="orange"
                  style={{ cursor: 'pointer', borderRadius: 12, fontSize: 11, fontWeight: 600 }}
                  onClick={() => form.setFieldValue('purpose', cause)}
                >
                  + {cause}
                </Tag>
              ))}
            </Space>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <Button size="large" onClick={onCancel} style={{ borderRadius: 8, fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                borderColor: '#F97316',
                borderRadius: 8,
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
              }}
            >
              {editingReceipt ? 'Update Receipt' : 'Issue Receipt'}
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default ReceiptFormModal;
