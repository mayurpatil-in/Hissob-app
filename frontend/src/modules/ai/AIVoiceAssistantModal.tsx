import React, { useState } from 'react';
import { Modal, Input, Button, Tag, Space, Alert, Typography, App } from 'antd';
import { RobotOutlined, AudioOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { parseAIReceipt } from '../../api/services';

const { Text } = Typography;

interface Props {
  open: boolean;
  onCancel: () => void;
  onApplyParsedData: (data: any) => void;
}

const AIVoiceAssistantModal: React.FC<Props> = ({ open, onCancel, onApplyParsedData }) => {
  const { message } = App.useApp();
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);

  const handleParse = async () => {
    if (!promptText.trim()) {
      message.warning('Please enter a natural language prompt or dictation text');
      return;
    }
    setLoading(true);
    try {
      const res = await parseAIReceipt(promptText);
      setParsedResult(res);
      message.success('Receipt details recognized!');
    } catch (err: any) {
      message.error('Failed to parse AI prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyParsedData(parsedResult);
      onCancel();
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#F97316' }} />
          <span>AI Voice & Smart Receipt Entry Assistant</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Text type="secondary">
          Dictate or type in natural language (e.g. <i>"Received 5000 cash from Ramesh Patel for Ganesh Festival"</i>)
        </Text>

        <Input.TextArea
          rows={3}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="e.g. Received 11000 via UPI from Priya Patel for Ganesh Pooja"
        />

        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button icon={<AudioOutlined />} onClick={() => setPromptText('Received 5000 cash from Ramesh Patel for Ganesh festival')}>
              Try Quick Sample
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={handleParse}
              style={{ background: '#F97316', borderColor: '#F97316' }}
            >
              Parse Prompt
            </Button>
          </Space>
        </div>

        {parsedResult && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={<b>AI Recognition Score: {(parsedResult.confidence_score * 100).toFixed(0)}%</b>}
            description={
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><b>Detected Amount:</b> <Tag color="orange">₹ {parsedResult.amount || 'Not found'}</Tag></div>
                <div><b>Donor Name:</b> <Tag color="blue">{parsedResult.donor_name || 'Not found'}</Tag></div>
                <div><b>Payment Mode:</b> <Tag color="green">{parsedResult.payment_mode?.toUpperCase()}</Tag></div>
                <div><b>Purpose:</b> <Text>{parsedResult.purpose}</Text></div>
                <div style={{ textAlign: 'right', marginTop: 12 }}>
                  <Button type="primary" onClick={handleApply} style={{ background: '#22C55E' }}>
                    Apply Fields to Form
                  </Button>
                </div>
              </div>
            }
          />
        )}
      </div>
    </Modal>
  );
};

export default AIVoiceAssistantModal;
