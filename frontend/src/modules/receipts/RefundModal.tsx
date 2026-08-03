import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Button, Typography, App, Alert } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { initiateRazorpayRefund, formatErrorMessage } from '../../api/services';

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: any | null;
  onSuccess: () => void;
}

export const RefundModal: React.FC<Props> = ({
  open,
  onClose,
  receipt,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  if (!receipt) return null;

  const handleRefund = async (values: any) => {
    setLoading(true);
    try {
      const res = await initiateRazorpayRefund({
        receipt_id: receipt.id,
        amount: values.amount ? parseFloat(values.amount) : undefined,
        reason: values.reason || 'User requested refund',
      });

      message.success(res.message || `Refund processed successfully for Receipt #${receipt.receipt_number}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(formatErrorMessage(err?.response?.data?.detail, 'Failed to process online refund'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnHidden
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#EF4444', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
            <ReloadOutlined style={{ fontSize: 18 }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, fontWeight: 900 }}>
              Initiate Online Refund (Razorpay)
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Receipt #{receipt.receipt_number} • {receipt.donor?.full_name || 'Donor'}
            </Text>
          </div>
        </div>
      }
    >
      <Alert
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message="Important Refund Information"
        description={`This action will trigger an official refund of up to ₹${Number(receipt.amount).toLocaleString('en-IN')} back to the donor's original payment method via Razorpay and cancel receipt #${receipt.receipt_number}.`}
        style={{ marginTop: 16, marginBottom: 16, borderRadius: 10 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleRefund}
        initialValues={{
          amount: receipt.amount,
          reason: 'Donor requested cancellation / refund',
        }}
      >
        <Form.Item
          name="amount"
          label={<span style={{ fontWeight: 700 }}>Refund Amount (₹)</span>}
          rules={[{ required: true, message: 'Refund amount is required' }]}
          extra={`Max full refund: ₹${Number(receipt.amount).toLocaleString('en-IN')}`}
          style={{ marginBottom: 14 }}
        >
          <InputNumber
            style={{ width: '100%', borderRadius: 8 }}
            prefix="₹"
            min={1}
            max={Number(receipt.amount)}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label={<span style={{ fontWeight: 700 }}>Cancellation & Refund Reason</span>}
          rules={[{ required: true, message: 'Reason required' }]}
          style={{ marginBottom: 20 }}
        >
          <Input.TextArea
            rows={3}
            placeholder="e.g. Duplicate payment, Accidental transaction, Donor request..."
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            danger
            htmlType="submit"
            loading={loading}
            icon={<ReloadOutlined />}
            style={{ borderRadius: 8, fontWeight: 800 }}
          >
            Confirm & Issue Online Refund
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
